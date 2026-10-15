import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contentSecurityPolicy,
  PORTFOLIO_PREVIEW_PATH,
  securityHeaderRules,
  securityHeaders,
} from "./security-headers";

describe("storefront security headers", () => {
  it("enforces the production browser and transport boundary", () => {
    const headers = new Map(
      securityHeaders({ reportOnly: false, development: false }).map(
        ({ key, value }) => [key, value],
      ),
    );
    const policy = headers.get("Content-Security-Policy") ?? "";

    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /frame-ancestors 'none'(;|$)/);
    assert.match(policy, /script-src[^;]+https:\/\/sdk\.cashfree\.com/);
    assert.match(
      policy,
      /script-src[^;]+https:\/\/accounts\.google\.com\/gsi\/client/,
    );
    assert.match(policy, /connect-src[^;]+https:\/\/api\.cashfree\.com/);
    assert.match(
      policy,
      /connect-src[^;]+https:\/\/accounts\.google\.com\/gsi\//,
    );
    assert.match(policy, /connect-src[^;]+https:\/\/\*\.posthog\.com/);
    assert.match(policy, /connect-src[^;]+https:\/\/\*\.ingest\.sentry\.io/);
    assert.match(policy, /frame-src[^;]+https:\/\/payments\.cashfree\.com/);
    assert.match(
      policy,
      /frame-src[^;]+https:\/\/accounts\.google\.com\/gsi\//,
    );
    assert.match(policy, /upgrade-insecure-requests/);
    assert.equal(headers.get("Strict-Transport-Security"), "max-age=31536000");
    assert.equal(headers.get("X-Frame-Options"), "DENY");
    assert.equal(
      headers.get("Cross-Origin-Opener-Policy"),
      "same-origin-allow-popups",
    );
  });

  it("lets only the home page into Khanect's portfolio preview frame", () => {
    const rules = securityHeaderRules({ reportOnly: false, development: false });
    const policyFor = (source: string) =>
      rules
        .filter((rule) => rule.source === source)
        .at(-1)
        ?.headers.find(({ key }) => key === "Content-Security-Policy")?.value ?? "";

    assert.equal(PORTFOLIO_PREVIEW_PATH, "/");
    assert.equal(rules.at(-1)?.source, PORTFOLIO_PREVIEW_PATH);
    assert.match(policyFor("/(.*)"), /frame-ancestors 'none'(;|$)/);
    assert.match(
      policyFor(PORTFOLIO_PREVIEW_PATH),
      /frame-ancestors 'self' https:\/\/khanect\.com https:\/\/www\.khanect\.com(;|$)/,
    );
  });

  it("supports local report-only validation without production HSTS", () => {
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
