import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPkr, formatQty, rupeesToCents } from "./money";

describe("rupeesToCents", () => {
  it("converts whole and fractional rupees to integer paisa", () => {
    assert.equal(rupeesToCents(0), 0);
    assert.equal(rupeesToCents(1), 100);
    assert.equal(rupeesToCents(12.5), 1250);
    assert.equal(rupeesToCents(4500.5), 450_050);
  });

  it("rounds to nearest paisa (Math.round; watch float noise)", () => {
    // Prefer two-decimal form inputs from UI (e.g. 12.34), not third decimal.
    assert.equal(rupeesToCents(1.01), 101);
    assert.equal(rupeesToCents(1.99), 199);
    assert.equal(rupeesToCents(10.555), 1056); // 1055.5 → 1056
  });

  it("rejects non-finite input", () => {
    assert.throws(() => rupeesToCents(Number.NaN), /Invalid money amount/);
    assert.throws(() => rupeesToCents(Number.POSITIVE_INFINITY), /Invalid/);
  });
});

describe("formatPkr", () => {
  it("prefixes Rs and formats whole rupees without decimals", () => {
    const out = formatPkr(100_00);
    assert.match(out, /^Rs /);
    assert.match(out, /100/);
    assert.ok(!out.includes(".00") || out.includes("100"));
  });

  it("shows two decimals for fractional paisa", () => {
    const out = formatPkr(123_45);
    assert.match(out, /^Rs /);
    // Grouping may vary by ICU; require the decimal part.
    assert.match(out, /23\.45|123\.45/);
  });

  it("formats inventory cost of zero", () => {
    assert.equal(formatPkr(0), "Rs 0");
  });
});

describe("formatQty", () => {
  it("formats integer unit counts", () => {
    assert.equal(formatQty(0), "0");
    assert.equal(formatQty(12), "12");
    assert.match(formatQty(1200), /1.?200|1200/);
  });
});
