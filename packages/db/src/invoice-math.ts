/**
 * Pure invoice money math (unit-testable).
 */

export function lineTotalCents(quantity: number, unitPriceCents: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive integer");
  }
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new Error("unitPriceCents must be a non-negative integer");
  }
  return quantity * unitPriceCents;
}

export function invoiceSubtotalCents(
  lines: { lineTotalCents: number }[],
): number {
  return lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
}

/** Balance remaining: total − paid (never negative for display). */
export function invoiceBalanceCents(
  totalCents: number,
  amountPaidCents: number,
): number {
  return Math.max(0, totalCents - amountPaidCents);
}

export function remainingToFulfill(
  quantity: number,
  quantityFulfilled: number,
): number {
  return Math.max(0, quantity - quantityFulfilled);
}
