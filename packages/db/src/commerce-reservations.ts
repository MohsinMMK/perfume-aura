import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { DomainError } from "./domain-errors";
import {
  productPublications,
  products,
  productVariants,
  checkoutSessions,
  locations,
  stockMovements,
  stockReservations,
  variantPrices,
} from "./schema";
import { runDomainTransaction } from "./transactions";

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
  const variantIds = items.map((item) => item.variantId);

  return runDomainTransaction(async (tx) => {
    const existing = await tx
      .select()
      .from(stockReservations)
      .where(eq(stockReservations.checkoutSessionId, input.checkoutSessionId))
      .orderBy(asc(stockReservations.variantId))
      .for("update");

    if (existing.length > 0) {
      const matches =
        existing.length === items.length &&
        existing.every(
          (reservation, index) =>
            reservation.status === "active" &&
            reservation.variantId === items[index]?.variantId &&
            reservation.quantity === items[index]?.quantity,
        );
      if (!matches) {
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "Checkout already owns a different reservation set",
        );
      }
      return {
        checkoutSessionId: input.checkoutSessionId,
        reservations: existing.map((reservation) => ({
          id: reservation.id,
          variantId: reservation.variantId,
          quantity: reservation.quantity,
          expiresAt: reservation.expiresAt,
        })),
        idempotent: true,
      };
    }

    const candidates = await tx
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));
    if (candidates.length !== variantIds.length) {
      throw new DomainError("NOT_FOUND", "One or more product variants were not found");
    }

    const productIds = [...new Set(candidates.map((row) => row.productId))].sort();
    const lockedProducts = await tx
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(inArray(products.id, productIds))
      .orderBy(asc(products.id))
      .for("update");
    if (
      lockedProducts.length !== productIds.length ||
      lockedProducts.some((product) => product.status !== "active")
    ) {
      throw new DomainError("INVALID_STATE", "All reserved products must be active");
    }

    const lockedVariants = await tx
      .select({
        id: productVariants.id,
        status: productVariants.status,
        quantityOnHand: productVariants.quantityOnHand,
        qtyReserved: productVariants.qtyReserved,
      })
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds))
      .orderBy(asc(productVariants.id))
      .for("update");

    const publicationRows = await tx
      .select({
        variantId: variantPrices.variantId,
        publicationStatus: productPublications.status,
        legalApprovedAt: productPublications.legalApprovedAt,
        contentApprovedAt: productPublications.contentApprovedAt,
        mediaApprovedAt: productPublications.mediaApprovedAt,
        priceActive: variantPrices.active,
        priceApprovedAt: variantPrices.approvedAt,
        priceCurrency: variantPrices.currency,
        priceAmountMinor: variantPrices.amountMinor,
      })
      .from(variantPrices)
      .innerJoin(productVariants, eq(variantPrices.variantId, productVariants.id))
      .innerJoin(productPublications, eq(productVariants.productId, productPublications.productId))
      .where(inArray(variantPrices.variantId, variantIds));
    const publicationByVariant = new Map(
      publicationRows.map((row) => [row.variantId, row]),
    );

    for (const item of items) {
      const variant = lockedVariants.find((candidate) => candidate.id === item.variantId);
      const publication = publicationByVariant.get(item.variantId);
      if (
        !variant ||
        variant.status !== "active" ||
        publication?.publicationStatus !== "published" ||
        !publication.legalApprovedAt ||
        !publication.contentApprovedAt ||
        !publication.mediaApprovedAt ||
        !publication.priceActive ||
        !publication.priceApprovedAt ||
        publication.priceCurrency !== "INR" ||
        publication.priceAmountMinor <= 0
      ) {
        throw new DomainError(
          "INVALID_STATE",
          "Every reserved variant must be active, published, and price-approved",
        );
      }
      const available = variant.quantityOnHand - variant.qtyReserved;
      if (item.quantity > available) {
        throw new DomainError(
          "INSUFFICIENT_STOCK",
          `Insufficient available stock for variant ${item.variantId}`,
        );
      }
    }

    const inserted = await tx
      .insert(stockReservations)
      .values(
        items.map((item) => ({
          checkoutSessionId: input.checkoutSessionId,
          variantId: item.variantId,
          quantity: item.quantity,
          expiresAt: input.expiresAt,
        })),
      )
      .returning();

    for (const item of items) {
      await tx
        .update(productVariants)
        .set({
          qtyReserved: sql`${productVariants.qtyReserved} + ${item.quantity}`,
          version: sql`${productVariants.version} + 1`,
        })
        .where(eq(productVariants.id, item.variantId));
    }

    return {
      checkoutSessionId: input.checkoutSessionId,
      reservations: inserted.map((reservation) => ({
        id: reservation.id,
        variantId: reservation.variantId,
        quantity: reservation.quantity,
        expiresAt: reservation.expiresAt,
      })),
      idempotent: false,
    };
  });
}

export async function releaseCheckoutReservations(input: Readonly<{
  checkoutSessionId: string;
  reason: "cancelled" | "payment_failed" | "abandoned" | "expired";
  now?: Date;
}>): Promise<Readonly<{ releasedCount: number; idempotent: boolean }>> {
  const now = input.now ?? new Date();
  return runDomainTransaction(async (tx) => {
    const activeReservations = await tx
      .select()
      .from(stockReservations)
      .where(eq(stockReservations.checkoutSessionId, input.checkoutSessionId))
      .orderBy(asc(stockReservations.variantId))
      .for("update");
    const releasable = activeReservations.filter(
      (reservation) => reservation.status === "active",
    );
    if (releasable.length === 0) {
      return { releasedCount: 0, idempotent: true };
    }

    const variantIds = releasable.map((reservation) => reservation.variantId);
    await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds))
      .orderBy(asc(productVariants.id))
      .for("update");

    for (const reservation of releasable) {
      await tx
        .update(productVariants)
        .set({
          qtyReserved: sql`${productVariants.qtyReserved} - ${reservation.quantity}`,
          version: sql`${productVariants.version} + 1`,
        })
        .where(eq(productVariants.id, reservation.variantId));
      await tx
        .update(stockReservations)
        .set({
          status: input.reason === "expired" ? "expired" : "released",
          releasedAt: now,
          releaseReason: input.reason,
        })
        .where(eq(stockReservations.id, reservation.id));
    }

    return { releasedCount: releasable.length, idempotent: false };
  });
}

