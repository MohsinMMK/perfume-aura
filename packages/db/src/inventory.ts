import { and, eq } from "drizzle-orm";
import { DomainError } from "./domain-errors";
import {
  availableQuantity,
  InventoryMathError,
  resolveQuantityDelta,
} from "./inventory-math";
import {
  locations,
  products,
  productVariants,
  stockMovements,
  stockMovementTypeEnum,
} from "./schema";
import {
  isUniqueViolation,
  runDomainTransaction,
  type DbTransaction,
} from "./transactions";

export type StockMovementType =
  (typeof stockMovementTypeEnum.enumValues)[number];

export type ApplyMovementInput = {
  variantId: string;
  locationId?: string;
  type: StockMovementType;
  /**
   * Always a positive integer for receive | sale | damage | return.
   * Ignored for adjust when `quantityDelta` is provided.
   */
  quantity?: number;
  /**
   * Signed delta for `adjust` only. Required when type is `adjust`.
   * Note is required for adjust.
   */
  quantityDelta?: number;
  note?: string;
  userId?: string;
  idempotencyKey?: string;
  refType?: string;
  refId?: string;
};

export type ApplyMovementResult = {
  movementId: string;
  variantId: string;
  productId: string;
  locationId: string;
  type: StockMovementType;
  quantityDelta: number;
  quantityAfter: number;
  idempotent: boolean;
};

type InventoryErrorCode =
  | "INVALID_INPUT"
  | "INVALID_STATE"
  | "NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT";

export class InventoryError extends DomainError {
  declare readonly code: InventoryErrorCode;

  constructor(message: string, code: InventoryErrorCode) {
    super(code, message);
    this.name = "InventoryError";
  }
}

function resolveDelta(input: ApplyMovementInput): number {
  try {
    return resolveQuantityDelta(input);
  } catch (error) {
    if (error instanceof InventoryMathError) {
      throw new InventoryError(error.message, "INVALID_INPUT");
    }
    throw error;
  }
}
function optionalValue(value: string | undefined): string | null {
  return value ?? null;
}

function existingMovementMatches(
  existing: typeof stockMovements.$inferSelect,
  input: ApplyMovementInput,
  locationId: string,
  delta: number,
): boolean {
  return (
    existing.variantId === input.variantId &&
    existing.locationId === locationId &&
    existing.type === input.type &&
    existing.quantityDelta === delta &&
    existing.refType === optionalValue(input.refType) &&
    existing.refId === optionalValue(input.refId) &&
    existing.note === optionalValue(input.note) &&
    existing.createdBy === optionalValue(input.userId)
  );
}

/**
 * Transaction-composable inventory mutation.
 *
 * Fulfillment may enter with multiple sorted variant locks and deliberately
 * permits an already-issued line to complete after archival. Manual receive or
 * adjust instead discovers the aggregate, locks product then variant, replays
 * an exact idempotent result when present, and otherwise requires both rows to
 * remain active before the ledger/cache mutation.
 */
