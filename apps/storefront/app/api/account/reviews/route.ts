import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createCustomerAuth } from "@/lib/customer-auth";
import { submitCustomerReview } from "@/lib/customer-reviews";
import { isTrustedStorefrontMutation } from "@/lib/customer-request-security";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED !== "true") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isTrustedStorefrontMutation(request.headers)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const session = await createCustomerAuth().api.getSession({ headers: request.headers });
  if (!session?.user || session.user.emailVerified !== true) return NextResponse.json({ error: "A verified customer session is required." }, { status: 401 });
  try {
    const payload = await request.json().catch(() => null);
    await submitCustomerReview(session.user.id, payload);
    return NextResponse.json({ submitted: true, moderationStatus: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid review." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "This order item is not eligible for review") {
      return NextResponse.json({ error: `${error.message}.` }, { status: 403 });
    }
    console.error("[customer review] submission failed", error);
    return NextResponse.json({ error: "A review already exists or could not be submitted." }, { status: 409 });
  }
}
