import {
  and,
  commerceOrderEvents,
  commerceOrderItems,
  commerceOrders,
  commerceRefunds,
  commerceReturns,
  db,
  desc,
  eq,
  paymentAttempts,
  reviews,
  shipments,
  sql,
} from "@perfume-aura/db";

const customerEventLabels = {
  order_placed: "Order placed",
  payment_confirmed: "Payment confirmed",
  order_confirmed: "Order confirmed",
  processing: "Preparing your order",
  shipment_booked: "Shipment booked",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Order cancelled",
  returned: "Returned to sender",
  refund_requested: "Refund requested",
  refund_processing: "Refund processing",
  refund_succeeded: "Refund completed",
  refund_failed: "Refund needs review",
} as const;

type CustomerEventType = keyof typeof customerEventLabels;

function isCustomerEventType(value: string): value is CustomerEventType {
  return Object.hasOwn(customerEventLabels, value);
}

export async function listCustomerOrders(userId: string) {
  return db.select({
    orderNumber: commerceOrders.orderNumber,
    status: commerceOrders.status,
    paymentState: commerceOrders.paymentState,
    totalAmountMinor: commerceOrders.totalAmountMinor,
    placedAt: commerceOrders.placedAt,
  }).from(commerceOrders)
    .where(eq(commerceOrders.customerUserId, userId))
    .orderBy(desc(commerceOrders.placedAt))
    .limit(100);
}

export async function getCustomerOrder(userId: string, orderNumber: string) {
  const [order] = await db.select({
    id: commerceOrders.id,
    orderNumber: commerceOrders.orderNumber,
    status: commerceOrders.status,
    paymentState: commerceOrders.paymentState,
    currency: commerceOrders.currency,
    subtotalAmountMinor: commerceOrders.subtotalAmountMinor,
    shippingAmountMinor: commerceOrders.shippingAmountMinor,
    taxAmountMinor: commerceOrders.taxAmountMinor,
    discountAmountMinor: commerceOrders.discountAmountMinor,
    totalAmountMinor: commerceOrders.totalAmountMinor,
    shippingAddressSnapshot: commerceOrders.shippingAddressSnapshot,
    placedAt: commerceOrders.placedAt,
  }).from(commerceOrders).where(and(
    eq(commerceOrders.orderNumber, orderNumber),
    eq(commerceOrders.customerUserId, userId),
  )).limit(1);
  if (!order) return null;

  const [items, eventRows, shipmentRows, refundRows, returnRows] = await Promise.all([
    db.select({
      id: commerceOrderItems.id,
      productName: commerceOrderItems.productNameSnapshot,
      sku: commerceOrderItems.skuSnapshot,
      sizeMl: commerceOrderItems.sizeMlSnapshot,
      unitPriceAmountMinor: commerceOrderItems.unitPriceAmountMinor,
      quantity: commerceOrderItems.quantity,
      fulfilledQuantity: commerceOrderItems.fulfilledQuantity,
      lineTotalAmountMinor: commerceOrderItems.lineTotalAmountMinor,
      reviewStatus: reviews.status,
    }).from(commerceOrderItems)
      .leftJoin(reviews, eq(reviews.orderItemId, commerceOrderItems.id))
      .where(eq(commerceOrderItems.orderId, order.id)),
    db.select({ eventType: commerceOrderEvents.eventType, createdAt: commerceOrderEvents.createdAt })
      .from(commerceOrderEvents).where(eq(commerceOrderEvents.orderId, order.id))
      .orderBy(commerceOrderEvents.createdAt),
    db.select({
      courier: shipments.courier,
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
      shippedAt: shipments.shippedAt,
      deliveredAt: shipments.deliveredAt,
      returnWindowOpen: sql<boolean>`${shipments.deliveredAt} is not null and ${shipments.deliveredAt} >= now() - interval '7 days'`,
    }).from(shipments).where(eq(shipments.orderId, order.id)).orderBy(desc(shipments.createdAt)).limit(1),
    db.select({
      status: commerceRefunds.status,
      amountMinor: commerceRefunds.amountMinor,
      createdAt: commerceRefunds.createdAt,
      processedAt: commerceRefunds.processedAt,
    }).from(commerceRefunds)
      .innerJoin(paymentAttempts, eq(paymentAttempts.id, commerceRefunds.paymentAttemptId))
      .where(eq(paymentAttempts.orderId, order.id))
      .orderBy(desc(commerceRefunds.createdAt)),
    db.select({
      id: commerceReturns.id,
      status: commerceReturns.status,
      reason: commerceReturns.reason,
      requestedAt: commerceReturns.requestedAt,
    }).from(commerceReturns)
      .where(eq(commerceReturns.orderId, order.id))
      .orderBy(desc(commerceReturns.requestedAt)),
  ]);
  return {
    ...order,
    paymentMethod: "UPI" as const,
    items,
    shipment: shipmentRows[0] ?? null,
    refunds: refundRows,
    returns: returnRows,
    timeline: eventRows.flatMap((event) => isCustomerEventType(event.eventType)
      ? [{ type: event.eventType, label: customerEventLabels[event.eventType], createdAt: event.createdAt }]
      : []),
  };
}
