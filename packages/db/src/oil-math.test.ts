import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InventoryMathError } from "./inventory-math";
import {
  ML_PER_KG_OIL_BOTTLE,
  OIL_CONCENTRATION_PERCENT,
  oilMlForBottles,
  receiveOilMl,
  remainingOilAfterDelta,
} from "./oil-math";

describe("oilMlForBottles", () => {
  it("uses the locked 50% recipe", () => {
    assert.equal(OIL_CONCENTRATION_PERCENT, 50);
    assert.equal(oilMlForBottles(100, 1), 50);
    assert.equal(oilMlForBottles(50, 2), 50);
    assert.equal(oilMlForBottles(30, 1), 15);
  });

  it("rejects non-positive or non-integer inputs", () => {
    assert.throws(() => oilMlForBottles(100, 0), InventoryMathError);
    assert.throws(() => oilMlForBottles(50.5, 1), InventoryMathError);
  });
});

describe("receiveOilMl", () => {
  it("treats one kilogram bottle as 1000 ml", () => {
    assert.equal(ML_PER_KG_OIL_BOTTLE, 1000);
    assert.equal(receiveOilMl(1), 1000);
    assert.equal(receiveOilMl(3), 3000);
  });
});

describe("remainingOilAfterDelta", () => {
  it("applies receive and sale deltas", () => {
    assert.equal(remainingOilAfterDelta(1000, -50), 950);
    assert.equal(remainingOilAfterDelta(0, 1000), 1000);
  });
});
