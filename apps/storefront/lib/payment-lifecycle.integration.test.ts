import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
  checkoutSessions,
  commerceCarts,
  commerceSettings,
  commerceOrderEvents,
  commerceOrderItems,
  commerceOrders,
  commerceRefunds,
  db,
  eq,
  locations,
  notificationOutbox,
  paymentAttempts,
  productVariants,
  productPublications,
  products,
  sql,
  stockMovements,
  stockReservations,
  variantPrices,
} from "@perfume-aura/db";
import { finalizeCashfreePayment } from "./payment-finalization";
import { reconcilePendingPayments } from "./payment-reconciliation";
import { reconcilePendingRefunds } from "./refund-reconciliation";
import { drainOrderEmailOutbox } from "./order-email-outbox";

const integrationDatabaseUrl = new URL(process.env.TEST_DATABASE_URL ?? "");
assert.ok(["127.0.0.1", "localhost", "::1"].includes(integrationDatabaseUrl.hostname));
assert.match(integrationDatabaseUrl.pathname, /^\/perfume_aura_[a-z0-9_]+$/);

type SeededPayment = Readonly<{
  attemptId: string;
  checkoutId: string;
  orderId: string;
  providerOrderId: string;
  variantId: string;
}>;

async function seedPayment(input: Readonly<{
  attemptStatus?: "pending" | "succeeded";
  orderStatus?: "pending" | "processing";
  paymentState?: "prepaid_pending" | "paid";
  providerPaymentId?: string;
  withProviderBinding?: boolean;
  withReservation?: boolean;
}> = {}): Promise<SeededPayment> {
  const suffix = randomUUID();
  const [product] = await db.insert(products).values({ name: `Payment test ${suffix}`, slug: `payment-test-${suffix}`, status: "active" }).returning({ id: products.id });
  assert.ok(product);
  const [variant] = await db.insert(productVariants).values({
    productId: product.id, sku: `PAY-${suffix}`, sizeMl: 100,
    costCents: 2_500, retailCents: 5_000, quantityOnHand: 10,
    qtyReserved: input.withReservation === false ? 0 : 2, status: "active",
  }).returning({ id: productVariants.id });
  assert.ok(variant);
  if (input.withProviderBinding === false) {
    const approvedAt = new Date();
    await db.insert(productPublications).values({
      productId: product.id,
      publicName: `Payment test ${suffix}`,
      publicSlug: `payment-test-${suffix}`,
      status: "published",
      legalApprovedAt: approvedAt,
      legalApprovalReference: `legal-${suffix}`,
      contentApprovedAt: approvedAt,
      contentApprovalReference: `content-${suffix}`,
      mediaApprovedAt: approvedAt,
      mediaApprovalReference: `media-${suffix}`,
      publishedAt: approvedAt,
    });
    await db.insert(variantPrices).values({
      variantId: variant.id,
      amountMinor: 5_000,
      approvedAt,
      approvalReference: `price-${suffix}`,
      active: true,
    });
    await db.update(commerceSettings).set({
      flatShippingAmountMinor: 500,
      freeShippingThresholdMinor: 10_000,
      taxTreatment: "prices_include_approved_tax",
      taxPolicyApproved: true,
      taxApprovalReference: `tax-${suffix}`,
      catalogLegalApproved: true,
      legalApprovalReference: `catalog-${suffix}`,
      supportChannel: "email",
      supportOperationsApproved: true,
      shippingPolicyApproved: true,
      returnsPolicyApproved: true,
      cancellationPolicyApproved: true,
      checkoutEnabled: true,
    }).where(eq(commerceSettings.id, "primary"));
  }
  const [cart] = await db.insert(commerceCarts).values({ tokenDigest: `payment-cart-${suffix}`, expiresAt: new Date(Date.now() + 3_600_000) }).returning({ id: commerceCarts.id });
  assert.ok(cart);
  const [checkout] = await db.insert(checkoutSessions).values({
    cartId: cart.id, tokenDigest: `payment-checkout-${suffix}`,
    requestId: randomUUID(), payloadDigest: `payload-${suffix}`,
    status: input.withProviderBinding === false ? "open" : "payment_pending",
    expiresAt: new Date(Date.now() + 2_400_000),
  }).returning({ id: checkoutSessions.id });
  assert.ok(checkout);
  const orderNumber = `PA-PAY-${suffix}`;
  const [order] = await db.insert(commerceOrders).values({
    orderNumber, accessTokenDigest: `payment-access-${suffix}`,
    checkoutSessionId: checkout.id, guestEmail: "payment-test@example.invalid",
    status: input.orderStatus ?? "pending",
    paymentState: input.withProviderBinding === false
      ? "unpaid"
      : (input.paymentState ?? "prepaid_pending"),
    subtotalAmountMinor: 10_000, totalAmountMinor: 10_000,
    shippingAddressSnapshot: { postalCode: "400001" },
  }).returning({ id: commerceOrders.id });
  assert.ok(order);
  await db.insert(commerceOrderItems).values({
    orderId: order.id,
    variantId: variant.id,
    productNameSnapshot: `Payment test ${suffix}`,
    skuSnapshot: `PAY-${suffix}`,
    sizeMlSnapshot: 100,
    unitPriceAmountMinor: 5_000,
    quantity: 2,
    lineTotalAmountMinor: 10_000,
  });
  const providerOrderId = orderNumber;
  const [attempt] = await db.insert(paymentAttempts).values({
    orderId: order.id,
    provider: "cashfree",
    status: input.withProviderBinding === false ? "created" : (input.attemptStatus ?? "pending"),
    providerOrderId: input.withProviderBinding === false ? null : providerOrderId,
    providerSessionId: input.withProviderBinding === false ? null : `session-${suffix}`,
    providerPaymentId: input.providerPaymentId,
    idempotencyKey: randomUUID(), amountMinor: 10_000,
    verifiedAt: input.attemptStatus === "succeeded" ? new Date() : null,
  }).returning({ id: paymentAttempts.id });
  assert.ok(attempt);
  if (input.withReservation !== false) {
    await db.insert(stockReservations).values({
      checkoutSessionId: checkout.id, variantId: variant.id, quantity: 2,
      expiresAt: new Date(Date.now() + 2_400_000),
    });
  }
  await db.insert(locations).values({ code: "MAIN", name: "Main" }).onConflictDoNothing();
  const { receiveOilLot } = await import("@perfume-aura/db");
  const oilLot = await receiveOilLot({
    productId: product.id,
    kgBottles: 1,
    idempotencyKey: `oil-pay-${suffix}`,
  });
  if (input.withReservation !== false) {
    // A payment-pending fixture must model the exact pre-provider oil hold
    // created by reserve_storefront_checkout_stock: two 100 ml bottles use
    // 100 ml concentrate, not a later aggregate oil balance.
    await db.execute(sql`
      UPDATE public.oil_lots
      SET reserved_quantity_ml = 100
      WHERE id = ${oilLot.lotId}::uuid
    `);
    await db.execute(sql`
      INSERT INTO public.oil_reservations (
        checkout_session_id, lot_id, product_id, quantity_ml, expires_at
      )
      VALUES (
        ${checkout.id}::uuid,
        ${oilLot.lotId}::uuid,
        ${product.id}::uuid,
        100,
        now() + interval '40 minutes'
      )
    `);
  }
  return { attemptId: attempt.id, checkoutId: checkout.id, orderId: order.id, providerOrderId, variantId: variant.id };
}

