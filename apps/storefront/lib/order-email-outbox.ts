import {
  and,
  commerceOrderEvents,
  commerceOrders,
  db,
  eq,
  inArray,
  lte,
  notificationOutbox,
  or,
  sql,
  shipments,
} from "@perfume-aura/db";
import { sendCommerceOrderEmail, type OrderMailKind } from "./customer-mail";

const supportedKinds = new Set<OrderMailKind>([
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "refund_succeeded",
  "refund_processing",
  "refund_failed",
]);

function isOrderMailKind(value: string): value is OrderMailKind {
  return supportedKinds.has(value as OrderMailKind);
}

export async function drainOrderEmailOutbox(input: Readonly<{
  now?: Date;
  limit?: number;
}> = {}): Promise<Readonly<{ sent: number; failed: number }>> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Email outbox batch limit must be from 1 to 100");
  }
  const leaseExpiresAt = new Date(now.getTime() + 2 * 60 * 1_000);
  const claimed = await db.transaction(async (transaction) => {
    const rows = await transaction.select({ id: notificationOutbox.id })
      .from(notificationOutbox)
      .where(and(
        inArray(notificationOutbox.status, ["pending", "failed", "processing"]),
        lte(notificationOutbox.nextAttemptAt, now),
        or(
          sql`${notificationOutbox.leaseExpiresAt} IS NULL`,
          lte(notificationOutbox.leaseExpiresAt, now),
        ),
      ))
      .orderBy(notificationOutbox.nextAttemptAt, notificationOutbox.id)
      .limit(limit)
      .for("update", { skipLocked: true });
    for (const row of rows) {
      await transaction.update(notificationOutbox).set({
        status: "processing",
        leaseExpiresAt,
        attemptCount: sql`${notificationOutbox.attemptCount} + 1`,
        updatedAt: now,
      }).where(eq(notificationOutbox.id, row.id));
    }
    return rows;
  });

  let sent = 0;
  let failed = 0;
  for (const claim of claimed) {
    const [message] = await db.select({
      kind: notificationOutbox.kind,
      attemptCount: notificationOutbox.attemptCount,
      email: commerceOrders.guestEmail,
      orderNumber: commerceOrders.orderNumber,
      courier: shipments.courier,
      trackingNumber: shipments.trackingNumber,
    }).from(notificationOutbox)
      .innerJoin(commerceOrderEvents, eq(commerceOrderEvents.id, notificationOutbox.orderEventId))
      .innerJoin(commerceOrders, eq(commerceOrders.id, commerceOrderEvents.orderId))
      .leftJoin(shipments, eq(shipments.orderId, commerceOrders.id))
      .where(eq(notificationOutbox.id, claim.id)).limit(1);
    if (!message?.email || !isOrderMailKind(message.kind)) {
      await db.update(notificationOutbox).set({
        status: "failed",
        leaseExpiresAt: null,
        errorCode: "invalid_message",
        nextAttemptAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
        updatedAt: new Date(),
      }).where(eq(notificationOutbox.id, claim.id));
      failed += 1;
      continue;
    }
    try {
      const storefrontUrl = new URL(process.env.STOREFRONT_URL ?? "https://perfumeaura.com");
      const details = message.kind === "order_shipped"
        ? [message.courier, message.trackingNumber ? `Tracking ${message.trackingNumber}` : null].filter(Boolean).join(" · ")
        : undefined;
      await sendCommerceOrderEmail({
        to: message.email,
        kind: message.kind,
        orderNumber: message.orderNumber,
        orderUrl: new URL(`/account/orders/${encodeURIComponent(message.orderNumber)}`, storefrontUrl).toString(),
        details,
      });
      await db.update(notificationOutbox).set({
        status: "sent",
        sentAt: new Date(),
        leaseExpiresAt: null,
        errorCode: null,
        updatedAt: new Date(),
      }).where(eq(notificationOutbox.id, claim.id));
      sent += 1;
    } catch {
      const attemptCount = message.attemptCount;
      const retryMinutes = Math.min(24 * 60, 2 ** Math.min(attemptCount, 10));
      await db.update(notificationOutbox).set({
        status: "failed",
        attemptCount,
        leaseExpiresAt: null,
        errorCode: "delivery_failed",
        nextAttemptAt: new Date(Date.now() + retryMinutes * 60 * 1_000),
        updatedAt: new Date(),
      }).where(eq(notificationOutbox.id, claim.id));
      failed += 1;
    }
  }
  return { sent, failed };
}
