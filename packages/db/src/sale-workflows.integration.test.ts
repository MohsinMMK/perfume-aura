import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;

describe("completeOpsSale integration", () => {
  let db: typeof import("./client").db;
  let pool: typeof import("./client").pool;
  let schema: typeof import("./schema/index");
  let receiveOilLot: typeof import("./oil-inventory").receiveOilLot;
  let completeOpsSale: typeof import("./sale-workflows").completeOpsSale;
  let receiveInvoiceLineReturn: typeof import("./return-workflows").receiveInvoiceLineReturn;
  let production: typeof import("./production");
  let DomainError: typeof import("./domain-errors").DomainError;
  let seedMainLocation: typeof import("./seed").seedMainLocation;

  let seriesId: string;
  let productId: string;
  let variant100Id: string;
  let baseId: string;
  let bottle100Id: string;
  let box100Id: string;
  let bottle105Id: string;

  async function onHand(variantId: string): Promise<number | undefined> {
    const [row] = await db
      .select({ onHand: schema.productVariants.quantityOnHand })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.id, variantId));
    return row?.onHand;
  }

  async function supplyOnHand(supplyId: string): Promise<number | undefined> {
    const [row] = await db
      .select({ onHand: schema.supplyItems.quantityOnHand })
      .from(schema.supplyItems)
      .where(eq(schema.supplyItems.id, supplyId));
    return row?.onHand;
  }

  async function oilRemaining(id: string): Promise<number | undefined> {
    const [row] = await db
      .select({ remaining: schema.oilLots.remainingQuantityMl })
      .from(schema.oilLots)
      .where(eq(schema.oilLots.productId, id));
    return row?.remaining;
  }

  async function addSupply(
    kind: "bottle" | "box",
    sizeMl: number,
    quantity: number,
  ): Promise<string> {
    const { supplyId } = await production.createSupplyItem({
      kind,
      name: `${kind} ${sizeMl} ${randomUUID()}`,
      sizeMl,
      reorderLevel: 2,
    });
    await production.receiveSupply({
      supplyId,
      quantity,
      idempotencyKey: randomUUID(),
    });
    return supplyId;
  }

  async function addVariant(input: {
    productId: string;
    sizeMl: number;
    quantityOnHand: number;
    retailCents?: number;
  }): Promise<string> {
    const [variant] = await db
      .insert(schema.productVariants)
      .values({
        productId: input.productId,
        sku: `SALE-${input.sizeMl}-${randomUUID()}`,
        sizeMl: input.sizeMl,
        costCents: 5_000,
        retailCents: input.retailCents ?? 14_000,
        quantityOnHand: input.quantityOnHand,
        status: "active",
      })
      .returning({ id: schema.productVariants.id });
    assert.ok(variant);
    return variant.id;
  }

  before(async () => {
    ({ db, pool } = await import("./client"));
    schema = await import("./schema/index");
    ({ receiveOilLot } = await import("./oil-inventory"));
    ({ completeOpsSale } = await import("./sale-workflows"));
    ({ receiveInvoiceLineReturn } = await import("./return-workflows"));
    production = await import("./production");
    ({ DomainError } = await import("./domain-errors"));
    ({ seedMainLocation } = await import("./seed"));
    await seedMainLocation();

    const [base] = await db
      .select({ id: schema.supplyItems.id })
      .from(schema.supplyItems)
      .where(
        and(
          eq(schema.supplyItems.kind, "base"),
          eq(schema.supplyItems.status, "active"),
        ),
      );
    assert.ok(base, "migration 0020 seeds the base mixture");
    baseId = base.id;
    await production.receiveSupply({
      supplyId: baseId,
      quantity: 1_000,
      idempotencyKey: randomUUID(),
    });

    const suffix = randomUUID();
    ({ seriesId } = await production.createProductSeries({
      name: `Sale series ${suffix}`,
      slug: `sale-series-${suffix}`,
      oilConcentrationPercent: 50,
      oilReorderLevelMl: 200,
    }));
    bottle100Id = await addSupply("bottle", 100, 10);
    box100Id = await addSupply("box", 100, 10);
    bottle105Id = await addSupply("bottle", 105, 10);
    const bottle30Id = await addSupply("bottle", 30, 10);
    await production.upsertSeriesSize({
      seriesId,
      sizeMl: 100,
      defaultRetailCents: 14_000,
      bottleSupplyId: bottle100Id,
      boxSupplyId: box100Id,
      isActive: true,
    });
    await production.upsertSeriesSize({
      seriesId,
      sizeMl: 105,
      defaultRetailCents: 26_000,
      bottleSupplyId: bottle105Id,
      boxSupplyId: null,
      isActive: true,
    });
    await production.upsertSeriesSize({
      seriesId,
      sizeMl: 30,
      defaultRetailCents: 6_000,
      bottleSupplyId: bottle30Id,
      boxSupplyId: null,
      isActive: true,
    });

    const created = await production.createSeriesProduct({
      name: `Sale oil ${suffix}`,
      slug: `sale-oil-${suffix}`,
      seriesId,
      variants: [
        {
          sizeMl: 100,
          sku: `SALE-100-${suffix}`,
          retailCents: 14_000,
          costCents: 5_000,
          reorderLevel: 0,
        },
      ],
    });
    productId = created.productId;
    const [first] = created.variantIds;
    assert.ok(first);
    variant100Id = first;
    // One bottle already filled and on the shelf.
    await db
      .update(schema.productVariants)
      .set({ quantityOnHand: 1 })
      .where(eq(schema.productVariants.id, variant100Id));
    await receiveOilLot({
      productId,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
    });
  });

  after(async () => {
    await pool.end().catch(() => undefined);
  });

  it("sells a finished bottle without touching oil, base or packaging", async () => {
    const baseBefore = await supplyOnHand(baseId);
    const result = await completeOpsSale({
      customer: { name: "Walk-in Asha", phone: "9876543210" },
      lines: [{ variantId: variant100Id, quantity: 1 }],
      idempotencyKey: randomUUID(),
      now: new Date("2094-03-01T12:00:00.000Z"),
    });
    assert.match(result.invoiceNumber, /^INV-\d{4}-\d+$/);
    assert.equal(result.filledBottles, 0);
    assert.equal(result.oilConsumedMl, 0);
    assert.equal(result.totalCents, 14_000);
    assert.equal(result.idempotent, false);
    assert.equal(await onHand(variant100Id), 0);
    assert.equal(await oilRemaining(productId), 1_000);
    assert.equal(await supplyOnHand(baseId), baseBefore);
    assert.equal(await supplyOnHand(bottle100Id), 10);

    const [invoice] = await db
      .select({
        status: schema.invoices.status,
        amountPaidCents: schema.invoices.amountPaidCents,
      })
      .from(schema.invoices)
      .where(eq(schema.invoices.id, result.invoiceId));
    assert.equal(invoice?.status, "issued");
    assert.equal(invoice?.amountPaidCents, 0);
  });

  it("makes missing bottles from oil, base, bottle and box at the series share", async () => {
    const baseBefore = (await supplyOnHand(baseId)) ?? 0;
    const result = await completeOpsSale({
      customer: { name: "Made to order" },
      lines: [{ variantId: variant100Id, quantity: 2 }],
      idempotencyKey: randomUUID(),
      now: new Date("2094-03-02T12:00:00.000Z"),
    });
    assert.equal(result.filledBottles, 2);
    assert.equal(result.oilConsumedMl, 100);
    assert.equal(result.baseConsumedMl, 100);
    assert.equal(await onHand(variant100Id), 0);
    assert.equal(await oilRemaining(productId), 900);
    assert.equal(await supplyOnHand(baseId), baseBefore - 100);
    assert.equal(await supplyOnHand(bottle100Id), 8);
    assert.equal(await supplyOnHand(box100Id), 8);

    const movements = await db
      .select({
        type: schema.stockMovements.type,
        refType: schema.stockMovements.refType,
        quantityDelta: schema.stockMovements.quantityDelta,
      })
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.refId, result.invoiceId));
    assert.deepEqual(
      movements
        .map((movement) => `${movement.refType}:${movement.quantityDelta}`)
        .sort(),
      ["fill:2", "invoice:-2"],
    );

    const supplyRows = await db
      .select({ quantityDelta: schema.supplyMovements.quantityDelta })
      .from(schema.supplyMovements)
      .where(eq(schema.supplyMovements.refId, result.invoiceId));
    assert.equal(supplyRows.length, 3);
  });

  it("replays the same sale key without a second deduct", async () => {
    const key = randomUUID();
    const first = await completeOpsSale({
      customer: { name: "Replay Cust" },
      lines: [{ variantId: variant100Id, quantity: 1 }],
      idempotencyKey: key,
      now: new Date("2094-03-03T12:00:00.000Z"),
    });
    const replay = await completeOpsSale({
      customer: { name: "Replay Cust" },
      lines: [{ variantId: variant100Id, quantity: 1 }],
      idempotencyKey: key,
      now: new Date("2094-03-03T12:00:00.000Z"),
    });
    assert.equal(replay.idempotent, true);
    assert.equal(replay.invoiceId, first.invoiceId);
    assert.equal(await supplyOnHand(bottle100Id), 7);
    assert.equal(await oilRemaining(productId), 850);
  });

  it("refuses the whole sale when packaging runs short", async () => {
    // The base is shared with other suites; keep it from running out first.
    await production.receiveSupply({
      supplyId: baseId,
      quantity: 5_000,
      idempotencyKey: randomUUID(),
    });
    await assert.rejects(
      () =>
        completeOpsSale({
          customer: { name: "Too many" },
          lines: [{ variantId: variant100Id, quantity: 99 }],
          idempotencyKey: randomUUID(),
        }),
      (error: unknown) =>
        error instanceof DomainError &&
        error.code === "INSUFFICIENT_SUPPLIES" &&
        /have 7, need 99/.test(error.message),
    );
    assert.equal(await supplyOnHand(bottle100Id), 7);
    assert.equal(await oilRemaining(productId), 850);
  });

  it("refuses to make a size the series does not list", async () => {
    const variant75Id = await addVariant({ productId, sizeMl: 75, quantityOnHand: 0 });
    await assert.rejects(
      () =>
        completeOpsSale({
          customer: { name: "Odd size" },
          lines: [{ variantId: variant75Id, quantity: 1 }],
          idempotencyKey: randomUUID(),
        }),
      (error: unknown) =>
        error instanceof DomainError &&
        error.code === "INVALID_STATE" &&
        /not made in 75 ml/.test(error.message),
    );
  });

  it("refuses to make bottles for a product outside every series", async () => {
    const suffix = randomUUID();
    const [loose] = await db
      .insert(schema.products)
      .values({ name: `Loose ${suffix}`, slug: `loose-${suffix}`, status: "active" })
      .returning({ id: schema.products.id });
    assert.ok(loose);
    const looseVariantId = await addVariant({
      productId: loose.id,
      sizeMl: 100,
      quantityOnHand: 0,
    });
    await assert.rejects(
      () =>
        completeOpsSale({
          customer: { name: "No series" },
          lines: [{ variantId: looseVariantId, quantity: 1 }],
          idempotencyKey: randomUUID(),
        }),
      (error: unknown) =>
        error instanceof DomainError && error.code === "INSUFFICIENT_STOCK",
    );
  });

  it("keeps an explicit zero unit price on a mixed invoice", async () => {
    const sampleId = await addVariant({
      productId,
      sizeMl: 30,
      quantityOnHand: 2,
      retailCents: 6_000,
    });
    const result = await completeOpsSale({
      customer: { name: "Staff sample" },
      lines: [
        { variantId: sampleId, quantity: 1, unitPriceCents: 0 },
        { variantId: variant100Id, quantity: 1 },
      ],
      idempotencyKey: randomUUID(),
      now: new Date("2094-03-04T12:00:00.000Z"),
    });
    assert.equal(result.totalCents, 14_000);
    assert.equal(result.filledBottles, 1);
    assert.equal(result.oilConsumedMl, 50);
  });

  it("ceils Signature 105 ml oil to 53 ml and puts the rest in base", async () => {
    const variant105Id = await addVariant({
      productId,
      sizeMl: 105,
      quantityOnHand: 0,
      retailCents: 26_000,
    });
    const result = await completeOpsSale({
      customer: { name: "Signature walk-in" },
      lines: [{ variantId: variant105Id, quantity: 1 }],
      idempotencyKey: randomUUID(),
      now: new Date("2094-03-05T12:00:00.000Z"),
    });
    assert.equal(result.totalCents, 26_000);
    assert.equal(result.oilConsumedMl, 53);
    assert.equal(result.baseConsumedMl, 52);
    assert.equal(await supplyOnHand(bottle105Id), 9);
  });

  it("uses each series' own oil share", async () => {
    const suffix = randomUUID();
    const light = await production.createProductSeries({
      name: `Light ${suffix}`,
      slug: `light-${suffix}`,
      oilConcentrationPercent: 30,
      oilReorderLevelMl: 0,
    });
    await production.upsertSeriesSize({
      seriesId: light.seriesId,
      sizeMl: 100,
      defaultRetailCents: 10_000,
      bottleSupplyId: bottle100Id,
      boxSupplyId: null,
      isActive: true,
    });
    const created = await production.createSeriesProduct({
      name: `Light oil ${suffix}`,
      slug: `light-oil-${suffix}`,
      seriesId: light.seriesId,
      variants: [
        {
          sizeMl: 100,
          sku: `LIGHT-100-${suffix}`,
          retailCents: 10_000,
          costCents: 3_000,
          reorderLevel: 0,
        },
      ],
    });
    await receiveOilLot({
      productId: created.productId,
      kgBottles: 1,
      idempotencyKey: randomUUID(),
    });
    const [variantId] = created.variantIds;
    assert.ok(variantId);
    const result = await completeOpsSale({
      customer: { name: "Light walk-in" },
      lines: [{ variantId, quantity: 1 }],
      idempotencyKey: randomUUID(),
      now: new Date("2094-03-06T12:00:00.000Z"),
    });
    assert.equal(result.oilConsumedMl, 30);
    assert.equal(result.baseConsumedMl, 70);
  });

  it("returns a sold bottle to stock without restoring oil or packaging", async () => {
    const sale = await completeOpsSale({
      customer: { name: "Return customer" },
      lines: [{ variantId: variant100Id, quantity: 1 }],
      idempotencyKey: randomUUID(),
      now: new Date("2094-03-07T12:00:00.000Z"),
    });
    const [line] = await db
      .select({ id: schema.invoiceLines.id })
      .from(schema.invoiceLines)
      .where(eq(schema.invoiceLines.invoiceId, sale.invoiceId));
    assert.ok(line);
    const oilBefore = await oilRemaining(productId);
    const bottlesBefore = await supplyOnHand(bottle100Id);

    const key = randomUUID();
    const returned = await receiveInvoiceLineReturn({
      invoiceId: sale.invoiceId,
      lineId: line.id,
      quantity: 1,
      reason: "Customer returned sealed bottle",
      idempotencyKey: key,
    });
    const replay = await receiveInvoiceLineReturn({
      invoiceId: sale.invoiceId,
      lineId: line.id,
      quantity: 1,
      reason: "Customer returned sealed bottle",
      idempotencyKey: key,
    });
    assert.equal(returned.idempotent, false);
    assert.equal(replay.idempotent, true);

    const [movement] = await db
      .select({ quantityDelta: schema.stockMovements.quantityDelta })
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.idempotencyKey, key));
    assert.equal(movement?.quantityDelta, 1);
    assert.equal(await oilRemaining(productId), oilBefore);
    assert.equal(await supplyOnHand(bottle100Id), bottlesBefore);
    assert.equal(await onHand(variant100Id), 1);

    await assert.rejects(
      () =>
        receiveInvoiceLineReturn({
          invoiceId: sale.invoiceId,
          lineId: line.id,
          quantity: 1,
          reason: "Second return",
          idempotencyKey: randomUUID(),
        }),
      (error: unknown) =>
        error instanceof DomainError && error.code === "INVALID_INPUT",
    );
  });
});
