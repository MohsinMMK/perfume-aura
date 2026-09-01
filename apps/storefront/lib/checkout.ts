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
  inArray,
  paymentAttempts,
  productMedia,
  productPublications,
  products,
  productVariants,
  reserveCheckoutStock,
  shippingServiceability,
  sql,
  storefrontCustomerProfile,
  variantPrices,
} from "@perfume-aura/db";
import { createCashfreeOrder } from "./cashfree";
import { recoverCashfreePaymentBinding } from "./payment-binding-recovery";
import {
  bindCreatedCashfreePaymentAttempt,
  cancelCashfreePaymentAttempt,
} from "./payment-finalizer-client";
import {
  checkoutCartSnapshotChanged,
  compareCheckoutCartSet,
} from "./checkout-cart-eligibility";
import { deliveryProfileInputSchema } from "./customer-profile";

const checkoutInputSchema = deliveryProfileInputSchema.extend({
  requestId: z.string().uuid(),
  cartLines: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
    amountMinor: z.number().int().positive(),
  })).min(1).max(100),
  saveAddress: z.boolean().default(false),
});

export type CheckoutCustomerIdentity = Readonly<{ userId: string; email: string }>;

type CheckoutResult = Readonly<{
  orderNumber: string;
  accountOrderPath: string;
  cashfreePaymentSessionId: string;
  cashfreeMode: "sandbox" | "production";
}>;

export class CheckoutCartChangedError extends Error {
  readonly code = "CART_CHANGED";

