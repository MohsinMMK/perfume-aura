/**
 * INR money helpers. Legacy `*Cents` columns store integer paise; UI uses rupees.
 */

/** Convert major INR rupees to integer paise. */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error("Invalid money amount");
  }
  return Math.round(rupees * 100);
}

/** Format integer paise with the unambiguous INR currency symbol. */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Compact integer formatting for unit counts. */
export function formatQty(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}
