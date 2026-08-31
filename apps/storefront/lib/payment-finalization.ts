import {
  commerceOrders,
  db,
  eq,
  paymentAttempts,
} from "@perfume-aura/db";
import { verifyCashfreePaymentSucceeded } from "./cashfree";
import { finalizeVerifiedCashfreePayment } from "./payment-finalizer-client";

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
  const finalized = await finalizeVerifiedCashfreePayment({
    paymentAttemptId: payment.attemptId,
    orderId: payment.orderId,
    providerOrderId: payment.providerOrderId,
    expectedAmountMinor: payment.amountMinor,
    paymentId: input.paymentId,
    finalizedAt: new Date(),
  });
  return { paid: finalized.newlyFinalized, orderId: finalized.orderId };
}
