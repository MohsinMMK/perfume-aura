export { db, pool, type Database } from "./client";

export * from "./schema";

export {
  applyMovement,
  applyMovementInTransaction,
  InventoryError,
  type ApplyMovementInput,
  type ApplyMovementResult,
  type StockMovementType,
} from "./inventory";

export {
  DomainError,
  domainErrorCodes,
  type DomainErrorCode,
} from "./domain-errors";

export {
  runDomainTransaction,
  domainTransactionConfig,
  retryableTransactionSqlStates,
  MAX_TRANSACTION_ATTEMPTS,
  postgresSqlState,
  postgresConstraint,
  isUniqueViolation,
  type DbTransaction,
} from "./transactions";

export {
  BUSINESS_TIMEZONE,
  DEFAULT_BUSINESS_TIMEZONE,
  validateBusinessTimeZone,
  businessDateAt,
  businessYearAt,
  zonedDateTimeToInstant,
  parseBusinessDateTime,
  businessPeriodBounds,
  businessMonthBounds,
} from "./business-time";

export { allocateDocumentNumberInTransaction } from "./document-numbers";

export {
  createProductWithInitialVariant,
  createProductVariant,
  updateProduct,
  updateProductVariant,
  archiveProduct,
  reactivateProduct,
  archiveProductVariant,
  reactivateProductVariant,
  type CreateProductWithInitialVariantInput,
  type UpdateProductInput,
  type UpdateProductVariantInput,
  type ProductLifecycleInput,
  type VariantLifecycleInput,
} from "./product-workflows";

export {
  createInvoiceDraft,
  addInvoiceLine,
  removeInvoiceLine,
  recalculateInvoiceTotalsInTransaction,
  issueInvoice,
  voidInvoice,
  fulfillInvoice,
} from "./invoice-workflows";

export {
  recordPayment,
  recordRemainingInvoiceBalance,
  type PaymentMethod,
  type RecordPaymentInput,
  type PaymentOperationResult,
} from "./payment-workflows";

export {
  getFinanceSnapshot,
  type FinanceSnapshot,
} from "./finance-workflows";

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
  inArray,
  like,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
