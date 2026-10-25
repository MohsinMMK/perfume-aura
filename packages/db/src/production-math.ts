import { InventoryMathError } from "./inventory-math";
import { oilMlForBottles } from "./oil-math";

/** Oil and base mixture one batch of finished bottles uses. */
export type BottleRecipe = {
  oilMl: number;
  baseMl: number;
};

/**
 * Oil is the ceiling of the series share so the ledger never under-deducts;
 * the base fills the rest of the bottle.
 */
export function recipeForBottles(
  sizeMl: number,
  quantity: number,
  concentrationPercent: number,
): BottleRecipe {
  const oilMl = oilMlForBottles(sizeMl, quantity, concentrationPercent);
  return { oilMl, baseMl: sizeMl * quantity - oilMl };
}

function assertNonNegativeInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new InventoryMathError(
      `${field} must be a non-negative integer`,
      "INVALID_INPUT",
    );
  }
  return value;
}

export type CanMakeInput = {
  sizeMl: number;
  concentrationPercent: number;
  oilAvailableMl: number;
  baseAvailableMl: number;
  bottlesOnHand: number;
  /** Null when this size ships without a box. */
  boxesOnHand: number | null;
};

export type CanMakeResult = {
  quantity: number;
  /** The material that runs out first. */
  limitedBy: "oil" | "base" | "bottle" | "box";
};

/**
 * The most finished bottles of one size the materials on hand can make.
 * Exact for the rounded recipe: oil needs size·n·p ≤ 100·oil, and the base
 * (the floor of the rest) needs size·n·(100 − p) < 100·(base + 1).
 */
export function bottlesCanMake(input: CanMakeInput): CanMakeResult {
  const size = input.sizeMl;
  const percent = input.concentrationPercent;
  if (!Number.isInteger(size) || size <= 0) {
    throw new InventoryMathError("sizeMl must be a positive integer", "INVALID_INPUT");
  }
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    throw new InventoryMathError(
      "concentrationPercent must be an integer from 1 to 100",
      "INVALID_INPUT",
    );
  }
  const oil = assertNonNegativeInt(input.oilAvailableMl, "oilAvailableMl");
  const base = assertNonNegativeInt(input.baseAvailableMl, "baseAvailableMl");
  const bottles = assertNonNegativeInt(input.bottlesOnHand, "bottlesOnHand");

  const limits: Array<[CanMakeResult["limitedBy"], number]> = [
    ["oil", Math.floor((100 * oil) / (size * percent))],
    [
      "base",
      percent === 100
        ? Number.POSITIVE_INFINITY
        : Math.ceil((100 * (base + 1)) / (size * (100 - percent))) - 1,
    ],
    ["bottle", bottles],
  ];
  if (input.boxesOnHand !== null) {
    limits.push(["box", assertNonNegativeInt(input.boxesOnHand, "boxesOnHand")]);
  }

  let best = limits[0] as [CanMakeResult["limitedBy"], number];
  for (const limit of limits) {
    if (limit[1] < best[1]) best = limit;
  }
  return { quantity: best[1], limitedBy: best[0] };
}
