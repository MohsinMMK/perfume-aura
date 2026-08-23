import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  commerceOrders,
  customerOrderClaims,
  db,
  eq,
} from "@perfume-aura/db";
import { createCustomerAuth } from "@/lib/customer-auth";
import { isTrustedStorefrontMutation } from "@/lib/customer-request-security";

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isTrustedStorefrontMutation(request.headers)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  try {
    const session = await createCustomerAuth().api.getSession({ headers: request.headers });
    if (!session?.user || session.user.emailVerified !== true) {
      return NextResponse.json({ error: "A verified customer session is required." }, { status: 401 });
    }
    const body = (await request.json()) as { orderToken?: unknown };
    const orderToken = typeof body.orderToken === "string" ? body.orderToken.trim() : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(orderToken)) {
      return NextResponse.json({ error: "Order link is invalid." }, { status: 400 });
    }
    await db.transaction(async (transaction) => {
      const [order] = await transaction
        .select({ id: commerceOrders.id, guestEmail: commerceOrders.guestEmail, customerUserId: commerceOrders.customerUserId })
        .from(commerceOrders)
        .where(eq(commerceOrders.accessTokenDigest, digest(orderToken)))
        .for("update")
        .limit(1);
      if (!order || order.guestEmail?.toLowerCase() !== session.user.email.toLowerCase()) {
        throw new Error("Order is not eligible for this account");
      }
      if (order.customerUserId && order.customerUserId !== session.user.id) {
        throw new Error("Order is already claimed");
      }
      await transaction
        .insert(customerOrderClaims)
        .values({
          orderId: order.id,
          customerUserId: session.user.id,
          emailVerifiedAt: new Date(),
        })
        .onConflictDoNothing({ target: customerOrderClaims.orderId });
      await transaction
        .update(commerceOrders)
        .set({ customerUserId: session.user.id })
        .where(eq(commerceOrders.id, order.id));
    });
    return NextResponse.json({ claimed: true });
  } catch (error) {
    console.error("[customer order claim] claim failed", error);
    return NextResponse.json({ error: "Order could not be claimed." }, { status: 409 });
  }
}
