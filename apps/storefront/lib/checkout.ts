import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  and,
  checkoutSessions,
  commerceCartItems,
  commerceCarts,
  commerceOrderItems,
  commerceOrders,
  commerceSettings,
  consumeCheckoutReservations,
  db,
  eq,
  paymentAttempts,
  productPublications,
  products,
  productVariants,
  releaseCheckoutReservations,
  reserveCheckoutStock,
  shipments,
  sql,
  variantPrices,
} from "@perfume-aura/db";
import { createCashfreeOrder } from "./cashfree";

const checkoutInputSchema = z.object({
  requestId: z.string().uuid(),
  email: z.string().trim().email().max(320),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid six-digit Indian PIN code"),
  paymentMethod: z.enum(["cashfree", "cod"]),
});

type CheckoutResult = Readonly<{
  orderToken: string;
  orderNumber: string;
  paymentMethod: "cashfree" | "cod";
  cashfreePaymentSessionId?: string;
  cashfreeMode?: "sandbox" | "production";
}>;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function orderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PA-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function placeCheckoutOrder(
  rawInput: unknown,
  cartToken: string,
): Promise<CheckoutResult> {
  const input = checkoutInputSchema.parse(rawInput);
  if (process.env.STOREFRONT_CHECKOUT_RELEASE_APPROVED !== "true") {
    throw new Error("Checkout has not passed the production release gate");
  }
  const [settings] = await db
    .select()
    .from(commerceSettings)
    .where(eq(commerceSettings.id, "primary"))
    .limit(1);
  if (
    !settings?.checkoutEnabled ||
    settings.flatShippingAmountMinor == null ||
    !settings.taxTreatment ||
    !settings.supportChannel ||
    !settings.shippingPolicyApproved ||
    !settings.returnsPolicyApproved ||
    !settings.cancellationPolicyApproved
  ) {
    throw new Error("Checkout policy settings are incomplete");
  }
  if (
    settings.taxTreatment !== "prices_include_approved_tax" &&
    settings.taxTreatment !== "no_tax_collected_owner_approved"
  ) {
    throw new Error("Checkout tax treatment is not a supported approved code");
  }

  const tokenHash = digest(cartToken);
  const [cart] = await db
    .select({ id: commerceCarts.id, status: commerceCarts.status })
    .from(commerceCarts)
    .where(eq(commerceCarts.tokenDigest, tokenHash))
    .limit(1);
  if (!cart || cart.status !== "active") throw new Error("Cart is unavailable");

  const lines = await db
    .select({
      variantId: productVariants.id,
      productName: productPublications.publicName,
      sku: productVariants.sku,
      sizeMl: productVariants.sizeMl,
      quantity: commerceCartItems.quantity,
      amountMinor: variantPrices.amountMinor,
    })
    .from(commerceCartItems)
    .innerJoin(productVariants, eq(productVariants.id, commerceCartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(productPublications, eq(productPublications.productId, products.id))
    .innerJoin(variantPrices, eq(variantPrices.variantId, productVariants.id))
    .where(
      and(
        eq(commerceCartItems.cartId, cart.id),
        eq(products.status, "active"),
        eq(productVariants.status, "active"),
        eq(productPublications.status, "published"),
        eq(variantPrices.active, true),
        eq(variantPrices.currency, "INR"),
        sql`${productPublications.publicName} IS NOT NULL`,
        sql`${productPublications.legalApprovedAt} IS NOT NULL`,
        sql`${productPublications.contentApprovedAt} IS NOT NULL`,
        sql`${productPublications.mediaApprovedAt} IS NOT NULL`,
        sql`${variantPrices.approvedAt} IS NOT NULL`,
        sql`${variantPrices.amountMinor} > 0`,
      ),
    );
  if (lines.length === 0) throw new Error("Cart has no approved products");

  const subtotalAmountMinor = lines.reduce(
    (sum, line) => sum + line.amountMinor * line.quantity,
    0,
  );
  const freeShipping =
    settings.freeShippingThresholdMinor != null &&
    subtotalAmountMinor >= settings.freeShippingThresholdMinor;
  const shippingAmountMinor = freeShipping ? 0 : settings.flatShippingAmountMinor;
  const taxAmountMinor = 0;
  const totalAmountMinor = subtotalAmountMinor + shippingAmountMinor + taxAmountMinor;
  if (totalAmountMinor <= 0) throw new Error("Order total must be positive");

  const checkoutToken = randomBytes(32).toString("base64url");
  const orderToken = randomBytes(32).toString("base64url");
  const checkoutExpiresAt = new Date(Date.now() + 15 * 60 * 1_000);
  const createdCheckout = await db.transaction(async (transaction) => {
    const [lockedCart] = await transaction
      .select({ id: commerceCarts.id, status: commerceCarts.status })
      .from(commerceCarts)
      .where(eq(commerceCarts.id, cart.id))
      .for("update")
      .limit(1);
    if (!lockedCart || lockedCart.status !== "active") {
      throw new Error("Cart is already being checked out");
    }
    const [checkout] = await transaction
      .insert(checkoutSessions)
      .values({
        cartId: cart.id,
        tokenDigest: digest(checkoutToken),
        status: "open",
        pricingVersion: 1,
        email: input.email.toLowerCase(),
        shippingAddress: {
          name: input.name,
          phone: input.phone,
          address: input.address,
          city: input.city,
          postalCode: input.postalCode,
          country: "IN",
        },
        expiresAt: checkoutExpiresAt,
      })
      .returning({ id: checkoutSessions.id });
    if (!checkout) throw new Error("Checkout session could not be created");
    await transaction
      .update(commerceCarts)
      .set({ status: "converted", updatedAt: new Date() })
      .where(eq(commerceCarts.id, cart.id));
    return checkout;
  });

  try {
    await reserveCheckoutStock({
      checkoutSessionId: createdCheckout.id,
      items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      expiresAt: checkoutExpiresAt,
    });
  } catch (error) {
    await db.transaction(async (transaction) => {
      await transaction.update(checkoutSessions).set({ status: "cancelled" }).where(eq(checkoutSessions.id, createdCheckout.id));
      await transaction.update(commerceCarts).set({ status: "active" }).where(eq(commerceCarts.id, cart.id));
    });
    throw error;
  }

  const createdOrderNumber = orderNumber();
  let order: { id: string };
  try {
    order = await db.transaction(async (transaction) => {
      const [insertedOrder] = await transaction
        .insert(commerceOrders)
        .values({
          orderNumber: createdOrderNumber,
          accessTokenDigest: digest(orderToken),
          checkoutSessionId: createdCheckout.id,
          guestEmail: input.email.toLowerCase(),
          status: "pending",
          paymentState: input.paymentMethod === "cod" ? "cod_due" : "prepaid_pending",
          currency: "INR",
          subtotalAmountMinor,
          shippingAmountMinor,
          taxAmountMinor,
          discountAmountMinor: 0,
          totalAmountMinor,
          shippingAddressSnapshot: {
            name: input.name,
            phone: input.phone,
            address: input.address,
            city: input.city,
            postalCode: input.postalCode,
            country: "IN",
            taxTreatment: settings.taxTreatment,
          },
        })
        .returning({ id: commerceOrders.id });
      if (!insertedOrder) throw new Error("Order could not be created");
      await transaction.insert(commerceOrderItems).values(
        lines.map((line) => ({
          orderId: insertedOrder.id,
          variantId: line.variantId,
          productNameSnapshot: line.productName ?? "Approved product",
          skuSnapshot: line.sku,
          sizeMlSnapshot: line.sizeMl,
          unitPriceAmountMinor: line.amountMinor,
          quantity: line.quantity,
          lineTotalAmountMinor: line.amountMinor * line.quantity,
        })),
      );
      return insertedOrder;
    });
  } catch (error) {
    await releaseCheckoutReservations({
      checkoutSessionId: createdCheckout.id,
      reason: "cancelled",
    });
    await db.transaction(async (transaction) => {
      await transaction.update(checkoutSessions).set({ status: "cancelled" }).where(eq(checkoutSessions.id, createdCheckout.id));
      await transaction.update(commerceCarts).set({ status: "active" }).where(eq(commerceCarts.id, cart.id));
    });
    throw error;
  }

  if (input.paymentMethod === "cod") {
    await db.insert(paymentAttempts).values({
      orderId: order.id,
      provider: "cod",
      status: "pending",
      idempotencyKey: input.requestId,
      currency: "INR",
      amountMinor: totalAmountMinor,
    });
    await db.insert(shipments).values({
      orderId: order.id,
      status: "pending",
      codAmountMinor: totalAmountMinor,
    });
    await consumeCheckoutReservations({ checkoutSessionId: createdCheckout.id, orderId: order.id });
    await db.transaction(async (transaction) => {
      await transaction.update(commerceOrders).set({ status: "confirmed" }).where(eq(commerceOrders.id, order.id));
      await transaction.update(checkoutSessions).set({ status: "completed", completedAt: new Date() }).where(eq(checkoutSessions.id, createdCheckout.id));
    });
    return { orderToken, orderNumber: createdOrderNumber, paymentMethod: "cod" };
  }

  const [attempt] = await db
    .insert(paymentAttempts)
    .values({
      orderId: order.id,
      provider: "cashfree",
      status: "created",
      idempotencyKey: input.requestId,
      currency: "INR",
      amountMinor: totalAmountMinor,
    })
    .returning({ id: paymentAttempts.id });
  if (!attempt) throw new Error("Payment attempt could not be created");

  try {
    const storefrontUrl = new URL(process.env.STOREFRONT_URL ?? "https://shop.perfumeaura.com");
    const cashfreeOrder = await createCashfreeOrder({
      orderId: createdOrderNumber,
      amountMinor: totalAmountMinor,
      idempotencyKey: input.requestId,
      customer: {
        id: `guest-${digest(input.email).slice(0, 24)}`,
        name: input.name,
        email: input.email,
        phone: input.phone,
      },
      returnUrl: new URL(`/order/${orderToken}`, storefrontUrl).toString(),
      notifyUrl: new URL("/api/payments/cashfree/webhook", storefrontUrl).toString(),
    });
    if (!cashfreeOrder.payment_session_id) throw new Error("Cashfree did not return a payment session");
    await db.transaction(async (transaction) => {
      await transaction.update(paymentAttempts).set({ status: "pending", providerOrderId: cashfreeOrder.order_id }).where(eq(paymentAttempts.id, attempt.id));
      await transaction.update(checkoutSessions).set({ status: "payment_pending" }).where(eq(checkoutSessions.id, createdCheckout.id));
    });
    return {
      orderToken,
      orderNumber: createdOrderNumber,
      paymentMethod: "cashfree",
      cashfreePaymentSessionId: cashfreeOrder.payment_session_id,
      cashfreeMode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
    };
  } catch (error) {
    await releaseCheckoutReservations({ checkoutSessionId: createdCheckout.id, reason: "payment_failed" });
    await db.transaction(async (transaction) => {
      await transaction.update(paymentAttempts).set({ status: "failed" }).where(eq(paymentAttempts.id, attempt.id));
      await transaction.update(commerceOrders).set({ status: "cancelled", paymentState: "failed", cancelledAt: new Date() }).where(eq(commerceOrders.id, order.id));
      await transaction.update(checkoutSessions).set({ status: "cancelled" }).where(eq(checkoutSessions.id, createdCheckout.id));
      await transaction.update(commerceCarts).set({ status: "active" }).where(eq(commerceCarts.id, cart.id));
    });
    throw error;
  }
}
