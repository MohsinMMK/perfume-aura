import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createCustomerAuth } from "@/lib/customer-auth";
import { requestCustomerOrderReturn } from "@/lib/customer-returns";
import { isTrustedStorefrontMutation } from "@/lib/customer-request-security";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isTrustedStorefrontMutation(request.headers)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const session = await createCustomerAuth().api.getSession({ headers: request.headers });
  if (!session?.user || session.user.emailVerified !== true) {
    return NextResponse.json({ error: "A verified customer session is required." }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => null);
    const result = await requestCustomerOrderReturn(session.user.id, payload);
    return NextResponse.json({ status: "requested", returnId: result.returnId }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid return request." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Return request could not be created";
    const expected = [
      "Order was not found",
      "A return can be requested only after delivery",
      "A return request already exists for this order",
      "Every order item must be fulfilled before requesting a return",
      "The seven-day return request window has closed",
    ].includes(message);
    if (expected) return NextResponse.json({ error: message }, { status: 409 });
    console.error("[customer return] request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Return request could not be created" }, { status: 500 });
  }
}
