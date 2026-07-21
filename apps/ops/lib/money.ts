/**
 * PKR money helpers. Storage is integer cents (paisa); UI uses major units (rupees).
 */

/** Convert major PKR (rupees, may be fractional) to integer cents. */
export function rupeesToCents(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error("Invalid money amount");
  }
  return Math.round(rupees * 100);
}

/** Format cents as "Rs 1,234.56" (or whole rupees when exact). */
export function formatPkr(cents: number): string {
  const rupees = cents / 100;
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `Rs ${formatted}`;
}

/** Compact integer formatting for unit counts. */
export function formatQty(n: number): string {
  return new Intl.NumberFormat("en-PK").format(n);
}
