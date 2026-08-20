import {
  and,
  commerceOrderEvents,
  commerceOrders,
  commerceRefunds,
  db,
  eq,
  lte,
  notificationOutbox,
  or,
  paymentAttempts,
  sql,
} from "@perfume-aura/db";
import {
  cashfreeMajorToAmountMinor,
  getCashfreeRefund,
  type CashfreeRefund,
} from "./cashfree";
import { nextReconciliationSchedule } from "./reconciliation-backoff";

type RefundReconciliationErrorCode =
  | "missing_provider_order_id"
  | "missing_provider_payment_id"
  | "provider_identity_mismatch"
  | "provider_lookup_failed"
  | "refund_not_final";

class RefundIdentityMismatchError extends Error {
  constructor() {
    super("Cashfree refund identity does not match the persisted request");
    this.name = "RefundIdentityMismatchError";
  }
}

async function deferRefundReconciliation(input: Readonly<{
  refundId: string;
  currentAttemptCount: number;
  errorCode: RefundReconciliationErrorCode;
  now: Date;
  providerRefund?: CashfreeRefund;
}>): Promise<void> {
  const schedule = nextReconciliationSchedule(input.now, input.currentAttemptCount);
  await db.update(commerceRefunds).set({
    providerRefundId: input.providerRefund?.cf_refund_id,
    providerStatus: input.providerRefund?.refund_status,
    arn: input.providerRefund?.refund_arn ?? undefined,
    lastReconciledAt: input.now,
    reconciliationAttemptCount: schedule.attemptCount,
    nextReconcileAt: schedule.nextReconcileAt,
    lastReconciliationErrorCode: input.errorCode,
    updatedAt: input.now,
  }).where(and(
    eq(commerceRefunds.id, input.refundId),
    eq(commerceRefunds.status, "processing"),
  ));
}

function assertRefundIdentity(input: Readonly<{
  candidate: Readonly<{
    idempotencyKey: string;
    amountMinor: number;
    providerOrderId: string;
    providerPaymentId: string;
    providerRefundId: string | null;
  }>;
  providerRefund: CashfreeRefund;
}>): void {
  const expectedRefundId = `refund-${input.candidate.idempotencyKey}`;
  if (
    input.providerRefund.order_id !== input.candidate.providerOrderId ||
    input.providerRefund.refund_id !== expectedRefundId ||
    input.providerRefund.cf_payment_id !== input.candidate.providerPaymentId ||
    (input.candidate.providerRefundId !== null &&
      input.providerRefund.cf_refund_id !== input.candidate.providerRefundId) ||
    input.providerRefund.refund_currency !== "INR" ||
    cashfreeMajorToAmountMinor(input.providerRefund.refund_amount) !==
      input.candidate.amountMinor
  ) {
    throw new RefundIdentityMismatchError();
  }
}

