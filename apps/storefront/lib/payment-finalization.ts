import {
  checkoutSessions,
  commerceOrderEvents,
  commerceOrders,
  consumeCheckoutReservations,
  db,
  eq,
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
    amountMinor: paymentAttempts.amountMinor,
    orderId: commerceOrders.id,
    checkoutSessionId: commerceOrders.checkoutSessionId,
  }).from(paymentAttempts)
    .innerJoin(commerceOrders, eq(commerceOrders.id, paymentAttempts.orderId))
    .where(eq(paymentAttempts.id, input.paymentAttemptId)).limit(1);
  if (!payment?.providerOrderId) throw new Error("Cashfree payment attempt was not found");
  if (payment.attemptStatus === "succeeded") return { paid: false, orderId: payment.orderId };
  await verifyCashfreePaymentSucceeded({
    orderId: payment.providerOrderId,
    paymentId: input.paymentId,
    expectedAmountMinor: payment.amountMinor,
  });
  await consumeCheckoutReservations({
    checkoutSessionId: payment.checkoutSessionId,
    orderId: payment.orderId,
  });
  await db.transaction(async (transaction) => {
    const [locked] = await transaction.select({ status: paymentAttempts.status })
      .from(paymentAttempts).where(eq(paymentAttempts.id, payment.attemptId))
      .for("update").limit(1);
    if (locked?.status === "succeeded") return;
    await transaction.update(paymentAttempts).set({
      status: "succeeded",
      providerPaymentId: input.paymentId,
      verifiedAt: new Date(),
      lastReconciledAt: new Date(),
    }).where(eq(paymentAttempts.id, payment.attemptId));
    await transaction.update(commerceOrders).set({ paymentState: "paid", status: "confirmed", updatedAt: new Date() })
      .where(eq(commerceOrders.id, payment.orderId));
    await transaction.update(checkoutSessions).set({ status: "completed", completedAt: new Date() })
      .where(eq(checkoutSessions.id, payment.checkoutSessionId));
    const [confirmedEvent] = await transaction.insert(commerceOrderEvents).values({
      orderId: payment.orderId,
      eventType: "payment_confirmed",
      fromStatus: "pending",
      toStatus: "confirmed",
      idempotencyKey: `payment-confirmed:${payment.attemptId}`,
    }).onConflictDoNothing().returning({ id: commerceOrderEvents.id });
    if (confirmedEvent) {
      await transaction.insert(notificationOutbox).values({
        orderEventId: confirmedEvent.id,
        kind: "order_confirmed",
      }).onConflictDoNothing();
    }
  });
  return { paid: true, orderId: payment.orderId };
}
