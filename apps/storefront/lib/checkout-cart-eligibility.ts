export function compareCheckoutCartSet(
  storedVariantIds: readonly string[],
  eligibleVariantIds: readonly string[],
): Readonly<{ changed: boolean; removedVariantIds: readonly string[] }> {
  const eligibleCounts = new Map<string, number>();
  for (const variantId of eligibleVariantIds) {
    eligibleCounts.set(variantId, (eligibleCounts.get(variantId) ?? 0) + 1);
  }
  const removedVariantIds = storedVariantIds.filter(
    (variantId) => eligibleCounts.get(variantId) !== 1,
  );
  return {
    changed: storedVariantIds.length !== eligibleVariantIds.length || removedVariantIds.length > 0,
    removedVariantIds,
  };
}

export type CheckoutCartLineSnapshot = Readonly<{
  amountMinor: number;
  quantity: number;
  variantId: string;
}>;

export function checkoutCartSnapshotChanged(
  presentedLines: readonly CheckoutCartLineSnapshot[],
  currentLines: readonly CheckoutCartLineSnapshot[],
): boolean {
  if (presentedLines.length !== currentLines.length) return true;
  const presentedByVariant = new Map(
    presentedLines.map((line) => [line.variantId, line] as const),
  );
  if (presentedByVariant.size !== presentedLines.length) return true;
  return currentLines.some((currentLine) => {
    const presentedLine = presentedByVariant.get(currentLine.variantId);
    return !presentedLine ||
      presentedLine.quantity !== currentLine.quantity ||
      presentedLine.amountMinor !== currentLine.amountMinor;
  });
}
