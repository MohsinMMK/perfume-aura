import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availableQuantity,
  canSell,
  InventoryMathError,
  quantityAfterDelta,
  resolveQuantityDelta,
} from "./inventory-math";

describe("availableQuantity", () => {
  it("subtracts reserved from on-hand", () => {
    assert.equal(availableQuantity(10, 3), 7);
  });

  it("never returns negative when reserved exceeds on-hand", () => {
    assert.equal(availableQuantity(2, 5), 0);
  });

  it("allows zero reserved", () => {
    assert.equal(availableQuantity(4, 0), 4);
  });

  it("rejects non-integers", () => {
    assert.throws(
      () => availableQuantity(1.5, 0),
      (err: unknown) =>
        err instanceof InventoryMathError && err.code === "INVALID_INPUT",
    );
  });
});

describe("canSell", () => {
  it("allows sale within available", () => {
    assert.equal(canSell(5, 1, 4), true);
  });

  it("rejects sale above available", () => {
    assert.equal(canSell(5, 1, 5), false);
  });

  it("rejects last unit when fully reserved", () => {
    assert.equal(canSell(1, 1, 1), false);
  });

  it("rejects non-positive request", () => {
    assert.equal(canSell(10, 0, 0), false);
    assert.equal(canSell(10, 0, -1), false);
  });
});

describe("quantityAfterDelta", () => {
  it("applies receive and sale deltas", () => {
    assert.equal(quantityAfterDelta(10, 3), 13);
    assert.equal(quantityAfterDelta(10, -4), 6);
  });

  it("allows projected negative (caller enforces)", () => {
    assert.equal(quantityAfterDelta(1, -2), -1);
  });
});

describe("resolveQuantityDelta", () => {
  it("maps receive/return positive and sale/damage negative", () => {
    assert.equal(resolveQuantityDelta({ type: "receive", quantity: 5 }), 5);
    assert.equal(resolveQuantityDelta({ type: "return", quantity: 2 }), 2);
    assert.equal(resolveQuantityDelta({ type: "sale", quantity: 3 }), -3);
    assert.equal(resolveQuantityDelta({ type: "damage", quantity: 1 }), -1);
  });

  it("requires positive quantity for non-adjust types", () => {
    assert.throws(
      () => resolveQuantityDelta({ type: "sale", quantity: 0 }),
      InventoryMathError,
    );
    assert.throws(
      () => resolveQuantityDelta({ type: "receive" }),
      InventoryMathError,
    );
  });

  it("requires signed delta and note for adjust", () => {
    assert.equal(
      resolveQuantityDelta({
        type: "adjust",
        quantityDelta: -2,
        note: "count correction",
      }),
      -2,
    );
    assert.throws(
      () =>
        resolveQuantityDelta({
          type: "adjust",
          quantityDelta: 1,
          note: "   ",
        }),
      InventoryMathError,
    );
    assert.throws(
      () => resolveQuantityDelta({ type: "adjust", note: "missing delta" }),
      InventoryMathError,
    );
    assert.throws(
      () =>
        resolveQuantityDelta({
          type: "adjust",
          quantityDelta: 0,
          note: "zero",
        }),
      InventoryMathError,
    );
  });
});
