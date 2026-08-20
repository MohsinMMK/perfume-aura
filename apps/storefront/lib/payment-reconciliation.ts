import { and, db, eq, inArray, lte, or, paymentAttempts, sql } from "@perfume-aura/db";
import { cashfreeMajorToAmountMinor, listCashfreePayments } from "./cashfree";
import { finalizeCashfreePayment } from "./payment-finalization";
import { nextReconciliationSchedule } from "./reconciliation-backoff";

async function deferPaymentReconciliation(input: Readonly<{
  paymentAttemptId: string;
  currentAttemptCount: number;
  errorCode: "missing_provider_order_id" | "payment_not_final" | "provider_identity_mismatch" | "provider_lookup_failed";
  now: Date;
}>): Promise<void> {
  const schedule = nextReconciliationSchedule(input.now, input.currentAttemptCount);
  await db.update(paymentAttempts).set({
    lastReconciledAt: input.now,
    reconciliationAttemptCount: schedule.attemptCount,
    nextReconcileAt: schedule.nextReconcileAt,
    lastReconciliationErrorCode: input.errorCode,
    updatedAt: input.now,
  }).where(and(
    eq(paymentAttempts.id, input.paymentAttemptId),
    inArray(paymentAttempts.status, ["created", "pending"]),
  ));
}

export async function reconcilePendingPayments(input: Readonly<{
  now?: Date;
  limit?: number;
}> = {}): Promise<Readonly<{
  processed: number;
  succeeded: number;
  retried: number;
  mismatched: number;
  failed: number;
}>> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Payment reconciliation batch limit must be from 1 to 100");
  }
  const candidates = await db.select({
    id: paymentAttempts.id,
    providerOrderId: paymentAttempts.providerOrderId,
    amountMinor: paymentAttempts.amountMinor,
    reconciliationAttemptCount: paymentAttempts.reconciliationAttemptCount,
  }).from(paymentAttempts).where(and(
    eq(paymentAttempts.provider, "cashfree"),
    inArray(paymentAttempts.status, ["created", "pending"]),
    or(
      sql`${paymentAttempts.nextReconcileAt} IS NULL`,
      lte(paymentAttempts.nextReconcileAt, now),
    ),
  )).orderBy(paymentAttempts.createdAt).limit(limit);
  let succeeded = 0;
  let retried = 0;
  let mismatched = 0;
  let failed = 0;
  for (const candidate of candidates) {
    if (!candidate.providerOrderId) {
      await deferPaymentReconciliation({
        paymentAttemptId: candidate.id,
        currentAttemptCount: candidate.reconciliationAttemptCount,
        errorCode: "missing_provider_order_id",
        now,
      });
      retried += 1;
      continue;
    }
    let payments: Awaited<ReturnType<typeof listCashfreePayments>>;
    try {
      payments = await listCashfreePayments(candidate.providerOrderId);
    } catch {
      await deferPaymentReconciliation({
        paymentAttemptId: candidate.id,
        currentAttemptCount: candidate.reconciliationAttemptCount,
        errorCode: "provider_lookup_failed",
        now,
      });
      retried += 1;
      failed += 1;
      continue;
    }
    const successful = payments.find((payment) =>
      payment.payment_status === "SUCCESS" && payment.is_captured &&
      payment.payment_currency === "INR" &&
      cashfreeMajorToAmountMinor(payment.payment_amount) === candidate.amountMinor,
    );
    if (successful) {
      try {
        await finalizeCashfreePayment({
          paymentAttemptId: candidate.id,
          paymentId: successful.cf_payment_id,
        });
        succeeded += 1;
      } catch {
        await deferPaymentReconciliation({
          paymentAttemptId: candidate.id,
          currentAttemptCount: candidate.reconciliationAttemptCount,
          errorCode: "provider_identity_mismatch",
          now,
        });
        retried += 1;
        mismatched += 1;
      }
    } else {
      await deferPaymentReconciliation({
        paymentAttemptId: candidate.id,
        currentAttemptCount: candidate.reconciliationAttemptCount,
        errorCode: "payment_not_final",
        now,
      });
      retried += 1;
    }
  }
  return { processed: candidates.length, succeeded, retried, mismatched, failed };
}
