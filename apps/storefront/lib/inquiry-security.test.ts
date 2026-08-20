import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inquiryRateLimitDigest,
  readBoundedInquiryJson,
  requireTrustedInquiryIp,
  resolveInquiryRateLimitSecret,
  resolveTrustedInquiryIp,
} from "./inquiry-security";

describe("inquiry request boundary", () => {
  it("requires a strong HMAC secret and never returns the raw input", () => {
    assert.throws(() => resolveInquiryRateLimitSecret({ STOREFRONT_INQUIRY_RATE_LIMIT_SECRET: "short" }));
    const secret = "a-strong-inquiry-secret-with-at-least-32-characters";
    assert.equal(resolveInquiryRateLimitSecret({ STOREFRONT_INQUIRY_RATE_LIMIT_SECRET: secret }), secret);
    assert.match(inquiryRateLimitDigest("person@example.com", secret), /^[a-f0-9]{64}$/);
    assert.doesNotMatch(inquiryRateLimitDigest("person@example.com", secret), /person/);
  });

  it("trusts only one configured, valid IP value", () => {
    const environment = { STOREFRONT_INQUIRY_TRUSTED_IP_HEADER: "x-hostinger-client-ip" };
    assert.equal(resolveTrustedInquiryIp(new Headers({ "x-hostinger-client-ip": "203.0.113.7" }), environment), "203.0.113.7");
    assert.equal(resolveTrustedInquiryIp(new Headers({ "x-hostinger-client-ip": "203.0.113.7, 10.0.0.1" }), environment), null);
    assert.equal(resolveTrustedInquiryIp(new Headers({ "x-hostinger-client-ip": "not-an-ip" }), environment), null);
    assert.equal(resolveTrustedInquiryIp(new Headers({ "x-hostinger-client-ip": "203.0.113.7" }), {}), null);
    assert.equal(requireTrustedInquiryIp(
      new Headers({ "x-hostinger-client-ip": "203.0.113.7" }),
      environment,
    ), "203.0.113.7");
    assert.throws(() => requireTrustedInquiryIp(new Headers(), environment));
    assert.throws(() => requireTrustedInquiryIp(
      new Headers({ "x-hostinger-client-ip": "203.0.113.7" }),
      {},
    ));
  });

  it("rejects oversized JSON even when content-length is absent", async () => {
    const accepted = new Request("https://perfumeaura.com/api/inquiries", { method: "POST", body: JSON.stringify({ message: "hello" }) });
    assert.deepEqual(await readBoundedInquiryJson(accepted), { message: "hello" });
    const oversized = new Request("https://perfumeaura.com/api/inquiries", { method: "POST", body: JSON.stringify({ message: "x".repeat(9 * 1024) }) });
    assert.equal(await readBoundedInquiryJson(oversized), null);
  });
});
