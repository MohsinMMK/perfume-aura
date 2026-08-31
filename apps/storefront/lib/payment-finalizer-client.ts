import { resolveRuntimeDatabaseTlsOptions } from "@perfume-aura/db";
import { Pool } from "pg";

type CashfreeFinalizerResult = Readonly<{
  newlyFinalized: boolean;
  orderId: string;
}>;

type CashfreeFinalizerRow = Readonly<{
  newly_finalized: boolean;
  order_id: string;
}>;

type CashfreePaymentAttemptBindingResult = Readonly<{
  orderId: string;
  checkoutSessionId: string;
  idempotent: boolean;
}>;

type CashfreePaymentAttemptBindingRow = Readonly<{
  order_id: string;
  checkout_session_id: string;
  idempotent: boolean;
}>;

type CashfreePaymentAttemptCancellationResult = Readonly<{
  orderId: string;
  checkoutSessionId: string;
  releasedCount: number;
  idempotent: boolean;
}>;

type CashfreePaymentAttemptCancellationRow = Readonly<{
  order_id: string;
  checkout_session_id: string;
  released_count: number;
  idempotent: boolean;
}>;

let paymentFinalizerPool: Pool | undefined;

function isDisposableLoopbackTestUrl(connectionString: string): boolean {
  try {
    const databaseUrl = new URL(connectionString);
    const host = databaseUrl.hostname.toLowerCase();
    return (
      (databaseUrl.protocol === "postgres:" || databaseUrl.protocol === "postgresql:") &&
      ["127.0.0.1", "localhost", "::1"].includes(host) &&
      /^\/perfume_aura_[a-z0-9_]+$/.test(databaseUrl.pathname)
    );
  } catch {
    return false;
  }
}

function resolvePaymentFinalizerConnectionString(): string {
  const configured = process.env.STOREFRONT_PAYMENT_FINALIZER_DATABASE_URL?.trim();
  if (configured) return configured;

  // Integration tests run against a disposable loopback owner database. Never
  // make DATABASE_URL a production fallback: that would collapse the normal
  // storefront and payment-finalization capability boundaries.
  const integrationUrl = process.env.TEST_DATABASE_URL?.trim();
  if (
    process.env.NODE_ENV !== "production" &&
    integrationUrl &&
    isDisposableLoopbackTestUrl(integrationUrl)
  ) {
    return integrationUrl;
  }

  throw new Error(
    "STOREFRONT_PAYMENT_FINALIZER_DATABASE_URL is required for Cashfree payment finalization",
  );
}

function getPaymentFinalizerPool(): Pool {
  if (paymentFinalizerPool) return paymentFinalizerPool;

  const connectionString = resolvePaymentFinalizerConnectionString();
  paymentFinalizerPool = new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    // Keeps disposable integration processes from being held open by an idle
    // pool; a running Next.js process continues to hold its server lifecycle.
    allowExitOnIdle: true,
    application_name: "perfume-aura-storefront-payment-finalizer",
    ...resolveRuntimeDatabaseTlsOptions(connectionString),
  });
  return paymentFinalizerPool;
}

export async function finalizeVerifiedCashfreePayment(input: Readonly<{
  paymentAttemptId: string;
  orderId: string;
  providerOrderId: string;
  expectedAmountMinor: number;
  paymentId: string;
  finalizedAt: Date;
}>): Promise<CashfreeFinalizerResult> {
  const result = await getPaymentFinalizerPool().query<CashfreeFinalizerRow>(
    `
      SELECT newly_finalized, order_id
      FROM public.finalize_storefront_cashfree_payment(
        $1::uuid,
        $2::uuid,
        $3::text,
        $4::integer,
        $5::text,
        $6::timestamptz
      )
    `,
    [
      input.paymentAttemptId,
      input.orderId,
      input.providerOrderId,
      input.expectedAmountMinor,
      input.paymentId,
      input.finalizedAt,
    ],
  );
  const row = result.rows[0];
  if (result.rowCount !== 1 || !row) {
    throw new Error("Cashfree payment finalizer returned an invalid result");
  }

  return { newlyFinalized: row.newly_finalized, orderId: row.order_id };
}

export async function bindCreatedCashfreePaymentAttempt(input: Readonly<{
  paymentAttemptId: string;
  providerOrderId: string;
  providerSessionId: string;
  boundAt: Date;
}>): Promise<CashfreePaymentAttemptBindingResult> {
  const result = await getPaymentFinalizerPool().query<CashfreePaymentAttemptBindingRow>(
    `
      SELECT order_id, checkout_session_id, idempotent
      FROM public.bind_storefront_cashfree_payment_attempt(
        $1::uuid,
        $2::text,
        $3::text,
        $4::timestamptz
      )
    `,
    [
      input.paymentAttemptId,
      input.providerOrderId,
      input.providerSessionId,
      input.boundAt,
    ],
  );
  const row = result.rows[0];
  if (result.rowCount !== 1 || !row) {
    throw new Error("Cashfree payment binding returned an invalid result");
  }

  return {
    orderId: row.order_id,
    checkoutSessionId: row.checkout_session_id,
    idempotent: row.idempotent,
  };
}

/**
 * Release a Cashfree intent and its inventory holds through the only database
 * capability allowed to cancel a provider-bound checkout. This serializes
 * failure/expiry with independently verified payment finalization.
 */
export async function cancelCashfreePaymentAttempt(input: Readonly<{
  paymentAttemptId: string;
  reason: "payment_failed" | "expired";
  cancelledAt: Date;
}>): Promise<CashfreePaymentAttemptCancellationResult> {
  const result = await getPaymentFinalizerPool().query<CashfreePaymentAttemptCancellationRow>(
    `
      SELECT order_id, checkout_session_id, released_count, idempotent
      FROM public.cancel_storefront_cashfree_payment_attempt(
        $1::uuid,
        $2::text,
        $3::timestamptz
      )
    `,
    [input.paymentAttemptId, input.reason, input.cancelledAt],
  );
  const row = result.rows[0];
  if (result.rowCount !== 1 || !row) {
    throw new Error("Cashfree payment cancellation returned an invalid result");
  }

  return {
    orderId: row.order_id,
    checkoutSessionId: row.checkout_session_id,
    releasedCount: Number(row.released_count),
    idempotent: row.idempotent,
  };
}
