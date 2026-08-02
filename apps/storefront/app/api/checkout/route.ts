import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { placeCheckoutOrder } from "@/lib/checkout";

const cartCookieName = "pa_storefront_cart";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cartToken = request.cookies.get(cartCookieName)?.value;
  if (!cartToken || !/^[A-Za-z0-9_-]{43}$/.test(cartToken)) {
    return NextResponse.json({ error: "Your cart session is unavailable." }, { status: 400 });
  }
  try {
    const result = await placeCheckoutOrder(await request.json(), cartToken);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid checkout details." }, { status: 400 });
    }
    console.error("[storefront checkout] checkout failed", error);
    return NextResponse.json({ error: "Checkout could not be completed." }, { status: 409 });
  }
}
