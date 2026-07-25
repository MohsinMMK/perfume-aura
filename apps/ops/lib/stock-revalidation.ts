export type PathRevalidator = (path: string) => void;
export type RevalidationFailureHandler = (
  error: unknown,
  path: string,
) => void;

/**
 * Cache invalidation happens only after the stock transaction commits.
 *
 * A cache failure must never turn a committed ledger movement into an action
 * failure. Attempt every global and targeted path independently so one failed
 * invalidation cannot prevent the others.
 */
export function revalidateCommittedStockMutation(
  productId: string,
  revalidate: PathRevalidator,
  onFailure: RevalidationFailureHandler,
): void {
  const paths = [
    "/stock",
    "/stock/low",
    "/dashboard",
    "/products",
    "/finance",
    `/products/${productId}`,
  ];

  for (const path of paths) {
    try {
      revalidate(path);
    } catch (error) {
      onFailure(error, path);
    }
  }
}