export async function applyMovementInTransaction(
  tx: DbTransaction,
  input: ApplyMovementInput,
): Promise<ApplyMovementResult> {
  const delta = resolveDelta(input);
  const requiresActiveCatalog =
    input.type === "receive" || input.type === "adjust";

  let locationId = input.locationId;
  if (!locationId) {
    const [main] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.code, "MAIN"))
      .limit(1);
    if (!main) {
      throw new InventoryError(
        'Location MAIN not found — run seedMainLocation()',
        "NOT_FOUND",
      );
    }
    locationId = main.id;
  } else {
    const [location] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);
    if (!location) {
      throw new InventoryError(`Location not found: ${locationId}`, "NOT_FOUND");
    }
  }

  let lockedProductStatus: "active" | "archived" | undefined;
  let expectedProductId: string | undefined;
  if (requiresActiveCatalog) {
    // Manual stock entry shares the product-first aggregate lock order used by
    // lifecycle workflows. The unlocked lookup discovers the aggregate; the
    // product lock then serializes this mutation against product/variant
    // archive before the variant row is locked below.
    const [candidate] = await tx
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.id, input.variantId))
      .limit(1);
    if (!candidate) {
      throw new InventoryError(
        `Variant not found: ${input.variantId}`,
        "NOT_FOUND",
      );
    }
    expectedProductId = candidate.productId;

    const [product] = await tx
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.id, expectedProductId))
      .for("update")
      .limit(1);
    if (!product) {
      throw new InventoryError(
        `Product not found for variant: ${input.variantId}`,
        "NOT_FOUND",
      );
    }
    lockedProductStatus = product.status;
  }

  const [variant] = await tx
    .select()
    .from(productVariants)
    .where(
      expectedProductId
        ? and(
            eq(productVariants.id, input.variantId),
            eq(productVariants.productId, expectedProductId),
          )
        : eq(productVariants.id, input.variantId),
    )
    .for("update")
    .limit(1);

  if (!variant) {
    throw new InventoryError(
      `Variant not found: ${input.variantId}`,
      "NOT_FOUND",
    );
  }

  if (input.idempotencyKey) {
    const [existing] = await tx
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing) {
      if (!existingMovementMatches(existing, input, locationId, delta)) {
        throw new InventoryError(
          "Idempotency key was already used for a different stock movement",
          "IDEMPOTENCY_CONFLICT",
        );
      }

      return {
        movementId: existing.id,
        variantId: existing.variantId,
        productId: variant.productId,
        locationId: existing.locationId,
        type: existing.type,
        quantityDelta: existing.quantityDelta,
        quantityAfter: existing.quantityAfter,
        idempotent: true,
      };
    }
  }

  if (
    requiresActiveCatalog &&
    (lockedProductStatus !== "active" || variant.status !== "active")
  ) {
    throw new InventoryError(
      "Manual stock changes require an active product and variant",
      "INVALID_STATE",
    );
  }

  const quantityAfter = variant.quantityOnHand + delta;
  if (quantityAfter < 0) {
    throw new InventoryError(
      `Insufficient stock: on hand ${variant.quantityOnHand}, requested ${Math.abs(delta)}`,
      "INSUFFICIENT_STOCK",
    );
  }

  if (input.type === "sale") {
    const available = availableQuantity(
      variant.quantityOnHand,
      variant.qtyReserved,
    );
    if (Math.abs(delta) > available) {
      throw new InventoryError(
        `Insufficient available stock: available ${available}, requested ${Math.abs(delta)}`,
        "INSUFFICIENT_STOCK",
      );
    }
  }

  const [movement] = await tx
    .insert(stockMovements)
    .values({
      variantId: input.variantId,
      locationId,
      type: input.type,
      quantityDelta: delta,
      quantityAfter,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      note: input.note ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      unitCostCents: input.type === "sale" ? variant.costCents : null,
      costBasis: input.type === "sale" ? "snapshot" : null,
      createdBy: input.userId ?? null,
    })
    .returning();

  if (!movement) {
    throw new InventoryError("Failed to insert stock movement", "CONFLICT");
  }

  const updated = await tx
    .update(productVariants)
    .set({
      quantityOnHand: quantityAfter,
      version: variant.version + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productVariants.id, input.variantId),
        eq(productVariants.version, variant.version),
      ),
    )
    .returning({ id: productVariants.id });

  if (updated.length !== 1) {
    throw new InventoryError("Concurrent stock update", "CONFLICT");
  }

  return {
    movementId: movement.id,
    variantId: input.variantId,
    productId: variant.productId,
    locationId,
    type: input.type,
    quantityDelta: delta,
    quantityAfter,
    idempotent: false,
  };
}

/** Public standalone wrapper. Never start this inside another transaction. */
export async function applyMovement(
  input: ApplyMovementInput,
): Promise<ApplyMovementResult> {
  try {
    return await runDomainTransaction((tx) =>
      applyMovementInTransaction(tx, input),
    );
  } catch (error) {
    if (error instanceof InventoryError) throw error;
    if (isUniqueViolation(error) && input.idempotencyKey) {
      throw new InventoryError(
        "Idempotency key was already used by a concurrent operation",
        "IDEMPOTENCY_CONFLICT",
      );
    }
    throw error;
  }
}
