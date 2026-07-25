import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "./domain-errors";
import {
  domainTransactionConfig,
  MAX_TRANSACTION_ATTEMPTS,
  runDomainTransactionWithRunner,
  type DbTransaction,
} from "./transactions";

function sqlState(code: string): Error & { code: string } {
  return Object.assign(new Error(`SQLSTATE ${code}`), { code });
}

describe("domain transaction retry policy", () => {
  it("retries the complete callback for 40001 and 40P01 only", async () => {
    for (const code of ["40001", "40P01"]) {
      let callbackAttempts = 0;
      const configs: unknown[] = [];
      const waits: number[] = [];
      const runner = {
        async transaction<T>(
          operation: (tx: DbTransaction) => Promise<T>,
          config: typeof domainTransactionConfig,
        ): Promise<T> {
          configs.push(config);
          return operation({} as DbTransaction);
        },
      };

      const result = await runDomainTransactionWithRunner(
        runner,
        async () => {
          callbackAttempts += 1;
          if (callbackAttempts === 1) throw sqlState(code);
          return `ok-${code}`;
        },
        {
          random: () => 0,
          wait: async (milliseconds) => {
            waits.push(milliseconds);
          },
        },
      );

      assert.equal(result, `ok-${code}`);
      assert.equal(callbackAttempts, 2);
      assert.deepEqual(configs, [
        domainTransactionConfig,
        domainTransactionConfig,
      ]);
      assert.deepEqual(waits, [10]);
    }
  });

  it("makes exactly three total attempts, then returns a stable typed error", async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        runDomainTransactionWithRunner(
          {
            async transaction<T>(
              operation: (tx: DbTransaction) => Promise<T>,
            ): Promise<T> {
              attempts += 1;
              return operation({} as DbTransaction);
            },
          },
          async () => {
            throw sqlState("40P01");
          },
          { random: () => 0, wait: async () => undefined },
        ),
      (error: unknown) =>
        error instanceof DomainError &&
        error.code === "DATABASE_RETRY_EXHAUSTED" &&
        (error.cause as { code?: string } | undefined)?.code === "40P01",
    );
    assert.equal(attempts, MAX_TRANSACTION_ATTEMPTS);
  });

  it("never retries unique, FK, check, domain, or network failures", async () => {
    const errors: unknown[] = [
      sqlState("23505"),
      sqlState("23503"),
      sqlState("23514"),
      new DomainError("INVALID_STATE", "business failure"),
      Object.assign(new Error("network"), { code: "ECONNRESET" }),
    ];

    for (const expected of errors) {
      let attempts = 0;
      await assert.rejects(
        () =>
          runDomainTransactionWithRunner(
            {
              async transaction<T>(): Promise<T> {
                attempts += 1;
                throw expected;
              },
            },
            async () => "unreachable",
            { wait: async () => undefined },
          ),
        (actual: unknown) => actual === expected,
      );
      assert.equal(attempts, 1);
    }
  });
});
