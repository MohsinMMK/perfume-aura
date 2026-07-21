/**
 * Pure inventory math (unit-testable, no DB).
 * Used by applyMovement and any UI that mirrors available qty.
 */

export type MovementTypeForDelta =
  | "receive"
  | "sale"
  | "adjust"
  | "damage"
  | "return";

export class InventoryMathError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_INPUT",
  ) {
    super(message);
    this.name = "InventoryMathError";
  }
}

/** Bottles available to sell: on_hand − reserved (never negative). */
export function availableQuantity(
  quantityOnHand: number,
  qtyReserved: number,
): number {
  if (!Number.isInteger(quantityOnHand) || !Number.isInteger(qtyReserved)) {
    throw new InventoryMathError(
      "quantityOnHand and qtyReserved must be integers",
      "INVALID_INPUT",
    );
  }
  return Math.max(0, quantityOnHand - qtyReserved);
}

/**
 * Whether an outbound sale of `requested` bottles is allowed.
 * `requested` is a positive count (not a signed delta).
 */
export function canSell(
  quantityOnHand: number,
  qtyReserved: number,
  requested: number,
): boolean {
  if (!Number.isInteger(requested) || requested <= 0) {
    return false;
  }
  return requested <= availableQuantity(quantityOnHand, qtyReserved);
}

/** Projected on-hand after applying a signed delta. */
export function quantityAfterDelta(
  quantityOnHand: number,
  delta: number,
): number {
  if (!Number.isInteger(quantityOnHand) || !Number.isInteger(delta)) {
    throw new InventoryMathError(
      "quantityOnHand and delta must be integers",
      "INVALID_INPUT",
    );
  }
  return quantityOnHand + delta;
}

export function assertPositiveInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InventoryMathError(
      `${field} must be a positive integer`,
      "INVALID_INPUT",
    );
  }
  return value;
}

export function assertNonZeroInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value === 0) {
    throw new InventoryMathError(
      `${field} must be a non-zero integer`,
      "INVALID_INPUT",
    );
  }
  return value;
}

export type ResolveDeltaInput = {
  type: MovementTypeForDelta;
  quantity?: number;
  quantityDelta?: number;
  note?: string;
};

/**
 * Resolve signed quantity_delta from movement type.
 * - receive / return → +quantity
 * - sale / damage → −quantity
 * - adjust → quantityDelta (signed), note required
 */
export function resolveQuantityDelta(input: ResolveDeltaInput): number {
  const { type } = input;

  if (type === "adjust") {
    if (input.quantityDelta === undefined) {
      throw new InventoryMathError(
        "adjust requires signed quantityDelta",
        "INVALID_INPUT",
      );
    }
    if (!input.note || input.note.trim().length === 0) {
      throw new InventoryMathError("adjust requires a note", "INVALID_INPUT");
    }
    return assertNonZeroInt(input.quantityDelta, "quantityDelta");
  }

  if (input.quantity === undefined) {
    throw new InventoryMathError(
      `${type} requires positive quantity`,
      "INVALID_INPUT",
    );
  }

  const qty = assertPositiveInt(input.quantity, "quantity");

  switch (type) {
    case "receive":
    case "return":
      return qty;
    case "sale":
    case "damage":
      return -qty;
    default: {
      const _exhaustive: never = type;
      throw new InventoryMathError(
        `Unknown movement type: ${_exhaustive}`,
        "INVALID_INPUT",
      );
    }
  }
}
