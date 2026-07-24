export const domainErrorCodes = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "INVALID_STATE",
  "CONFLICT",
  "SKU_CONFLICT",
  "SLUG_CONFLICT",
  "VARIANT_SIZE_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "INSUFFICIENT_STOCK",
  "OVERPAYMENT",
  "NOTHING_TO_FULFILL",
  "DATABASE_RETRY_EXHAUSTED",
] as const;

export type DomainErrorCode = (typeof domainErrorCodes)[number];

/**
 * Stable errors for expected business-rule failures.
 *
 * Server Actions may safely branch on `code`. They should log and mask
 * unexpected database/programming errors instead of matching driver messages.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DomainError";
    this.code = code;
  }
}
