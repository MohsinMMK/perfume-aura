import { createHash } from "node:crypto";
import { z } from "zod";
import {
  and,
  db,
  eq,
  paymentAttempts,
  paymentEvents,
  commerceOrders,
  checkoutSessions,
  consumeCheckoutReservations,
} from "@perfume-aura/db";
import {
  cashfreeMajorToAmountMinor,
  verifyCashfreeOrderPaid,
} from "./cashfree";

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

export async function processCashfreeWebhook(rawBody: string): Promise<Readonly<{
  duplicate: boolean;
  paid: boolean;
}>> {
  const event = webhookSchema.parse(JSON.parse(rawBody) as unknown);
  const providerEventId = event.data.payment
    ? `${event.type}:${event.data.payment.cf_payment_id}`
    : event.data.refund
      ? `${event.type}:${event.data.refund.cf_refund_id}`
      : `${event.type}:${createHash("sha256").update(rawBody).digest("hex")}`;
  const payloadDigest = createHash("sha256").update(rawBody).digest("hex");

  const eventReceipt = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(paymentEvents)
      .values({
        provider: "cashfree",
        providerEventId,
        eventType: event.type,
        payloadDigest,
        signatureVerified: true,
        occurredAt: new Date(event.event_time),
      })
      .onConflictDoNothing()
      .returning({ id: paymentEvents.id });
    const [stored] = await tx
      .select({ id: paymentEvents.id, processedAt: paymentEvents.processedAt })
      .from(paymentEvents)
      .where(
        and(
          eq(paymentEvents.provider, "cashfree"),
          eq(paymentEvents.providerEventId, providerEventId),
        ),
      )
      .limit(1);
    if (!stored) throw new Error("Cashfree event could not be persisted");
    return {
      id: stored.id,
      alreadyProcessed: inserted.length === 0 && stored.processedAt !== null,
    };
  });
  if (eventReceipt.alreadyProcessed) return { duplicate: true, paid: false };

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
  if (!attempt || event.data.payment?.payment_status !== "SUCCESS") {
    await db
      .update(paymentEvents)
      .set({ paymentAttemptId: attempt?.id, processedAt: new Date() })
      .where(eq(paymentEvents.id, eventReceipt.id));
    return { duplicate: false, paid: false };
  }

  if (
    cashfreeMajorToAmountMinor(event.data.order.order_amount) !== attempt.amountMinor ||
    cashfreeMajorToAmountMinor(event.data.payment.payment_amount) !== attempt.amountMinor
  ) {
    throw new Error("Cashfree webhook amount does not match the payment attempt");
  }

  await verifyCashfreeOrderPaid(attempt.providerOrderId ?? "", attempt.amountMinor);
  const [order] = await db
    .select({ checkoutSessionId: commerceOrders.checkoutSessionId })
    .from(commerceOrders)
    .where(eq(commerceOrders.id, attempt.orderId))
    .limit(1);
  if (!order) throw new Error("Cashfree payment order was not found");
  await consumeCheckoutReservations({
    checkoutSessionId: order.checkoutSessionId,
    orderId: attempt.orderId,
  });
  await db.transaction(async (tx) => {
    await tx
      .update(paymentAttempts)
      .set({
        status: "succeeded",
        providerPaymentId: event.data.payment?.cf_payment_id,
        verifiedAt: new Date(),
      })
      .where(eq(paymentAttempts.id, attempt.id));
    await tx
      .update(commerceOrders)
      .set({ paymentState: "paid", status: "confirmed" })
      .where(eq(commerceOrders.id, attempt.orderId));
    await tx
      .update(checkoutSessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(checkoutSessions.id, order.checkoutSessionId));
    await tx
      .update(paymentEvents)
      .set({ paymentAttemptId: attempt.id, processedAt: new Date() })
      .where(eq(paymentEvents.id, eventReceipt.id));
  });
  return { duplicate: false, paid: true };
}
