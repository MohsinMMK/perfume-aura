import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPS_CAPABILITIES,
  capabilitiesForOpsRole,
  hasOpsCapability,
  isProtectedOpsRole,
  parseOpsRole,
} from "./ops-access";
import {
  areOpsStaffInvitesEnabled,
  isOpsTwoFactorRequired,
} from "./ops-security-policy";

describe("operations role and capability policy", () => {
  it("accepts only one exact known role", () => {
    assert.equal(parseOpsRole("owner"), "owner");
    assert.equal(parseOpsRole("staff"), "staff");
    assert.equal(parseOpsRole("user"), "user");

    for (const unsafeRole of [
      undefined,
      null,
      "",
      "owner,staff",
      "staff,owner",
      "administrator",
      ["owner"],
      { role: "owner" },
    ]) {
      assert.equal(parseOpsRole(unsafeRole), null);
      assert.equal(isProtectedOpsRole(unsafeRole), false);
    }
  });

  it("gives the owner every capability and staff only operational capabilities", () => {
    for (const capability of OPS_CAPABILITIES) {
      assert.equal(hasOpsCapability("owner", capability), true, capability);
      assert.equal(
        hasOpsCapability("user", capability),
        false,
        `public user must not receive ${capability}`,
      );
      assert.equal(
        hasOpsCapability("owner,staff", capability),
        false,
        `combined role must not receive ${capability}`,
      );
    }

    for (const allowed of capabilitiesForOpsRole("staff")) {
      assert.equal(hasOpsCapability("staff", allowed), true, allowed);
    }

    for (const ownerOnly of [
      "catalog.manage-commercials",
      "stock.adjust",
      "stock.view-cost",
      "customers.archive",
      "invoices.void",
      "payments.record",
      "finance.view",
      "commerce.cod.reconcile",
      "commerce.refunds.manage",
      "commerce.promotions.manage",
      "commerce.release-gates.manage",
      "security.staff.manage",
      "security.audit.view",
    ] as const) {
      assert.equal(hasOpsCapability("staff", ownerOnly), false, ownerOnly);
    }
  });

  it("enables security release gates only for the literal true value", () => {
    for (const unsafeValue of [undefined, "", "TRUE", "1", "yes", "false"]) {
      assert.equal(
        isOpsTwoFactorRequired({ OPS_TWO_FACTOR_REQUIRED: unsafeValue }),
        false,
      );
      assert.equal(
        areOpsStaffInvitesEnabled({ OPS_STAFF_INVITES_ENABLED: unsafeValue }),
        false,
      );
    }

    assert.equal(
      isOpsTwoFactorRequired({ OPS_TWO_FACTOR_REQUIRED: "true" }),
      true,
    );
    assert.equal(
      areOpsStaffInvitesEnabled({ OPS_STAFF_INVITES_ENABLED: "true" }),
      true,
    );
  });
});
