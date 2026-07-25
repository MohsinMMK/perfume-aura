import { db, type Database } from "./client";
import { DomainError } from "./domain-errors";

export type DbTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export const domainTransactionConfig = {
  isolationLevel: "read committed",
  accessMode: "read write",
} as const;

export const retryableTransactionSqlStates = new Set(["40001", "40P01"]);
export const MAX_TRANSACTION_ATTEMPTS = 3;

type ErrorWithCause = {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
};

/** Find a PostgreSQL SQLSTATE through Drizzle/node-postgres error wrappers. */
export function postgresSqlState(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current = error;

  while (
    current &&
    (typeof current === "object" || typeof current === "function") &&
    !seen.has(current)
  ) {
    seen.add(current);
    const candidate = current as ErrorWithCause;
    if (typeof candidate.code === "string") return candidate.code;
    current = candidate.cause;
  }

  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return postgresSqlState(error) === "23505";
}

export function postgresConstraint(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current = error;

  while (
    current &&
    (typeof current === "object" || typeof current === "function") &&
    !seen.has(current)
  ) {
    seen.add(current);
    const candidate = current as ErrorWithCause;
    if (typeof candidate.constraint === "string") {
      return candidate.constraint;
    }
    current = candidate.cause;
  }

  return undefined;
}

function retryDelayMs(attempt: number, random: () => number): number {
  // Small bounded jitter keeps concurrent retries from immediately colliding.
  return attempt * 10 + Math.floor(random() * 21);
}

function defaultWait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

type TransactionRunner = {
  transaction<T>(
    operation: (tx: DbTransaction) => Promise<T>,
    config: typeof domainTransactionConfig,
  ): Promise<T>;
};

/** Test seam for proving retry policy without manufacturing driver failures. */
export async function runDomainTransactionWithRunner<T>(
  runner: TransactionRunner,
  operation: (tx: DbTransaction) => Promise<T>,
  hooks: {
    random?: () => number;
    wait?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<T> {
  const random = hooks.random ?? Math.random;
  const wait = hooks.wait ?? defaultWait;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await runner.transaction(operation, domainTransactionConfig);
    } catch (error) {
      const state = postgresSqlState(error);
      const canRetry =
        state !== undefined &&
        retryableTransactionSqlStates.has(state) &&
        attempt < MAX_TRANSACTION_ATTEMPTS;

      if (!canRetry) {
        if (
          state !== undefined &&
          retryableTransactionSqlStates.has(state) &&
          attempt === MAX_TRANSACTION_ATTEMPTS
        ) {
          throw new DomainError(
            "DATABASE_RETRY_EXHAUSTED",
            "Database transaction could not complete after 3 attempts",
            { cause: error },
          );
        }
        throw error;
      }
      await wait(retryDelayMs(attempt, random));
    }
  }

  // The loop always returns or throws. Keep an explicit exhaustiveness guard.
  throw new Error("Unreachable transaction retry state");
}

/**
 * Run one complete domain operation in an explicit READ COMMITTED,
 * read-write transaction.
 *
 * PostgreSQL serialization failures and deadlocks invalidate the transaction,
 * so only the complete callback is retried. No other error is retried.
 */
export async function runDomainTransaction<T>(
  operation: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  return runDomainTransactionWithRunner(db, operation);
}
