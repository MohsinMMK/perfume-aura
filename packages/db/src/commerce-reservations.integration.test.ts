import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { and, count, eq } from "drizzle-orm";
import {
  checkoutSessions,
  commerceCarts,
  commerceOrders,
  locations,
  productPublications,
  products,
  productVariants,
  stockMovements,
  stockReservations,
  variantPrices,
} from "./schema";
import { db } from "./client";
import {
  consumeCheckoutReservations,
  expireAbandonedCheckouts,
  releaseCheckoutReservations,
  reserveCheckoutStock,
} from "./commerce-reservations";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

requireDisposableTestDatabaseUrl();

async function seedSellableVariant(quantityOnHand = 10): Promise<Readonly<{
  checkoutSessionId: string;
  orderId: string;
  variantId: string;
}>> {
  const suffix = randomUUID();
  const [product] = await db.insert(products).values({
    name: `Reservation test ${suffix}`,
    slug: `reservation-test-${suffix}`,
    status: "active",
  }).returning({ id: products.id });
  assert.ok(product);
  const [variant] = await db.insert(productVariants).values({
    productId: product.id,
    sku: `RES-${suffix}`,
    sizeMl: 100,
    costCents: 10_000,
    retailCents: 20_000,
    quantityOnHand,
    status: "active",
  }).returning({ id: productVariants.id });
  assert.ok(variant);
  const approvedAt = new Date();
  await db.insert(productPublications).values({
    productId: product.id,
    publicName: `Reservation test ${suffix}`,
    publicSlug: `reservation-test-${suffix}`,
    status: "published",
    legalApprovedAt: approvedAt,
    legalApprovalReference: `legal-${suffix}`,
    contentApprovedAt: approvedAt,
    contentApprovalReference: `content-${suffix}`,
    mediaApprovedAt: approvedAt,
    mediaApprovalReference: `media-${suffix}`,
    publishedAt: approvedAt,
  });
  await db.insert(variantPrices).values({
    variantId: variant.id,
    amountMinor: 20_000,
    approvedAt,
    approvalReference: `price-${suffix}`,
    active: true,
  });
  const [cart] = await db.insert(commerceCarts).values({
    tokenDigest: `cart-${suffix}`,
    expiresAt: new Date(Date.now() + 60 * 60_000),
  }).returning({ id: commerceCarts.id });
  assert.ok(cart);
  const [checkout] = await db.insert(checkoutSessions).values({
    cartId: cart.id,
    tokenDigest: `checkout-${suffix}`,
    requestId: randomUUID(),
    payloadDigest: `payload-${suffix}`,
    expiresAt: new Date(Date.now() + 40 * 60_000),
  }).returning({ id: checkoutSessions.id });
  assert.ok(checkout);
  const [order] = await db.insert(commerceOrders).values({
    orderNumber: `PA-RES-${suffix}`,
    accessTokenDigest: `access-${suffix}`,
    checkoutSessionId: checkout.id,
    guestEmail: "reservation-test@example.invalid",
    subtotalAmountMinor: 20_000,
    totalAmountMinor: 20_000,
    shippingAddressSnapshot: { postalCode: "400001" },
  }).returning({ id: commerceOrders.id });
  assert.ok(order);
  await db.insert(locations).values({ code: "MAIN", name: "Main" }).onConflictDoNothing();
  return { checkoutSessionId: checkout.id, orderId: order.id, variantId: variant.id };
}

describe("commerce reservation state transitions", () => {
  it("reserves and consumes stock exactly once across retries", async () => {
    const seeded = await seedSellableVariant();
    const expiry = new Date(Date.now() + 40 * 60_000);
    const firstReservation = await reserveCheckoutStock({
      checkoutSessionId: seeded.checkoutSessionId,
      items: [{ variantId: seeded.variantId, quantity: 2 }],
      expiresAt: expiry,
    });
    const replayedReservation = await reserveCheckoutStock({
      checkoutSessionId: seeded.checkoutSessionId,
      items: [{ variantId: seeded.variantId, quantity: 2 }],
      expiresAt: expiry,
    });
    assert.equal(firstReservation.idempotent, false);
    assert.equal(replayedReservation.idempotent, true);

    const firstConsume = await consumeCheckoutReservations({
      checkoutSessionId: seeded.checkoutSessionId,
      orderId: seeded.orderId,
    });
    const replayedConsume = await consumeCheckoutReservations({
      checkoutSessionId: seeded.checkoutSessionId,
      orderId: seeded.orderId,
    });
    assert.deepEqual(firstConsume, { consumedCount: 1, idempotent: false });
    assert.deepEqual(replayedConsume, { consumedCount: 0, idempotent: true });

    const [variant] = await db.select({
      quantityOnHand: productVariants.quantityOnHand,
      qtyReserved: productVariants.qtyReserved,
    }).from(productVariants).where(eq(productVariants.id, seeded.variantId));
    assert.deepEqual(variant, { quantityOnHand: 8, qtyReserved: 0 });
    const [movementCount] = await db.select({ total: count(stockMovements.id) })
      .from(stockMovements).where(and(
        eq(stockMovements.variantId, seeded.variantId),
        eq(stockMovements.refId, seeded.orderId),
      ));
    assert.equal(Number(movementCount?.total ?? 0), 1);
  });

  it("releases a reservation once and preserves on-hand stock", async () => {
    const seeded = await seedSellableVariant();
    await reserveCheckoutStock({
      checkoutSessionId: seeded.checkoutSessionId,
      items: [{ variantId: seeded.variantId, quantity: 3 }],
      expiresAt: new Date(Date.now() + 40 * 60_000),
    });
    const first = await releaseCheckoutReservations({
      checkoutSessionId: seeded.checkoutSessionId,
      reason: "cancelled",
    });
    const replay = await releaseCheckoutReservations({
      checkoutSessionId: seeded.checkoutSessionId,
      reason: "cancelled",
    });
    assert.deepEqual(first, { releasedCount: 1, idempotent: false });
    assert.deepEqual(replay, { releasedCount: 0, idempotent: true });
    const [variant] = await db.select({
      quantityOnHand: productVariants.quantityOnHand,
      qtyReserved: productVariants.qtyReserved,
    }).from(productVariants).where(eq(productVariants.id, seeded.variantId));
    assert.deepEqual(variant, { quantityOnHand: 10, qtyReserved: 0 });
  });

  it("aborts expiry when the reserved balance is inconsistent", async () => {
    const seeded = await seedSellableVariant();
    const expiredAt = new Date(Date.now() - 60_000);
    await reserveCheckoutStock({
      checkoutSessionId: seeded.checkoutSessionId,
      items: [{ variantId: seeded.variantId, quantity: 2 }],
      expiresAt: new Date(Date.now() + 60_000),
    });
    await db.update(checkoutSessions).set({ expiresAt: expiredAt })
      .where(eq(checkoutSessions.id, seeded.checkoutSessionId));
    await db.update(productVariants).set({ qtyReserved: 0 })
      .where(eq(productVariants.id, seeded.variantId));

    await assert.rejects(
      () => expireAbandonedCheckouts({ now: new Date(), limit: 20 }),
      /Reserved inventory balance is inconsistent/,
    );
    const [reservation] = await db.select({ status: stockReservations.status })
      .from(stockReservations)
      .where(eq(stockReservations.checkoutSessionId, seeded.checkoutSessionId));
    assert.equal(reservation?.status, "active");
  });
});
