import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  adjustStockSchema,
  receiveStockSchema,
} from "@perfume-aura/validators";
import { revalidateCommittedStockMutation } from "./stock-revalidation";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

async function sourceFile(path: string): Promise<string> {
  return readFile(resolve(currentDirectory, path), "utf8");
}

function exportedFunction(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function assertStableClientKey(
  source: string,
  actionCall: string,
  formName: string,
): void {
  const initialize = source.indexOf(
    "idempotencyKeyRef.current ??= crypto.randomUUID()",
  );
  const payload = source.indexOf(
    "idempotencyKey: idempotencyKeyRef.current",
  );
  const submit = source.indexOf(actionCall);
  const rejected = source.indexOf("if (!result.ok)", submit);
  const clear = source.indexOf("idempotencyKeyRef.current = null", rejected);
  const ambiguousFailure = source.indexOf("} catch", clear);

  assert.ok(source.includes("useRef<string | null>(null)"));
  assert.ok(initialize >= 0, `${formName} must generate a client UUID`);
  assert.ok(payload > initialize, `${formName} must send the generated UUID`);
  assert.ok(submit > payload, `${formName} must send the UUID with the action`);
  assert.ok(rejected > submit, `${formName} must handle a rejected result`);
  assert.match(
    source.slice(rejected, clear),
    /return;/,
    `${formName} must retain its UUID after a rejected result`,
  );
  assert.ok(
    clear > rejected,
    `${formName} may clear its UUID only after confirmed success`,
  );
  assert.ok(
    ambiguousFailure > clear,
    `${formName} must retain its UUID after an ambiguous thrown failure`,
  );
  assert.equal(
    source.match(/idempotencyKeyRef\.current = null/g)?.length,
    1,
    `${formName} must rotate the UUID in exactly one confirmed-success branch`,
  );
}

describe("manual stock idempotency contract", () => {
  it("requires a UUID on both receive and adjustment inputs", () => {
    const receive = {
      variantId: randomUUID(),
      quantity: 2,
      note: "PO-42",
    };
    const adjustment = {
      variantId: randomUUID(),
      quantityDelta: -1,
      note: "Cycle count",
    };

    assert.equal(receiveStockSchema.safeParse(receive).success, false);
    assert.equal(adjustStockSchema.safeParse(adjustment).success, false);
    assert.equal(
      receiveStockSchema.safeParse({
        ...receive,
        idempotencyKey: "not-a-uuid",
      }).success,
      false,
    );
    assert.equal(
      adjustStockSchema.safeParse({
        ...adjustment,
        idempotencyKey: "not-a-uuid",
      }).success,
      false,
    );
    assert.equal(
      receiveStockSchema.safeParse({
        ...receive,
        idempotencyKey: randomUUID(),
      }).success,
      true,
    );
    assert.equal(
      adjustStockSchema.safeParse({
        ...adjustment,
        idempotencyKey: randomUUID(),
      }).success,
      true,
    );
  });

  it("retains one client UUID through non-success and ambiguous retries", async () => {
    const receiveSource = await sourceFile(
      "../components/stock/receive-stock-form.tsx",
    );
    const adjustSource = await sourceFile(
      "../components/stock/adjust-stock-form.tsx",
    );

    assertStableClientKey(
      receiveSource,
      "await receiveStockAction(payload)",
      "ReceiveStockForm",
    );
    assertStableClientKey(
      adjustSource,
      "await adjustStockAction(payload)",
      "AdjustStockForm",
    );
  });

  it("passes the UUID to the domain call and keeps cache work outside the mutation catch", async () => {
    const stockSource = await sourceFile("stock.ts");

    for (const actionName of ["receiveStockAction", "adjustStockAction"]) {
      const body = exportedFunction(stockSource, actionName);
      const transaction = body.indexOf("result = await applyMovement({");
      const idempotencyKey = body.indexOf("idempotencyKey,", transaction);
      const transactionCatch = body.indexOf("} catch", transaction);
      const revalidation = body.indexOf(
        "revalidateStockPaths(result.productId)",
        transactionCatch,
      );
      const success = body.indexOf("return actionOk", revalidation);

      assert.ok(transaction >= 0, `${actionName} must call applyMovement`);
      assert.ok(
        idempotencyKey > transaction,
        `${actionName} must pass the validated UUID to applyMovement`,
      );
      assert.ok(
        transactionCatch > idempotencyKey,
        `${actionName} must isolate transaction failures`,
      );
      assert.ok(
        revalidation > transactionCatch,
        `${actionName} must revalidate only after the transaction returns`,
      );
      assert.ok(
        success > revalidation,
        `${actionName} must finalize only after best-effort revalidation`,
      );
      assert.equal(
        body.includes(".select("),
        false,
        `${actionName} must not perform a fallible post-commit product lookup`,
      );
    }
  });

  it("never turns a post-commit cache failure into a mutation failure", () => {
    const productId = randomUUID();
    const attempted: string[] = [];
    const failures: Array<{ path: string; error: unknown }> = [];

    assert.doesNotThrow(() =>
      revalidateCommittedStockMutation(
        productId,
        (path) => {
          attempted.push(path);
          if (path === "/stock" || path === `/products/${productId}`) {
            throw new Error(`cache unavailable for ${path}`);
          }
        },
        (error, path) => {
          failures.push({ path, error });
        },
      ),
    );

    assert.deepEqual(attempted, [
      "/stock",
      "/stock/low",
      "/dashboard",
      "/products",
      "/finance",
      `/products/${productId}`,
    ]);
    assert.deepEqual(
      failures.map(({ path }) => path),
      ["/stock", `/products/${productId}`],
    );
    assert.ok(failures.every(({ error }) => error instanceof Error));
  });
});
