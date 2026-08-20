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
