import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

describe("security headers", () => {
  it("enforces the production CSP and transport boundary", () => {
    const headers = new Map(
      securityHeaders({ reportOnly: false, development: false }).map(
        ({ key, value }) => [key, value],
      ),
    );
    assert.match(headers.get("Content-Security-Policy") ?? "", /default-src 'self'/);
    assert.match(headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
    assert.match(headers.get("Content-Security-Policy") ?? "", /upgrade-insecure-requests/);
    assert.equal(headers.get("Strict-Transport-Security"), "max-age=31536000");
    assert.equal(headers.get("X-Frame-Options"), "DENY");
    assert.equal(headers.get("X-Powered-By"), undefined);
  });

  it("supports report-only validation without production HSTS locally", () => {
    const headers = new Map(
      securityHeaders({ reportOnly: true, development: true }).map(
        ({ key, value }) => [key, value],
      ),
    );
    assert.equal(headers.has("Content-Security-Policy"), false);
    assert.match(
      headers.get("Content-Security-Policy-Report-Only") ?? "",
      /'unsafe-eval'/,
    );
    assert.equal(headers.has("Strict-Transport-Security"), false);
    assert.doesNotMatch(contentSecurityPolicy(true), /upgrade-insecure-requests/);
  });
});
