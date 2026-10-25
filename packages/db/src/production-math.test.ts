import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InventoryMathError } from "./inventory-math";
import { bottlesCanMake, recipeForBottles } from "./production-math";

describe("recipeForBottles", () => {
  it("splits each bottle into oil and base at the series share", () => {
    assert.deepEqual(recipeForBottles(100, 1, 50), { oilMl: 50, baseMl: 50 });
    assert.deepEqual(recipeForBottles(50, 2, 30), { oilMl: 30, baseMl: 70 });
    assert.deepEqual(recipeForBottles(30, 1, 100), { oilMl: 30, baseMl: 0 });
  });

  it("rounds oil up and gives the rest to the base", () => {
    assert.deepEqual(recipeForBottles(105, 1, 50), { oilMl: 53, baseMl: 52 });
    assert.deepEqual(recipeForBottles(105, 2, 50), { oilMl: 105, baseMl: 105 });
  });

  it("rejects a share above 100%", () => {
    assert.throws(() => recipeForBottles(50, 1, 101), InventoryMathError);
  });
});

describe("bottlesCanMake", () => {
  const plenty = {
    sizeMl: 50,
    concentrationPercent: 50,
    oilAvailableMl: 10_000,
    baseAvailableMl: 10_000,
    bottlesOnHand: 1_000,
    boxesOnHand: null,
  };

  it("stops at the material that runs out first", () => {
    assert.deepEqual(bottlesCanMake({ ...plenty, oilAvailableMl: 100 }), {
      quantity: 4,
      limitedBy: "oil",
    });
    assert.deepEqual(bottlesCanMake({ ...plenty, baseAvailableMl: 74 }), {
      quantity: 2,
      limitedBy: "base",
    });
    assert.deepEqual(bottlesCanMake({ ...plenty, bottlesOnHand: 3 }), {
      quantity: 3,
      limitedBy: "bottle",
    });
    assert.deepEqual(bottlesCanMake({ ...plenty, boxesOnHand: 0 }), {
      quantity: 0,
      limitedBy: "box",
    });
  });

  it("agrees with the rounded recipe at every boundary", () => {
    for (const sizeMl of [10, 30, 50, 105, 150]) {
      for (const percent of [15, 33, 50, 99]) {
        for (let oil = 0; oil <= 200; oil += 7) {
          for (let base = 0; base <= 200; base += 11) {
            const { quantity } = bottlesCanMake({
              ...plenty,
              sizeMl,
              concentrationPercent: percent,
              oilAvailableMl: oil,
              baseAvailableMl: base,
            });
            if (quantity > 0) {
              const used = recipeForBottles(sizeMl, quantity, percent);
              assert.ok(used.oilMl <= oil && used.baseMl <= base);
            }
            const next = recipeForBottles(sizeMl, quantity + 1, percent);
            assert.ok(next.oilMl > oil || next.baseMl > base);
          }
        }
      }
    }
  });

  it("needs no base for a pure-oil series", () => {
    assert.equal(
      bottlesCanMake({ ...plenty, concentrationPercent: 100, baseAvailableMl: 0 }).quantity,
      200,
    );
  });
});
