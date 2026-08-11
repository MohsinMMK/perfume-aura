import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_RETURN_PATH,
  LOCAL_AUTH_IP_ORIGIN,
  LOCAL_AUTH_ORIGIN,
  PRODUCTION_AUTH_ORIGIN,
  resolveAuthBaseUrl,
  resolveAuthTrustedOrigins,
  safeReturnPath,
} from "./auth-policy";

describe("auth origin policy", () => {
  it("requires the exact HTTPS production origin at runtime", () => {
    assert.equal(
      resolveAuthBaseUrl({
        NODE_ENV: "production",
        BETTER_AUTH_URL: PRODUCTION_AUTH_ORIGIN,
      }),
      PRODUCTION_AUTH_ORIGIN,
    );
    assert.throws(
      () => resolveAuthBaseUrl({ NODE_ENV: "production" }),
      /BETTER_AUTH_URL is required/,
    );
    assert.throws(
      () =>
        resolveAuthBaseUrl({
          NODE_ENV: "production",
          BETTER_AUTH_URL: "http://app.perfumeaura.com",
        }),
      /Production BETTER_AUTH_URL/,
    );
  });

  it("separates exact production origins from development and test", () => {
    assert.deepEqual(resolveAuthTrustedOrigins({ NODE_ENV: "production" }), [
      PRODUCTION_AUTH_ORIGIN,
    ]);
    assert.deepEqual(resolveAuthTrustedOrigins({ NODE_ENV: "test" }), [
      LOCAL_AUTH_ORIGIN,
      LOCAL_AUTH_IP_ORIGIN,
    ]);
    assert.throws(
      () =>
        resolveAuthBaseUrl({
          NODE_ENV: "test",
          BETTER_AUTH_URL: PRODUCTION_AUTH_ORIGIN,
        }),
      /approved for the current environment/,
    );
    assert.throws(
      () =>
        resolveAuthBaseUrl({
          NODE_ENV: "production",
          BETTER_AUTH_URL: LOCAL_AUTH_ORIGIN,
        }),
      /Production BETTER_AUTH_URL/,
    );
  });

  it("forces the canonical build origin over conflicting inherited values", () => {
    assert.equal(
      resolveAuthBaseUrl({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
        BETTER_AUTH_URL: LOCAL_AUTH_ORIGIN,
      }),
      PRODUCTION_AUTH_ORIGIN,
    );
    assert.equal(
      resolveAuthBaseUrl({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
        BETTER_AUTH_URL: "https://conflicting.example",
      }),
      PRODUCTION_AUTH_ORIGIN,
    );
    assert.throws(
      () => resolveAuthBaseUrl({ NODE_ENV: "production" }),
      /BETTER_AUTH_URL is required/,
    );
  });
});

describe("safe auth return paths", () => {
  it("retains allowlisted paths, query strings, and fragments", () => {
    assert.equal(
      safeReturnPath("/invoices/abc?print=true#summary"),
      "/invoices/abc?print=true#summary",
    );
    assert.equal(safeReturnPath("/settings/security"), "/settings/security");
    assert.equal(safeReturnPath("/commerce/orders"), "/commerce/orders");
  });

  it("rejects external, encoded, malformed, and unrecognized targets", () => {
    const attacks = [
      null,
      "",
      "//evil.example",
      "/%2f%2fevil.example",
      "/%252f%252fevil.example",
      "/\\evil.example",
      "/%5cevil.example",
      "https://evil.example",
      "/javascript:alert(1)",
      "/%6aavascript:alert(1)",
      "/dashboard%0d%0aLocation:%20https://evil.example",
      " /dashboard",
      "/admin",
    ];

    for (const attack of attacks) {
      assert.equal(safeReturnPath(attack), DEFAULT_RETURN_PATH);
    }
  });
});
