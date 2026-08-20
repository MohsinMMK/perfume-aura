import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  and,
  checkoutSessions,
  commerceCartItems,
  commerceCarts,
  commerceOrderEvents,
  commerceOrderItems,
  commerceOrders,
  commerceSettings,
  db,
  eq,
  paymentAttempts,
  productPublications,
  products,
  productVariants,
  releaseCheckoutReservations,
  reserveCheckoutStock,
  sql,
  storefrontCustomerProfile,
  variantPrices,
} from "@perfume-aura/db";
import { createCashfreeOrder } from "./cashfree";
import { deliveryProfileInputSchema } from "./customer-profile";

const checkoutInputSchema = deliveryProfileInputSchema.extend({
  requestId: z.string().uuid(),
  saveAddress: z.boolean().default(false),
});

export type CheckoutCustomerIdentity = Readonly<{ userId: string; email: string }>;

type CheckoutResult = Readonly<{
  orderNumber: string;
  accountOrderPath: string;
  cashfreePaymentSessionId: string;
  cashfreeMode: "sandbox" | "production";
}>;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PA-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function orderPath(orderNumber: string): string {
  return `/account/orders/${encodeURIComponent(orderNumber)}`;
}

function payloadDigest(
  input: z.infer<typeof checkoutInputSchema>,
  identity: CheckoutCustomerIdentity,
  cartToken: string,
): string {
  return digest(JSON.stringify({
    cart: digest(cartToken),
    userId: identity.userId,
    email: identity.email.trim().toLowerCase(),
    ...input,
  }));
}

async function replayCheckout(
  requestId: string,
  expectedDigest: string,
  userId: string,
): Promise<CheckoutResult | null> {
  const [existing] = await db
    .select({
      payloadDigest: checkoutSessions.payloadDigest,
      customerUserId: commerceOrders.customerUserId,
      orderNumber: commerceOrders.orderNumber,
      providerSessionId: paymentAttempts.providerSessionId,
      paymentStatus: paymentAttempts.status,
    })
    .from(checkoutSessions)
    .innerJoin(commerceOrders, eq(commerceOrders.checkoutSessionId, checkoutSessions.id))
    .innerJoin(paymentAttempts, eq(paymentAttempts.orderId, commerceOrders.id))
    .where(eq(checkoutSessions.requestId, requestId))
    .limit(1);
  if (!existing) return null;
  if (existing.payloadDigest !== expectedDigest || existing.customerUserId !== userId) {
    throw new Error("Checkout request identifier was already used with different details");
  }
  if (!existing.providerSessionId || !["created", "pending"].includes(existing.paymentStatus)) {
    throw new Error("This payment session is no longer active; start checkout again");
  }
  return {
    orderNumber: existing.orderNumber,
    accountOrderPath: orderPath(existing.orderNumber),
    cashfreePaymentSessionId: existing.providerSessionId,
    cashfreeMode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
  };
}

