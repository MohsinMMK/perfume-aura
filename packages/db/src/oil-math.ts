import { InventoryMathError } from "./inventory-math";

/** Locked v1 recipe: every finished perfume is 50% oil by volume. */
export const OIL_CONCENTRATION_PERCENT = 50;

/** Locked v1 conversion: one original 1 kg concentrate bottle is 1000 ml. */
export const ML_PER_KG_OIL_BOTTLE = 1000;

function assertPositiveInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InventoryMathError(
      `${field} must be a positive integer`,
      "INVALID_INPUT",
    );
  }
  return value;
}

/**
 * Oil millilitres consumed by selling `quantity` finished bottles of `sizeMl`.
 * 100 ml at 50% → 50 ml. 50 ml → 25 ml. 30 ml → 15 ml.
 */
export function oilMlForBottles(sizeMl: number, quantity: number): number {
  const size = assertPositiveInt(sizeMl, "sizeMl");
  const count = assertPositiveInt(quantity, "quantity");
  const numerator = size * count * OIL_CONCENTRATION_PERCENT;
  if (numerator % 100 !== 0) {
    throw new InventoryMathError(
      `Oil volume for ${size} ml × ${count} is not a whole millilitre at ${OIL_CONCENTRATION_PERCENT}%`,
      "INVALID_INPUT",
    );
  }
  return numerator / 100;
}

/** Received oil millilitres for a whole number of 1 kg bottles. */
export function receiveOilMl(kgBottles: number): number {
  return assertPositiveInt(kgBottles, "kgBottles") * ML_PER_KG_OIL_BOTTLE;
}

export function remainingOilAfterDelta(
  remainingMl: number,
  deltaMl: number,
): number {
  if (!Number.isInteger(remainingMl) || !Number.isInteger(deltaMl)) {
    throw new InventoryMathError(
      "remainingMl and deltaMl must be integers",
      "INVALID_INPUT",
    );
  }
  return remainingMl + deltaMl;
}
