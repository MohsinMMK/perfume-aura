import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  invoiceBalanceCents,
  invoiceSubtotalCents,
  lineTotalCents,
  remainingToFulfill,
} from "./invoice-math";

describe("lineTotalCents", () => {
  it("multiplies qty × unit price", () => {
    assert.equal(lineTotalCents(3, 250_00), 750_00);
  });
});

describe("invoiceSubtotalCents", () => {
  it("sums line totals", () => {
    assert.equal(
      invoiceSubtotalCents([
        { lineTotalCents: 100 },
        { lineTotalCents: 250 },
      ]),
      350,
    );
  });
});

describe("invoiceBalanceCents", () => {
  it("computes remaining AR", () => {
    assert.equal(invoiceBalanceCents(1000, 400), 600);
    assert.equal(invoiceBalanceCents(1000, 1000), 0);
    assert.equal(invoiceBalanceCents(1000, 1200), 0);
  });
});

describe("remainingToFulfill", () => {
  it("tracks unfulfilled qty", () => {
    assert.equal(remainingToFulfill(5, 2), 3);
    assert.equal(remainingToFulfill(5, 5), 0);
  });
});
