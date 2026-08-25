/**
 * Oil lot receive/consume against disposable loopback PostgreSQL.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;

describe("oil inventory integration", () => {
  let db: typeof import("./client").db;
  let pool: typeof import("./client").pool;
  let products: typeof import("./schema/index").products;
  let oilLots: typeof import("./schema/index").oilLots;
  let oilMovements: typeof import("./schema/index").oilMovements;
  let receiveOilLot: typeof import("./oil-inventory").receiveOilLot;
  let consumeOilInTransaction: typeof import("./oil-inventory").consumeOilInTransaction;
  let oilDemandForVariant: typeof import("./oil-inventory").oilDemandForVariant;
  let OilInventoryError: typeof import("./oil-inventory").OilInventoryError;
  let runDomainTransaction: typeof import("./transactions").runDomainTransaction;

  let productId: string;

  before(async () => {
    ({ db, pool } = await import("./client"));
    ({ products, oilLots, oilMovements } = await import("./schema/index"));
    ({
      receiveOilLot,
      consumeOilInTransaction,
      oilDemandForVariant,
      OilInventoryError,
    } = await import("./oil-inventory"));
    ({ runDomainTransaction } = await import("./transactions"));

    const suffix = randomUUID();
    const [product] = await db
      .insert(products)
      .values({
        name: `Oil test ${suffix}`,
        slug: `oil-test-${suffix}`,
        status: "active",
      })
      .returning({ id: products.id });
    assert.ok(product);
    productId = product.id;
  });

  after(async () => {
    await pool.end().catch(() => undefined);
  });

  it("receives 1 kg as 1000 ml and deducts 50 ml for a 100 ml sale", async () => {
    const received = await receiveOilLot({
      productId,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
      note: "opening concentrate",
    });
    assert.equal(received.receivedQuantityMl, 1000);
    assert.equal(received.remainingQuantityMl, 1000);

    const consumed = await runDomainTransaction((tx) =>
      consumeOilInTransaction(tx, {
        demands: [oilDemandForVariant({ productId, sizeMl: 100, quantity: 1 })],
        refType: "invoice",
        refId: randomUUID(),
        idempotencyPrefix: `oil:test:${randomUUID()}`,
      }),
    );
    assert.equal(consumed.consumedMl, 50);

    const [lot] = await db
      .select({ remaining: oilLots.remainingQuantityMl })
      .from(oilLots)
      .where(eq(oilLots.id, received.lotId));
    assert.equal(lot?.remaining, 950);
  });

  it("blocks a sale when oil is insufficient and leaves the lot unchanged", async () => {
    const suffix = randomUUID();
    const [product] = await db
      .insert(products)
      .values({
        name: `Oil short ${suffix}`,
        slug: `oil-short-${suffix}`,
        status: "active",
      })
      .returning({ id: products.id });
    assert.ok(product);
    const received = await receiveOilLot({
      productId: product.id,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
    });
    await runDomainTransaction((tx) =>
      consumeOilInTransaction(tx, {
        demands: [oilDemandForVariant({ productId: product.id, sizeMl: 100, quantity: 19 })],
        refType: "invoice",
        refId: randomUUID(),
        idempotencyPrefix: `oil:test:${randomUUID()}`,
      }),
    );

    const before = await db
      .select({ remaining: oilLots.remainingQuantityMl })
      .from(oilLots)
      .where(eq(oilLots.id, received.lotId));

    await assert.rejects(
      () =>
        runDomainTransaction((tx) =>
          consumeOilInTransaction(tx, {
            demands: [oilDemandForVariant({ productId: product.id, sizeMl: 100, quantity: 2 })],
            refType: "invoice",
            refId: randomUUID(),
            idempotencyPrefix: `oil:test:${randomUUID()}`,
          }),
        ),
      (error: unknown) =>
        error instanceof OilInventoryError && error.code === "INSUFFICIENT_OIL",
    );

    const after = await db
      .select({ remaining: oilLots.remainingQuantityMl })
      .from(oilLots)
      .where(eq(oilLots.id, received.lotId));
    assert.equal(after[0]?.remaining, before[0]?.remaining);
  });

  it("replays the same consume key without double-deducting", async () => {
    await receiveOilLot({
      productId,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
    });
    const refId = randomUUID();
    const prefix = `oil:test:${refId}`;
    const first = await runDomainTransaction((tx) =>
      consumeOilInTransaction(tx, {
        demands: [oilDemandForVariant({ productId, sizeMl: 30, quantity: 1 })],
        refType: "invoice",
        refId,
        idempotencyPrefix: prefix,
      }),
    );
    const replay = await runDomainTransaction((tx) =>
      consumeOilInTransaction(tx, {
        demands: [oilDemandForVariant({ productId, sizeMl: 30, quantity: 1 })],
        refType: "invoice",
        refId,
        idempotencyPrefix: prefix,
      }),
    );
    assert.equal(first.consumedMl, 15);
    assert.equal(replay.idempotent, true);
    assert.equal(replay.consumedMl, 15);

    const movements = await db
      .select({ id: oilMovements.id })
      .from(oilMovements)
      .where(eq(oilMovements.refId, refId));
    assert.equal(movements.length, 1);
  });

  it("replays a drained lot without asking for more oil", async () => {
    const suffix = randomUUID();
    const [product] = await db
      .insert(products)
      .values({
        name: `Oil last ${suffix}`,
        slug: `oil-last-${suffix}`,
        status: "active",
      })
      .returning({ id: products.id });
    assert.ok(product);
    await receiveOilLot({
      productId: product.id,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
    });
    const refId = randomUUID();
    const prefix = `oil:test:${refId}`;
    const first = await runDomainTransaction((tx) =>
      consumeOilInTransaction(tx, {
        demands: [oilDemandForVariant({ productId: product.id, sizeMl: 100, quantity: 20 })],
        refType: "invoice",
        refId,
        idempotencyPrefix: prefix,
      }),
    );
    const replay = await runDomainTransaction((tx) =>
      consumeOilInTransaction(tx, {
        demands: [oilDemandForVariant({ productId: product.id, sizeMl: 100, quantity: 20 })],
        refType: "invoice",
        refId,
        idempotencyPrefix: prefix,
      }),
    );
    assert.equal(first.consumedMl, 1000);
    assert.equal(replay.idempotent, true);
    assert.equal(replay.consumedMl, 1000);
  });
});
