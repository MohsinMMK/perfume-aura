import {
  and,
  commerceOrders,
  db,
  eq,
  paymentAttempts,
} from "@perfume-aura/db";
import { cashfreeMajorToAmountMinor, listCashfreePayments } from "./cashfree";
import { finalizeCashfreePayment } from "./payment-finalization";

export async function reconcileCustomerOrderPayment(
  userId: string,
  orderNumber: string,
): Promise<void> {
  const [attempt] = await db.select({
    id: paymentAttempts.id,
    status: paymentAttempts.status,
    providerOrderId: paymentAttempts.providerOrderId,
    amountMinor: paymentAttempts.amountMinor,
  }).from(paymentAttempts)
    .innerJoin(commerceOrders, and(
      eq(commerceOrders.id, paymentAttempts.orderId),
      eq(commerceOrders.customerUserId, userId),
      eq(commerceOrders.orderNumber, orderNumber),
    ))
    .where(eq(paymentAttempts.provider, "cashfree"))
    .limit(1);
  if (!attempt?.providerOrderId || attempt.status === "succeeded") return;
  const payments = await listCashfreePayments(attempt.providerOrderId);
  const successful = payments.find((payment) =>
    payment.payment_status === "SUCCESS" &&
    payment.is_captured &&
    payment.payment_currency === "INR" &&
    cashfreeMajorToAmountMinor(payment.payment_amount) === attempt.amountMinor,
  );
  if (!successful) return;
  await finalizeCashfreePayment({ paymentAttemptId: attempt.id, paymentId: successful.cf_payment_id });
}
