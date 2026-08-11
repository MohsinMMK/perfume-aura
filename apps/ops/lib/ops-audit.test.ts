import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeAuditMetadata } from "./ops-audit";

describe("operations audit metadata", () => {
  it("accepts a small scalar event summary", () => {
    assert.deepEqual(
      safeAuditMetadata({ accepted: true, attempts: 2, source: "owner" }),
      { accepted: true, attempts: 2, source: "owner" },
    );
  });

  it("rejects access material and raw payload-shaped fields", () => {
    for (const key of [
      "password",
      "reset_token",
      "totpCode",
      "authorization",
      "cookie",
      "raw_payload",
      "redirect_url",
    ]) {
      assert.throws(() => safeAuditMetadata({ [key]: "not-safe" }));
    }
  });

  it("rejects nested, unbounded, and non-finite metadata", () => {
    assert.throws(() => safeAuditMetadata({ nested: { value: true } }));
    assert.throws(() => safeAuditMetadata({ rows: [1, 2] }));
    assert.throws(() => safeAuditMetadata({ attempts: Number.NaN }));
    assert.throws(() => safeAuditMetadata({ note: "x".repeat(257) }));
  });
});
