import { createHash } from "node:crypto";
import { z } from "zod";
import {
  and,
  db,
  eq,
  lte,
  or,
  paymentAttempts,
  paymentEvents,
} from "@perfume-aura/db";
import {
  type CashfreeWebhookMetadata,
  cashfreeMajorToAmountMinor,
} from "./cashfree";
import { finalizeCashfreePayment } from "./payment-finalization";

const webhookSchema = z.object({
  type: z.string().min(1),
  event_time: z.string().datetime({ offset: true }),
  data: z.object({
    order: z.object({
      order_id: z.string().min(1),
      order_amount: z.number().nonnegative(),
      order_currency: z.literal("INR"),
    }),
    payment: z.object({
      cf_payment_id: z.union([z.string(), z.number()]).transform(String),
      payment_status: z.string().min(1),
      payment_amount: z.number().nonnegative(),
      payment_currency: z.literal("INR"),
    }).optional(),
    refund: z.object({
      cf_refund_id: z.union([z.string(), z.number()]).transform(String),
    }).optional(),
  }),
});

export async function processCashfreeWebhook(
  rawBody: string,
  metadata: CashfreeWebhookMetadata,
): Promise<Readonly<{
  duplicate: boolean;
  paid: boolean;
}>> {
  const event = webhookSchema.parse(JSON.parse(rawBody) as unknown);
  const providerEventId = metadata.idempotencyKey;
  const payloadDigest = createHash("sha256").update(rawBody).digest("hex");

  const eventReceipt = await db.transaction(async (tx) => {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + 2 * 60 * 1_000);
    const inserted = await tx
      .insert(paymentEvents)
      .values({
        provider: "cashfree",
        providerEventId,
        eventType: event.type,
        payloadDigest,
        signatureVerified: true,
        webhookVersion: metadata.version,
        idempotencyHeader: metadata.idempotencyKey,
        processingStatus: "received",
        occurredAt: new Date(event.event_time),
      })
      .onConflictDoNothing()
      .returning({ id: paymentEvents.id });
    const [stored] = await tx
      .select({
        id: paymentEvents.id,
        payloadDigest: paymentEvents.payloadDigest,
        processedAt: paymentEvents.processedAt,
        processingStatus: paymentEvents.processingStatus,
        leaseExpiresAt: paymentEvents.leaseExpiresAt,
      })
      .from(paymentEvents)
      .where(
        and(
          eq(paymentEvents.provider, "cashfree"),
          eq(paymentEvents.providerEventId, providerEventId),
        ),
      )
      .for("update")
      .limit(1);
    if (!stored) throw new Error("Cashfree event could not be persisted");
    if (stored.payloadDigest !== payloadDigest) {
      throw new Error("Cashfree webhook idempotency key payload mismatch");
    }
    if (stored.processingStatus === "processed" || stored.processedAt !== null) {
      return { id: stored.id, alreadyProcessed: true };
    }
    if (
      inserted.length === 0 &&
      stored.processingStatus === "processing" &&
      stored.leaseExpiresAt && stored.leaseExpiresAt > now
    ) {
      return { id: stored.id, alreadyProcessed: true };
    }
    await tx.update(paymentEvents).set({
      processingStatus: "processing",
      leaseExpiresAt,
      failedAt: null,
      failureCode: null,
    }).where(and(
      eq(paymentEvents.id, stored.id),
      or(
        eq(paymentEvents.processingStatus, "received"),
        eq(paymentEvents.processingStatus, "failed"),
        lte(paymentEvents.leaseExpiresAt, now),
      ),
    ));
    return { id: stored.id, alreadyProcessed: false };
  });
  if (eventReceipt.alreadyProcessed) return { duplicate: true, paid: false };
  try {
    const [attempt] = await db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.provider, "cashfree"),
        eq(paymentAttempts.providerOrderId, event.data.order.order_id),
      ),
    )
    .limit(1);
    if (
      !attempt ||
      event.type !== "PAYMENT_SUCCESS_WEBHOOK" ||
      event.data.payment?.payment_status !== "SUCCESS"
    ) {
      await db.update(paymentEvents).set({
        paymentAttemptId: attempt?.id,
        processingStatus: "processed",
        processedAt: new Date(),
        leaseExpiresAt: null,
      }).where(eq(paymentEvents.id, eventReceipt.id));
      return { duplicate: false, paid: false };
    }

    if (
      cashfreeMajorToAmountMinor(event.data.order.order_amount) !== attempt.amountMinor ||
      cashfreeMajorToAmountMinor(event.data.payment.payment_amount) !== attempt.amountMinor
    ) {
      throw new Error("Cashfree webhook amount does not match the payment attempt");
    }

    const finalization = await finalizeCashfreePayment({
      paymentAttemptId: attempt.id,
      paymentId: event.data.payment.cf_payment_id,
    });
    await db
      .update(paymentEvents)
      .set({
        paymentAttemptId: attempt.id,
        processingStatus: "processed",
        processedAt: new Date(),
        leaseExpiresAt: null,
      })
      .where(eq(paymentEvents.id, eventReceipt.id));
    return { duplicate: false, paid: finalization.paid };
  } catch (error) {
    await db.update(paymentEvents).set({
      processingStatus: "failed",
      failedAt: new Date(),
      leaseExpiresAt: null,
      failureCode: "processing_failed",
    }).where(eq(paymentEvents.id, eventReceipt.id));
    throw error;
  }
}
