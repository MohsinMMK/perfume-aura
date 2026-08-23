import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTrustedStorefrontMutation } from "./customer-request-security";

const production = {
  NODE_ENV: "production",
  CUSTOMER_AUTH_URL: "https://perfumeaura.com/api/customer-auth",
  STOREFRONT_URL: "https://perfumeaura.com",
};

describe("storefront mutation origin", () => {
  it("accepts only an exact same-origin request", () => {
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "https://perfumeaura.com",
      "sec-fetch-site": "same-origin",
    }), production), true);
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "https://app.perfumeaura.com",
      "sec-fetch-site": "same-site",
    }), production), false);
  });

  it("fails closed for missing, invalid, or cross-site origins", () => {
    assert.equal(isTrustedStorefrontMutation(new Headers(), production), false);
    assert.equal(isTrustedStorefrontMutation(new Headers({ origin: "not-a-url" }), production), false);
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "https://perfumeaura.com",
      "sec-fetch-site": "cross-site",
    }), production), false);
  });
});
