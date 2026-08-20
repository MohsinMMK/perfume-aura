import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  commerceInquiries,
  db,
  eq,
  inquiryNotificationOutbox,
  sql,
  storefrontRateLimit,
} from "@perfume-aura/db";
import { claimInquiryRateLimit, inquiryRateLimitDigest } from "./inquiry-security";
import { drainInquiryNotificationOutbox } from "./inquiry-notification-outbox";

const integrationDatabaseUrl = new URL(process.env.TEST_DATABASE_URL ?? "");
assert.ok(["127.0.0.1", "localhost", "::1"].includes(integrationDatabaseUrl.hostname));
assert.match(integrationDatabaseUrl.pathname, /^\/perfume_aura_[a-z0-9_]+$/);

describe("inquiry throttling and notification delivery", () => {
  it("atomically enforces a hashed counter without persisting the raw identity", async () => {
    const rawEmail = `customer-${randomUUID()}@example.invalid`;
    const digest = inquiryRateLimitDigest(rawEmail, "inquiry-test-secret-that-is-long-enough-1234");
    const key = `inquiry:email:${digest}`;
    const now = new Date("2026-08-20T12:00:00.000Z");
    assert.equal(await claimInquiryRateLimit({ key, limit: 3, windowMilliseconds: 3_600_000, now }), true);
    assert.equal(await claimInquiryRateLimit({ key, limit: 3, windowMilliseconds: 3_600_000, now }), true);
    assert.equal(await claimInquiryRateLimit({ key, limit: 3, windowMilliseconds: 3_600_000, now }), true);
    assert.equal(await claimInquiryRateLimit({ key, limit: 3, windowMilliseconds: 3_600_000, now }), false);
    const [stored] = await db.select({ key: storefrontRateLimit.key }).from(storefrontRateLimit)
      .where(eq(storefrontRateLimit.key, key));
    assert.equal(stored?.key, key);
    assert.equal((stored?.key ?? "").includes(rawEmail), false);
  });

  it("reclaims expired leases, joins PII only for sending, and persists retry state", async () => {
    const now = new Date("2026-08-20T12:05:00.000Z");
    const [successfulInquiry, retryInquiry] = await db.insert(commerceInquiries).values([
      { kind: "contact", name: "Successful Sender", email: "success@example.invalid", message: "Please tell me when the collection opens.", consentVersion: "test-v1" },
      { kind: "wholesale", name: "Retry Sender", email: "retry@example.invalid", businessName: "Retry Business", message: "Please share reviewed wholesale terms.", consentVersion: "test-v1" },
    ]).returning({ id: commerceInquiries.id });
    assert.ok(successfulInquiry && retryInquiry);
    await db.insert(inquiryNotificationOutbox).values([
      { inquiryId: successfulInquiry.id, nextAttemptAt: now },
      { inquiryId: retryInquiry.id, status: "processing", nextAttemptAt: now, leaseExpiresAt: new Date(now.getTime() - 1_000) },
    ]);
    const delivered: string[] = [];
    const result = await drainInquiryNotificationOutbox({
      now,
      sendImplementation: async (notification) => {
        delivered.push(notification.email);
        if (notification.email === "retry@example.invalid") throw new Error("simulated SMTP failure");
      },
    });
    assert.deepEqual(result, { sent: 1, failed: 1 });
    assert.deepEqual(delivered.sort(), ["retry@example.invalid", "success@example.invalid"]);
    const rows = await db.select({
      inquiryId: inquiryNotificationOutbox.inquiryId,
      status: inquiryNotificationOutbox.status,
      attemptCount: inquiryNotificationOutbox.attemptCount,
      leaseExpiresAt: inquiryNotificationOutbox.leaseExpiresAt,
      errorCode: inquiryNotificationOutbox.errorCode,
    }).from(inquiryNotificationOutbox)
      .where(eq(inquiryNotificationOutbox.kind, "support_inquiry_received"));
    const successful = rows.find((row) => row.inquiryId === successfulInquiry.id);
    const retry = rows.find((row) => row.inquiryId === retryInquiry.id);
    assert.deepEqual({ status: successful?.status, attempts: successful?.attemptCount, lease: successful?.leaseExpiresAt }, { status: "sent", attempts: 1, lease: null });
    assert.deepEqual({ status: retry?.status, attempts: retry?.attemptCount, lease: retry?.leaseExpiresAt, error: retry?.errorCode }, { status: "failed", attempts: 1, lease: null, error: "delivery_failed" });
  });

  it("does not let a stale worker overwrite a newer outbox claim", async () => {
    const now = new Date("2026-08-20T12:10:00.000Z");
    const [inquiry] = await db.insert(commerceInquiries).values({
      kind: "contact",
      name: "Lease Fence",
      email: "lease-fence@example.invalid",
      message: "Please verify that stale delivery workers cannot overwrite a newer claim.",
      consentVersion: "test-v1",
    }).returning({ id: commerceInquiries.id });
    assert.ok(inquiry);
    const [outbox] = await db.insert(inquiryNotificationOutbox).values({
      inquiryId: inquiry.id,
      nextAttemptAt: now,
    }).returning({ id: inquiryNotificationOutbox.id });
    assert.ok(outbox);

    const result = await drainInquiryNotificationOutbox({
      now,
      sendImplementation: async () => {
        await db.update(inquiryNotificationOutbox).set({
          status: "processing",
          attemptCount: sql`${inquiryNotificationOutbox.attemptCount} + 1`,
          leaseExpiresAt: new Date(now.getTime() + 4 * 60 * 1_000),
        }).where(eq(inquiryNotificationOutbox.id, outbox.id));
      },
    });
    assert.deepEqual(result, { sent: 0, failed: 0 });
    const [stored] = await db.select({
      attemptCount: inquiryNotificationOutbox.attemptCount,
      status: inquiryNotificationOutbox.status,
    }).from(inquiryNotificationOutbox).where(eq(inquiryNotificationOutbox.id, outbox.id));
    assert.deepEqual(stored, { attemptCount: 2, status: "processing" });
  });
});
