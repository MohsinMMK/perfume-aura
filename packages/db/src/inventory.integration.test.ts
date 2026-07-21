/**
 * Integration tests against Neon/Postgres (pg Pool + interactive TX).
 *
 * Requires DATABASE_URL (loads apps/ops/.env.local when present).
 * Skip when unset so CI without secrets still runs unit tests.
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { eq } from "drizzle-orm";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../apps/ops/.env.local") });
config(); // optional packages/db/.env

const hasDb = Boolean(process.env.DATABASE_URL);

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
    if (!variantId) {
      await pool.end().catch(() => undefined);
      return;
    }
    // Clean test rows (product cascade deletes variants; movements need FK order)
    await db
      .delete(stockMovements)
      .where(eq(stockMovements.variantId, variantId));
    await db.delete(products).where(eq(products.id, productId));
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

  it("idempotency key does not double-apply", async () => {
    await db
      .update(productVariants)
      .set({ quantityOnHand: 5, qtyReserved: 0 })
      .where(eq(productVariants.id, variantId));

    const key = `idem-${variantId}-receive-1`;
    const first = await applyMovement({
      variantId,
      type: "receive",
      quantity: 1,
      idempotencyKey: key,
    });
    const second = await applyMovement({
      variantId,
      type: "receive",
      quantity: 1,
      idempotencyKey: key,
    });

    assert.equal(first.idempotent, false);
    assert.equal(second.idempotent, true);
    assert.equal(first.movementId, second.movementId);
    assert.equal(first.quantityAfter, second.quantityAfter);

    const [v] = await db
      .select({ quantityOnHand: productVariants.quantityOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    assert.equal(v?.quantityOnHand, 6);
  });
});

if (!hasDb) {
  console.log(
    "[inventory.integration] skipped — set DATABASE_URL (e.g. apps/ops/.env.local) to run",
  );
}
