import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { DomainError } from "./domain-errors";
import {
  checkoutSessions,
  commerceCarts,
  commerceOrderEvents,
  commerceOrders,
  notificationOutbox,
  paymentAttempts,
} from "./schema";
import {
  postgresSqlState,
  runDomainTransaction,
  type DbTransaction,
} from "./transactions";

export type ReservationItemInput = Readonly<{
  variantId: string;
  quantity: number;
}>;

export type ReservationResult = Readonly<{
  checkoutSessionId: string;
  reservations: readonly Readonly<{
    id: string;
    variantId: string;
    quantity: number;
    expiresAt: Date;
  }>[];
  idempotent: boolean;
}>;

type ReservationRoutineRow = Readonly<{
  reservation_id: string;
  variant_id: string;
  quantity: number;
  expires_at: Date | string;
  idempotent: boolean;
}>;

type ReleaseRoutineRow = Readonly<{
  released_count: number;
  idempotent: boolean;
  has_consumed: boolean;
}>;

type SettlementRoutineRow = Readonly<{
  consumed_count: number;
  idempotent: boolean;
}>;

function routineRows<T>(result: Readonly<{ rows: unknown[] }>): readonly T[] {
  return result.rows as readonly T[];
}

function parsedTimestamp(value: Date | string, field: string): Date {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new DomainError("INVALID_STATE", `Database returned an invalid ${field}`);
  }
  return timestamp;
}

function singleRoutineRow<T>(rows: readonly T[], routine: string): T {
  const row = rows[0];
  if (!row || rows.length !== 1) {
    throw new DomainError("INVALID_STATE", `${routine} returned an invalid result`);
  }
  return row;
}

function routineErrorMessage(error: unknown): string {
  const seen = new Set<unknown>();
  let current = error;
  let deepestMessage: string | undefined;

  while (
    current &&
    (typeof current === "object" || typeof current === "function") &&
    !seen.has(current)
  ) {
    seen.add(current);
    const candidate = current as Readonly<{ message?: unknown; cause?: unknown }>;
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      deepestMessage = candidate.message;
    }
    current = candidate.cause;
  }

  return deepestMessage ?? "Storefront inventory transition failed";
}

function normalizedRoutineError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;

  const message = routineErrorMessage(error);
  const state = postgresSqlState(error);
  const code = state === "22023"
    ? "INVALID_INPUT"
    : state === "P0002"
      ? "NOT_FOUND"
      : state === "P1002"
        ? "INSUFFICIENT_OIL"
        : state === "P1001"
          ? "INSUFFICIENT_STOCK"
          : "INVALID_STATE";
  return new DomainError(code, message, { cause: error });
}

export function normalizeReservationItems(
  items: readonly ReservationItemInput[],
): ReservationItemInput[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new DomainError(
        "INVALID_INPUT",
        "Reservation items require a variant and positive integer quantity",
      );
    }
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  }
  if (quantities.size === 0) {
    throw new DomainError("INVALID_INPUT", "At least one reservation item is required");
  }
  return [...quantities.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}

async function reserveInTransaction(
  tx: DbTransaction,
  input: Readonly<{
    checkoutSessionId: string;
    items: readonly ReservationItemInput[];
    expiresAt: Date;
  }>,
): Promise<ReservationResult> {
  const rows = routineRows<ReservationRoutineRow>((await tx.execute(sql`
    SELECT reservation_id, variant_id, quantity, expires_at, idempotent
    FROM public.reserve_storefront_checkout_stock(
      ${input.checkoutSessionId}::uuid,
      ARRAY[${sql.join(
        input.items.map((item) => sql`${item.variantId}::uuid`),
        sql`, `,
      )}]::uuid[],
      ARRAY[${sql.join(
        input.items.map((item) => sql`${item.quantity}::integer`),
        sql`, `,
      )}]::integer[],
      ${input.expiresAt}::timestamptz
    )
  `)) as Readonly<{ rows: unknown[] }>);
  if (rows.length !== input.items.length) {
    throw new DomainError("INVALID_STATE", "Stock reservation returned an incomplete result");
  }

  return {
    checkoutSessionId: input.checkoutSessionId,
    reservations: rows.map((row) => ({
      id: row.reservation_id,
      variantId: row.variant_id,
      quantity: Number(row.quantity),
      expiresAt: parsedTimestamp(row.expires_at, "reservation expiry"),
    })),
    idempotent: rows.every((row) => row.idempotent),
  };
}

