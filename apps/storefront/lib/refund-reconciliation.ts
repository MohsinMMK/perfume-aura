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

export async function reconcilePendingRefunds(input: Readonly<{
  now?: Date;
  limit?: number;
}> = {}): Promise<Readonly<{ reconciled: number; pending: number }>> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Refund reconciliation batch limit must be from 1 to 100");
  }
  const retryBefore = new Date(now.getTime() - 60_000);
  const candidates = await db.select({
    refundId: commerceRefunds.id,
    idempotencyKey: commerceRefunds.idempotencyKey,
    amountMinor: commerceRefunds.amountMinor,
    paymentAttemptId: paymentAttempts.id,
    paymentAmountMinor: paymentAttempts.amountMinor,
    providerOrderId: paymentAttempts.providerOrderId,
    orderId: commerceOrders.id,
    orderStatus: commerceOrders.status,
  }).from(commerceRefunds)
    .innerJoin(paymentAttempts, eq(paymentAttempts.id, commerceRefunds.paymentAttemptId))
    .innerJoin(commerceOrders, eq(commerceOrders.id, paymentAttempts.orderId))
    .where(and(
      eq(commerceRefunds.status, "processing"),
      or(
        sql`${commerceRefunds.lastReconciledAt} IS NULL`,
        lte(commerceRefunds.lastReconciledAt, retryBefore),
      ),
    ))
    .orderBy(commerceRefunds.createdAt)
    .limit(limit);

  let reconciled = 0;
  let pending = 0;
  for (const candidate of candidates) {
    if (!candidate.providerOrderId) {
      pending += 1;
      continue;
    }
    let providerRefund: CashfreeRefund;
    try {
      providerRefund = await getCashfreeRefund(
        candidate.providerOrderId,
        `refund-${candidate.idempotencyKey}`,
      );
    } catch {
      await db.update(commerceRefunds).set({
        lastReconciledAt: now,
        updatedAt: now,
      }).where(eq(commerceRefunds.id, candidate.refundId));
      pending += 1;
      continue;
    }
    if (cashfreeMajorToAmountMinor(providerRefund.refund_amount) !== candidate.amountMinor) {
      throw new Error("Cashfree refund amount does not match the persisted request");
    }
    if (providerRefund.refund_status === "PENDING" || providerRefund.refund_status === "ONHOLD") {
      await db.update(commerceRefunds).set({
        providerStatus: providerRefund.refund_status,
        arn: providerRefund.refund_arn ?? null,
        lastReconciledAt: now,
        updatedAt: now,
      }).where(eq(commerceRefunds.id, candidate.refundId));
      pending += 1;
      continue;
    }
    const succeeded = providerRefund.refund_status === "SUCCESS";
    await db.transaction(async (transaction) => {
      const [locked] = await transaction.select({ status: commerceRefunds.status })
        .from(commerceRefunds).where(eq(commerceRefunds.id, candidate.refundId))
        .for("update").limit(1);
      if (locked?.status !== "processing") return;
      await transaction.update(commerceRefunds).set({
        status: succeeded ? "succeeded" : "failed",
        providerStatus: providerRefund.refund_status,
        arn: providerRefund.refund_arn ?? null,
        processedAt: now,
        lastReconciledAt: now,
        updatedAt: now,
      }).where(eq(commerceRefunds.id, candidate.refundId));
      if (succeeded) {
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
      const eventType = succeeded ? "refund_succeeded" : "refund_failed";
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
    reconciled += 1;
  }
  return { reconciled, pending };
}