function paidOrder(orderId: string) {
  return { cf_order_id: `cf-${orderId}`, order_id: orderId, order_currency: "INR", order_amount: 100, order_status: "PAID" };
}

function capturedPayment(orderId: string, paymentId: string) {
  return {
    cf_payment_id: paymentId, order_id: orderId, entity: "payment", is_captured: true,
    order_amount: 100, order_currency: "INR", payment_group: "upi",
    payment_amount: 100, payment_currency: "INR", payment_status: "SUCCESS",
  };
}

describe("Cashfree payment and refund lifecycle", () => {
  const originalFetch = globalThis.fetch;

  before(() => {
    process.env.CASHFREE_ENV = "sandbox";
    process.env.CASHFREE_CLIENT_ID = "integration-client";
    process.env.CASHFREE_CLIENT_SECRET = "integration-secret";
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.CASHFREE_ENV;
    delete process.env.CASHFREE_CLIENT_ID;
    delete process.env.CASHFREE_CLIENT_SECRET;
  });

  it("finalizes concurrent success once without regressing fulfillment", async () => {
    await db.update(notificationOutbox).set({ status: "sent", sentAt: new Date() });
    const seeded = await seedPayment({ orderStatus: "processing" });
    const paymentId = `payment-${randomUUID()}`;
    globalThis.fetch = async (request) => {
      const url = String(request);
      const payload = url.endsWith(`/payments/${paymentId}`)
        ? capturedPayment(seeded.providerOrderId, paymentId)
        : paidOrder(seeded.providerOrderId);
      return Response.json(payload);
    };
    const results = await Promise.all([
      finalizeCashfreePayment({ paymentAttemptId: seeded.attemptId, paymentId }),
      finalizeCashfreePayment({ paymentAttemptId: seeded.attemptId, paymentId }),
    ]);
    assert.equal(results.filter((result) => result.paid).length, 1);
    const [order] = await db.select({ status: commerceOrders.status, paymentState: commerceOrders.paymentState })
      .from(commerceOrders).where(eq(commerceOrders.id, seeded.orderId));
    assert.deepEqual(order, { status: "processing", paymentState: "paid" });
    const [variant] = await db.select({ quantityOnHand: productVariants.quantityOnHand, qtyReserved: productVariants.qtyReserved })
      .from(productVariants).where(eq(productVariants.id, seeded.variantId));
    assert.deepEqual(variant, { quantityOnHand: 8, qtyReserved: 0 });
    const movements = await db.select({ id: stockMovements.id }).from(stockMovements)
      .where(eq(stockMovements.refId, seeded.orderId));
    assert.equal(movements.length, 1);
    const events = await db.select({ id: commerceOrderEvents.id }).from(commerceOrderEvents)
      .where(eq(commerceOrderEvents.orderId, seeded.orderId));
    assert.equal(events.length, 1);
    const expiredLeaseNow = new Date("2026-08-20T13:00:00.000Z");
    await db.update(notificationOutbox).set({
      status: "processing",
      nextAttemptAt: expiredLeaseNow,
      leaseExpiresAt: new Date(expiredLeaseNow.getTime() - 1_000),
    }).where(eq(notificationOutbox.orderEventId, events[0]!.id));
    const delivered: string[] = [];
    const emailResult = await drainOrderEmailOutbox({
      now: expiredLeaseNow,
      sendImplementation: async (message) => { delivered.push(message.orderNumber); },
    });
    assert.deepEqual(emailResult, { sent: 1, failed: 0 });
    assert.equal(delivered.length, 1);
    await assert.rejects(
      () => finalizeCashfreePayment({ paymentAttemptId: seeded.attemptId, paymentId: `different-${paymentId}` }),
      /already bound to another payment/,
    );
  });

  it("does not let a stale order-email worker overwrite a newer claim", async () => {
    const seeded = await seedPayment({ withReservation: false });
    const [event] = await db.insert(commerceOrderEvents).values({
      orderId: seeded.orderId,
      eventType: "payment_confirmed",
      toStatus: "confirmed",
      idempotencyKey: `lease-fence-${randomUUID()}`,
    }).returning({ id: commerceOrderEvents.id });
    assert.ok(event);
    const [outbox] = await db.insert(notificationOutbox).values({
      orderEventId: event.id,
      kind: "order_confirmed",
      nextAttemptAt: new Date("2026-08-20T12:00:00.000Z"),
    }).returning({ id: notificationOutbox.id });
    assert.ok(outbox);
    const now = new Date("2026-08-20T12:15:00.000Z");

    const result = await drainOrderEmailOutbox({
      now,
      sendImplementation: async () => {
        await db.update(notificationOutbox).set({
          status: "processing",
          attemptCount: sql`${notificationOutbox.attemptCount} + 1`,
          leaseExpiresAt: new Date(now.getTime() + 4 * 60 * 1_000),
        }).where(eq(notificationOutbox.id, outbox.id));
      },
    });
    assert.deepEqual(result, { sent: 0, failed: 0 });
    const [stored] = await db.select({
      attemptCount: notificationOutbox.attemptCount,
      status: notificationOutbox.status,
    }).from(notificationOutbox).where(eq(notificationOutbox.id, outbox.id));
    assert.deepEqual(stored, { attemptCount: 2, status: "processing" });
  });

  it("isolates a failed provider lookup so a later payment still reconciles", async () => {
    await db.update(paymentAttempts).set({ nextReconcileAt: new Date("2099-01-01T00:00:00.000Z") });
    const failed = await seedPayment({ withReservation: false });
    const succeeded = await seedPayment();
    const paymentId = `payment-${randomUUID()}`;
    globalThis.fetch = async (request) => {
      const url = String(request);
      if (url.includes(encodeURIComponent(failed.providerOrderId))) throw new Error("simulated provider outage");
      if (url.endsWith(`/orders/${encodeURIComponent(succeeded.providerOrderId)}/payments`)) {
        return Response.json([capturedPayment(succeeded.providerOrderId, paymentId)]);
      }
      if (url.endsWith(`/payments/${paymentId}`)) return Response.json(capturedPayment(succeeded.providerOrderId, paymentId));
      return Response.json(paidOrder(succeeded.providerOrderId));
    };
    const result = await reconcilePendingPayments({ now: new Date(), limit: 10 });
    assert.deepEqual(result, { processed: 2, succeeded: 1, retried: 1, mismatched: 0, failed: 1 });
    const [failedAttempt] = await db.select({ code: paymentAttempts.lastReconciliationErrorCode, count: paymentAttempts.reconciliationAttemptCount })
      .from(paymentAttempts).where(eq(paymentAttempts.id, failed.attemptId));
    assert.deepEqual(failedAttempt, { code: "provider_lookup_failed", count: 1 });
  });

  it("recovers an accepted Cashfree order whose local binding failed", async () => {
    await db.update(paymentAttempts).set({ nextReconcileAt: new Date("2099-01-01T00:00:00.000Z") });
    const seeded = await seedPayment({ withProviderBinding: false });
    const paymentId = `payment-${randomUUID()}`;
    globalThis.fetch = async (request) => {
      const url = String(request);
      if (url.endsWith(`/orders/${encodeURIComponent(seeded.providerOrderId)}/payments`)) {
        return Response.json([capturedPayment(seeded.providerOrderId, paymentId)]);
      }
      if (url.endsWith(`/payments/${paymentId}`)) {
        return Response.json(capturedPayment(seeded.providerOrderId, paymentId));
      }
      return Response.json({
        ...paidOrder(seeded.providerOrderId),
        payment_session_id: `session-${seeded.providerOrderId}`,
      });
    };

    const result = await reconcilePendingPayments({ now: new Date(), limit: 10 });
    assert.deepEqual(result, {
      processed: 1,
      succeeded: 1,
      retried: 0,
      mismatched: 0,
      failed: 0,
    });
    const [attempt] = await db.select({
      status: paymentAttempts.status,
      providerOrderId: paymentAttempts.providerOrderId,
      providerSessionId: paymentAttempts.providerSessionId,
    }).from(paymentAttempts).where(eq(paymentAttempts.id, seeded.attemptId));
    assert.deepEqual(attempt, {
      status: "succeeded",
      providerOrderId: seeded.providerOrderId,
      providerSessionId: `session-${seeded.providerOrderId}`,
    });
  });

  it("binds every refund identity and isolates a mismatch", async () => {
    await db.update(commerceRefunds).set({ nextReconcileAt: new Date("2099-01-01T00:00:00.000Z") });
    const successfulPaymentId = `captured-${randomUUID()}`;
    const mismatchedPaymentId = `captured-${randomUUID()}`;
    const successful = await seedPayment({ attemptStatus: "succeeded", paymentState: "paid", providerPaymentId: successfulPaymentId, withReservation: false });
    const mismatched = await seedPayment({ attemptStatus: "succeeded", paymentState: "paid", providerPaymentId: mismatchedPaymentId, withReservation: false });
    const successKey = randomUUID();
    const mismatchKey = randomUUID();
    const [successRefund] = await db.insert(commerceRefunds).values({
      paymentAttemptId: successful.attemptId, idempotencyKey: successKey,
      status: "processing", amountMinor: 4_000, reason: "Approved partial refund",
    }).returning({ id: commerceRefunds.id });
    const [mismatchRefund] = await db.insert(commerceRefunds).values({
      paymentAttemptId: mismatched.attemptId, idempotencyKey: mismatchKey,
      status: "processing", amountMinor: 3_000, reason: "Approved partial refund",
    }).returning({ id: commerceRefunds.id });
    assert.ok(successRefund && mismatchRefund);
    globalThis.fetch = async (request) => {
      const url = String(request);
      const isMismatch = url.includes(`refund-${mismatchKey}`);
      return Response.json({
        cf_payment_id: isMismatch ? mismatchedPaymentId : successfulPaymentId,
        cf_refund_id: isMismatch ? `cf-refund-${mismatchKey}` : `cf-refund-${successKey}`,
        refund_id: isMismatch ? `refund-${mismatchKey}` : `refund-${successKey}`,
        order_id: isMismatch ? "wrong-provider-order" : successful.providerOrderId,
        entity: "refund",
        refund_amount: isMismatch ? 30 : 40,
        refund_currency: "INR",
        refund_note: "Approved refund",
        refund_status: "SUCCESS",
        refund_arn: "test-arn",
      });
    };
    const result = await reconcilePendingRefunds({ now: new Date(), limit: 10 });
    assert.deepEqual(result, { processed: 2, succeeded: 1, retried: 1, mismatched: 1, failed: 0 });
    const [completed] = await db.select({ status: commerceRefunds.status, providerRefundId: commerceRefunds.providerRefundId })
      .from(commerceRefunds).where(eq(commerceRefunds.id, successRefund.id));
    assert.equal(completed?.status, "succeeded");
    assert.equal(completed?.providerRefundId, `cf-refund-${successKey}`);
    const [rejected] = await db.select({ status: commerceRefunds.status, code: commerceRefunds.lastReconciliationErrorCode })
      .from(commerceRefunds).where(eq(commerceRefunds.id, mismatchRefund.id));
    assert.deepEqual(rejected, { status: "processing", code: "provider_identity_mismatch" });
    const [order] = await db.select({ paymentState: commerceOrders.paymentState }).from(commerceOrders)
      .where(eq(commerceOrders.id, successful.orderId));
    assert.equal(order?.paymentState, "partially_refunded");
  });
});