/**
 * Convert every active checkout reservation into append-only sale ledger rows.
 * A retry after a successful consume is a no-op; mixed consumed/active state is
 * rejected so partial inventory settlement can never be hidden.
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

  return runDomainTransaction(async (tx) => {
    const reservations = await tx
      .select()
      .from(stockReservations)
      .where(eq(stockReservations.checkoutSessionId, input.checkoutSessionId))
      .orderBy(asc(stockReservations.variantId))
      .for("update");
    if (reservations.length === 0) {
      throw new DomainError("NOT_FOUND", "Checkout reservation was not found");
    }
    if (reservations.every((reservation) => reservation.status === "consumed")) {
      return { consumedCount: 0, idempotent: true };
    }
    if (reservations.some((reservation) => reservation.status !== "active")) {
      throw new DomainError("INVALID_STATE", "Checkout reservations are not wholly active");
    }

    const [mainLocation] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.code, "MAIN"))
      .limit(1);
    if (!mainLocation) {
      throw new DomainError("NOT_FOUND", "Inventory location MAIN is not configured");
    }

    const variantIds = reservations.map((reservation) => reservation.variantId);
    const variants = await tx
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds))
      .orderBy(asc(productVariants.id))
      .for("update");
    if (variants.length !== reservations.length) {
      throw new DomainError("NOT_FOUND", "A reserved variant was not found");
    }

    for (const reservation of reservations) {
      const variant = variants.find((candidate) => candidate.id === reservation.variantId);
      if (
        !variant ||
        variant.qtyReserved < reservation.quantity ||
        variant.quantityOnHand < reservation.quantity
      ) {
        throw new DomainError("INVALID_STATE", "Reserved inventory balance is inconsistent");
      }
      const quantityAfter = variant.quantityOnHand - reservation.quantity;
      await tx.insert(stockMovements).values({
        variantId: variant.id,
        locationId: mainLocation.id,
        type: "sale",
        quantityDelta: -reservation.quantity,
        quantityAfter,
        refType: "commerce_order",
        refId: input.orderId,
        note: "Storefront order inventory settlement",
        idempotencyKey: `commerce-order:${input.orderId}:${variant.id}`,
        unitCostCents: variant.costCents,
        costBasis: "snapshot",
      });
      await tx
        .update(productVariants)
        .set({
          quantityOnHand: quantityAfter,
          qtyReserved: variant.qtyReserved - reservation.quantity,
          version: variant.version + 1,
          updatedAt: now,
        })
        .where(eq(productVariants.id, variant.id));
      await tx
        .update(stockReservations)
        .set({ status: "consumed", releasedAt: now, releaseReason: "order_settled" })
        .where(eq(stockReservations.id, reservation.id));
    }
    return { consumedCount: reservations.length, idempotent: false };
  });
}

/** Release expired checkout holds in bounded batches. Safe for concurrent jobs. */
export async function expireAbandonedCheckouts(input: Readonly<{
  now?: Date;
  limit?: number;
}> = {}): Promise<Readonly<{ expiredCheckoutCount: number; releasedReservationCount: number }>> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new DomainError("INVALID_INPUT", "Expiry batch limit must be from 1 to 500");
  }
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
    const result = await runDomainTransaction(async (tx) => {
      const [checkout] = await tx
        .select({ id: checkoutSessions.id, status: checkoutSessions.status, expiresAt: checkoutSessions.expiresAt })
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
      const reservations = await tx
        .select()
        .from(stockReservations)
        .where(eq(stockReservations.checkoutSessionId, checkout.id))
        .orderBy(asc(stockReservations.variantId))
        .for("update");
      if (reservations.some((reservation) => reservation.status === "consumed")) {
        return { expired: false, released: 0 };
      }
      const active = reservations.filter((reservation) => reservation.status === "active");
      if (active.length > 0) {
        const variantIds = active.map((reservation) => reservation.variantId);
        await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(inArray(productVariants.id, variantIds))
          .orderBy(asc(productVariants.id))
          .for("update");
        for (const reservation of active) {
          await tx
            .update(productVariants)
            .set({
              qtyReserved: sql`${productVariants.qtyReserved} - ${reservation.quantity}`,
              version: sql`${productVariants.version} + 1`,
              updatedAt: now,
            })
            .where(
              and(
                eq(productVariants.id, reservation.variantId),
                sql`${productVariants.qtyReserved} >= ${reservation.quantity}`,
              ),
            );
          await tx
            .update(stockReservations)
            .set({ status: "expired", releasedAt: now, releaseReason: "expired" })
            .where(eq(stockReservations.id, reservation.id));
        }
      }
      await tx
        .update(checkoutSessions)
        .set({ status: "expired", updatedAt: now })
        .where(eq(checkoutSessions.id, checkout.id));
      return { expired: true, released: active.length };
    });
    if (result.expired) expiredCheckoutCount += 1;
    releasedReservationCount += result.released;
  }
  return { expiredCheckoutCount, releasedReservationCount };
}
