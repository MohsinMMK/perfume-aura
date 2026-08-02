export type CurrencyAuditSnapshot = Readonly<{
  products: {
    variantCount: number;
    nonZeroMoneyVariantCount: number;
    costAmountMinor: number;
    retailAmountMinor: number;
    inventoryCostAmountMinor: number;
    inventoryRetailAmountMinor: number;
  };
  invoices: {
    totalCount: number;
    pkrLabelledCount: number;
    nonZeroPkrCount: number;
    lineCount: number;
    nonZeroLineCount: number;
    lineAmountMinor: number;
    subtotalAmountMinor: number;
    taxAmountMinor: number;
    totalAmountMinor: number;
    paidAmountMinor: number;
    openReceivableAmountMinor: number;
  };
  payments: {
    totalCount: number;
    pkrLinkedCount: number;
    pkrLinkedAmountMinor: number;
  };
  finance: {
    issuedRevenueAmountMinor: number;
    collectedAmountMinor: number;
    cogsAmountMinor: number;
  };
}>;

export type CurrencyMigrationAuditReport = Readonly<{
  targetCurrency: "INR";
  sourceSemantics: "PKR-labelled legacy values";
  automaticExchangeRateConversion: false;
  safeToApplyCurrencyLabelMigration: boolean;
  blockingReasons: readonly string[];
  snapshot: CurrencyAuditSnapshot;
}>;

export function evaluateCurrencyMigration(
  snapshot: CurrencyAuditSnapshot,
): CurrencyMigrationAuditReport {
  const blockingReasons: string[] = [];

  if (
    snapshot.products.nonZeroMoneyVariantCount > 0 ||
    snapshot.products.costAmountMinor !== 0 ||
    snapshot.products.retailAmountMinor !== 0 ||
    snapshot.products.inventoryCostAmountMinor !== 0 ||
    snapshot.products.inventoryRetailAmountMinor !== 0
  ) {
    blockingReasons.push(
      "Product cost or retail values carry non-zero legacy PKR semantics.",
    );
  }

  if (
    snapshot.invoices.nonZeroPkrCount > 0 ||
    snapshot.invoices.nonZeroLineCount > 0 ||
    snapshot.invoices.lineAmountMinor !== 0 ||
    snapshot.invoices.subtotalAmountMinor !== 0 ||
    snapshot.invoices.taxAmountMinor !== 0 ||
    snapshot.invoices.totalAmountMinor !== 0 ||
    snapshot.invoices.paidAmountMinor !== 0 ||
    snapshot.invoices.openReceivableAmountMinor !== 0
  ) {
    blockingReasons.push(
      "Invoices contain non-zero amounts under a PKR label.",
    );
  }

  if (
    snapshot.payments.pkrLinkedCount > 0 &&
    snapshot.payments.pkrLinkedAmountMinor !== 0
  ) {
    blockingReasons.push(
      "Payments contain non-zero amounts linked to PKR-labelled invoices.",
    );
  }

  if (
    snapshot.finance.issuedRevenueAmountMinor !== 0 ||
    snapshot.finance.collectedAmountMinor !== 0 ||
    snapshot.finance.cogsAmountMinor !== 0
  ) {
    blockingReasons.push(
      "Finance totals contain non-zero legacy monetary activity.",
    );
  }

  return {
    targetCurrency: "INR",
    sourceSemantics: "PKR-labelled legacy values",
    automaticExchangeRateConversion: false,
    safeToApplyCurrencyLabelMigration: blockingReasons.length === 0,
    blockingReasons,
    snapshot,
  };
}
