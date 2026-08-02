import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPublicCatalogEnabled } from "./catalog-policy";
import { readReleaseLockedCart } from "./cart-store";

describe("storefront public release boundary", () => {
  it("requires an explicit public release flag", () => {
    assert.equal(isPublicCatalogEnabled({}), false);
    assert.equal(
      isPublicCatalogEnabled({ STOREFRONT_PUBLIC_RELEASE: "false" }),
      false,
    );
    assert.equal(
      isPublicCatalogEnabled({ STOREFRONT_PUBLIC_RELEASE: "true" }),
      true,
    );
  });

  it("returns an empty disabled cart while commerce is release-locked", () => {
    assert.deepEqual(readReleaseLockedCart(), {
      lines: [],
      subtotal: { currency: "INR", amountMinor: 0 },
      quantity: 0,
      checkoutEnabled: false,
      checkoutBlockReason:
        "Checkout is locked until shipping, policy, tax, Cashfree, and production catalog approvals are complete.",
    });
  });
});
