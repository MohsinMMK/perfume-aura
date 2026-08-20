import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { drainInquiryNotificationOutbox } from "@/lib/inquiry-notification-outbox";

function authorized(request: NextRequest): boolean {
  const secret = process.env.STOREFRONT_MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 32 || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await drainInquiryNotificationOutbox();
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    console.error("[inquiry notification outbox] maintenance job failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Inquiry notification delivery failed" }, { status: 500 });
  }
}
