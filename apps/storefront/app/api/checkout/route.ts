import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createCustomerAuth } from "@/lib/customer-auth";
import { isCustomerAuthEnabled } from "@/lib/customer-auth-policy";
import {
  CheckoutCartChangedError,
  placeCheckoutOrder,
} from "@/lib/checkout";
import { isTrustedStorefrontMutation } from "@/lib/customer-request-security";

const cartCookieName = "pa_storefront_cart";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isCustomerAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isTrustedStorefrontMutation(request.headers)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const session = await createCustomerAuth().api.getSession({ headers: request.headers });
  if (!session?.user || !session.user.emailVerified) {
    return NextResponse.json({ error: "Sign in with a verified account to checkout." }, { status: 401 });
  }
  const cartToken = request.cookies.get(cartCookieName)?.value;
  if (!cartToken || !/^[A-Za-z0-9_-]{43}$/.test(cartToken)) {
    return NextResponse.json({ error: "Your cart session is unavailable." }, { status: 400 });
  }
  try {
    const result = await placeCheckoutOrder(await request.json(), cartToken, {
      userId: session.user.id,
      email: session.user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid checkout details." }, { status: 400 });
    }
    if (error instanceof CheckoutCartChangedError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: 409 },
      );
    }
    console.error("[storefront checkout] checkout failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Checkout could not be completed." }, { status: 409 });
  }
}
