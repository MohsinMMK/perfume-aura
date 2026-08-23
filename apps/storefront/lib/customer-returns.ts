import { z } from "zod";
import {
  and,
  commerceOrderItems,
  commerceOrders,
  commerceReturnItems,
  commerceReturns,
  db,
  desc,
  eq,
  shipments,
  sql,
} from "@perfume-aura/db";

const returnWindowMilliseconds = 7 * 24 * 60 * 60 * 1_000;

export const customerReturnRequestSchema = z.object({
  orderNumber: z.string().trim().min(3).max(64),
  reason: z.string().trim().min(5).max(240),
  customerNotes: z.string().trim().max(2_000).optional(),
});

export async function requestCustomerOrderReturn(
  customerUserId: string,
  rawInput: unknown,
  now = new Date(),
): Promise<{ returnId: string }> {
  const input = customerReturnRequestSchema.parse(rawInput);

  return db.transaction(async (transaction) => {
    const [order] = await transaction
      .select({ id: commerceOrders.id, status: commerceOrders.status })
      .from(commerceOrders)
      .where(and(
        eq(commerceOrders.orderNumber, input.orderNumber),
        eq(commerceOrders.customerUserId, customerUserId),
      ))
      .for("update")
      .limit(1);
    if (!order) throw new Error("Order was not found");
    if (order.status !== "delivered") {
      throw new Error("A return can be requested only after delivery");
    }

    const [latestShipment] = await transaction
      .select({ deliveredAt: shipments.deliveredAt })
      .from(shipments)
      .where(and(
        eq(shipments.orderId, order.id),
        eq(shipments.status, "delivered"),
        sql`${shipments.deliveredAt} is not null`,
      ))
      .orderBy(desc(shipments.deliveredAt))
      .limit(1);
    if (
      !latestShipment?.deliveredAt ||
      now.getTime() > latestShipment.deliveredAt.getTime() + returnWindowMilliseconds
    ) {
      throw new Error("The seven-day return request window has closed");
    }

    const [existingReturn] = await transaction
      .select({ id: commerceReturns.id })
      .from(commerceReturns)
      .where(eq(commerceReturns.orderId, order.id))
      .limit(1);
    if (existingReturn) {
      throw new Error("A return request already exists for this order");
    }

    const items = await transaction
      .select({
        id: commerceOrderItems.id,
        fulfilledQuantity: commerceOrderItems.fulfilledQuantity,
        quantity: commerceOrderItems.quantity,
      })
      .from(commerceOrderItems)
      .where(eq(commerceOrderItems.orderId, order.id));
    if (
      items.length === 0 ||
      items.some((item) => item.fulfilledQuantity !== item.quantity)
    ) {
      throw new Error("Every order item must be fulfilled before requesting a return");
    }

    const [created] = await transaction.insert(commerceReturns).values({
      orderId: order.id,
      reason: input.reason,
      customerNotes: input.customerNotes || null,
    }).returning({ id: commerceReturns.id });
    if (!created) throw new Error("Return request was not created");

    await transaction.insert(commerceReturnItems).values(items.map((item) => ({
      returnId: created.id,
      orderItemId: item.id,
      quantity: item.quantity,
    })));
    return { returnId: created.id };
  });
}
