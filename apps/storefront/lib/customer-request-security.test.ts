import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTrustedStorefrontMutation } from "./customer-request-security";

const production = {
  NODE_ENV: "production",
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
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "https://perfumeaura.com",
      "sec-fetch-site": "same-origin",
    }), { NODE_ENV: "production" }), false);
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "https://perfumeaura.com",
      "sec-fetch-site": "same-origin",
    }), { ...production, STOREFRONT_URL: "not-a-url" }), false);
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "http://perfumeaura.com",
      "sec-fetch-site": "same-origin",
    }), { ...production, STOREFRONT_URL: "http://perfumeaura.com" }), false);
  });

  it("allows local storefront mutations without enabling customer auth", () => {
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
    }), { NODE_ENV: "development" }), true);
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "http://127.0.0.1:3001",
      "sec-fetch-site": "same-origin",
    }), { NODE_ENV: "development" }), true);
    assert.equal(isTrustedStorefrontMutation(new Headers({
      origin: "https://example.com",
      "sec-fetch-site": "same-origin",
    }), { NODE_ENV: "development" }), false);
  });
});
