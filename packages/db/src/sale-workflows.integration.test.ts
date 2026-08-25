import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;

describe("completeOpsSale integration", () => {
  let db: typeof import("./client").db;
  let pool: typeof import("./client").pool;
  let products: typeof import("./schema/index").products;
  let productVariants: typeof import("./schema/index").productVariants;
  let oilLots: typeof import("./schema/index").oilLots;
  let invoices: typeof import("./schema/index").invoices;
  let receiveOilLot: typeof import("./oil-inventory").receiveOilLot;
  let completeOpsSale: typeof import("./sale-workflows").completeOpsSale;
  let DomainError: typeof import("./domain-errors").DomainError;
  let seedMainLocation: typeof import("./seed").seedMainLocation;

  let productId: string;
  let variant100Id: string;

  before(async () => {
    ({ db, pool } = await import("./client"));
    ({ products, productVariants, oilLots, invoices } = await import(
      "./schema/index"
    ));
    ({ receiveOilLot } = await import("./oil-inventory"));
    ({ completeOpsSale } = await import("./sale-workflows"));
    ({ DomainError } = await import("./domain-errors"));
    ({ seedMainLocation } = await import("./seed"));
    await seedMainLocation();

    const suffix = randomUUID();
    const [product] = await db
      .insert(products)
      .values({
        name: `Sale oil ${suffix}`,
        slug: `sale-oil-${suffix}`,
        status: "active",
      })
      .returning({ id: products.id });
    assert.ok(product);
    productId = product.id;
    const [variant] = await db
      .insert(productVariants)
      .values({
        productId,
        sku: `SALE-${suffix}`,
        sizeMl: 100,
        costCents: 5_000,
        retailCents: 14_000,
        quantityOnHand: 5,
        status: "active",
      })
      .returning({ id: productVariants.id });
    assert.ok(variant);
    variant100Id = variant.id;
    await receiveOilLot({
      productId,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
    });
  });

  after(async () => {
    await pool.end().catch(() => undefined);
  });

  it("creates customer, invoice, bottle sale, and 50 ml oil deduct in one save", async () => {
    const result = await completeOpsSale({
      customer: { name: "Walk-in Asha", phone: "9876543210" },
      lines: [{ variantId: variant100Id, quantity: 1 }],
      idempotencyKey: randomUUID(),
      now: new Date("2094-03-01T12:00:00.000Z"),
    });
    assert.match(result.invoiceNumber, /^INV-\d{4}-\d+$/);
    assert.equal(result.oilConsumedMl, 50);
    assert.equal(result.totalCents, 14_000);
    assert.equal(result.idempotent, false);

    const [variant] = await db
      .select({ onHand: productVariants.quantityOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, variant100Id));
    assert.equal(variant?.onHand, 4);

    const [lot] = await db
      .select({ remaining: oilLots.remainingQuantityMl })
      .from(oilLots)
      .where(eq(oilLots.productId, productId));
    assert.ok(lot);
    assert.equal(lot.remaining, 950);

    const [invoice] = await db
      .select({ status: invoices.status, amountPaidCents: invoices.amountPaidCents })
      .from(invoices)
      .where(eq(invoices.id, result.invoiceId));
    assert.equal(invoice?.status, "issued");
    assert.equal(invoice?.amountPaidCents, 0);
  });

  it("replays the same sale key without a second deduct", async () => {
    const key = randomUUID();
    const first = await completeOpsSale({
      customer: { name: "Replay Cust" },
      lines: [{ variantId: variant100Id, quantity: 1 }],
      idempotencyKey: key,
      now: new Date("2094-03-02T12:00:00.000Z"),
    });
    const replay = await completeOpsSale({
      customer: { name: "Replay Cust" },
      lines: [{ variantId: variant100Id, quantity: 1 }],
      idempotencyKey: key,
      now: new Date("2094-03-02T12:00:00.000Z"),
    });
    assert.equal(replay.idempotent, true);
    assert.equal(replay.invoiceId, first.invoiceId);

    const [variant] = await db
      .select({ onHand: productVariants.quantityOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, variant100Id));
    assert.equal(variant?.onHand, 3);
  });

  it("refuses a sale when finished bottles are missing", async () => {
    await assert.rejects(
      () =>
        completeOpsSale({
          customer: { name: "No stock" },
          lines: [{ variantId: variant100Id, quantity: 99 }],
          idempotencyKey: randomUUID(),
        }),
      (error: unknown) =>
        error instanceof DomainError && error.code === "INSUFFICIENT_STOCK",
    );
  });
});