export async function reserveCheckoutStock(input: Readonly<{
  checkoutSessionId: string;
  items: readonly ReservationItemInput[];
  expiresAt: Date;
  now?: Date;
}>): Promise<ReservationResult> {
  const now = input.now ?? new Date();
  if (!input.checkoutSessionId || input.expiresAt <= now) {
    throw new DomainError("INVALID_INPUT", "Reservation expiry must be in the future");
  }
  const items = normalizeReservationItems(input.items);
  try {
    return await runDomainTransaction((tx) => reserveInTransaction(tx, {
      checkoutSessionId: input.checkoutSessionId,
      items,
      expiresAt: input.expiresAt,
    }));
  } catch (error) {
    throw normalizedRoutineError(error);
  }
}

async function releaseInTransaction(
  tx: DbTransaction,
  input: Readonly<{
    checkoutSessionId: string;
    reason: "cancelled" | "payment_failed" | "abandoned" | "expired";
    releasedAt: Date;
  }>,
): Promise<ReleaseRoutineRow> {
  const rows = routineRows<ReleaseRoutineRow>((await tx.execute(sql`
    SELECT released_count, idempotent, has_consumed
    FROM public.release_storefront_checkout_reservations(
      ${input.checkoutSessionId}::uuid,
      ${input.reason}::text,
      ${input.releasedAt}::timestamptz
    )
  `)) as Readonly<{ rows: unknown[] }>);
  return singleRoutineRow(rows, "Stock reservation release");
}

export async function releaseCheckoutReservations(input: Readonly<{
  checkoutSessionId: string;
  reason: "cancelled" | "payment_failed" | "abandoned" | "expired";
  now?: Date;
}>): Promise<Readonly<{ releasedCount: number; idempotent: boolean }>> {
  let row: ReleaseRoutineRow;
  try {
    row = await runDomainTransaction((tx) => releaseInTransaction(tx, {
      checkoutSessionId: input.checkoutSessionId,
      reason: input.reason,
      releasedAt: input.now ?? new Date(),
    }));
  } catch (error) {
    throw normalizedRoutineError(error);
  }
  return {
    releasedCount: Number(row.released_count),
    idempotent: row.idempotent,
  };
}

/**
 * Convert active checkout reservations into stock and oil ledger entries.
 * The security-definer routine derives every internal value from the bound
 * checkout/order pair, so the storefront role cannot submit raw stock writes.
 */
export async function consumeCheckoutReservations(input: Readonly<{
  checkoutSessionId: string;
  orderId: string;
  now?: Date;
}>): Promise<Readonly<{ consumedCount: number; idempotent: boolean }>> {
  const now = input.now ?? new Date();
  if (!input.checkoutSessionId || !input.orderId) {
    throw new DomainError("INVALID_INPUT", "Checkout session and order are required");
  }

  let row: SettlementRoutineRow;
  try {
    row = await runDomainTransaction(async (tx) => {
      const rows = routineRows<SettlementRoutineRow>((await tx.execute(sql`
        SELECT consumed_count, idempotent
        FROM public.settle_storefront_checkout_reservations(
          ${input.checkoutSessionId}::uuid,
          ${input.orderId}::uuid,
          ${now}::timestamptz
        )
      `)) as Readonly<{ rows: unknown[] }>);
      return singleRoutineRow(rows, "Stock reservation settlement");
    });
  } catch (error) {
    throw normalizedRoutineError(error);
  }
  return {
    consumedCount: Number(row.consumed_count),
    idempotent: row.idempotent,
  };
}

