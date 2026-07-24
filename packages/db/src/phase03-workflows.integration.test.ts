/**
 * Phase 03 workflow tests. They connect only when TEST_DATABASE_URL names a
 * guarded, disposable loopback database. No dotenv file is loaded.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;
process.env.BUSINESS_TIMEZONE = "Asia/Karachi";

describe("Phase 03 transactional workflows", () => {
  let api: typeof import("./index");
  const productIds = new Set<string>();
  const invoiceIds = new Set<string>();
  const customerIds = new Set<string>();
  const counterYears = new Set<number>();
  let customerId: string;
  let mainLocationId: string;
  let fixtureSequence = 0;

  function suffix(label: string): string {
    fixtureSequence += 1;
    return `${label}-${Date.now()}-${fixtureSequence}-${randomUUID().slice(0, 8)}`;
  }

  async function createVariantFixture(options: {
    quantityOnHand?: number;
    qtyReserved?: number;
    costCents?: number;
    sizeMl?: number;
  } = {}): Promise<{ productId: string; variantId: string; sku: string }> {
    const unique = suffix("variant");
    const [product] = await api.db
      .insert(api.products)
      .values({
        name: `Phase 03 ${unique}`,
        slug: `phase-03-${unique}`.toLowerCase(),
        status: "active",
      })
      .returning({ id: api.products.id });
    assert.ok(product);
    productIds.add(product.id);

    const sku = `P3-${unique}`.toUpperCase();
    const [variant] = await api.db
      .insert(api.productVariants)
      .values({
        productId: product.id,
        sku,
        sizeMl: options.sizeMl ?? fixtureSequence + 10,
        costCents: options.costCents ?? 250,
        retailCents: 1_000,
        quantityOnHand: options.quantityOnHand ?? 0,
        qtyReserved: options.qtyReserved ?? 0,
        reorderLevel: 0,
        version: 0,
        status: "active",
      })
      .returning({ id: api.productVariants.id });
    assert.ok(variant);
    return { productId: product.id, variantId: variant.id, sku };
  }

  async function createDraftWithLines(
    lines: Array<{
      variantId?: string;
      quantity: number;
      unitPriceCents: number;
      description?: string;
    }>,
  ): Promise<{ invoiceId: string; lineIds: string[] }> {
    const draft = await api.createInvoiceDraft({
      customerId,
      createdBy: "phase03-test",
    });
    invoiceIds.add(draft.invoiceId);
    const lineIds: string[] = [];
    for (const [index, line] of lines.entries()) {
      const created = await api.addInvoiceLine({
        invoiceId: draft.invoiceId,
        variantId: line.variantId ?? null,
        description: line.description ?? `Test line ${index + 1}`,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
      });
      lineIds.push(created.lineId);
    }
    return { invoiceId: draft.invoiceId, lineIds };
  }

  async function createIssuedInvoice(options: {
    lines?: Array<{
      variantId?: string;
      quantity: number;
      unitPriceCents: number;
    }>;
    now?: Date;
  } = {}): Promise<{ invoiceId: string; lineIds: string[] }> {
    const draft = await createDraftWithLines(
      options.lines ?? [{ quantity: 1, unitPriceCents: 1_000 }],
    );
    const now = options.now ?? new Date("2091-01-15T12:00:00.000Z");
    counterYears.add(api.businessYearAt(now));
    await api.issueInvoice(draft.invoiceId, { now });
    return draft;
  }

  async function rowsForInvoice(invoiceId: string) {
    const [invoice] = await api.db
      .select()
      .from(api.invoices)
      .where(eq(api.invoices.id, invoiceId))
      .limit(1);
    const lines = await api.db
      .select()
      .from(api.invoiceLines)
      .where(eq(api.invoiceLines.invoiceId, invoiceId))
      .orderBy(api.invoiceLines.id);
    const paymentRows = await api.db
      .select()
      .from(api.payments)
      .where(eq(api.payments.invoiceId, invoiceId));
    const movements = await api.db
      .select()
      .from(api.stockMovements)
      .where(
        and(
          eq(api.stockMovements.refType, "invoice"),
          eq(api.stockMovements.refId, invoiceId),
        ),
      );
    return { invoice, lines, payments: paymentRows, movements };
  }

  before(async () => {
    api = await import("./index");
    await api.seedMainLocation();
    const [location] = await api.db
      .select({ id: api.locations.id })
      .from(api.locations)
      .where(eq(api.locations.code, "MAIN"))
      .limit(1);
    assert.ok(location);
    mainLocationId = location.id;

    const [customer] = await api.db
      .insert(api.customers)
      .values({
        name: `Phase 03 Customer ${suffix("customer")}`,
        status: "active",
      })
      .returning({ id: api.customers.id });
    assert.ok(customer);
    customerId = customer.id;
    customerIds.add(customer.id);
  });

  after(async () => {
    await api.pool
      .query("DROP TRIGGER IF EXISTS phase03_reject_payment ON payments")
      .catch(() => undefined);
    await api.pool
      .query("DROP FUNCTION IF EXISTS phase03_reject_payment()")
      .catch(() => undefined);
    await api.pool
      .query(
        "DROP TRIGGER IF EXISTS phase03_reject_second_sale ON stock_movements",
      )
      .catch(() => undefined);
    await api.pool
      .query("DROP FUNCTION IF EXISTS phase03_reject_second_sale()")
      .catch(() => undefined);
    await api.pool
      .query("DROP TRIGGER IF EXISTS phase03_reject_invoice_total ON invoices")
      .catch(() => undefined);
    await api.pool
      .query("DROP FUNCTION IF EXISTS phase03_reject_invoice_total()")
      .catch(() => undefined);

    const trackedInvoices = [...invoiceIds];
    if (trackedInvoices.length > 0) {
      await api.db
        .delete(api.payments)
        .where(inArray(api.payments.invoiceId, trackedInvoices));
      await api.db
        .delete(api.invoiceLines)
        .where(inArray(api.invoiceLines.invoiceId, trackedInvoices));
      await api.db
        .delete(api.invoices)
        .where(inArray(api.invoices.id, trackedInvoices));
    }

    const trackedProducts = [...productIds];
    if (trackedProducts.length > 0) {
      // Test-owner cleanup bypasses user triggers only for this transaction.
      // Application/runtime sessions still receive SQLSTATE 55000.
      await api.pool.query("BEGIN");
      try {
        await api.pool.query(
          "SET LOCAL session_replication_role = replica",
        );
        await api.pool.query(
          `
            DELETE FROM stock_movements
            WHERE variant_id IN (
              SELECT id
              FROM product_variants
              WHERE product_id = ANY($1::uuid[])
            )
          `,
          [trackedProducts],
        );
        await api.pool.query(
          "DELETE FROM products WHERE id = ANY($1::uuid[])",
          [trackedProducts],
        );
        await api.pool.query("COMMIT");
      } catch (error) {
        await api.pool.query("ROLLBACK");
        throw error;
      }
    }

    if (customerIds.size > 0) {
      await api.db
        .delete(api.customers)
        .where(inArray(api.customers.id, [...customerIds]));
    }
    if (counterYears.size > 0) {
      await api.db
        .delete(api.documentNumberCounters)
        .where(
          inArray(api.documentNumberCounters.year, [...counterYears]),
        );
    }
    await api.pool.end();
  });

  it("allocates counter kind/year on the exact Karachi UTC rollover", async () => {
    await api.db
      .delete(api.documentNumberCounters)
      .where(inArray(api.documentNumberCounters.year, [2026, 2027]));
    counterYears.add(2026);
    counterYears.add(2027);

    const before = await api.runDomainTransaction((tx) =>
      api.allocateDocumentNumberInTransaction(
        tx,
        "invoice",
        new Date("2026-12-31T18:59:59.000Z"),
      ),
    );
    const after = await api.runDomainTransaction((tx) =>
      api.allocateDocumentNumberInTransaction(
        tx,
        "invoice",
        new Date("2026-12-31T19:00:00.000Z"),
      ),
    );

    assert.equal(before, "INV-2026-0001");
    assert.equal(after, "INV-2027-0001");
    const counters = await api.db
      .select()
      .from(api.documentNumberCounters)
      .where(inArray(api.documentNumberCounters.year, [2026, 2027]))
      .orderBy(api.documentNumberCounters.year);
    assert.deepEqual(
      counters.map(({ kind, year, lastValue }) => ({ kind, year, lastValue })),
      [
        { kind: "invoice", year: 2026, lastValue: 1 },
        { kind: "invoice", year: 2027, lastValue: 1 },
      ],
    );
  });

  it("20 parallel issue requests allocate one number and return one document", async () => {
    const draft = await createDraftWithLines([
      { quantity: 1, unitPriceCents: 1_250 },
    ]);
    const now = new Date("2091-02-01T12:00:00.000Z");
    counterYears.add(2091);

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        api.issueInvoice(draft.invoiceId, { now }),
      ),
    );

    assert.equal(new Set(results.map((result) => result.number)).size, 1);
    assert.equal(results.filter((result) => !result.idempotent).length, 1);
    const state = await rowsForInvoice(draft.invoiceId);
    assert.equal(state.invoice?.status, "issued");
    assert.equal(state.invoice?.totalCents, 1_250);
  });

  it("distinct concurrent issues allocate unique sequential invoice numbers", async () => {
    const year = 2093;
    counterYears.add(year);
    await api.db
      .delete(api.documentNumberCounters)
      .where(
        and(
          eq(api.documentNumberCounters.kind, "invoice"),
          eq(api.documentNumberCounters.year, year),
        ),
      );
    const drafts = await Promise.all(
      Array.from({ length: 20 }, () =>
        createDraftWithLines([{ quantity: 1, unitPriceCents: 100 }]),
      ),
    );
    const issued = await Promise.all(
      drafts.map((draft) =>
        api.issueInvoice(draft.invoiceId, {
          now: new Date("2093-01-10T10:00:00.000Z"),
        }),
      ),
    );
    const numbers = issued.map((row) => row.number).sort();
    assert.equal(new Set(numbers).size, 20);
    assert.deepEqual(
      numbers,
      Array.from(
        { length: 20 },
        (_, index) => `INV-2093-${String(index + 1).padStart(4, "0")}`,
      ),
    );
  });

  it("add-line racing issue cannot create a post-issue line", async () => {
    for (let run = 0; run < 10; run += 1) {
      const draft = await createDraftWithLines([
        { quantity: 1, unitPriceCents: 100 },
      ]);
      const [lineResult, issueResult] = await Promise.allSettled([
        api.addInvoiceLine({
          invoiceId: draft.invoiceId,
          description: "Racing line",
          quantity: 1,
          unitPriceCents: 200,
        }),
        api.issueInvoice(draft.invoiceId, {
          now: new Date("2094-01-01T10:00:00.000Z"),
        }),
      ]);
      counterYears.add(2094);
      assert.equal(issueResult.status, "fulfilled");
      const state = await rowsForInvoice(draft.invoiceId);
      assert.equal(state.invoice?.status, "issued");

      if (lineResult.status === "fulfilled") {
        assert.equal(state.lines.length, 2);
        assert.equal(state.invoice?.totalCents, 300);
      } else {
        assert.ok(
          lineResult.reason instanceof api.DomainError &&
            lineResult.reason.code === "INVALID_STATE",
        );
        assert.equal(state.lines.length, 1);
        assert.equal(state.invoice?.totalCents, 100);
      }
    }
  });

  it("serializes add-line against product archive without accepting an already-archived SKU", async () => {
    for (let run = 0; run < 10; run += 1) {
      const fixture = await createVariantFixture();
      const draft = await createDraftWithLines([]);

      const [lineResult, archiveResult] = await Promise.allSettled([
        api.addInvoiceLine({
          invoiceId: draft.invoiceId,
          variantId: fixture.variantId,
          description: "",
          quantity: 1,
          unitPriceCents: 0,
        }),
        api.archiveProduct(fixture.productId),
      ]);

      assert.equal(archiveResult.status, "fulfilled");
      const [product] = await api.db
        .select({ status: api.products.status })
        .from(api.products)
        .where(eq(api.products.id, fixture.productId))
        .limit(1);
      const [variant] = await api.db
        .select({ status: api.productVariants.status })
        .from(api.productVariants)
        .where(eq(api.productVariants.id, fixture.variantId))
        .limit(1);
      const state = await rowsForInvoice(draft.invoiceId);

      assert.equal(product?.status, "archived");
      assert.equal(variant?.status, "archived");
      if (lineResult.status === "fulfilled") {
        // Add-line held the product/variant locks first, so the line committed
        // against active rows before archive serialized behind it.
        assert.equal(state.lines.length, 1);
        assert.equal(state.lines[0]?.id, lineResult.value.lineId);
      } else {
        assert.ok(
          lineResult.reason instanceof api.DomainError &&
            lineResult.reason.code === "INVALID_STATE",
        );
        assert.equal(state.lines.length, 0);
      }

      const countBeforeStalePost = state.lines.length;
      await assert.rejects(
        () =>
          api.addInvoiceLine({
            invoiceId: draft.invoiceId,
            variantId: fixture.variantId,
            description: "",
            quantity: 1,
            unitPriceCents: 0,
          }),
        (error: unknown) =>
          error instanceof api.DomainError &&
          error.code === "INVALID_STATE",
      );
      const afterStalePost = await rowsForInvoice(draft.invoiceId);
      assert.equal(afterStalePost.lines.length, countBeforeStalePost);
    }
  });

  it("parallel draft-line writes get unique positions and atomic totals", async () => {
    const draft = await api.createInvoiceDraft({ customerId });
    invoiceIds.add(draft.invoiceId);

    const additions = await Promise.all([
      api.addInvoiceLine({
        invoiceId: draft.invoiceId,
        description: "A",
        quantity: 2,
        unitPriceCents: 100,
      }),
      api.addInvoiceLine({
        invoiceId: draft.invoiceId,
        description: "B",
        quantity: 3,
        unitPriceCents: 200,
      }),
    ]);
    let state = await rowsForInvoice(draft.invoiceId);
    assert.equal(state.invoice?.subtotalCents, 800);
    assert.deepEqual(
      state.lines.map((line) => line.position).sort((a, b) => a - b),
      [0, 1],
    );

    await Promise.all(
      additions.map((line) =>
        api.removeInvoiceLine({
          invoiceId: draft.invoiceId,
          lineId: line.lineId,
        }),
      ),
    );
    state = await rowsForInvoice(draft.invoiceId);
    assert.equal(state.lines.length, 0);
    assert.equal(state.invoice?.subtotalCents, 0);
    assert.equal(state.invoice?.totalCents, 0);
  });

  it("late invoice-total failure rolls back the inserted line", async () => {
    const draft = await api.createInvoiceDraft({ customerId });
    invoiceIds.add(draft.invoiceId);
    assert.match(draft.invoiceId, /^[0-9a-f-]{36}$/);

    await api.pool.query(`
      CREATE OR REPLACE FUNCTION phase03_reject_invoice_total()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.id = '${draft.invoiceId}' AND NEW.subtotal_cents > 0 THEN
          RAISE EXCEPTION 'phase03 injected invoice total failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await api.pool.query(`
      CREATE TRIGGER phase03_reject_invoice_total
      BEFORE UPDATE ON invoices
      FOR EACH ROW EXECUTE FUNCTION phase03_reject_invoice_total();
    `);

    try {
      await assert.rejects(() =>
        api.addInvoiceLine({
          invoiceId: draft.invoiceId,
          description: "Must roll back",
          quantity: 1,
          unitPriceCents: 500,
        }),
      );
    } finally {
      await api.pool.query(
        "DROP TRIGGER phase03_reject_invoice_total ON invoices",
      );
      await api.pool.query("DROP FUNCTION phase03_reject_invoice_total()");
    }

    const state = await rowsForInvoice(draft.invoiceId);
    assert.equal(state.lines.length, 0);
    assert.equal(state.invoice?.subtotalCents, 0);
    assert.equal(state.invoice?.totalCents, 0);
  });

  it("rolls product creation back when the initial SKU conflicts", async () => {
    const existing = await createVariantFixture({ sizeMl: 77 });
    const attemptedSlug = `rollback-product-${suffix("slug")}`.toLowerCase();

    await assert.rejects(
      () =>
        api.createProductWithInitialVariant({
          name: "Must roll back",
          slug: attemptedSlug,
          initialVariant: {
            sku: existing.sku,
            sizeMl: 88,
            costCents: 100,
            retailCents: 200,
            reorderLevel: 0,
          },
        }),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "SKU_CONFLICT",
    );

    const attempted = await api.db
      .select({ id: api.products.id })
      .from(api.products)
      .where(eq(api.products.slug, attemptedSlug));
    assert.equal(attempted.length, 0);
  });

  it("archives product and variants atomically without hiding or changing stock", async () => {
    const fixture = await createVariantFixture({
      quantityOnHand: 9,
      qtyReserved: 3,
    });
    const result = await api.archiveProduct(fixture.productId);
    assert.equal(result.idempotent, false);

    const [product] = await api.db
      .select()
      .from(api.products)
      .where(eq(api.products.id, fixture.productId));
    const [variant] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, fixture.variantId));
    assert.equal(product?.status, "archived");
    assert.equal(variant?.status, "archived");
    assert.equal(variant?.quantityOnHand, 9);
    assert.equal(variant?.qtyReserved, 3);

    const activeRows = await api.db
      .select({ id: api.productVariants.id })
      .from(api.productVariants)
      .where(
        and(
          eq(api.productVariants.id, fixture.variantId),
          eq(api.productVariants.status, "active"),
        ),
      );
    assert.equal(activeRows.length, 0);
    assert.equal((await api.archiveProduct(fixture.productId)).idempotent, true);
  });

  it("guards product and variant edits against stale writes without changing stock", async () => {
    const fixture = await createVariantFixture({
      quantityOnHand: 11,
      qtyReserved: 4,
      costCents: 300,
      sizeMl: 41,
    });
    const [beforeProduct] = await api.db
      .select()
      .from(api.products)
      .where(eq(api.products.id, fixture.productId));
    const [beforeVariant] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, fixture.variantId));
    assert.ok(beforeProduct);
    assert.ok(beforeVariant);

    await api.updateProduct({
      productId: fixture.productId,
      expectedUpdatedAt: beforeProduct.updatedAt,
      name: "Updated lifecycle product",
      brand: "Perfume Aura",
      category: "Test",
      description: "Edited without touching lifecycle state",
    });

    await assert.rejects(
      () =>
        api.updateProduct({
          productId: fixture.productId,
          expectedUpdatedAt: beforeProduct.updatedAt,
          name: "Stale product edit",
        }),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "STALE_WRITE",
    );

    await api.updateProductVariant({
      productId: fixture.productId,
      variantId: fixture.variantId,
      expectedVersion: beforeVariant.version,
      sku: `${fixture.sku}-EDIT`,
      barcode: "1234567890",
      sizeMl: 42,
      costCents: 350,
      retailCents: 1_200,
      reorderLevel: 5,
    });

    const [afterVariant] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, fixture.variantId));
    assert.ok(afterVariant);
    assert.equal(afterVariant.quantityOnHand, 11);
    assert.equal(afterVariant.qtyReserved, 4);
    assert.equal(afterVariant.version, beforeVariant.version + 1);
    assert.equal(afterVariant.costCents, 350);

    await assert.rejects(
      () =>
        api.updateProductVariant({
          productId: fixture.productId,
          variantId: fixture.variantId,
          expectedVersion: beforeVariant.version,
          sku: `${fixture.sku}-STALE`,
          sizeMl: 43,
          costCents: 400,
          retailCents: 1_300,
          reorderLevel: 5,
        }),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "STALE_WRITE",
    );
  });

  it("requires explicit per-variant restore after product reactivation", async () => {
    const fixture = await createVariantFixture({
      quantityOnHand: 8,
      qtyReserved: 2,
    });
    const [beforeProduct] = await api.db
      .select()
      .from(api.products)
      .where(eq(api.products.id, fixture.productId));
    assert.ok(beforeProduct);

    await api.archiveProduct(fixture.productId, {
      expectedUpdatedAt: beforeProduct.updatedAt,
    });

    const [archivedProduct] = await api.db
      .select()
      .from(api.products)
      .where(eq(api.products.id, fixture.productId));
    const [archivedVariant] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, fixture.variantId));
    assert.ok(archivedProduct);
    assert.ok(archivedVariant);
    assert.equal(archivedVariant.status, "archived");

    await api.reactivateProduct({
      productId: fixture.productId,
      expectedUpdatedAt: archivedProduct.updatedAt,
    });

    const [stillArchivedVariant] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, fixture.variantId));
    assert.ok(stillArchivedVariant);
    assert.equal(stillArchivedVariant.status, "archived");
    assert.equal(stillArchivedVariant.quantityOnHand, 8);
    assert.equal(stillArchivedVariant.qtyReserved, 2);

    const restored = await api.reactivateProductVariant({
      productId: fixture.productId,
      variantId: fixture.variantId,
      expectedVersion: stillArchivedVariant.version,
    });
    assert.equal(restored.version, stillArchivedVariant.version + 1);

    await assert.rejects(
      () =>
        api.archiveProductVariant({
          productId: fixture.productId,
          variantId: fixture.variantId,
          expectedVersion: stillArchivedVariant.version,
        }),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "STALE_WRITE",
    );

    const archivedAgain = await api.archiveProductVariant({
      productId: fixture.productId,
      variantId: fixture.variantId,
      expectedVersion: restored.version,
    });
    assert.equal(archivedAgain.version, restored.version + 1);

    const [finalVariant] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, fixture.variantId));
    assert.equal(finalVariant?.status, "archived");
    assert.equal(finalVariant?.quantityOnHand, 8);
    assert.equal(finalVariant?.qtyReserved, 2);
  });

  it("allocates 20 unique payment numbers in parallel", async () => {
    const now = new Date("2092-03-10T10:00:00.000Z");
    counterYears.add(2092);
    const issued = await Promise.all(
      Array.from({ length: 20 }, () =>
        createIssuedInvoice({
          now,
          lines: [{ quantity: 1, unitPriceCents: 100 }],
        }),
      ),
    );
    const recorded = await Promise.all(
      issued.map((invoice, index) =>
        api.recordPayment({
          invoiceId: invoice.invoiceId,
          amountCents: 100,
          method: "cash",
          paidAt: new Date(now.getTime() + index),
          idempotencyKey: randomUUID(),
        }),
      ),
    );
    const numbers = recorded.map((payment) => payment.number);
    assert.equal(new Set(numbers).size, 20);
    assert.ok(numbers.every((number) => number?.startsWith("PAY-2092-")));
  });

  it("serializes competing payments so the authoritative ledger cannot overpay", async () => {
    const issued = await createIssuedInvoice();
    const paidAt = new Date("2091-04-01T10:00:00.000Z");
    const results = await Promise.allSettled([
      api.recordPayment({
        invoiceId: issued.invoiceId,
        amountCents: 700,
        method: "cash",
        paidAt,
        idempotencyKey: randomUUID(),
      }),
      api.recordPayment({
        invoiceId: issued.invoiceId,
        amountCents: 700,
        method: "cash",
        paidAt,
        idempotencyKey: randomUUID(),
      }),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(rejected && rejected.status === "rejected");
    assert.ok(
      rejected.reason instanceof api.DomainError &&
        rejected.reason.code === "OVERPAYMENT",
    );

    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.payments.length, 1);
    assert.equal(state.invoice?.amountPaidCents, 700);
    assert.equal(state.payments[0]?.amountCents, 700);
  });

  it("payment racing void has exactly one committed outcome", async () => {
    const issued = await createIssuedInvoice({
      lines: [{ quantity: 1, unitPriceCents: 100 }],
    });
    const results = await Promise.allSettled([
      api.recordPayment({
        invoiceId: issued.invoiceId,
        amountCents: 100,
        method: "cash",
        paidAt: new Date("2091-04-02T10:00:00.000Z"),
        idempotencyKey: randomUUID(),
      }),
      api.voidInvoice(issued.invoiceId),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const state = await rowsForInvoice(issued.invoiceId);
    if (state.invoice?.status === "void") {
      assert.equal(state.payments.length, 0);
      assert.equal(state.invoice.amountPaidCents, 0);
    } else {
      assert.equal(state.invoice?.status, "paid");
      assert.equal(state.payments.length, 1);
      assert.equal(state.invoice?.amountPaidCents, 100);
    }
  });

  it("deduplicates an exact payment and rejects every payload mismatch", async () => {
    const issued = await createIssuedInvoice();
    const otherInvoice = await createIssuedInvoice();
    const idempotencyKey = randomUUID();
    const paidAt = new Date("2091-05-01T10:00:00.000Z");
    const [first, replay] = await Promise.all([
      api.recordPayment({
        invoiceId: issued.invoiceId,
        amountCents: 400,
        method: "bank_transfer",
        paidAt,
        idempotencyKey,
      }),
      api.recordPayment({
        invoiceId: issued.invoiceId,
        amountCents: 400,
        method: "bank_transfer",
        paidAt,
        idempotencyKey,
      }),
    ]);
    assert.equal(first.paymentId, replay.paymentId);
    assert.equal([first, replay].filter((row) => row.idempotent).length, 1);

    const conflicts = [
      {
        label: "invoice",
        input: {
          invoiceId: otherInvoice.invoiceId,
          amountCents: 400,
          method: "bank_transfer" as const,
          paidAt,
          idempotencyKey,
        },
      },
      {
        label: "amount",
        input: {
          invoiceId: issued.invoiceId,
          amountCents: 401,
          method: "bank_transfer" as const,
          paidAt,
          idempotencyKey,
        },
      },
      {
        label: "method",
        input: {
          invoiceId: issued.invoiceId,
          amountCents: 400,
          method: "cash" as const,
          paidAt,
          idempotencyKey,
        },
      },
      {
        label: "effective paidAt",
        input: {
          invoiceId: issued.invoiceId,
          amountCents: 400,
          method: "bank_transfer" as const,
          paidAt: new Date("2091-05-01T11:00:00.000Z"),
          idempotencyKey,
        },
      },
    ];

    for (const conflict of conflicts) {
      await assert.rejects(
        () => api.recordPayment(conflict.input),
        (error: unknown) =>
          error instanceof api.DomainError &&
          error.code === "IDEMPOTENCY_CONFLICT",
        conflict.label,
      );
    }

    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.payments.length, 1);
    assert.equal(state.invoice?.amountPaidCents, 400);
    const otherState = await rowsForInvoice(otherInvoice.invoiceId);
    assert.equal(otherState.payments.length, 0);
    assert.equal(otherState.invoice?.amountPaidCents, 0);
  });

  it("mark-paid uses the payment primitive and replay cannot move paidAt backward", async () => {
    const issued = await createIssuedInvoice();
    const firstAt = new Date("2091-06-01T10:00:00.000Z");
    const completionAt = new Date("2091-06-02T10:00:00.000Z");
    const firstKey = randomUUID();
    await api.recordPayment({
      invoiceId: issued.invoiceId,
      amountCents: 400,
      method: "cash",
      paidAt: firstAt,
      idempotencyKey: firstKey,
    });
    const completionKey = randomUUID();
    const completion = await api.recordRemainingInvoiceBalance({
      invoiceId: issued.invoiceId,
      method: "cash",
      paidAt: completionAt,
      idempotencyKey: completionKey,
    });
    assert.equal(completion.amountCents, 600);
    assert.equal(completion.fullyPaid, true);

    await api.recordPayment({
      invoiceId: issued.invoiceId,
      amountCents: 400,
      method: "cash",
      paidAt: firstAt,
      idempotencyKey: firstKey,
    });
    const markReplay = await api.recordRemainingInvoiceBalance({
      invoiceId: issued.invoiceId,
      method: "cash",
      paidAt: completionAt,
      idempotencyKey: completionKey,
    });
    assert.equal(markReplay.idempotent, true);

    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.invoice?.status, "paid");
    assert.equal(state.invoice?.amountPaidCents, 1_000);
    assert.equal(state.invoice?.paidAt?.toISOString(), completionAt.toISOString());
    assert.equal(state.payments.length, 2);
  });

  it("payment insert failure rolls back counter, ledger, and invoice cache", async () => {
    const issued = await createIssuedInvoice();
    const paidAt = new Date("2098-01-02T10:00:00.000Z");
    const businessYear = api.businessYearAt(paidAt);
    counterYears.add(businessYear);
    const idempotencyKey = randomUUID();
    assert.match(idempotencyKey, /^[0-9a-f-]{36}$/);

    const [beforeCounter] = await api.db
      .select()
      .from(api.documentNumberCounters)
      .where(
        and(
          eq(api.documentNumberCounters.kind, "payment"),
          eq(api.documentNumberCounters.year, businessYear),
        ),
      );

    await api.pool.query(`
      CREATE OR REPLACE FUNCTION phase03_reject_payment()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.idempotency_key = '${idempotencyKey}' THEN
          RAISE EXCEPTION 'phase03 injected payment failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await api.pool.query(`
      CREATE TRIGGER phase03_reject_payment
      BEFORE INSERT ON payments
      FOR EACH ROW EXECUTE FUNCTION phase03_reject_payment();
    `);

    try {
      await assert.rejects(() =>
        api.recordPayment({
          invoiceId: issued.invoiceId,
          amountCents: 100,
          method: "cash",
          paidAt,
          idempotencyKey,
        }),
      );
    } finally {
      await api.pool.query(
        "DROP TRIGGER phase03_reject_payment ON payments",
      );
      await api.pool.query("DROP FUNCTION phase03_reject_payment()");
    }

    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.payments.length, 0);
    assert.equal(state.invoice?.amountPaidCents, 0);
    assert.equal(state.invoice?.status, "issued");
    const [afterCounter] = await api.db
      .select()
      .from(api.documentNumberCounters)
      .where(
        and(
          eq(api.documentNumberCounters.kind, "payment"),
          eq(api.documentNumberCounters.year, businessYear),
        ),
      );
    assert.deepEqual(afterCounter, beforeCounter);
  });

  it("rejects aggregated same-variant demand before any fulfillment mutation", async () => {
    const variant = await createVariantFixture({ quantityOnHand: 6 });
    const issued = await createIssuedInvoice({
      lines: [
        { variantId: variant.variantId, quantity: 4, unitPriceCents: 100 },
        { variantId: variant.variantId, quantity: 4, unitPriceCents: 100 },
      ],
    });

    await assert.rejects(
      () => api.fulfillInvoice({ invoiceId: issued.invoiceId }),
      (error: unknown) =>
        error instanceof api.DomainError &&
        error.code === "INSUFFICIENT_STOCK",
    );
    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.movements.length, 0);
    assert.ok(state.lines.every((line) => line.quantityFulfilled === 0));
    const [after] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, variant.variantId));
    assert.equal(after?.quantityOnHand, 6);
  });

  it("fulfills an already-issued invoice after its product and variant are archived", async () => {
    const fixture = await createVariantFixture({ quantityOnHand: 2 });
    const issued = await createIssuedInvoice({
      lines: [
        {
          variantId: fixture.variantId,
          quantity: 1,
          unitPriceCents: 1_000,
        },
      ],
    });

    await api.archiveProduct(fixture.productId);
    const [archivedProduct] = await api.db
      .select({ status: api.products.status })
      .from(api.products)
      .where(eq(api.products.id, fixture.productId))
      .limit(1);
    const [archivedVariant] = await api.db
      .select({ status: api.productVariants.status })
      .from(api.productVariants)
      .where(eq(api.productVariants.id, fixture.variantId))
      .limit(1);
    assert.equal(archivedProduct?.status, "archived");
    assert.equal(archivedVariant?.status, "archived");

    const result = await api.fulfillInvoice({ invoiceId: issued.invoiceId });
    assert.equal(result.fulfilledLines, 1);
    assert.equal(result.idempotent, false);

    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.lines[0]?.quantityFulfilled, 1);
    assert.equal(state.movements.length, 1);
    assert.equal(state.movements[0]?.type, "sale");
    assert.equal(state.movements[0]?.quantityAfter, 1);
  });

  it("validates every selected line belongs to the target invoice", async () => {
    const variant = await createVariantFixture({ quantityOnHand: 3 });
    const target = await createIssuedInvoice({
      lines: [
        { variantId: variant.variantId, quantity: 1, unitPriceCents: 100 },
      ],
    });
    const other = await createIssuedInvoice({
      lines: [
        { variantId: variant.variantId, quantity: 1, unitPriceCents: 100 },
      ],
    });

    await assert.rejects(
      () =>
        api.fulfillInvoice({
          invoiceId: target.invoiceId,
          lineIds: [target.lineIds[0]!, other.lineIds[0]!],
        }),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "NOT_FOUND",
    );
    assert.equal((await rowsForInvoice(target.invoiceId)).movements.length, 0);
  });

  it("opposite client line orders lock deterministically and cannot double-fulfill", async () => {
    const firstVariant = await createVariantFixture({
      quantityOnHand: 1,
      costCents: 321,
    });
    const secondVariant = await createVariantFixture({
      quantityOnHand: 1,
      costCents: 654,
    });
    const issued = await createIssuedInvoice({
      lines: [
        {
          variantId: firstVariant.variantId,
          quantity: 1,
          unitPriceCents: 900,
        },
        {
          variantId: secondVariant.variantId,
          quantity: 1,
          unitPriceCents: 900,
        },
      ],
    });

    const [forward, reverse] = await Promise.all([
      api.fulfillInvoice({
        invoiceId: issued.invoiceId,
        lineIds: issued.lineIds,
      }),
      api.fulfillInvoice({
        invoiceId: issued.invoiceId,
        lineIds: [...issued.lineIds].reverse(),
      }),
    ]);
    assert.equal(
      [forward, reverse].filter((result) => !result.idempotent).length,
      1,
    );
    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.movements.length, 2);
    assert.ok(state.lines.every((line) => line.quantityFulfilled === 1));
    assert.deepEqual(
      state.movements
        .map((movement) => ({
          cost: movement.unitCostCents,
          basis: movement.costBasis,
        }))
        .sort((left, right) => (left.cost ?? 0) - (right.cost ?? 0)),
      [
        { cost: 321, basis: "snapshot" },
        { cost: 654, basis: "snapshot" },
      ],
    );
  });

  it("fulfillment racing void has exactly one committed outcome", async () => {
    const variant = await createVariantFixture({ quantityOnHand: 1 });
    const issued = await createIssuedInvoice({
      lines: [
        { variantId: variant.variantId, quantity: 1, unitPriceCents: 100 },
      ],
    });
    const results = await Promise.allSettled([
      api.fulfillInvoice({ invoiceId: issued.invoiceId }),
      api.voidInvoice(issued.invoiceId),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const state = await rowsForInvoice(issued.invoiceId);
    const [variantAfter] = await api.db
      .select()
      .from(api.productVariants)
      .where(eq(api.productVariants.id, variant.variantId));
    if (state.invoice?.status === "void") {
      assert.equal(state.movements.length, 0);
      assert.equal(state.lines[0]?.quantityFulfilled, 0);
      assert.equal(variantAfter?.quantityOnHand, 1);
    } else {
      assert.equal(state.invoice?.status, "issued");
      assert.equal(state.movements.length, 1);
      assert.equal(state.lines[0]?.quantityFulfilled, 1);
      assert.equal(variantAfter?.quantityOnHand, 0);
    }
  });

  it("finance keeps an actual fulfillment cost snapshot after variant cost changes", async () => {
    const variant = await createVariantFixture({
      quantityOnHand: 1,
      costCents: 432,
    });
    const issued = await createIssuedInvoice({
      lines: [
        { variantId: variant.variantId, quantity: 1, unitPriceCents: 1_000 },
      ],
    });
    await api.fulfillInvoice({ invoiceId: issued.invoiceId });

    const now = new Date(Date.now() + 1_000);
    const before = await api.getFinanceSnapshot(30, { now });
    await api.db
      .update(api.productVariants)
      .set({ costCents: 99_999 })
      .where(eq(api.productVariants.id, variant.variantId));
    const afterCostChange = await api.getFinanceSnapshot(30, { now });
    assert.equal(afterCostChange.cogsSnapshotCents, before.cogsSnapshotCents);

    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.movements[0]?.unitCostCents, 432);
    assert.equal(state.movements[0]?.costBasis, "snapshot");
  });

  it("an injected second-ledger failure rolls the whole fulfillment back", async () => {
    const firstVariant = await createVariantFixture({ quantityOnHand: 2 });
    const secondVariant = await createVariantFixture({ quantityOnHand: 2 });
    const issued = await createIssuedInvoice({
      lines: [
        {
          variantId: firstVariant.variantId,
          quantity: 1,
          unitPriceCents: 100,
        },
        {
          variantId: secondVariant.variantId,
          quantity: 1,
          unitPriceCents: 100,
        },
      ],
    });
    assert.match(issued.invoiceId, /^[0-9a-f-]{36}$/);

    await api.pool.query(`
      CREATE OR REPLACE FUNCTION phase03_reject_second_sale()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.ref_type = 'invoice'
          AND NEW.ref_id = '${issued.invoiceId}'
          AND EXISTS (
            SELECT 1
            FROM stock_movements
            WHERE ref_type = 'invoice'
              AND ref_id = NEW.ref_id
              AND type = 'sale'
          )
        THEN
          RAISE EXCEPTION 'phase03 injected second sale failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await api.pool.query(`
      CREATE TRIGGER phase03_reject_second_sale
      BEFORE INSERT ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION phase03_reject_second_sale();
    `);

    try {
      await assert.rejects(() =>
        api.fulfillInvoice({ invoiceId: issued.invoiceId }),
      );
    } finally {
      await api.pool.query(
        "DROP TRIGGER phase03_reject_second_sale ON stock_movements",
      );
      await api.pool.query("DROP FUNCTION phase03_reject_second_sale()");
    }

    const state = await rowsForInvoice(issued.invoiceId);
    assert.equal(state.movements.length, 0);
    assert.ok(state.lines.every((line) => line.quantityFulfilled === 0));
    for (const variantId of [
      firstVariant.variantId,
      secondVariant.variantId,
    ]) {
      const [variant] = await api.db
        .select()
        .from(api.productVariants)
        .where(eq(api.productVariants.id, variantId));
      assert.equal(variant?.quantityOnHand, 2);
      assert.equal(variant?.version, 0);
    }
  });

  it("void is idempotent only at zero payment and zero fulfillment", async () => {
    const clean = await createIssuedInvoice();
    assert.equal((await api.voidInvoice(clean.invoiceId)).idempotent, false);
    assert.equal((await api.voidInvoice(clean.invoiceId)).idempotent, true);

    const paid = await createIssuedInvoice();
    await api.recordPayment({
      invoiceId: paid.invoiceId,
      amountCents: 100,
      method: "cash",
      paidAt: new Date("2091-08-01T10:00:00.000Z"),
      idempotencyKey: randomUUID(),
    });
    await assert.rejects(
      () => api.voidInvoice(paid.invoiceId),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "INVALID_STATE",
    );

    const variant = await createVariantFixture({ quantityOnHand: 1 });
    const fulfilled = await createIssuedInvoice({
      lines: [
        { variantId: variant.variantId, quantity: 1, unitPriceCents: 100 },
      ],
    });
    await api.fulfillInvoice({ invoiceId: fulfilled.invoiceId });
    await assert.rejects(
      () => api.voidInvoice(fulfilled.invoiceId),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "INVALID_STATE",
    );
  });

  it("counter exhaustion rolls back issue state", async () => {
    const year = 2099;
    counterYears.add(year);
    await api.db
      .insert(api.documentNumberCounters)
      .values({ kind: "invoice", year, lastValue: 9_999 })
      .onConflictDoUpdate({
        target: [
          api.documentNumberCounters.kind,
          api.documentNumberCounters.year,
        ],
        set: { lastValue: 9_999 },
      });
    const draft = await createDraftWithLines([
      { quantity: 1, unitPriceCents: 100 },
    ]);

    await assert.rejects(
      () =>
        api.issueInvoice(draft.invoiceId, {
          now: new Date("2099-01-01T10:00:00.000Z"),
        }),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "CONFLICT",
    );
    const state = await rowsForInvoice(draft.invoiceId);
    assert.equal(state.invoice?.status, "draft");
    assert.equal(state.invoice?.number, null);
    const [counter] = await api.db
      .select()
      .from(api.documentNumberCounters)
      .where(
        and(
          eq(api.documentNumberCounters.kind, "invoice"),
          eq(api.documentNumberCounters.year, year),
        ),
      );
    assert.equal(counter?.lastValue, 9_999);
  });

  it("finance separates snapshot and legacy while contract rejects missing cost", async () => {
    const variant = await createVariantFixture({
      quantityOnHand: 20,
      costCents: 999,
    });
    const createdAt = new Date("2100-01-10T10:00:00.000Z");
    await api.db.insert(api.stockMovements).values([
      {
        variantId: variant.variantId,
        locationId: mainLocationId,
        type: "sale",
        quantityDelta: -2,
        quantityAfter: 18,
        unitCostCents: 100,
        costBasis: "snapshot",
        idempotencyKey: randomUUID(),
        createdAt,
      },
      {
        variantId: variant.variantId,
        locationId: mainLocationId,
        type: "sale",
        quantityDelta: -3,
        quantityAfter: 15,
        unitCostCents: 200,
        costBasis: "legacy_current",
        idempotencyKey: randomUUID(),
        createdAt,
      },
    ]);

    await assert.rejects(
      () =>
        api.db.insert(api.stockMovements).values({
          variantId: variant.variantId,
          locationId: mainLocationId,
          type: "sale",
          quantityDelta: -1,
          quantityAfter: 14,
          unitCostCents: null,
          costBasis: null,
          idempotencyKey: randomUUID(),
          createdAt,
        }),
      (error: unknown) => {
        let current = error;
        for (let depth = 0; depth < 5; depth += 1) {
          if (
            current &&
            typeof current === "object" &&
            "constraint" in current &&
            current.constraint === "stock_movements_cost_snapshot_check"
          ) {
            return true;
          }
          current =
            current && typeof current === "object" && "cause" in current
              ? current.cause
              : undefined;
        }
        return false;
      },
    );

    const snapshot = await api.getFinanceSnapshot(2, {
      now: new Date("2100-01-11T10:00:00.000Z"),
    });
    assert.equal(snapshot.cogsSnapshotCents, 200);
    assert.equal(snapshot.cogsLegacyCurrentCents, 600);
    assert.equal(snapshot.cogsTotalCents, 800);
    assert.equal(snapshot.cogsSnapshotDefectCount, 0);
  });
});
