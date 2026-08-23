import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApprovedCommercePolicy } from "./commerce-policy";

const approvedSettings = {
  flatShippingAmountMinor: 9_900,
  freeShippingThresholdMinor: 99_900,
  taxPolicyApproved: true,
  taxApprovalReference: "CA-GST-2026-08-23",
  catalogLegalApproved: true,
  legalApprovalReference: "INDIA-COUNSEL-2026-08-23",
  supportChannel: "support@perfumeaura.com",
  supportOperationsApproved: true,
  shippingPolicyApproved: true,
  returnsPolicyApproved: true,
  cancellationPolicyApproved: true,
  checkoutEnabled: true,
} as const;

describe("public commerce policy projection", () => {
  it("requires both runtime release planes and every approved setting", () => {
    assert.equal(resolveApprovedCommercePolicy(approvedSettings, {
      publicRelease: false,
      checkoutReleaseApproved: true,
    }), null);
    assert.equal(resolveApprovedCommercePolicy({
      ...approvedSettings,
      returnsPolicyApproved: false,
    }, {
      publicRelease: true,
      checkoutReleaseApproved: true,
    }), null);
    assert.equal(resolveApprovedCommercePolicy({
      ...approvedSettings,
      taxApprovalReference: " ",
    }, {
      publicRelease: true,
      checkoutReleaseApproved: true,
    }), null);
    assert.equal(resolveApprovedCommercePolicy({
      ...approvedSettings,
      legalApprovalReference: null,
    }, {
      publicRelease: true,
      checkoutReleaseApproved: true,
    }), null);
  });

  it("projects only the locked approved values", () => {
    const policy = resolveApprovedCommercePolicy(approvedSettings, {
      publicRelease: true,
      checkoutReleaseApproved: true,
    });
    assert.equal(policy?.flatShippingAmountMinor, 9_900);
    assert.equal(policy?.freeShippingThresholdMinor, 99_900);
    assert.equal(policy?.supportChannel, "support@perfumeaura.com");
  });
});
