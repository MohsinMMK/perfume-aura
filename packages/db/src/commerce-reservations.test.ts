import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeReservationItems } from "./commerce-reservations";

describe("normalizeReservationItems", () => {
  it("merges duplicate variants and sorts locks deterministically", () => {
    assert.deepEqual(
      normalizeReservationItems([
        { variantId: "b", quantity: 1 },
        { variantId: "a", quantity: 2 },
        { variantId: "b", quantity: 3 },
      ]),
      [
        { variantId: "a", quantity: 2 },
        { variantId: "b", quantity: 4 },
      ],
    );
  });

  it("rejects empty, fractional, and non-positive quantities", () => {
    assert.throws(() => normalizeReservationItems([]), /At least one/);
    assert.throws(
      () => normalizeReservationItems([{ variantId: "a", quantity: 0 }]),
      /positive integer/,
    );
    assert.throws(
      () => normalizeReservationItems([{ variantId: "a", quantity: 1.5 }]),
      /positive integer/,
    );
  });
});
