import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { reconcilePendingRefunds } from "@/lib/refund-reconciliation";

function authorized(request: NextRequest): boolean {
  const secret = process.env.STOREFRONT_MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 32 || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await reconcilePendingRefunds();
    if (result.failed > 0 || result.mismatched > 0) {
      return NextResponse.json(
        { status: "degraded", ...result },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    console.error("[refund reconciliation] maintenance job failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Refund reconciliation failed" }, { status: 500 });
  }
}
