import {
  and,
  checkoutSessions,
  commerceOrderEvents,
  commerceOrders,
  consumeCheckoutReservations,
  db,
  eq,
  inArray,
  notificationOutbox,
  paymentAttempts,
} from "@perfume-aura/db";
import { verifyCashfreePaymentSucceeded } from "./cashfree";

export async function finalizeCashfreePayment(input: Readonly<{
  paymentAttemptId: string;
  paymentId: string;
}>): Promise<Readonly<{ paid: boolean; orderId: string }>> {
  const [payment] = await db.select({
    attemptId: paymentAttempts.id,
    attemptStatus: paymentAttempts.status,
    providerOrderId: paymentAttempts.providerOrderId,
    providerPaymentId: paymentAttempts.providerPaymentId,
    amountMinor: paymentAttempts.amountMinor,
    orderId: commerceOrders.id,
    checkoutSessionId: commerceOrders.checkoutSessionId,
  }).from(paymentAttempts)
    .innerJoin(commerceOrders, eq(commerceOrders.id, paymentAttempts.orderId))
    .where(eq(paymentAttempts.id, input.paymentAttemptId)).limit(1);
  if (!payment?.providerOrderId) throw new Error("Cashfree payment attempt was not found");
  if (payment.attemptStatus === "succeeded") {
    if (payment.providerPaymentId !== input.paymentId) {
      throw new Error("Cashfree payment attempt is already bound to another payment");
    }
    return { paid: false, orderId: payment.orderId };
  }
  await verifyCashfreePaymentSucceeded({
    orderId: payment.providerOrderId,
    paymentId: input.paymentId,
    expectedAmountMinor: payment.amountMinor,
  });
  await consumeCheckoutReservations({
    checkoutSessionId: payment.checkoutSessionId,
    orderId: payment.orderId,
  });
  let newlyFinalized = false;
  await db.transaction(async (transaction) => {
    const [locked] = await transaction.select({
      status: paymentAttempts.status,
      providerPaymentId: paymentAttempts.providerPaymentId,
    })
      .from(paymentAttempts).where(eq(paymentAttempts.id, payment.attemptId))
      .for("update").limit(1);
    if (!locked) throw new Error("Cashfree payment attempt disappeared during finalization");
    if (locked.status === "succeeded") {
      if (locked.providerPaymentId !== input.paymentId) {
        throw new Error("Cashfree payment attempt is already bound to another payment");
      }
      return;
    }
    const [lockedOrder] = await transaction.select({
      status: commerceOrders.status,
      paymentState: commerceOrders.paymentState,
    }).from(commerceOrders).where(eq(commerceOrders.id, payment.orderId))
      .for("update").limit(1);
    if (!lockedOrder) throw new Error("Cashfree payment order disappeared during finalization");
    const nextOrderStatus = lockedOrder.status === "pending"
      ? "confirmed"
      : lockedOrder.status;
    const nextPaymentState = lockedOrder.paymentState === "partially_refunded" ||
      lockedOrder.paymentState === "refunded"
      ? lockedOrder.paymentState
      : "paid";
    const finalizedAt = new Date();
    await transaction.update(paymentAttempts).set({
      status: "succeeded",
      providerPaymentId: input.paymentId,
      verifiedAt: finalizedAt,
      lastReconciledAt: finalizedAt,
      reconciliationAttemptCount: 0,
      nextReconcileAt: null,
      lastReconciliationErrorCode: null,
    }).where(eq(paymentAttempts.id, payment.attemptId));
    newlyFinalized = true;
    await transaction.update(commerceOrders).set({
      paymentState: nextPaymentState,
      status: nextOrderStatus,
      updatedAt: finalizedAt,
    })
      .where(eq(commerceOrders.id, payment.orderId));
    await transaction.update(checkoutSessions).set({
      status: "completed",
      completedAt: finalizedAt,
    }).where(and(
      eq(checkoutSessions.id, payment.checkoutSessionId),
      inArray(checkoutSessions.status, ["open", "payment_pending"]),
    ));
    const [confirmedEvent] = await transaction.insert(commerceOrderEvents).values({
      orderId: payment.orderId,
      eventType: "payment_confirmed",
      fromStatus: lockedOrder.status,
      toStatus: nextOrderStatus,
      idempotencyKey: `payment-confirmed:${payment.attemptId}`,
    }).onConflictDoNothing().returning({ id: commerceOrderEvents.id });
    if (confirmedEvent && nextOrderStatus !== "cancelled" && nextOrderStatus !== "returned") {
      await transaction.insert(notificationOutbox).values({
        orderEventId: confirmedEvent.id,
        kind: "order_confirmed",
      }).onConflictDoNothing();
    }
  });
  return { paid: newlyFinalized, orderId: payment.orderId };
}
