import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkoutCartSnapshotChanged,
  compareCheckoutCartSet,
} from "./checkout-cart-eligibility";

describe("checkout cart-set comparison", () => {
  it("accepts only an exact one-to-one variant set", () => {
    assert.deepEqual(compareCheckoutCartSet(["a", "b"], ["b", "a"]), { changed: false, removedVariantIds: [] });
    assert.deepEqual(compareCheckoutCartSet(["a", "b"], ["a"]), { changed: true, removedVariantIds: ["b"] });
    assert.deepEqual(compareCheckoutCartSet(["a"], ["a", "a"]), { changed: true, removedVariantIds: ["a"] });
    assert.deepEqual(compareCheckoutCartSet(["a"], ["b"]), { changed: true, removedVariantIds: ["a"] });
  });

  it("detects stale quantities, prices, missing lines, and duplicate identities", () => {
    const current = [
      { variantId: "a", quantity: 1, amountMinor: 19_900 },
      { variantId: "b", quantity: 2, amountMinor: 29_900 },
    ];
    assert.equal(checkoutCartSnapshotChanged([...current].reverse(), current), false);
    assert.equal(checkoutCartSnapshotChanged([
      { ...current[0]!, quantity: 2 },
      current[1]!,
    ], current), true);
    assert.equal(checkoutCartSnapshotChanged([
      { ...current[0]!, amountMinor: 20_900 },
      current[1]!,
    ], current), true);
    assert.equal(checkoutCartSnapshotChanged([current[0]!], current), true);
    assert.equal(checkoutCartSnapshotChanged([current[0]!, current[0]!], current), true);
  });
});