export async function placeCheckoutOrder(
  rawInput: unknown,
  cartToken: string,
  identity: CheckoutCustomerIdentity,
): Promise<CheckoutResult> {
  const input = checkoutInputSchema.parse(rawInput);
  const customer = {
    userId: identity.userId,
    email: z.string().email().max(320).parse(identity.email).toLowerCase(),
  };
  const requestPayloadDigest = payloadDigest(input, customer, cartToken);
  if (process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED !== "true") {
    throw new Error("Customer authentication is not available yet");
  }
  if (process.env.STOREFRONT_CHECKOUT_RELEASE_APPROVED !== "true") {
    throw new Error("Online checkout is not available yet");
  }
  if (Number(process.env.CASHFREE_PAYMENT_TTL_MINUTES) !== 20) {
    throw new Error("Cashfree payment TTL must be configured to 20 minutes");
  }
  const replay = await replayCheckout(input.requestId, requestPayloadDigest, customer.userId);
  if (replay) return replay;

  const [settings] = await db.select().from(commerceSettings)
    .where(eq(commerceSettings.id, "primary")).limit(1);
  if (
    !settings?.checkoutEnabled || settings.flatShippingAmountMinor == null ||
    !settings.taxTreatment || !settings.supportChannel ||
    !settings.shippingPolicyApproved || !settings.returnsPolicyApproved ||
    !settings.cancellationPolicyApproved
  ) {
    throw new Error("Checkout policy settings are incomplete");
  }
  if (![
    "prices_include_approved_tax",
    "no_tax_collected_owner_approved",
  ].includes(settings.taxTreatment)) {
    throw new Error("Checkout tax treatment is not a supported approved code");
  }

  const [cart] = await db.select({ id: commerceCarts.id, status: commerceCarts.status })
    .from(commerceCarts).where(eq(commerceCarts.tokenDigest, digest(cartToken))).limit(1);
  if (!cart || cart.status !== "active") throw new Error("Cart is unavailable");

  const lines = await db.select({
    variantId: productVariants.id,
    productName: productPublications.publicName,
    sku: productVariants.sku,
    sizeMl: productVariants.sizeMl,
    quantity: commerceCartItems.quantity,
    amountMinor: variantPrices.amountMinor,
  }).from(commerceCartItems)
    .innerJoin(productVariants, eq(productVariants.id, commerceCartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(productPublications, eq(productPublications.productId, products.id))
    .innerJoin(variantPrices, eq(variantPrices.variantId, productVariants.id))
    .where(and(
      eq(commerceCartItems.cartId, cart.id), eq(products.status, "active"),
      eq(productVariants.status, "active"), eq(productPublications.status, "published"),
      eq(variantPrices.active, true), eq(variantPrices.currency, "INR"),
      sql`${productPublications.publicName} IS NOT NULL`,
      sql`${productPublications.legalApprovedAt} IS NOT NULL`,
      sql`${productPublications.contentApprovedAt} IS NOT NULL`,
      sql`${productPublications.mediaApprovedAt} IS NOT NULL`,
      sql`${variantPrices.approvedAt} IS NOT NULL`, sql`${variantPrices.amountMinor} > 0`,
    ));
  if (lines.length === 0) throw new Error("Cart has no approved products");

  const subtotalAmountMinor = lines.reduce(
    (sum, line) => sum + line.amountMinor * line.quantity,
    0,
  );
  const freeShipping = settings.freeShippingThresholdMinor != null &&
    subtotalAmountMinor >= settings.freeShippingThresholdMinor;
  const shippingAmountMinor = freeShipping ? 0 : settings.flatShippingAmountMinor;
  const totalAmountMinor = subtotalAmountMinor + shippingAmountMinor;
  if (totalAmountMinor <= 0) throw new Error("Order total must be positive");

  const checkoutToken = randomBytes(32).toString("base64url");
  const legacyAccessToken = randomBytes(32).toString("base64url");
  const providerOrderExpiresAt = new Date(Date.now() + 15 * 60 * 1_000);
  const finalizationDeadlineAt = new Date(Date.now() + 40 * 60 * 1_000);
  const createdOrderNumber = createOrderNumber();
  const shippingAddress = {
    recipientName: input.recipientName,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 || null,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: "IN" as const,
    taxTreatment: settings.taxTreatment,
  };

  const created = await db.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.requestId}))`);
    const [existingRequest] = await transaction.select({ payloadDigest: checkoutSessions.payloadDigest })
      .from(checkoutSessions).where(eq(checkoutSessions.requestId, input.requestId)).limit(1);
    if (existingRequest) {
      if (existingRequest.payloadDigest !== requestPayloadDigest) {
        throw new Error("Checkout request identifier was already used with different details");
      }
      throw new Error("Checkout request is already being processed; retry shortly");
    }
    const [lockedCart] = await transaction
      .select({ status: commerceCarts.status }).from(commerceCarts)
      .where(eq(commerceCarts.id, cart.id)).for("update").limit(1);
    if (lockedCart?.status !== "active") throw new Error("Cart is already being checked out");

    const [checkout] = await transaction.insert(checkoutSessions).values({
      cartId: cart.id,
      tokenDigest: digest(checkoutToken),
      requestId: input.requestId,
      payloadDigest: requestPayloadDigest,
      status: "open",
      pricingVersion: 1,
      email: customer.email,
      shippingAddress,
      expiresAt: finalizationDeadlineAt,
    }).returning({ id: checkoutSessions.id });
    if (!checkout) throw new Error("Checkout session could not be created");

    const [order] = await transaction.insert(commerceOrders).values({
      orderNumber: createdOrderNumber,
      accessTokenDigest: digest(legacyAccessToken),
      checkoutSessionId: checkout.id,
      customerUserId: customer.userId,
      guestEmail: customer.email,
      status: "pending",
      paymentState: "prepaid_pending",
      currency: "INR",
      subtotalAmountMinor,
      shippingAmountMinor,
      taxAmountMinor: 0,
      discountAmountMinor: 0,
      totalAmountMinor,
      shippingAddressSnapshot: shippingAddress,
    }).returning({ id: commerceOrders.id });
    if (!order) throw new Error("Order could not be created");

    await transaction.insert(commerceOrderItems).values(lines.map((line) => ({
      orderId: order.id,
      variantId: line.variantId,
      productNameSnapshot: line.productName ?? "Approved product",
      skuSnapshot: line.sku,
      sizeMlSnapshot: line.sizeMl,
      unitPriceAmountMinor: line.amountMinor,
      quantity: line.quantity,
      lineTotalAmountMinor: line.amountMinor * line.quantity,
    })));
    await transaction.insert(commerceOrderEvents).values({
      orderId: order.id,
      eventType: "order_placed",
      toStatus: "pending",
      idempotencyKey: `order-placed:${order.id}`,
    });
    const [attempt] = await transaction.insert(paymentAttempts).values({
      orderId: order.id,
      provider: "cashfree",
      status: "created",
      idempotencyKey: input.requestId,
      currency: "INR",
      amountMinor: totalAmountMinor,
      providerOrderExpiresAt,
      finalizationDeadlineAt,
    }).returning({ id: paymentAttempts.id });
    if (!attempt) throw new Error("Payment attempt could not be created");

    if (input.saveAddress) {
      await transaction.insert(storefrontCustomerProfile).values({
        userId: customer.userId,
        recipientName: input.recipientName,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: "IN",
      }).onConflictDoUpdate({
        target: storefrontCustomerProfile.userId,
        set: {
          recipientName: input.recipientName,
          phone: input.phone,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 || null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: "IN",
          updatedAt: new Date(),
        },
      });
    }
    await transaction.update(commerceCarts)
      .set({ customerUserId: customer.userId, status: "converted", updatedAt: new Date() })
      .where(eq(commerceCarts.id, cart.id));
    return { checkoutId: checkout.id, orderId: order.id, attemptId: attempt.id };
  });

  try {
    await reserveCheckoutStock({
      checkoutSessionId: created.checkoutId,
      items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      expiresAt: finalizationDeadlineAt,
    });
    const storefrontUrl = new URL(process.env.STOREFRONT_URL ?? "https://perfumeaura.com");
    const providerOrder = await createCashfreeOrder({
      orderId: createdOrderNumber,
      amountMinor: totalAmountMinor,
      idempotencyKey: input.requestId,
      customer: {
        id: `account-${digest(customer.userId).slice(0, 24)}`,
        name: input.recipientName,
        email: customer.email,
        phone: input.phone,
      },
      returnUrl: new URL(`${orderPath(createdOrderNumber)}?payment=return`, storefrontUrl).toString(),
      notifyUrl: new URL("/api/payments/cashfree/webhook", storefrontUrl).toString(),
    });
    if (!providerOrder.payment_session_id) throw new Error("Cashfree did not return a payment session");
    await db.transaction(async (transaction) => {
      await transaction.update(paymentAttempts).set({
        status: "pending",
        providerOrderId: providerOrder.order_id,
        providerSessionId: providerOrder.payment_session_id,
      }).where(eq(paymentAttempts.id, created.attemptId));
      await transaction.update(checkoutSessions).set({ status: "payment_pending" })
        .where(eq(checkoutSessions.id, created.checkoutId));
    });
    return {
      orderNumber: createdOrderNumber,
      accountOrderPath: orderPath(createdOrderNumber),
      cashfreePaymentSessionId: providerOrder.payment_session_id,
      cashfreeMode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
    };
  } catch (error) {
    await releaseCheckoutReservations({ checkoutSessionId: created.checkoutId, reason: "payment_failed" });
    await db.transaction(async (transaction) => {
      await transaction.update(paymentAttempts).set({ status: "failed" })
        .where(eq(paymentAttempts.id, created.attemptId));
      await transaction.update(commerceOrders)
        .set({ status: "cancelled", paymentState: "failed", cancelledAt: new Date() })
        .where(eq(commerceOrders.id, created.orderId));
      await transaction.update(checkoutSessions).set({ status: "cancelled" })
        .where(eq(checkoutSessions.id, created.checkoutId));
      await transaction.update(commerceCarts).set({ status: "active" })
        .where(eq(commerceCarts.id, cart.id));
      await transaction.insert(commerceOrderEvents).values({
        orderId: created.orderId,
        eventType: "payment_failed",
        fromStatus: "pending",
        toStatus: "cancelled",
        idempotencyKey: `payment-session-failed:${created.attemptId}`,
      });
    });
    throw error;
  }
}