/** Release expired checkout holds in bounded batches. Safe for concurrent jobs. */
export async function expireAbandonedCheckouts(input: Readonly<{
  now?: Date;
  limit?: number;
  canReleasePaymentPending?: (checkoutSessionId: string) => Promise<boolean>;
}> = {}): Promise<Readonly<{ expiredCheckoutCount: number; releasedReservationCount: number }>> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new DomainError("INVALID_INPUT", "Expiry batch limit must be from 1 to 500");
  }
  try {
  const candidates = await runDomainTransaction((tx) =>
    tx
      .select({ id: checkoutSessions.id })
      .from(checkoutSessions)
      .where(
        and(
          inArray(checkoutSessions.status, ["open", "payment_pending"]),
          lte(checkoutSessions.expiresAt, now),
        ),
      )
      .orderBy(asc(checkoutSessions.expiresAt), asc(checkoutSessions.id))
      .limit(limit),
  );

  let expiredCheckoutCount = 0;
  let releasedReservationCount = 0;
  for (const candidate of candidates) {
    const paymentPendingReleaseAuthorized = input.canReleasePaymentPending
      ? await input.canReleasePaymentPending(candidate.id)
      : false;
    const result = await runDomainTransaction(async (tx) => {
      const [checkout] = await tx
        .select({
          id: checkoutSessions.id,
          cartId: checkoutSessions.cartId,
          status: checkoutSessions.status,
          expiresAt: checkoutSessions.expiresAt,
        })
        .from(checkoutSessions)
        .where(eq(checkoutSessions.id, candidate.id))
        .for("update")
        .limit(1);
      if (
        !checkout ||
        (checkout.status !== "open" && checkout.status !== "payment_pending") ||
        checkout.expiresAt > now
      ) {
        return { expired: false, released: 0 };
      }
      if (checkout.status === "payment_pending" && !paymentPendingReleaseAuthorized) {
        return { expired: false, released: 0 };
      }

      const release = await releaseInTransaction(tx, {
        checkoutSessionId: checkout.id,
        reason: "expired",
        releasedAt: now,
      });
      if (release.has_consumed) {
        return { expired: false, released: 0 };
      }

      await tx
        .update(checkoutSessions)
        .set({ status: "expired", updatedAt: now })
        .where(eq(checkoutSessions.id, checkout.id));
      await tx
        .update(commerceCarts)
        .set({ status: "active", updatedAt: now })
        .where(eq(commerceCarts.id, checkout.cartId));
      const [order] = await tx
        .select({ id: commerceOrders.id, status: commerceOrders.status })
        .from(commerceOrders)
        .where(eq(commerceOrders.checkoutSessionId, checkout.id))
        .for("update")
        .limit(1);
      if (order && order.status === "pending") {
        await tx
          .update(commerceOrders)
          .set({
            status: "cancelled",
            paymentState: "failed",
            cancelledAt: now,
            updatedAt: now,
          })
          .where(eq(commerceOrders.id, order.id));
        await tx
          .update(paymentAttempts)
          .set({ status: "cancelled", updatedAt: now })
          .where(and(
            eq(paymentAttempts.orderId, order.id),
            inArray(paymentAttempts.status, ["created", "pending"]),
          ));
        const [cancelledEvent] = await tx
          .insert(commerceOrderEvents)
          .values({
            orderId: order.id,
            eventType: "cancelled",
            fromStatus: "pending",
            toStatus: "cancelled",
            idempotencyKey: `checkout-expired:${checkout.id}`,
          })
          .onConflictDoNothing()
          .returning({ id: commerceOrderEvents.id });
        if (cancelledEvent) {
          await tx
            .insert(notificationOutbox)
            .values({ orderEventId: cancelledEvent.id, kind: "order_cancelled" })
            .onConflictDoNothing();
        }
      }
      return { expired: true, released: Number(release.released_count) };
    });
    if (result.expired) expiredCheckoutCount += 1;
    releasedReservationCount += result.released;
  }
  return { expiredCheckoutCount, releasedReservationCount };
  } catch (error) {
    throw normalizedRoutineError(error);
  }
}
