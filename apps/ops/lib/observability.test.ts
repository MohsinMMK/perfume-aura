import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ErrorEvent } from "@sentry/nextjs";
import {
  parseObservabilitySampleRate,
  redactSensitiveText,
  sanitizeObservabilityUrl,
  sanitizePostHogCapture,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
} from "./observability";

describe("operations observability privacy", () => {
  it("removes query strings, fragments, and opaque path tokens", () => {
    assert.equal(
      sanitizeObservabilityUrl(
        "https://app.perfumeaura.com/reset/1234567890abcdefghijklmnop?email=owner@example.com#code",
      ),
      "https://app.perfumeaura.com/reset/[redacted]",
    );
  });

  it("keeps only privacy-safe PostHog properties", () => {
    const capture = sanitizePostHogCapture({
      uuid: "01f00000-0000-7000-8000-000000000000",
      event: "$pageview",
      properties: {
        $current_url: "https://app.perfumeaura.com/orders?customer=42",
        email: "owner@example.com",
        role: "owner",
      },
    });
    assert.equal(capture?.properties.$current_url, "https://app.perfumeaura.com/orders");
    assert.equal(capture?.properties.email, undefined);
    assert.equal(capture?.properties.role, "owner");
  });

  it("strips request payloads and direct identifiers from Sentry events", () => {
    const event = sanitizeSentryEvent({
      type: undefined,
      message: "token=abc123 failed",
      request: {
        url: "https://app.perfumeaura.com/api/orders?email=test@example.com",
        data: { email: "test@example.com" },
        headers: { authorization: "Bearer secret" },
      },
      user: { id: "user-42", email: "owner@example.com", ip_address: "127.0.0.1" },
    } satisfies ErrorEvent);
    assert.equal(event.message, "token=[redacted] failed");
    assert.equal(event.request?.url, "https://app.perfumeaura.com/api/orders");
    assert.equal(event.request?.data, undefined);
    assert.deepEqual(event.user, { id: "user-42" });
  });

  it("drops console and UI breadcrumbs and validates trace sampling", () => {
    assert.equal(sanitizeSentryBreadcrumb({ category: "console" }), null);
    assert.equal(parseObservabilitySampleRate("0.25"), 0.25);
    assert.equal(parseObservabilitySampleRate("2"), 0.1);
    assert.equal(
      redactSensitiveText("postgresql://user:pass@db.example/app failed"),
      "[redacted-database-url] failed",
    );
  });
});
