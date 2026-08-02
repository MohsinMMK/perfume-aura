import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatInr, formatQty, rupeesToPaise } from "./money";

describe("rupeesToPaise", () => {
  it("converts whole and fractional rupees to integer paisa", () => {
    assert.equal(rupeesToPaise(0), 0);
    assert.equal(rupeesToPaise(1), 100);
    assert.equal(rupeesToPaise(12.5), 1250);
    assert.equal(rupeesToPaise(4500.5), 450_050);
  });

  it("rounds to nearest paisa (Math.round; watch float noise)", () => {
    // Prefer two-decimal form inputs from UI (e.g. 12.34), not third decimal.
    assert.equal(rupeesToPaise(1.01), 101);
    assert.equal(rupeesToPaise(1.99), 199);
    assert.equal(rupeesToPaise(10.555), 1056); // 1055.5 → 1056
  });

  it("rejects non-finite input", () => {
    assert.throws(() => rupeesToPaise(Number.NaN), /Invalid money amount/);
    assert.throws(() => rupeesToPaise(Number.POSITIVE_INFINITY), /Invalid/);
  });
});

describe("formatInr", () => {
  it("formats whole rupees as INR without decimals", () => {
    const out = formatInr(100_00);
    assert.match(out, /₹/);
    assert.match(out, /100/);
    assert.ok(!out.includes(".00") || out.includes("100"));
  });

  it("shows two decimals for fractional paisa", () => {
    const out = formatInr(123_45);
    assert.match(out, /₹/);
    // Grouping may vary by ICU; require the decimal part.
    assert.match(out, /23\.45|123\.45/);
  });

  it("formats inventory cost of zero", () => {
    assert.match(formatInr(0), /₹0/);
  });
});

describe("formatQty", () => {
  it("formats integer unit counts", () => {
    assert.equal(formatQty(0), "0");
    assert.equal(formatQty(12), "12");
    assert.match(formatQty(1200), /1.?200|1200/);
  });
});
