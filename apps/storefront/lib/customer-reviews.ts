import { z } from "zod";
import {
  and,
  commerceOrderItems,
  commerceOrders,
  db,
  eq,
  reviews,
} from "@perfume-aura/db";

export const customerReviewSchema = z.object({
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().min(10).max(2_000),
});

export async function submitCustomerReview(
  customerUserId: string,
  rawInput: unknown,
): Promise<void> {
  const input = customerReviewSchema.parse(rawInput);
  const [eligible] = await db
    .select({ id: commerceOrderItems.id })
    .from(commerceOrderItems)
    .innerJoin(commerceOrders, eq(commerceOrders.id, commerceOrderItems.orderId))
    .where(and(
      eq(commerceOrderItems.id, input.orderItemId),
      eq(commerceOrders.customerUserId, customerUserId),
      eq(commerceOrders.status, "delivered"),
      eq(commerceOrderItems.fulfilledQuantity, commerceOrderItems.quantity),
    ))
    .limit(1);
  if (!eligible) throw new Error("This order item is not eligible for review");

  await db.insert(reviews).values({
    orderItemId: eligible.id,
    customerUserId,
    rating: input.rating,
    title: input.title || null,
    body: input.body,
    status: "pending",
  });
}
