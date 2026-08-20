import {
  and,
  commerceOrders,
  db,
  eq,
  inArray,
  lte,
  or,
  paymentAttempts,
  sql,
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
    customerReconciledAt: paymentAttempts.customerReconciledAt,
  }).from(paymentAttempts)
    .innerJoin(commerceOrders, and(
      eq(commerceOrders.id, paymentAttempts.orderId),
      eq(commerceOrders.customerUserId, userId),
      eq(commerceOrders.orderNumber, orderNumber),
    ))
    .where(eq(paymentAttempts.provider, "cashfree"))
    .limit(1);
  if (
    !attempt?.providerOrderId ||
    attempt.status === "succeeded" ||
    attempt.customerReconciledAt
  ) return;

  const claimedAt = new Date();
  const leaseUntil = new Date(claimedAt.getTime() + 30_000);
  const [claim] = await db.update(paymentAttempts).set({
    customerReconcileLeaseUntil: leaseUntil,
    updatedAt: claimedAt,
  }).where(and(
    eq(paymentAttempts.id, attempt.id),
    inArray(paymentAttempts.status, ["created", "pending"]),
    sql`${paymentAttempts.customerReconciledAt} IS NULL`,
    or(
      sql`${paymentAttempts.customerReconcileLeaseUntil} IS NULL`,
      lte(paymentAttempts.customerReconcileLeaseUntil, claimedAt),
    ),
  )).returning({ id: paymentAttempts.id });
  if (!claim) return;

  try {
    const payments = await listCashfreePayments(attempt.providerOrderId);
    const successful = payments.find((payment) =>
      payment.payment_status === "SUCCESS" &&
      payment.is_captured &&
      payment.payment_currency === "INR" &&
      cashfreeMajorToAmountMinor(payment.payment_amount) === attempt.amountMinor,
    );
    if (!successful) return;
    await finalizeCashfreePayment({
      paymentAttemptId: attempt.id,
      paymentId: successful.cf_payment_id,
    });
  } finally {
    const completedAt = new Date();
    await db.update(paymentAttempts).set({
      customerReconciledAt: completedAt,
      customerReconcileLeaseUntil: null,
      updatedAt: completedAt,
    }).where(and(
      eq(paymentAttempts.id, attempt.id),
      eq(paymentAttempts.customerReconcileLeaseUntil, leaseUntil),
      sql`${paymentAttempts.customerReconciledAt} IS NULL`,
    ));
  }
}
