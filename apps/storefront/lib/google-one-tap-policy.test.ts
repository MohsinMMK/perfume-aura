import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldOfferGoogleOneTap } from "./google-one-tap-policy";

describe("Google One Tap route policy", () => {
  it("offers sign-in only on discovery and shopping routes", () => {
    for (const pathname of [
      "/",
      "/shop",
      "/products/aura-elixir",
      "/collections/signature",
      "/cart",
      "/search",
      "/find-your-scent",
    ]) {
      assert.equal(shouldOfferGoogleOneTap(pathname), true, pathname);
    }
  });

  it("does not interrupt account, checkout, order, or policy flows", () => {
    for (const pathname of [
      "/account/sign-in",
      "/account/settings",
      "/checkout",
      "/order/private-token",
      "/privacy",
      "/terms",
    ]) {
      assert.equal(shouldOfferGoogleOneTap(pathname), false, pathname);
    }
  });
});
