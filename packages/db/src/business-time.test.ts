import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessDateAt,
  businessMonthBounds,
  businessPeriodBounds,
  businessYearAt,
  DEFAULT_BUSINESS_TIMEZONE,
  parseBusinessDateTime,
  validateBusinessTimeZone,
} from "./business-time";
import { DomainError } from "./domain-errors";

describe("business time", () => {
  it("defaults to the approved Asia/Karachi zone", () => {
    assert.equal(DEFAULT_BUSINESS_TIMEZONE, "Asia/Karachi");
  });

  it("accepts valid IANA zones and rejects invalid values", () => {
    assert.equal(validateBusinessTimeZone("America/New_York"), "America/New_York");
    assert.throws(
      () => validateBusinessTimeZone("Not/A_Real_Zone"),
      (error: unknown) =>
        error instanceof DomainError && error.code === "INVALID_INPUT",
    );
  });

  it("uses Karachi date/year around UTC midnight", () => {
    const before = new Date("2026-12-31T18:59:59.000Z");
    const after = new Date("2026-12-31T19:00:00.000Z");
    assert.equal(businessDateAt(before, "Asia/Karachi"), "2026-12-31");
    assert.equal(businessYearAt(before, "Asia/Karachi"), 2026);
    assert.equal(businessDateAt(after, "Asia/Karachi"), "2027-01-01");
    assert.equal(businessYearAt(after, "Asia/Karachi"), 2027);
  });

  it("parses datetime-local values in business time and preserves ISO instants", () => {
    assert.equal(
      parseBusinessDateTime(
        "2026-01-01T00:30",
        new Date(0),
        "Asia/Karachi",
      ).toISOString(),
      "2025-12-31T19:30:00.000Z",
    );
    assert.equal(
      parseBusinessDateTime(
        "2026-01-01T00:30:00.000Z",
        new Date(0),
        "Asia/Karachi",
      ).toISOString(),
      "2026-01-01T00:30:00.000Z",
    );
  });

  it("parses fractional datetime-local input independently of process timezone", () => {
    const originalProcessTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      assert.equal(
        parseBusinessDateTime(
          "2026-01-01T00:30:15.123",
          new Date(0),
          "Asia/Karachi",
        ).toISOString(),
        "2025-12-31T19:30:15.123Z",
      );
      assert.equal(
        parseBusinessDateTime(
          "2026-01-01T00:30:15.123+05:00",
          new Date(0),
          "Asia/Karachi",
        ).toISOString(),
        "2025-12-31T19:30:15.123Z",
      );
    } finally {
      if (originalProcessTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalProcessTimeZone;
      }
    }
  });

  it("rejects date-only, host-ambiguous, malformed, and offset-less instant strings", () => {
    for (const value of [
      "",
      "2026-01-01",
      "2026-01-01 00:30:00",
      "January 1, 2026",
      "2026-02-30T10:00",
      "2026-01-01T10:00Z",
      "2026-01-01T10:00:00.1234",
      "2026-01-01T10:00:00+24:00",
    ]) {
      assert.throws(
        () => parseBusinessDateTime(value),
        (error: unknown) =>
          error instanceof DomainError && error.code === "INVALID_INPUT",
        value,
      );
    }
  });

  it("builds day and month boundaries in business time", () => {
    const now = new Date("2026-07-24T00:30:00.000Z");
    const period = businessPeriodBounds(1, now, "Asia/Karachi");
    assert.equal(period.from.toISOString(), "2026-07-22T19:00:00.000Z");
    assert.equal(period.to.toISOString(), now.toISOString());

    const month = businessMonthBounds(now, "Asia/Karachi");
    assert.equal(month.from.toISOString(), "2026-06-30T19:00:00.000Z");
    assert.equal(month.to.toISOString(), "2026-07-31T19:00:00.000Z");
  });
});
