import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  checkoutSessions,
  commerceCarts,
  commerceOrderItems,
  commerceOrders,
  commerceReturnItems,
  commerceReturns,
  db,
  eq,
  reviews,
  shipments,
  storefrontUser,
} from "@perfume-aura/db";
import { submitCustomerReview } from "./customer-reviews";
import { requestCustomerOrderReturn } from "./customer-returns";

const integrationDatabaseUrl = new URL(process.env.TEST_DATABASE_URL ?? "");
assert.ok(["127.0.0.1", "localhost", "::1"].includes(integrationDatabaseUrl.hostname));
assert.match(integrationDatabaseUrl.pathname, /^\/perfume_aura_[a-z0-9_]+$/);

async function seedDeliveredOrder() {
  const suffix = randomUUID();
  const userId = `return-user-${suffix}`;
  await db.insert(storefrontUser).values({
    id: userId,
    name: "Return Test",
    email: `return-${suffix}@example.invalid`,
    emailVerified: true,
  });
  const [cart] = await db.insert(commerceCarts).values({
    tokenDigest: `return-cart-${suffix}`,
    customerUserId: userId,
    status: "converted",
    expiresAt: new Date(Date.now() + 3_600_000),
  }).returning({ id: commerceCarts.id });
  assert.ok(cart);
  const [checkout] = await db.insert(checkoutSessions).values({
    cartId: cart.id,
    tokenDigest: `return-checkout-${suffix}`,
    requestId: randomUUID(),
    payloadDigest: `return-payload-${suffix}`,
    status: "completed",
    expiresAt: new Date(Date.now() + 3_600_000),
    completedAt: new Date(),
  }).returning({ id: checkoutSessions.id });
  assert.ok(checkout);
  const orderNumber = `PA-RETURN-${suffix}`;
  const [order] = await db.insert(commerceOrders).values({
    orderNumber,
    accessTokenDigest: `return-access-${suffix}`,
    checkoutSessionId: checkout.id,
    customerUserId: userId,
    status: "delivered",
    paymentState: "paid",
    subtotalAmountMinor: 10_000,
    totalAmountMinor: 10_000,
    shippingAddressSnapshot: { postalCode: "400001" },
  }).returning({ id: commerceOrders.id });
  assert.ok(order);
  await db.insert(shipments).values({
    orderId: order.id,
    status: "delivered",
    deliveredAt: new Date(),
  });
  const [item] = await db.insert(commerceOrderItems).values({
    orderId: order.id,
    productNameSnapshot: "Return Test Scent",
    skuSnapshot: `RETURN-${suffix}`,
    sizeMlSnapshot: 50,
    unitPriceAmountMinor: 5_000,
    quantity: 2,
    lineTotalAmountMinor: 10_000,
    fulfilledQuantity: 2,
  }).returning({ id: commerceOrderItems.id });
  assert.ok(item);
  return { itemId: item.id, orderId: order.id, orderNumber, userId };
}

describe("customer return requests", () => {
  it("creates one full-order request and rejects concurrent duplicates", async () => {
    const seeded = await seedDeliveredOrder();
    const attempts = await Promise.allSettled([
      requestCustomerOrderReturn(seeded.userId, {
        orderNumber: seeded.orderNumber,
        reason: "The unopened item is no longer needed",
      }),
      requestCustomerOrderReturn(seeded.userId, {
        orderNumber: seeded.orderNumber,
        reason: "The unopened item is no longer needed",
      }),
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);

    const storedReturns = await db.select({ id: commerceReturns.id })
      .from(commerceReturns).where(eq(commerceReturns.orderId, seeded.orderId));
    assert.equal(storedReturns.length, 1);
    const returnedItems = await db.select({
      orderItemId: commerceReturnItems.orderItemId,
      quantity: commerceReturnItems.quantity,
    }).from(commerceReturnItems)
      .where(eq(commerceReturnItems.returnId, storedReturns[0]!.id));
    assert.deepEqual(returnedItems, [{ orderItemId: seeded.itemId, quantity: 2 }]);
  });

  it("fails closed when the order is not delivered", async () => {
    const seeded = await seedDeliveredOrder();
    await db.update(commerceOrders).set({ status: "shipped" }).where(eq(commerceOrders.id, seeded.orderId));
    await assert.rejects(
      requestCustomerOrderReturn(seeded.userId, {
        orderNumber: seeded.orderNumber,
        reason: "Request before delivery",
      }),
      /only after delivery/,
    );
  });

  it("fails closed after the seven-day request window", async () => {
    const seeded = await seedDeliveredOrder();
    await db.update(shipments).set({ deliveredAt: new Date("2026-08-01T00:00:00.000Z") })
      .where(eq(shipments.orderId, seeded.orderId));
    await assert.rejects(
      requestCustomerOrderReturn(
        seeded.userId,
        {
          orderNumber: seeded.orderNumber,
          reason: "Request after the return window",
        },
        new Date("2026-08-09T00:00:00.000Z"),
      ),
      /seven-day return request window has closed/,
    );
  });
});

describe("customer reviews", () => {
  it("accepts one verified delivered-item review and leaves it pending", async () => {
    const seeded = await seedDeliveredOrder();
    await submitCustomerReview(seeded.userId, {
      orderItemId: seeded.itemId,
      rating: 5,
      title: "A composed scent",
      body: "The delivered perfume matched the approved product details.",
    });
    const [stored] = await db.select({
      status: reviews.status,
      rating: reviews.rating,
    }).from(reviews).where(eq(reviews.orderItemId, seeded.itemId));
    assert.deepEqual(stored, { status: "pending", rating: 5 });
    await assert.rejects(
      submitCustomerReview(seeded.userId, {
        orderItemId: seeded.itemId,
        rating: 4,
        body: "A second review must not be accepted for this order item.",
      }),
    );
  });

  it("rejects an unfulfilled order item", async () => {
    const seeded = await seedDeliveredOrder();
    await db.update(commerceOrderItems).set({ fulfilledQuantity: 1 })
      .where(eq(commerceOrderItems.id, seeded.itemId));
    await assert.rejects(
      submitCustomerReview(seeded.userId, {
        orderItemId: seeded.itemId,
        rating: 3,
        body: "This item is not eligible because fulfillment is incomplete.",
      }),
      /not eligible/,
    );
  });
});
