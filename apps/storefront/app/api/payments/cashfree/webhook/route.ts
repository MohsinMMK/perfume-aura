import { NextResponse } from "next/server";
import { processCashfreeWebhook } from "@/lib/cashfree-webhook";
import {
  resolveCashfreeConfiguration,
  verifyCashfreeWebhookSignature,
} from "@/lib/cashfree";

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  let clientSecret: string;
  try {
    clientSecret = resolveCashfreeConfiguration().clientSecret;
  } catch {
    return NextResponse.json({ error: "Payment provider unavailable" }, { status: 503 });
  }
  if (
    !verifyCashfreeWebhookSignature({
      rawBody,
      signature,
      timestamp,
      secret: clientSecret,
    })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  try {
    const result = await processCashfreeWebhook(rawBody);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error: unknown) {
    console.error("Cashfree webhook processing failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
