import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCustomerCallbackURL } from "./customer-auth-policy";

describe("customer callback URL policy", () => {
  it("preserves safe local paths and rejects external or protocol-relative targets", () => {
    assert.equal(normalizeCustomerCallbackURL("/checkout?from=cart"), "/checkout?from=cart");
    assert.equal(normalizeCustomerCallbackURL("https://evil.example"), "/account");
    assert.equal(normalizeCustomerCallbackURL("//evil.example/checkout"), "/account");
    assert.equal(normalizeCustomerCallbackURL("/\\evil.example"), "/account");
  });
});