export async function reconcilePendingRefunds(input: Readonly<{
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
    throw new Error("Refund reconciliation batch limit must be from 1 to 100");
  }
  const candidates = await db.select({
    refundId: commerceRefunds.id,
    providerRefundId: commerceRefunds.providerRefundId,
    idempotencyKey: commerceRefunds.idempotencyKey,
    amountMinor: commerceRefunds.amountMinor,
    reconciliationAttemptCount: commerceRefunds.reconciliationAttemptCount,
    paymentAttemptId: paymentAttempts.id,
    paymentAmountMinor: paymentAttempts.amountMinor,
    providerOrderId: paymentAttempts.providerOrderId,
    providerPaymentId: paymentAttempts.providerPaymentId,
    orderId: commerceOrders.id,
    orderStatus: commerceOrders.status,
  }).from(commerceRefunds)
    .innerJoin(paymentAttempts, eq(paymentAttempts.id, commerceRefunds.paymentAttemptId))
    .innerJoin(commerceOrders, eq(commerceOrders.id, paymentAttempts.orderId))
    .where(and(
      eq(commerceRefunds.status, "processing"),
      or(
        sql`${commerceRefunds.nextReconcileAt} IS NULL`,
        lte(commerceRefunds.nextReconcileAt, now),
      ),
    ))
    .orderBy(commerceRefunds.createdAt)
    .limit(limit);

  let succeededCount = 0;
  let retried = 0;
  let mismatched = 0;
  let failed = 0;
  for (const candidate of candidates) {
    if (!candidate.providerOrderId) {
      await deferRefundReconciliation({
        refundId: candidate.refundId,
        currentAttemptCount: candidate.reconciliationAttemptCount,
        errorCode: "missing_provider_order_id",
        now,
      });
      retried += 1;
      continue;
    }
    if (!candidate.providerPaymentId) {
      await deferRefundReconciliation({
        refundId: candidate.refundId,
        currentAttemptCount: candidate.reconciliationAttemptCount,
        errorCode: "missing_provider_payment_id",
        now,
      });
      retried += 1;
      continue;
    }
    try {
      const providerRefund = await getCashfreeRefund(
        candidate.providerOrderId,
        `refund-${candidate.idempotencyKey}`,
      );
      assertRefundIdentity({
        candidate: {
          idempotencyKey: candidate.idempotencyKey,
          amountMinor: candidate.amountMinor,
          providerOrderId: candidate.providerOrderId,
          providerPaymentId: candidate.providerPaymentId,
          providerRefundId: candidate.providerRefundId,
        },
        providerRefund,
      });
      if (providerRefund.refund_status === "PENDING" || providerRefund.refund_status === "ONHOLD") {
        await deferRefundReconciliation({
          refundId: candidate.refundId,
          currentAttemptCount: candidate.reconciliationAttemptCount,
          errorCode: "refund_not_final",
          now,
          providerRefund,
        });
        retried += 1;
        continue;
      }
      const refundSucceeded = providerRefund.refund_status === "SUCCESS";
      await db.transaction(async (transaction) => {
        const [locked] = await transaction.select({
          status: commerceRefunds.status,
          providerRefundId: commerceRefunds.providerRefundId,
        }).from(commerceRefunds).where(eq(commerceRefunds.id, candidate.refundId))
          .for("update").limit(1);
        if (locked?.status !== "processing") return;
        if (locked.providerRefundId !== null &&
          locked.providerRefundId !== providerRefund.cf_refund_id) {
          throw new RefundIdentityMismatchError();
        }
        await transaction.update(commerceRefunds).set({
          status: refundSucceeded ? "succeeded" : "failed",
          providerRefundId: providerRefund.cf_refund_id,
          providerStatus: providerRefund.refund_status,
          arn: providerRefund.refund_arn ?? null,
          processedAt: now,
          lastReconciledAt: now,
          reconciliationAttemptCount: 0,
          nextReconcileAt: null,
          lastReconciliationErrorCode: null,
          updatedAt: now,
        }).where(eq(commerceRefunds.id, candidate.refundId));
        if (refundSucceeded) {
          const [totals] = await transaction.select({
            refundedAmountMinor: sql<number>`coalesce(sum(${commerceRefunds.amountMinor}), 0)::int`,
          }).from(commerceRefunds).where(and(
            eq(commerceRefunds.paymentAttemptId, candidate.paymentAttemptId),
            eq(commerceRefunds.status, "succeeded"),
          ));
          await transaction.update(commerceOrders).set({
            paymentState: (totals?.refundedAmountMinor ?? 0) >= candidate.paymentAmountMinor
              ? "refunded"
              : "partially_refunded",
            updatedAt: now,
          }).where(eq(commerceOrders.id, candidate.orderId));
        }
        const eventType = refundSucceeded ? "refund_succeeded" : "refund_failed";
        const [orderEvent] = await transaction.insert(commerceOrderEvents).values({
          orderId: candidate.orderId,
          eventType,
          fromStatus: candidate.orderStatus,
          toStatus: candidate.orderStatus,
          idempotencyKey: `refund:${candidate.refundId}:${eventType}`,
        }).onConflictDoNothing().returning({ id: commerceOrderEvents.id });
        if (orderEvent) {
          await transaction.insert(notificationOutbox).values({
            orderEventId: orderEvent.id,
            kind: eventType,
          }).onConflictDoNothing();
        }
      });
      succeededCount += 1;
    } catch (error) {
      await deferRefundReconciliation({
        refundId: candidate.refundId,
        currentAttemptCount: candidate.reconciliationAttemptCount,
        errorCode: error instanceof RefundIdentityMismatchError
          ? "provider_identity_mismatch"
          : "provider_lookup_failed",
        now,
      });
      retried += 1;
      if (error instanceof RefundIdentityMismatchError) mismatched += 1;
      else failed += 1;
    }
  }
  return {
    processed: candidates.length,
    succeeded: succeededCount,
    retried,
    mismatched,
    failed,
  };
}
