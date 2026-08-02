export type Money = Readonly<{
  currency: "INR";
  amountMinor: number;
}>;

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: money.amountMinor % 100 === 0 ? 0 : 2,
  }).format(money.amountMinor / 100);
}
