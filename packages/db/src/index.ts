export { db, pool, type Database } from "./client";

export * from "./schema";

export {
  applyMovement,
  InventoryError,
  type ApplyMovementInput,
  type ApplyMovementResult,
  type StockMovementType,
} from "./inventory";

export {
  availableQuantity,
  canSell,
  quantityAfterDelta,
  resolveQuantityDelta,
  InventoryMathError,
  type MovementTypeForDelta,
  type ResolveDeltaInput,
} from "./inventory-math";

export {
  lineTotalCents,
  invoiceSubtotalCents,
  invoiceBalanceCents,
  remainingToFulfill,
} from "./invoice-math";

export {
  sumPaymentCents,
  wouldOverpay,
  remainingBalanceCents,
  isFullyPaid,
} from "./payment-math";

export {
  seedMainLocation,
  runSeed,
  MAIN_LOCATION_CODE,
  MAIN_LOCATION_NAME,
} from "./seed";

/**
 * Official monorepo pattern: apps import operators only from `@perfume-aura/db`
 * (this package’s drizzle-orm instance). Never `import { eq } from "drizzle-orm"`
 * in apps — that creates dual-package type conflicts under pnpm.
 *
 * Export only operators the monorepo currently uses. When a new query needs
 * another operator, add it here and import from `@perfume-aura/db`.
 */
export {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
