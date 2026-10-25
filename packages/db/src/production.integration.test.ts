import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;

describe("series and supplies integration", () => {
  let db: typeof import("./client").db;
  let pool: typeof import("./client").pool;
  let schema: typeof import("./schema/index");
  let production: typeof import("./production");
  let receiveOilLot: typeof import("./oil-inventory").receiveOilLot;
  let DomainError: typeof import("./domain-errors").DomainError;

  function hasCode(code: string) {
    return (error: unknown) =>
      error instanceof DomainError && error.code === code;
  }

  before(async () => {
    ({ db, pool } = await import("./client"));
    schema = await import("./schema/index");
    production = await import("./production");
    ({ receiveOilLot } = await import("./oil-inventory"));
    ({ DomainError } = await import("./domain-errors"));
  });

  after(async () => {
    await pool.end().catch(() => undefined);
  });

  it("receives and adjusts a supply through an append-only ledger", async () => {
    const { supplyId } = await production.createSupplyItem({
      kind: "bottle",
      name: `Round 50 ${randomUUID()}`,
      sizeMl: 50,
      reorderLevel: 5,
    });
    const key = randomUUID();
    const received = await production.receiveSupply({
      supplyId,
      quantity: 24,
      totalCostCents: 120_00,
      supplierName: "Glassworks",
      idempotencyKey: key,
    });
    const replay = await production.receiveSupply({
      supplyId,
      quantity: 24,
      idempotencyKey: key,
    });
    assert.equal(received.quantityAfter, 24);
    assert.equal(replay.idempotent, true);
    await assert.rejects(
      () =>
        production.receiveSupply({ supplyId, quantity: 5, idempotencyKey: key }),
      hasCode("IDEMPOTENCY_CONFLICT"),
    );

    const adjusted = await production.adjustSupply({
      supplyId,
      quantityDelta: -3,
      note: "Broken in transit",
      idempotencyKey: randomUUID(),
    });
    assert.equal(adjusted.quantityAfter, 21);
    await assert.rejects(
      () =>
        production.adjustSupply({
          supplyId,
          quantityDelta: -50,
          note: "Recount",
          idempotencyKey: randomUUID(),
        }),
      hasCode("INSUFFICIENT_SUPPLIES"),
    );

    await assert.rejects(() =>
      db.execute(
        sql`UPDATE supply_movements SET quantity_delta = 1 WHERE supply_id = ${supplyId}`,
      ),
    );
  });

  it("keeps a single active base mixture", async () => {
    await assert.rejects(
      () =>
        production.createSupplyItem({
          kind: "base",
          name: `Second base ${randomUUID()}`,
          sizeMl: null,
          reorderLevel: 0,
        }),
      hasCode("CONFLICT"),
    );
  });

  it("links only matching, active packaging to a series size", async () => {
    const suffix = randomUUID();
    const { seriesId } = await production.createProductSeries({
      name: `Pack ${suffix}`,
      slug: `pack-${suffix}`,
      oilConcentrationPercent: 40,
      oilReorderLevelMl: 0,
    });
    const box = await production.createSupplyItem({
      kind: "box",
      name: `Box 50 ${suffix}`,
      sizeMl: 50,
      reorderLevel: 0,
    });
    await assert.rejects(
      () =>
        production.upsertSeriesSize({
          seriesId,
          sizeMl: 50,
          defaultRetailCents: 1_000,
          bottleSupplyId: box.supplyId,
          boxSupplyId: null,
          isActive: true,
        }),
      hasCode("INVALID_INPUT"),
    );

    const first = await production.upsertSeriesSize({
      seriesId,
      sizeMl: 50,
      defaultRetailCents: 1_000,
      bottleSupplyId: null,
      boxSupplyId: box.supplyId,
      isActive: true,
    });
    const second = await production.upsertSeriesSize({
      seriesId,
      sizeMl: 50,
      defaultRetailCents: 2_000,
      bottleSupplyId: null,
      boxSupplyId: null,
      isActive: true,
    });
    assert.equal(second.seriesSizeId, first.seriesSizeId);
    const [row] = await db
      .select({ price: schema.seriesSizes.defaultRetailCents })
      .from(schema.seriesSizes)
      .where(eq(schema.seriesSizes.id, first.seriesSizeId));
    assert.equal(row?.price, 2_000);
  });

  it("rejects a duplicate series slug and duplicate product sizes", async () => {
    const slug = `dup-${randomUUID()}`;
    const { seriesId } = await production.createProductSeries({
      name: "Dup",
      slug,
      oilConcentrationPercent: 50,
      oilReorderLevelMl: 0,
    });
    await assert.rejects(
      () =>
        production.createProductSeries({
          name: "Dup again",
          slug,
          oilConcentrationPercent: 50,
          oilReorderLevelMl: 0,
        }),
      hasCode("SLUG_CONFLICT"),
    );
    await assert.rejects(
      () =>
        production.createSeriesProduct({
          name: "Twice",
          slug: `twice-${randomUUID()}`,
          seriesId,
          variants: [
            { sizeMl: 50, sku: `A-${randomUUID()}`, retailCents: 1, costCents: 0, reorderLevel: 0 },
            { sizeMl: 50, sku: `B-${randomUUID()}`, retailCents: 1, costCents: 0, reorderLevel: 0 },
          ],
        }),
      hasCode("INVALID_INPUT"),
    );
  });

  it("counts bottles the shelf can still make and names what blocks the rest", async () => {
    const suffix = randomUUID();
    const [base] = await db
      .select({ id: schema.supplyItems.id })
      .from(schema.supplyItems)
      .where(eq(schema.supplyItems.kind, "base"));
    assert.ok(base);
    await production.receiveSupply({
      supplyId: base.id,
      quantity: 1_000,
      idempotencyKey: randomUUID(),
    });
    const { seriesId } = await production.createProductSeries({
      name: `Make ${suffix}`,
      slug: `make-${suffix}`,
      oilConcentrationPercent: 50,
      oilReorderLevelMl: 0,
    });
    const bottle = await production.createSupplyItem({
      kind: "bottle",
      name: `Make 100 ${suffix}`,
      sizeMl: 100,
      reorderLevel: 0,
    });
    await production.receiveSupply({
      supplyId: bottle.supplyId,
      quantity: 3,
      idempotencyKey: randomUUID(),
    });
    await production.upsertSeriesSize({
      seriesId,
      sizeMl: 100,
      defaultRetailCents: 0,
      bottleSupplyId: bottle.supplyId,
      boxSupplyId: null,
      isActive: true,
    });
    const product = await production.createSeriesProduct({
      name: `Make ${suffix}`,
      slug: `make-${suffix}`,
      seriesId,
      variants: [
        { sizeMl: 100, sku: `MK-100-${suffix}`, retailCents: 0, costCents: 0, reorderLevel: 0 },
        { sizeMl: 50, sku: `MK-50-${suffix}`, retailCents: 0, costCents: 0, reorderLevel: 0 },
      ],
    });
    await receiveOilLot({
      productId: product.productId,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
    });

    const [made, unlisted] = product.variantIds;
    assert.ok(made && unlisted);
    const capacity = await production.loadVariantCapacity([made, unlisted]);
    assert.deepEqual(capacity.get(made), {
      seriesName: `Make ${suffix}`,
      concentrationPercent: 50,
      recipe: { oilMl: 50, baseMl: 50 },
      canMake: 3,
      limitedBy: "bottle",
      blocker: null,
    });
    assert.equal(capacity.get(unlisted)?.canMake, 0);
    assert.match(capacity.get(unlisted)?.blocker ?? "", /no 50 ml size/);
  });
});