  constructor() {
    super("Your cart changed. Review the updated items before continuing to UPI.");
    this.name = "CheckoutCartChangedError";
  }
}

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
  const canonicalCartLines = [...input.cartLines]
    .sort((left, right) => left.variantId.localeCompare(right.variantId));
  return digest(JSON.stringify({
    cart: digest(cartToken),
    userId: identity.userId,
    email: identity.email.trim().toLowerCase(),
    ...input,
    cartLines: canonicalCartLines,
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
    !settings.taxPolicyApproved || !settings.taxApprovalReference ||
    !settings.catalogLegalApproved || !settings.legalApprovalReference ||
    !settings.supportOperationsApproved ||
    !settings.shippingPolicyApproved || !settings.returnsPolicyApproved ||
    !settings.cancellationPolicyApproved
  ) {
    throw new Error("Checkout policy settings are incomplete");
  }
  if (settings.taxTreatment !== "prices_include_approved_tax") {
    throw new Error("Checkout tax treatment is not a supported approved code");
  }
  if (
    settings.flatShippingAmountMinor !== 9_900 ||
    settings.freeShippingThresholdMinor !== 99_900
  ) {
    throw new Error("Checkout shipping policy does not match the approved launch policy");
  }
  const flatShippingAmountMinor = settings.flatShippingAmountMinor;
  const freeShippingThresholdMinor = settings.freeShippingThresholdMinor;

  const [cart] = await db.select({ id: commerceCarts.id, status: commerceCarts.status })
    .from(commerceCarts).where(eq(commerceCarts.tokenDigest, digest(cartToken))).limit(1);
  if (!cart || cart.status !== "active") throw new Error("Cart is unavailable");

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

    const [serviceability] = await transaction.select({
      delhiveryEnabled: shippingServiceability.delhiveryEnabled,
      indiaPostEnabled: shippingServiceability.indiaPostEnabled,
      deliveryMinBusinessDays: shippingServiceability.deliveryMinBusinessDays,
      deliveryMaxBusinessDays: shippingServiceability.deliveryMaxBusinessDays,
    }).from(shippingServiceability).where(and(
      eq(shippingServiceability.postalCode, input.postalCode),
      eq(shippingServiceability.active, true),
      sql`${shippingServiceability.delhiveryEnabled} OR ${shippingServiceability.indiaPostEnabled}`,
    )).limit(1);
    if (!serviceability) {
      throw new Error("Delivery is not available for this PIN code yet");
    }

    const storedLines = await transaction
      .select({
        variantId: commerceCartItems.variantId,
        quantity: commerceCartItems.quantity,
      })
      .from(commerceCartItems)
      .where(eq(commerceCartItems.cartId, cart.id));
    if (storedLines.length === 0) throw new Error("Cart has no products");

    const lines = await transaction.select({
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
      .innerJoin(productMedia, and(
        eq(productMedia.productId, products.id),
        eq(productMedia.kind, "pack"),
        eq(productMedia.position, 0),
      ))
      .where(and(
        eq(commerceCartItems.cartId, cart.id), eq(products.status, "active"),
        eq(productVariants.status, "active"), eq(productPublications.status, "published"),
        eq(variantPrices.active, true), eq(variantPrices.currency, "INR"),
        sql`${productPublications.publicName} IS NOT NULL`,
        sql`${productPublications.publicSlug} IS NOT NULL`,
        sql`${productPublications.legalApprovedAt} IS NOT NULL`,
        sql`${productPublications.legalApprovalReference} IS NOT NULL`,
        sql`${productPublications.contentApprovedAt} IS NOT NULL`,
        sql`${productPublications.contentApprovalReference} IS NOT NULL`,
        sql`${productPublications.mediaApprovedAt} IS NOT NULL`,
        sql`${productPublications.mediaApprovalReference} IS NOT NULL`,
        sql`${productMedia.approvedAt} IS NOT NULL`,
        sql`${productMedia.approvalReference} IS NOT NULL`,
        sql`${variantPrices.approvedAt} IS NOT NULL`,
        sql`${variantPrices.approvalReference} IS NOT NULL`,
        sql`${variantPrices.amountMinor} > 0`,
        sql`${productVariants.quantityOnHand} - ${productVariants.qtyReserved} >= ${commerceCartItems.quantity}`,
      ));
    const cartComparison = compareCheckoutCartSet(
      storedLines.map((line) => line.variantId),
      lines.map((line) => line.variantId),
    );
    const presentedCartChanged = checkoutCartSnapshotChanged(
      input.cartLines,
      lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        amountMinor: line.amountMinor,
      })),
    );
    if (cartComparison.changed || presentedCartChanged) {
      const removedVariantIds = cartComparison.removedVariantIds;
      if (removedVariantIds.length > 0) {
        await transaction.delete(commerceCartItems).where(and(
          eq(commerceCartItems.cartId, cart.id),
          inArray(commerceCartItems.variantId, removedVariantIds),
        ));
      }
      return { cartChanged: true as const };
    }

    const subtotalAmountMinor = lines.reduce(
      (sum, line) => sum + line.amountMinor * line.quantity,
      0,
    );
    const freeShipping = subtotalAmountMinor >= freeShippingThresholdMinor;
    const shippingAmountMinor = freeShipping ? 0 : flatShippingAmountMinor;
    const totalAmountMinor = subtotalAmountMinor + shippingAmountMinor;
    if (totalAmountMinor <= 0) throw new Error("Order total must be positive");

    const availableCouriers = [
      serviceability.delhiveryEnabled ? "Delhivery" : null,
      serviceability.indiaPostEnabled ? "India Post" : null,
    ].filter((courier): courier is string => courier !== null);
    const approvedShippingAddress = {
      ...shippingAddress,
      availableCouriers,
      deliveryEstimateBusinessDays: {
        minimum: serviceability.deliveryMinBusinessDays,
        maximum: serviceability.deliveryMaxBusinessDays,
      },
    };

    const [checkout] = await transaction.insert(checkoutSessions).values({
      cartId: cart.id,
      tokenDigest: digest(checkoutToken),
      requestId: input.requestId,
      payloadDigest: requestPayloadDigest,
      pricingVersion: 1,
      email: customer.email,
      shippingAddress: approvedShippingAddress,
      expiresAt: finalizationDeadlineAt,
    }).returning({ id: checkoutSessions.id });
    if (!checkout) throw new Error("Checkout session could not be created");

    const [order] = await transaction.insert(commerceOrders).values({
      orderNumber: createdOrderNumber,
      accessTokenDigest: digest(legacyAccessToken),
      checkoutSessionId: checkout.id,
      customerUserId: customer.userId,
      guestEmail: customer.email,
      subtotalAmountMinor,
      shippingAmountMinor,
      taxAmountMinor: 0,
      discountAmountMinor: 0,
      totalAmountMinor,
      shippingAddressSnapshot: approvedShippingAddress,
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
      idempotencyKey: input.requestId,
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
    return {
      cartChanged: false as const,
      checkoutId: checkout.id,
      orderId: order.id,
      attemptId: attempt.id,
      lines,
      totalAmountMinor,
    };
  });
  if (created.cartChanged) throw new CheckoutCartChangedError();

  const { lines, totalAmountMinor } = created;
  let providerOrderMayExist = false;

  try {
    await reserveCheckoutStock({
      checkoutSessionId: created.checkoutId,
      items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      expiresAt: finalizationDeadlineAt,
    });
    const storefrontUrl = new URL(process.env.STOREFRONT_URL ?? "https://perfumeaura.com");
    // Set this before the network request. A transport failure can occur after
    // Cashfree accepted the idempotent order, so the catch path must treat the
    // provider intent as live until Cashfree itself confirms it is terminal.
    providerOrderMayExist = true;
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
    if (!providerOrder.order_id || !providerOrder.payment_session_id) {
      throw new Error("Cashfree did not return a complete payment session");
    }
    await bindCreatedCashfreePaymentAttempt({
      paymentAttemptId: created.attemptId,
      providerOrderId: providerOrder.order_id,
      providerSessionId: providerOrder.payment_session_id,
      boundAt: new Date(),
    });
    return {
      orderNumber: createdOrderNumber,
      accountOrderPath: orderPath(createdOrderNumber),
      cashfreePaymentSessionId: providerOrder.payment_session_id,
      cashfreeMode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
    };
  } catch (error) {
    let terminalProviderFailure = !providerOrderMayExist;
    if (providerOrderMayExist) {
      try {
        const recovery = await recoverCashfreePaymentBinding({
          paymentAttemptId: created.attemptId,
          createdOrderNumber,
          expectedAmountMinor: totalAmountMinor,
          boundAt: new Date(),
        });
        terminalProviderFailure =
          recovery.kind === "terminal" || recovery.kind === "absent";
        if (recovery.kind === "bound") {
          return {
            orderNumber: createdOrderNumber,
            accountOrderPath: orderPath(createdOrderNumber),
            cashfreePaymentSessionId: recovery.providerSessionId,
            cashfreeMode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
          };
        }
        if (recovery.kind === "pending") {
          console.warn("[checkout] retained uncertain Cashfree intent for reconciliation", {
            orderNumber: createdOrderNumber,
            providerStatus: recovery.providerStatus,
          });
        }
      } catch (providerLookupError) {
        // A provider timeout is not evidence of failure. Keep the exact stock
        // and oil holds until a verified terminal status or the expiry job can
        // safely release them.
        console.warn("[checkout] unable to verify Cashfree intent for cancellation", {
          orderNumber: createdOrderNumber,
          name: providerLookupError instanceof Error ? providerLookupError.name : "UnknownError",
        });
      }
    }

    if (terminalProviderFailure) {
      try {
        await cancelCashfreePaymentAttempt({
          paymentAttemptId: created.attemptId,
          reason: "payment_failed",
          cancelledAt: new Date(),
        });
      } catch (cancellationError) {
        // Do not hide the checkout/provider failure, but make the operational
        // cleanup failure visible for reconciliation. The finalizer routine is
        // atomic and idempotent, so a maintenance retry can safely recover it.
        console.error("[checkout] Cashfree cancellation cleanup failed", {
          name: cancellationError instanceof Error ? cancellationError.name : "UnknownError",
        });
      }
    }
    throw error;
  }
}
