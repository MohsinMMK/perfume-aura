import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deliveryProfileInputSchema } from "./customer-profile";

describe("customer delivery profile", () => {
  it("normalizes a valid Indian mobile number and preserves delivery fields", () => {
    const profile = deliveryProfileInputSchema.parse({
      recipientName: "A Customer",
      phone: "98765 43210",
      addressLine1: "10 Test Road",
      addressLine2: "Near Market",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
    });
    assert.equal(profile.phone, "+919876543210");
    assert.equal(profile.postalCode, "400001");
  });

  it("rejects non-Indian mobile and PIN formats", () => {
    assert.throws(() => deliveryProfileInputSchema.parse({
      recipientName: "A Customer",
      phone: "1234567890",
      addressLine1: "10 Test Road",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "000001",
    }));
  });
});
