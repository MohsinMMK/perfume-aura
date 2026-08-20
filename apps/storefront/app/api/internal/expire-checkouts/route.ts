import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  and,
  checkoutSessions,
  commerceOrders,
  db,
  eq,
  paymentAttempts,
  expireAbandonedCheckouts,
} from "@perfume-aura/db";
import { getCashfreeOrder } from "@/lib/cashfree";

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
    const result = await expireAbandonedCheckouts({
      canReleasePaymentPending: async (checkoutSessionId) => {
        const [attempt] = await db.select({ providerOrderId: paymentAttempts.providerOrderId })
          .from(checkoutSessions)
          .innerJoin(commerceOrders, eq(commerceOrders.checkoutSessionId, checkoutSessions.id))
          .innerJoin(paymentAttempts, and(
            eq(paymentAttempts.orderId, commerceOrders.id),
            eq(paymentAttempts.provider, "cashfree"),
          ))
          .where(eq(checkoutSessions.id, checkoutSessionId))
          .limit(1);
        if (!attempt?.providerOrderId) return false;
        try {
          const providerOrder = await getCashfreeOrder(attempt.providerOrderId);
          return providerOrder.order_status === "EXPIRED" ||
            providerOrder.order_status === "TERMINATED";
        } catch {
          return false;
        }
      },
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    console.error("[checkout expiry] maintenance job failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Checkout expiry failed" }, { status: 500 });
  }
}
