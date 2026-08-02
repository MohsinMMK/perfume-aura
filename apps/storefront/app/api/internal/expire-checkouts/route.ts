import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { expireAbandonedCheckouts } from "@perfume-aura/db";

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
    const result = await expireAbandonedCheckouts();
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    console.error("[checkout expiry] maintenance job failed", error);
    return NextResponse.json({ error: "Checkout expiry failed" }, { status: 500 });
  }
}
