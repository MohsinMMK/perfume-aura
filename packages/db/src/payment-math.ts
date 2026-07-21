/**
 * Pure payment / balance math (unit-testable). Never touches stock.
 */

export function sumPaymentCents(amounts: number[]): number {
  return amounts.reduce((s, a) => {
    if (!Number.isInteger(a) || a < 0) {
      throw new Error("payment amounts must be non-negative integers");
    }
    return s + a;
  }, 0);
}

/** True if this payment would exceed remaining balance. */
export function wouldOverpay(
  totalCents: number,
  amountPaidCents: number,
  newPaymentCents: number,
): boolean {
  if (!Number.isInteger(newPaymentCents) || newPaymentCents <= 0) {
    return true;
  }
  return amountPaidCents + newPaymentCents > totalCents;
}

export function remainingBalanceCents(
  totalCents: number,
  amountPaidCents: number,
): number {
  return Math.max(0, totalCents - amountPaidCents);
}

/** After applying payment, should invoice become paid? */
export function isFullyPaid(
  totalCents: number,
  amountPaidCentsAfter: number,
): boolean {
  return amountPaidCentsAfter >= totalCents;
}
