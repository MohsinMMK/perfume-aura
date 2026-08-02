import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCustomerAuthSecretResolver,
  resolveCustomerAuthBaseUrl,
  resolveCustomerAuthTrustedOrigins,
} from "./customer-auth-policy";

describe("storefront customer-auth boundary", () => {
  it("uses only the storefront origin and a distinct customer secret", () => {
    const environment = {
      NODE_ENV: "production",
      CUSTOMER_AUTH_URL: "https://shop.perfumeaura.com/api/customer-auth",
      STOREFRONT_URL: "https://shop.perfumeaura.com",
      CUSTOMER_AUTH_SECRET: "customer-secret-that-is-distinct-and-long-enough",
    };
    assert.equal(resolveCustomerAuthBaseUrl(environment), "https://shop.perfumeaura.com");
    assert.deepEqual(resolveCustomerAuthTrustedOrigins(environment), ["https://shop.perfumeaura.com"]);
    assert.equal(createCustomerAuthSecretResolver()(environment), environment.CUSTOMER_AUTH_SECRET);
    assert.ok(!resolveCustomerAuthTrustedOrigins(environment).includes("https://app.perfumeaura.com"));
  });
});
