import {
  and,
  commerceInquiries,
  db,
  eq,
  inArray,
  inquiryNotificationOutbox,
  lte,
  or,
  sql,
} from "@perfume-aura/db";
import { sendInquiryNotification } from "./customer-mail";

export async function drainInquiryNotificationOutbox(input: Readonly<{
  limit?: number;
  now?: Date;
  sendImplementation?: typeof sendInquiryNotification;
}> = {}): Promise<Readonly<{ failed: number; sent: number }>> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Inquiry notification batch limit must be from 1 to 100");
  }
  const leaseExpiresAt = new Date(now.getTime() + 2 * 60 * 1_000);
  const claimed = await db.transaction(async (transaction) => {
    const rows = await transaction
      .select({ id: inquiryNotificationOutbox.id })
      .from(inquiryNotificationOutbox)
      .where(and(
        inArray(inquiryNotificationOutbox.status, ["pending", "failed", "processing"]),
        lte(inquiryNotificationOutbox.nextAttemptAt, now),
        or(
          sql`${inquiryNotificationOutbox.leaseExpiresAt} IS NULL`,
          lte(inquiryNotificationOutbox.leaseExpiresAt, now),
        ),
      ))
      .orderBy(inquiryNotificationOutbox.nextAttemptAt, inquiryNotificationOutbox.id)
      .limit(limit)
      .for("update", { skipLocked: true });
    const claims: Array<{ attemptCount: number; id: string }> = [];
    for (const row of rows) {
      const [claim] = await transaction.update(inquiryNotificationOutbox).set({
        status: "processing",
        leaseExpiresAt,
        attemptCount: sql`${inquiryNotificationOutbox.attemptCount} + 1`,
        updatedAt: now,
      }).where(eq(inquiryNotificationOutbox.id, row.id)).returning({
        attemptCount: inquiryNotificationOutbox.attemptCount,
        id: inquiryNotificationOutbox.id,
      });
      if (claim) claims.push(claim);
    }
    return claims;
  });

  let sent = 0;
  let failed = 0;
  for (const claim of claimed) {
    const [notification] = await db
      .select({
        businessName: commerceInquiries.businessName,
        email: commerceInquiries.email,
        kind: commerceInquiries.kind,
        message: commerceInquiries.message,
        name: commerceInquiries.name,
        notificationKind: inquiryNotificationOutbox.kind,
      })
      .from(inquiryNotificationOutbox)
      .innerJoin(commerceInquiries, eq(commerceInquiries.id, inquiryNotificationOutbox.inquiryId))
      .where(and(
        eq(inquiryNotificationOutbox.id, claim.id),
        eq(inquiryNotificationOutbox.status, "processing"),
        eq(inquiryNotificationOutbox.attemptCount, claim.attemptCount),
      ))
      .limit(1);
    if (!notification) continue;
    if (notification.notificationKind !== "support_inquiry_received") {
      const invalidated = await db.update(inquiryNotificationOutbox).set({
        status: "failed",
        leaseExpiresAt: null,
        errorCode: "invalid_notification",
        nextAttemptAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
        updatedAt: new Date(),
      }).where(and(
        eq(inquiryNotificationOutbox.id, claim.id),
        eq(inquiryNotificationOutbox.status, "processing"),
        eq(inquiryNotificationOutbox.attemptCount, claim.attemptCount),
      )).returning({ id: inquiryNotificationOutbox.id });
      if (invalidated.length === 1) failed += 1;
      continue;
    }
    try {
      await (input.sendImplementation ?? sendInquiryNotification)(notification);
      const completed = await db.update(inquiryNotificationOutbox).set({
        status: "sent",
        sentAt: new Date(),
        leaseExpiresAt: null,
        errorCode: null,
        updatedAt: new Date(),
      }).where(and(
        eq(inquiryNotificationOutbox.id, claim.id),
        eq(inquiryNotificationOutbox.status, "processing"),
        eq(inquiryNotificationOutbox.attemptCount, claim.attemptCount),
      )).returning({ id: inquiryNotificationOutbox.id });
      if (completed.length === 1) sent += 1;
    } catch {
      const retryMinutes = Math.min(24 * 60, 2 ** Math.min(claim.attemptCount, 10));
      const deferred = await db.update(inquiryNotificationOutbox).set({
        status: "failed",
        leaseExpiresAt: null,
        errorCode: "delivery_failed",
        nextAttemptAt: new Date(Date.now() + retryMinutes * 60 * 1_000),
        updatedAt: new Date(),
      }).where(and(
        eq(inquiryNotificationOutbox.id, claim.id),
        eq(inquiryNotificationOutbox.status, "processing"),
        eq(inquiryNotificationOutbox.attemptCount, claim.attemptCount),
      )).returning({ id: inquiryNotificationOutbox.id });
      if (deferred.length === 1) failed += 1;
    }
  }
  return { sent, failed };
}
