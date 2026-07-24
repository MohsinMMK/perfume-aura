/**
 * Integration tests against a disposable local PostgreSQL database
 * (pg Pool + interactive TX).
 *
 * Requires an explicitly safe TEST_DATABASE_URL. Never loads app or package
 * dotenv files. Skip when unset so CI without local PostgreSQL still runs.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, before, after } from "node:test";
import { eq } from "drizzle-orm";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL
  ? requireDisposableTestDatabaseUrl()
  : undefined;
const hasDb = Boolean(testDatabaseUrl);

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

describe("applyMovement integration", { skip: !hasDb }, () => {
  let applyMovement: typeof import("./inventory").applyMovement;
  let InventoryError: typeof import("./inventory").InventoryError;
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
});

if (!hasDb) {
  console.log(
    "[inventory.integration] skipped — set a guarded local TEST_DATABASE_URL to run",
  );
}
