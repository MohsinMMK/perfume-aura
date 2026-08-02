import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateCurrencyMigration,
  type CurrencyAuditSnapshot,
} from "./currency-migration-audit";

const emptySnapshot: CurrencyAuditSnapshot = {
  products: {
    variantCount: 3,
    nonZeroMoneyVariantCount: 0,
    costAmountMinor: 0,
    retailAmountMinor: 0,
    inventoryCostAmountMinor: 0,
    inventoryRetailAmountMinor: 0,
  },
  invoices: {
    totalCount: 1,
    pkrLabelledCount: 1,
    nonZeroPkrCount: 0,
    lineCount: 0,
    nonZeroLineCount: 0,
    lineAmountMinor: 0,
    subtotalAmountMinor: 0,
    taxAmountMinor: 0,
    totalAmountMinor: 0,
    paidAmountMinor: 0,
    openReceivableAmountMinor: 0,
  },
  payments: { totalCount: 0, pkrLinkedCount: 0, pkrLinkedAmountMinor: 0 },
  finance: {
    issuedRevenueAmountMinor: 0,
    collectedAmountMinor: 0,
    cogsAmountMinor: 0,
  },
};

describe("evaluateCurrencyMigration", () => {
  it("allows a label-only migration when every legacy amount is zero", () => {
    const report = evaluateCurrencyMigration(emptySnapshot);
    assert.equal(report.safeToApplyCurrencyLabelMigration, true);
    assert.deepEqual(report.blockingReasons, []);
    assert.equal(report.automaticExchangeRateConversion, false);
  });

  it("blocks when any existing PKR-semantic money is non-zero", () => {
    const report = evaluateCurrencyMigration({
      ...emptySnapshot,
      invoices: {
        ...emptySnapshot.invoices,
        nonZeroPkrCount: 1,
        totalAmountMinor: 125_000,
      },
    });
    assert.equal(report.safeToApplyCurrencyLabelMigration, false);
    assert.match(report.blockingReasons.join(" "), /Invoices/);
  });
});
