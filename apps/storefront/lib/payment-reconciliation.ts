import { and, db, eq, inArray, lte, or, paymentAttempts, sql } from "@perfume-aura/db";
import { cashfreeMajorToAmountMinor, listCashfreePayments } from "./cashfree";
import { finalizeCashfreePayment } from "./payment-finalization";

export async function reconcilePendingPayments(input: Readonly<{
  now?: Date;
  limit?: number;
}> = {}): Promise<Readonly<{ reconciled: number; pending: number }>> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Payment reconciliation batch limit must be from 1 to 100");
  }
  const retryBefore = new Date(now.getTime() - 60_000);
  const candidates = await db.select({
    id: paymentAttempts.id,
    providerOrderId: paymentAttempts.providerOrderId,
    amountMinor: paymentAttempts.amountMinor,
  }).from(paymentAttempts).where(and(
    eq(paymentAttempts.provider, "cashfree"),
    inArray(paymentAttempts.status, ["created", "pending"]),
    or(
      sql`${paymentAttempts.lastReconciledAt} IS NULL`,
      lte(paymentAttempts.lastReconciledAt, retryBefore),
    ),
  )).orderBy(paymentAttempts.createdAt).limit(limit);
  let reconciled = 0;
  let pending = 0;
  for (const candidate of candidates) {
    if (!candidate.providerOrderId) {
      pending += 1;
      continue;
    }
    const payments = await listCashfreePayments(candidate.providerOrderId);
    const successful = payments.find((payment) =>
      payment.payment_status === "SUCCESS" && payment.is_captured &&
      cashfreeMajorToAmountMinor(payment.payment_amount) === candidate.amountMinor,
    );
    if (successful) {
      await finalizeCashfreePayment({ paymentAttemptId: candidate.id, paymentId: successful.cf_payment_id });
      reconciled += 1;
    } else {
      await db.update(paymentAttempts).set({ lastReconciledAt: now, updatedAt: now })
        .where(eq(paymentAttempts.id, candidate.id));
      pending += 1;
    }
  }
  return { reconciled, pending };
}
