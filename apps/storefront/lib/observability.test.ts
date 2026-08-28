import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ErrorEvent } from "@sentry/nextjs";
import {
  parseObservabilitySampleRate,
  redactSensitiveText,
  sanitizeObservabilityUrl,
  sanitizeReferrerDomain,
  sanitizePostHogCapture,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
} from "./observability";
import { createStorefrontActionProperties } from "./posthog-client";

describe("storefront observability privacy", () => {
  it("removes query strings, fragments, and opaque path tokens", () => {
    assert.equal(
      sanitizeObservabilityUrl(
        "https://perfumeaura.com/order/1234567890abcdefghijklmnop?email=buyer@example.com#code",
      ),
      "https://perfumeaura.com/order/[redacted]",
    );
    assert.equal(
      sanitizeReferrerDomain("https://chatgpt.com/c/example?utm_source=private"),
      "https://chatgpt.com",
    );
  });

  it("keeps only privacy-safe PostHog properties", () => {
    const capture = sanitizePostHogCapture({
      uuid: "01f00000-0000-7000-8000-000000000000",
      event: "$pageview",
      properties: {
        $current_url: "https://perfumeaura.com/shop?search=oud",
        email: "buyer@example.com",
        application: "storefront",
      },
    });
    assert.equal(capture?.properties.$current_url, "https://perfumeaura.com/shop");
    assert.equal(capture?.properties.email, undefined);
    assert.equal(capture?.properties.application, "storefront");
  });

  it("limits contact conversion events to approved non-personal properties", () => {
    assert.deepEqual(
      createStorefrontActionProperties("floating_action", "open_whatsapp"),
      {
        application: "storefront",
        surface: "floating_action",
        action: "open_whatsapp",
      },
    );
  });

  it("strips request payloads and direct identifiers from Sentry events", () => {
    const event = sanitizeSentryEvent({
      type: undefined,
      message: "secret=abc123 failed",
      request: {
        url: "https://perfumeaura.com/api/checkout?email=test@example.com",
        data: { email: "test@example.com" },
        headers: { authorization: "Bearer secret" },
      },
      user: { id: "user-42", email: "buyer@example.com", ip_address: "127.0.0.1" },
    } satisfies ErrorEvent);
    assert.equal(event.message, "secret=[redacted] failed");
    assert.equal(event.request?.url, "https://perfumeaura.com/api/checkout");
    assert.equal(event.request?.data, undefined);
    assert.deepEqual(event.user, { id: "user-42" });
  });

  it("drops console and UI breadcrumbs and validates trace sampling", () => {
    assert.equal(sanitizeSentryBreadcrumb({ category: "ui.input" }), null);
    assert.equal(parseObservabilitySampleRate("0.25"), 0.25);
    assert.equal(parseObservabilitySampleRate("-1"), 0.1);
    assert.equal(
      redactSensitiveText("postgres://user:pass@db.example/app failed"),
      "[redacted-database-url] failed",
    );
  });
});
