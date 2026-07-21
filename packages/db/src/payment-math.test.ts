import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isFullyPaid,
  remainingBalanceCents,
  sumPaymentCents,
  wouldOverpay,
} from "./payment-math";

describe("sumPaymentCents", () => {
  it("sums payment amounts", () => {
    assert.equal(sumPaymentCents([100, 250, 50]), 400);
  });
});

describe("wouldOverpay", () => {
  it("detects overpayment", () => {
    assert.equal(wouldOverpay(1000, 600, 500), true);
    assert.equal(wouldOverpay(1000, 600, 400), false);
    assert.equal(wouldOverpay(1000, 600, 399), false);
  });
});

describe("remainingBalanceCents", () => {
  it("never goes negative", () => {
    assert.equal(remainingBalanceCents(1000, 400), 600);
    assert.equal(remainingBalanceCents(1000, 1200), 0);
  });
});

describe("isFullyPaid", () => {
  it("marks paid at or above total", () => {
    assert.equal(isFullyPaid(1000, 1000), true);
    assert.equal(isFullyPaid(1000, 999), false);
  });
});
