import { and, eq } from "drizzle-orm";
import { db } from "./client";
import {
  availableQuantity,
  InventoryMathError,
  resolveQuantityDelta,
} from "./inventory-math";
import {
  locations,
  productVariants,
  stockMovements,
  stockMovementTypeEnum,
} from "./schema";

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
  locationId: string;
  type: StockMovementType;
  quantityDelta: number;
  quantityAfter: number;
  idempotent: boolean;
};

export class InventoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "INSUFFICIENT_STOCK"
      | "CONFLICT"
      | "NEGATIVE_STOCK",
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

function resolveDelta(input: ApplyMovementInput): number {
  try {
    return resolveQuantityDelta(input);
  } catch (err) {
    if (err instanceof InventoryMathError) {
      throw new InventoryError(err.message, "INVALID_INPUT");
    }
    throw err;
  }
}

/**
 * Single write path for inventory. Ledger row + on-hand update in one TX.
 *
 * - Locks variant row with FOR UPDATE
 * - Rejects negative on-hand
 * - Optimistic version bump
 * - Idempotent when `idempotencyKey` already exists
 */
export async function applyMovement(
  input: ApplyMovementInput,
): Promise<ApplyMovementResult> {
  const delta = resolveDelta(input);

  return db.transaction(async (tx) => {
    // Idempotency: return existing movement without double-applying
    if (input.idempotencyKey) {
      const existing = await tx
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.idempotencyKey, input.idempotencyKey))
        .limit(1);

      if (existing[0]) {
        const row = existing[0];
        return {
          movementId: row.id,
          variantId: row.variantId,
          locationId: row.locationId,
          type: row.type,
          quantityDelta: row.quantityDelta,
          quantityAfter: row.quantityAfter,
          idempotent: true,
        };
      }
    }

    // Resolve location (default MAIN)
    let locationId = input.locationId;
    if (!locationId) {
      const main = await tx
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.code, "MAIN"))
        .limit(1);

      if (!main[0]) {
        throw new InventoryError(
          'Location MAIN not found — run seedMainLocation()',
          "NOT_FOUND",
        );
      }
      locationId = main[0].id;
    } else {
      const loc = await tx
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);
      if (!loc[0]) {
        throw new InventoryError(
          `Location not found: ${locationId}`,
          "NOT_FOUND",
        );
      }
    }

    // Lock variant balance
    const variants = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, input.variantId))
      .for("update")
      .limit(1);

    const variant = variants[0];
    if (!variant) {
      throw new InventoryError(
        `Variant not found: ${input.variantId}`,
        "NOT_FOUND",
      );
    }

    const quantityAfter = variant.quantityOnHand + delta;
    if (quantityAfter < 0) {
      throw new InventoryError(
        `Insufficient stock for variant ${input.variantId}: on_hand=${variant.quantityOnHand}, delta=${delta}`,
        "INSUFFICIENT_STOCK",
      );
    }

    // Outbound also cannot exceed available (on_hand - reserved) for sales
    if (input.type === "sale") {
      const available = availableQuantity(
        variant.quantityOnHand,
        variant.qtyReserved,
      );
      if (Math.abs(delta) > available) {
        throw new InventoryError(
          `Insufficient available stock: available=${available}, requested=${Math.abs(delta)}`,
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

    if (updated.length === 0) {
      throw new InventoryError(
        "Concurrent stock update — retry",
        "CONFLICT",
      );
    }

    return {
      movementId: movement.id,
      variantId: input.variantId,
      locationId,
      type: input.type,
      quantityDelta: delta,
      quantityAfter,
      idempotent: false,
    };
  });
}
