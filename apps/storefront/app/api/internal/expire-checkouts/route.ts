import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  and,
  asc,
  checkoutSessions,
  commerceOrders,
  db,
  eq,
  inArray,
  lte,
  paymentAttempts,
} from "@perfume-aura/db";
import { getCashfreeOrder } from "@/lib/cashfree";
import { cancelCashfreePaymentAttempt } from "@/lib/payment-finalizer-client";

function authorized(request: NextRequest): boolean {
  const secret = process.env.STOREFRONT_MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 32 || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (Number(process.env.CASHFREE_PAYMENT_TTL_MINUTES) !== 20) {
      throw new Error("Cashfree payment TTL must be configured to 20 minutes");
    }
    const now = new Date();
    const candidates = await db.select({
      checkoutSessionId: checkoutSessions.id,
      checkoutStatus: checkoutSessions.status,
      paymentAttemptId: paymentAttempts.id,
      providerOrderId: paymentAttempts.providerOrderId,
    }).from(checkoutSessions)
      .innerJoin(commerceOrders, eq(commerceOrders.checkoutSessionId, checkoutSessions.id))
      .innerJoin(paymentAttempts, and(
        eq(paymentAttempts.orderId, commerceOrders.id),
        eq(paymentAttempts.provider, "cashfree"),
      ))
      .where(and(
        inArray(checkoutSessions.status, ["open", "payment_pending"]),
        lte(checkoutSessions.expiresAt, now),
      ))
      .orderBy(asc(checkoutSessions.expiresAt), asc(checkoutSessions.id))
      .limit(100);

    let expiredCheckoutCount = 0;
    let releasedReservationCount = 0;
    let skippedCount = 0;
    for (const candidate of candidates) {
      if (candidate.checkoutStatus === "payment_pending") {
        if (!candidate.providerOrderId) {
          skippedCount += 1;
          continue;
        }
        try {
          const providerOrder = await getCashfreeOrder(candidate.providerOrderId);
          if (
            providerOrder.order_status !== "EXPIRED" &&
            providerOrder.order_status !== "TERMINATED"
          ) {
            skippedCount += 1;
            continue;
          }
        } catch (error) {
          console.warn("[checkout expiry] provider status lookup failed", {
            checkoutSessionId: candidate.checkoutSessionId,
            name: error instanceof Error ? error.name : "UnknownError",
          });
          skippedCount += 1;
          continue;
        }
      }

      try {
        const result = await cancelCashfreePaymentAttempt({
          paymentAttemptId: candidate.paymentAttemptId,
          reason: "expired",
          cancelledAt: now,
        });
        if (!result.idempotent) {
          expiredCheckoutCount += 1;
          releasedReservationCount += result.releasedCount;
        }
      } catch (error) {
        // A concurrent finalization owns the checkout lock and wins safely;
        // leave that candidate for the next bounded maintenance run instead of
        // failing the entire batch.
        console.warn("[checkout expiry] cancellation transition skipped", {
          checkoutSessionId: candidate.checkoutSessionId,
          name: error instanceof Error ? error.name : "UnknownError",
        });
        skippedCount += 1;
      }
    }
    return NextResponse.json({
      status: "ok",
      expiredCheckoutCount,
      releasedReservationCount,
      skippedCount,
    });
  } catch (error) {
    console.error("[checkout expiry] maintenance job failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Checkout expiry failed" }, { status: 500 });
  }
}
