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
  await db.transaction(async (transaction) => {
    const [candidate] = await transaction
      .select({ orderId: commerceOrderItems.orderId })
      .from(commerceOrderItems)
      .where(eq(commerceOrderItems.id, input.orderItemId))
      .limit(1);
    if (!candidate) throw new Error("This order item is not eligible for review");

    const [order] = await transaction
      .select({ id: commerceOrders.id, status: commerceOrders.status })
      .from(commerceOrders)
      .where(and(
        eq(commerceOrders.id, candidate.orderId),
        eq(commerceOrders.customerUserId, customerUserId),
      ))
      .for("update")
      .limit(1);
    if (order?.status !== "delivered") {
      throw new Error("This order item is not eligible for review");
    }
    const [item] = await transaction
      .select({
        id: commerceOrderItems.id,
        fulfilledQuantity: commerceOrderItems.fulfilledQuantity,
        quantity: commerceOrderItems.quantity,
      })
      .from(commerceOrderItems)
      .where(and(
        eq(commerceOrderItems.id, input.orderItemId),
        eq(commerceOrderItems.orderId, candidate.orderId),
      ))
      .for("update")
      .limit(1);
    if (
      !item ||
      item.fulfilledQuantity !== item.quantity
    ) throw new Error("This order item is not eligible for review");

    await transaction.insert(reviews).values({
      orderItemId: item.id,
      customerUserId,
      rating: input.rating,
      title: input.title || null,
      body: input.body,
      status: "pending",
    });
  });
}
