import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canTransitionCommerceReturn } from "./commerce-lifecycle";

describe("commerce return lifecycle", () => {
  it("allows only the reviewed forward path and terminal idempotency", () => {
    assert.equal(canTransitionCommerceReturn("requested", "approved"), true);
    assert.equal(canTransitionCommerceReturn("approved", "received"), true);
    assert.equal(canTransitionCommerceReturn("received", "refunded"), true);
    assert.equal(canTransitionCommerceReturn("refunded", "refunded"), true);
    assert.equal(canTransitionCommerceReturn("rejected", "approved"), false);
    assert.equal(canTransitionCommerceReturn("received", "cancelled"), false);
    assert.equal(canTransitionCommerceReturn("requested", "refunded"), false);
  });
});
