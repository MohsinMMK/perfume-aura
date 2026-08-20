import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareCheckoutCartSet } from "./checkout-cart-eligibility";

describe("checkout cart-set comparison", () => {
  it("accepts only an exact one-to-one variant set", () => {
    assert.deepEqual(compareCheckoutCartSet(["a", "b"], ["b", "a"]), { changed: false, removedVariantIds: [] });
    assert.deepEqual(compareCheckoutCartSet(["a", "b"], ["a"]), { changed: true, removedVariantIds: ["b"] });
    assert.deepEqual(compareCheckoutCartSet(["a"], ["a", "a"]), { changed: true, removedVariantIds: ["a"] });
    assert.deepEqual(compareCheckoutCartSet(["a"], ["b"]), { changed: true, removedVariantIds: ["a"] });
  });
});
