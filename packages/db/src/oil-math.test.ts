import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InventoryMathError } from "./inventory-math";
import {
  ML_PER_KG_OIL_BOTTLE,
  OIL_CONCENTRATION_PERCENT,
  availableOilMl,
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

  it("ceils Signature 105 ml so the integer ledger never under-consumes", () => {
    assert.equal(oilMlForBottles(105, 1), 53);
    assert.equal(oilMlForBottles(105, 2), 105);
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

describe("availableOilMl", () => {
  it("excludes active storefront holds from owner-side consumption", () => {
    assert.equal(availableOilMl(1000, 0), 1000);
    assert.equal(availableOilMl(1000, 175), 825);
    assert.equal(availableOilMl(175, 175), 0);
  });

  it("rejects invalid or over-reserved oil balances", () => {
    assert.throws(() => availableOilMl(1000, -1), InventoryMathError);
    assert.throws(() => availableOilMl(1000, 1001), InventoryMathError);
  });
});
