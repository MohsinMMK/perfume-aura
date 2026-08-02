import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  and,
  commerceOrderItems,
  commerceOrders,
  db,
  eq,
  reviews,
} from "@perfume-aura/db";
import { createCustomerAuth } from "@/lib/customer-auth";

const reviewSchema = z.object({
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().min(10).max(2_000),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED !== "true") return NextResponse.json({ error: "Customer accounts are not enabled." }, { status: 503 });
  const session = await createCustomerAuth().api.getSession({ headers: request.headers });
  if (!session?.user || session.user.emailVerified !== true) return NextResponse.json({ error: "A verified customer session is required." }, { status: 401 });
  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });
  const [eligible] = await db
    .select({ id: commerceOrderItems.id })
    .from(commerceOrderItems)
    .innerJoin(commerceOrders, eq(commerceOrders.id, commerceOrderItems.orderId))
    .where(and(eq(commerceOrderItems.id, parsed.data.orderItemId), eq(commerceOrders.customerUserId, session.user.id), eq(commerceOrders.status, "delivered"), eq(commerceOrderItems.fulfilledQuantity, commerceOrderItems.quantity)))
    .limit(1);
  if (!eligible) return NextResponse.json({ error: "This order item is not eligible for review." }, { status: 403 });
  try {
    await db.insert(reviews).values({ orderItemId: eligible.id, customerUserId: session.user.id, rating: parsed.data.rating, title: parsed.data.title || null, body: parsed.data.body, status: "pending" });
    return NextResponse.json({ submitted: true, moderationStatus: "pending" }, { status: 201 });
  } catch (error) {
    console.error("[customer review] submission failed", error);
    return NextResponse.json({ error: "A review already exists or could not be submitted." }, { status: 409 });
  }
}
