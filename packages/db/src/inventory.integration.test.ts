/**
 * Integration tests against a disposable local PostgreSQL database
 * (pg Pool + interactive TX).
 *
 * Requires an explicitly safe TEST_DATABASE_URL. Never loads app or package
 * dotenv files. Missing or unsafe targets fail closed.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, before, after } from "node:test";
import { eq } from "drizzle-orm";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;

describe("applyMovement integration", () => {
  let applyMovement: typeof import("./inventory").applyMovement;
  let InventoryError: typeof import("./inventory").InventoryError;
  let archiveProduct: typeof import("./product-workflows").archiveProduct;
  let db: typeof import("./client").db;
  let pool: typeof import("./client").pool;
  let products: typeof import("./schema/index").products;
  let productVariants: typeof import("./schema/index").productVariants;
  let stockMovements: typeof import("./schema/index").stockMovements;
  let seedMainLocation: typeof import("./seed").seedMainLocation;

  let productId: string;
  let variantId: string;
  const createdMovementIds: string[] = [];

  before(async () => {
    ({ applyMovement, InventoryError } = await import("./inventory"));
    ({ archiveProduct } = await import("./product-workflows"));
    ({ db, pool } = await import("./client"));
    ({ products, productVariants, stockMovements } = await import(
      "./schema/index"
    ));
    ({ seedMainLocation } = await import("./seed"));

    await seedMainLocation();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [product] = await db
      .insert(products)
      .values({
        name: `Test Concurrent ${suffix}`,
        slug: `test-concurrent-${suffix}`,
        status: "active",
      })
      .returning();

    assert.ok(product);
    productId = product.id;

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId,
        sku: `TEST-CONC-${suffix}`,
        sizeMl: 50,
        costCents: 100_00,
        retailCents: 250_00,
        quantityOnHand: 1,
        qtyReserved: 0,
        reorderLevel: 0,
        version: 0,
        status: "active",
      })
      .returning();

    assert.ok(variant);
    variantId = variant.id;
  });

  after(async () => {
    if (variantId) {
      // Test-owner cleanup bypasses user triggers only for this transaction.
      // Runtime behavior is still append-only and is tested separately.
      await pool.query("BEGIN");
      try {
        await pool.query("SET LOCAL session_replication_role = replica");
        await pool.query(
          "DELETE FROM stock_movements WHERE variant_id = $1",
          [variantId],
        );
        await pool.query("DELETE FROM products WHERE id = $1", [productId]);
        await pool.query("COMMIT");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }
    await pool.end().catch(() => undefined);
  });

  it("concurrent sell of last unit: exactly one success", async () => {
    // Ensure single unit available
    await db
      .update(productVariants)
      .set({ quantityOnHand: 1, qtyReserved: 0 })
      .where(eq(productVariants.id, variantId));

    const [a, b] = await Promise.allSettled([
      applyMovement({
        variantId,
        type: "sale",
        quantity: 1,
        note: "race-a",
      }),
      applyMovement({
        variantId,
        type: "sale",
        quantity: 1,
        note: "race-b",
      }),
    ]);

    const successes = [a, b].filter((r) => r.status === "fulfilled");
    const failures = [a, b].filter((r) => r.status === "rejected");

    assert.equal(
      successes.length,
      1,
      `expected exactly one success, got ${successes.length} success / ${failures.length} fail: ${JSON.stringify(
        [a, b].map((r) =>
          r.status === "fulfilled"
            ? { ok: true, after: r.value.quantityAfter }
            : {
                ok: false,
                err: r.reason instanceof Error ? r.reason.message : r.reason,
              },
        ),
      )}`,
    );
    assert.equal(failures.length, 1);

    const failed = failures[0];
    assert.ok(failed && failed.status === "rejected");
    const reason = failed.reason;
    assert.ok(
      reason instanceof InventoryError &&
        (reason.code === "INSUFFICIENT_STOCK" || reason.code === "CONFLICT"),
      `unexpected failure: ${reason}`,
    );

    const [v] = await db
      .select({
        quantityOnHand: productVariants.quantityOnHand,
      })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    assert.equal(v?.quantityOnHand, 0);

    const moves = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.variantId, variantId));

    const saleMoves = moves.filter((m) => m.type === "sale");
    assert.equal(saleMoves.length, 1);
    assert.equal(saleMoves[0]?.quantityAfter, 0);
    createdMovementIds.push(...moves.map((m) => m.id));
  });

  it("failed outbound leaves no orphan movement (TX rollback)", async () => {
    await db
      .update(productVariants)
      .set({ quantityOnHand: 2, qtyReserved: 0 })
      .where(eq(productVariants.id, variantId));

    const beforeMoves = await db
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(eq(stockMovements.variantId, variantId));

    await assert.rejects(
      () =>
        applyMovement({
          variantId,
          type: "sale",
          quantity: 99,
          note: "should-fail",
        }),
      (err: unknown) =>
        err instanceof InventoryError && err.code === "INSUFFICIENT_STOCK",
    );

    const afterMoves = await db
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(eq(stockMovements.variantId, variantId));

    assert.equal(afterMoves.length, beforeMoves.length);

    const [v] = await db
      .select({ quantityOnHand: productVariants.quantityOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    assert.equal(v?.quantityOnHand, 2);
  });

  it("exact receive replay returns the original movement without double-applying", async () => {
    await db
      .update(productVariants)
      .set({ quantityOnHand: 5, qtyReserved: 0 })
      .where(eq(productVariants.id, variantId));

    const key = randomUUID();
    const input = {
      variantId,
      type: "receive" as const,
      quantity: 1,
      note: "PO-RECEIVE-1",
      userId: "stock-user-a",
      refType: "manual-receive",
      refId: "receive-request-1",
      idempotencyKey: key,
    };
    const first = await applyMovement(input);
    const second = await applyMovement(input);

    assert.equal(first.idempotent, false);
    assert.equal(second.idempotent, true);
    assert.equal(first.movementId, second.movementId);
    assert.equal(first.quantityAfter, second.quantityAfter);
    assert.equal(first.productId, productId);
    assert.equal(second.productId, productId);

    const [v] = await db
      .select({ quantityOnHand: productVariants.quantityOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    assert.equal(v?.quantityOnHand, 6);

    const conflicts = [
      { ...input, quantity: 2 },
      { ...input, note: "different receive note" },
      { ...input, userId: "stock-user-b" },
      { ...input, refId: "different-receive-request" },
    ];

    for (const conflict of conflicts) {
      await assert.rejects(
        () => applyMovement(conflict),
        (error: unknown) =>
          error instanceof InventoryError &&
          error.code === "IDEMPOTENCY_CONFLICT",
      );
    }

    const [afterConflict] = await db
      .select({ quantityOnHand: productVariants.quantityOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);
    assert.equal(afterConflict?.quantityOnHand, 6);

    const movementsForKey = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.idempotencyKey, key));
    assert.equal(movementsForKey.length, 1);
    assert.equal(movementsForKey[0]?.note, input.note);
    assert.equal(movementsForKey[0]?.createdBy, input.userId);
  });

  it("exact adjustment replay is idempotent and mismatched key reuse is rejected", async () => {
    await db
      .update(productVariants)
      .set({ quantityOnHand: 10, qtyReserved: 0 })
      .where(eq(productVariants.id, variantId));

    const key = randomUUID();
    const input = {
      variantId,
      type: "adjust" as const,
      quantityDelta: -2,
      note: "Cycle count correction",
      userId: "stock-user-a",
      idempotencyKey: key,
    };

    const first = await applyMovement(input);
    const second = await applyMovement(input);

    assert.equal(first.idempotent, false);
    assert.equal(second.idempotent, true);
    assert.equal(first.movementId, second.movementId);
    assert.equal(first.quantityAfter, 8);
    assert.equal(second.quantityAfter, 8);
    assert.equal(first.productId, productId);
    assert.equal(second.productId, productId);

    const conflicts = [
      { ...input, quantityDelta: -3 },
      { ...input, note: "Different adjustment reason" },
      { ...input, userId: "stock-user-b" },
    ];

    for (const conflict of conflicts) {
      await assert.rejects(
        () => applyMovement(conflict),
        (error: unknown) =>
          error instanceof InventoryError &&
          error.code === "IDEMPOTENCY_CONFLICT",
      );
    }

    const [variant] = await db
      .select({ quantityOnHand: productVariants.quantityOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);
    assert.equal(variant?.quantityOnHand, 8);

    const movementsForKey = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.idempotencyKey, key));
    assert.equal(movementsForKey.length, 1);
    assert.equal(movementsForKey[0]?.note, input.note);
    assert.equal(movementsForKey[0]?.createdBy, input.userId);
  });

  it("replays exact receive and adjust retries after archive while rejecting conflicting reuse", async () => {
    await db
      .update(products)
      .set({ status: "active" })
      .where(eq(products.id, productId));
    await db
      .update(productVariants)
      .set({
        status: "active",
        quantityOnHand: 5,
        qtyReserved: 0,
      })
      .where(eq(productVariants.id, variantId));

    const receiveInput = {
      variantId,
      type: "receive" as const,
      quantity: 2,
      note: "Archive-safe receive replay",
      idempotencyKey: randomUUID(),
    };
    const received = await applyMovement(receiveInput);
    await archiveProduct(productId);
    const receiveReplay = await applyMovement(receiveInput);
    assert.equal(receiveReplay.idempotent, true);
    assert.equal(receiveReplay.movementId, received.movementId);
    assert.equal(receiveReplay.quantityAfter, received.quantityAfter);
    await assert.rejects(
      () => applyMovement({ ...receiveInput, quantity: 3 }),
      (error: unknown) =>
        error instanceof InventoryError &&
        error.code === "IDEMPOTENCY_CONFLICT",
    );

    await db
      .update(products)
      .set({ status: "active" })
      .where(eq(products.id, productId));
    await db
      .update(productVariants)
      .set({
        status: "active",
        quantityOnHand: 8,
        qtyReserved: 0,
      })
      .where(eq(productVariants.id, variantId));

    const adjustInput = {
      variantId,
      type: "adjust" as const,
      quantityDelta: -2,
      note: "Archive-safe adjustment replay",
      idempotencyKey: randomUUID(),
    };
    const adjusted = await applyMovement(adjustInput);
    await archiveProduct(productId);
    const adjustReplay = await applyMovement(adjustInput);
    assert.equal(adjustReplay.idempotent, true);
    assert.equal(adjustReplay.movementId, adjusted.movementId);
    assert.equal(adjustReplay.quantityAfter, adjusted.quantityAfter);
    await assert.rejects(
      () =>
        applyMovement({
          ...adjustInput,
          note: "Conflicting archived adjustment retry",
        }),
      (error: unknown) =>
        error instanceof InventoryError &&
        error.code === "IDEMPOTENCY_CONFLICT",
    );

    const replayRows = await db
      .select()
      .from(stockMovements)
      .where(
        eq(stockMovements.idempotencyKey, receiveInput.idempotencyKey),
      );
    const adjustReplayRows = await db
      .select()
      .from(stockMovements)
      .where(
        eq(stockMovements.idempotencyKey, adjustInput.idempotencyKey),
      );
    assert.equal(replayRows.length, 1);
    assert.equal(adjustReplayRows.length, 1);

    await db
      .update(products)
      .set({ status: "active" })
      .where(eq(products.id, productId));
    await db
      .update(productVariants)
      .set({ status: "active" })
      .where(eq(productVariants.id, variantId));
  });

  it("serializes manual stock mutation against product archive", async () => {
    for (let run = 0; run < 10; run += 1) {
      await db
        .update(products)
        .set({ status: "active" })
        .where(eq(products.id, productId));
      await db
        .update(productVariants)
        .set({
          status: "active",
          quantityOnHand: 10,
          qtyReserved: 0,
        })
        .where(eq(productVariants.id, variantId));

      const beforeRows = await db
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(eq(stockMovements.variantId, variantId));
      const movementInput =
        run % 2 === 0
          ? {
              variantId,
              type: "receive" as const,
              quantity: 1,
              note: `Archive race receive ${run}`,
              idempotencyKey: randomUUID(),
            }
          : {
              variantId,
              type: "adjust" as const,
              quantityDelta: 1,
              note: `Archive race adjustment ${run}`,
              idempotencyKey: randomUUID(),
            };

      const [movementResult, archiveResult] = await Promise.allSettled([
        applyMovement(movementInput),
        archiveProduct(productId),
      ]);
      assert.equal(archiveResult.status, "fulfilled");

      const [product] = await db
        .select({ status: products.status })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      const [variant] = await db
        .select({
          status: productVariants.status,
          quantityOnHand: productVariants.quantityOnHand,
        })
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);
      const afterRows = await db
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(eq(stockMovements.variantId, variantId));

      assert.equal(product?.status, "archived");
      assert.equal(variant?.status, "archived");
      if (movementResult.status === "fulfilled") {
        assert.equal(afterRows.length, beforeRows.length + 1);
        assert.equal(variant.quantityOnHand, 11);
      } else {
        assert.ok(
          movementResult.reason instanceof InventoryError &&
            movementResult.reason.code === "INVALID_STATE",
        );
        assert.equal(afterRows.length, beforeRows.length);
        assert.equal(variant?.quantityOnHand, 10);
      }

      await assert.rejects(
        () =>
          applyMovement({
            variantId,
            type: "receive",
            quantity: 1,
            note: "Stale post after archive",
            idempotencyKey: randomUUID(),
          }),
        (error: unknown) =>
          error instanceof InventoryError &&
          error.code === "INVALID_STATE",
      );
      const afterStalePost = await db
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(eq(stockMovements.variantId, variantId));
      assert.equal(afterStalePost.length, afterRows.length);
    }

    await db
      .update(products)
      .set({ status: "active" })
      .where(eq(products.id, productId));
    await db
      .update(productVariants)
      .set({ status: "active" })
      .where(eq(productVariants.id, variantId));
  });

  it("rejects manual receive and adjust for archived variants or products", async () => {
    await db
      .update(products)
      .set({ status: "active" })
      .where(eq(products.id, productId));
    await db
      .update(productVariants)
      .set({ status: "archived", quantityOnHand: 10, qtyReserved: 0 })
      .where(eq(productVariants.id, variantId));

    const attempts = [
      {
        label: "receive with archived variant",
        input: {
          variantId,
          type: "receive" as const,
          quantity: 1,
          idempotencyKey: randomUUID(),
        },
      },
      {
        label: "adjust with archived variant",
        input: {
          variantId,
          type: "adjust" as const,
          quantityDelta: -1,
          note: "Archived variant must not change",
          idempotencyKey: randomUUID(),
        },
      },
    ];

    await db
      .update(productVariants)
      .set({ status: "active" })
      .where(eq(productVariants.id, variantId));
    await db
      .update(products)
      .set({ status: "archived" })
      .where(eq(products.id, productId));
    attempts.push(
      {
        label: "receive with archived product",
        input: {
          variantId,
          type: "receive" as const,
          quantity: 1,
          idempotencyKey: randomUUID(),
        },
      },
      {
        label: "adjust with archived product",
        input: {
          variantId,
          type: "adjust" as const,
          quantityDelta: -1,
          note: "Archived product must not change",
          idempotencyKey: randomUUID(),
        },
      },
    );

    // Exercise each aggregate state independently so both movement types are
    // rejected by the domain API, not merely hidden by the app selector.
    for (const [index, attempt] of attempts.entries()) {
      const archivedVariant = index < 2;
      await db
        .update(products)
        .set({ status: archivedVariant ? "active" : "archived" })
        .where(eq(products.id, productId));
      await db
        .update(productVariants)
        .set({ status: archivedVariant ? "archived" : "active" })
        .where(eq(productVariants.id, variantId));

      const beforeMovements = await db
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(eq(stockMovements.variantId, variantId));
      await assert.rejects(
        () => applyMovement(attempt.input),
        (error: unknown) =>
          error instanceof InventoryError &&
          error.code === "INVALID_STATE" &&
          error.message.includes("active product and variant"),
        attempt.label,
      );
      const afterMovements = await db
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(eq(stockMovements.variantId, variantId));
      const [afterVariant] = await db
        .select({ quantityOnHand: productVariants.quantityOnHand })
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);
      assert.equal(afterMovements.length, beforeMovements.length, attempt.label);
      assert.equal(afterVariant?.quantityOnHand, 10, attempt.label);
    }

    await db
      .update(products)
      .set({ status: "active" })
      .where(eq(products.id, productId));
    await db
      .update(productVariants)
      .set({ status: "active" })
      .where(eq(productVariants.id, variantId));
  });
});
