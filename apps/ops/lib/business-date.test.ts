import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBusinessDate, formatBusinessDateTime } from "./business-date";

describe("business date formatting", () => {
  it("does not change when the process timezone changes", () => {
    const originalProcessTimeZone = process.env.TZ;
    const value = new Date("2026-01-01T00:30:15.123Z");
    try {
      process.env.TZ = "America/Los_Angeles";
      const losAngelesHost = formatBusinessDateTime(value);
      process.env.TZ = "Pacific/Auckland";
      const aucklandHost = formatBusinessDateTime(value);
      assert.equal(losAngelesHost, aucklandHost);
    } finally {
      if (originalProcessTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalProcessTimeZone;
      }
    }
  });

  it("formats PostgreSQL date-only values as business-calendar dates", () => {
    const originalProcessTimeZone = process.env.TZ;
    try {
      process.env.TZ = "America/Los_Angeles";
      const losAngelesHost = formatBusinessDate("2026-01-01");
      process.env.TZ = "Pacific/Auckland";
      const aucklandHost = formatBusinessDate("2026-01-01");
      assert.equal(losAngelesHost, aucklandHost);
      assert.match(losAngelesHost, /2026/);
    } finally {
      if (originalProcessTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalProcessTimeZone;
      }
    }
  });
});
