import { eq } from "drizzle-orm";
import { BUSINESS_TIMEZONE } from "./business-time";
import { allocateDocumentNumberInTransaction } from "./document-numbers";
import { DomainError } from "./domain-errors";
import { invoices, payments } from "./schema";
import {
  isUniqueViolation,
  postgresConstraint,
  runDomainTransaction,
  type DbTransaction,
} from "./transactions";

export type PaymentMethod = (typeof payments.$inferInsert)["method"];
type InvoiceRow = typeof invoices.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

type PaymentOperationInput = {
  invoiceId: string;
  idempotencyKey: string;
  method: PaymentMethod;
  paidAt: Date;
  reference?: string | null;
  note?: string | null;
  createdBy?: string | null;
  timeZone?: string;
};

export type RecordPaymentInput = PaymentOperationInput & {
  amountCents: number;
};

export type PaymentOperationResult = {
  paymentId: string;
  number: string | null;
  amountCents: number;
  authoritativePaidCents: number;
  fullyPaid: boolean;
  idempotent: boolean;
};

async function lockInvoice(
  tx: DbTransaction,
  invoiceId: string,
): Promise<InvoiceRow> {
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .for("update")
    .limit(1);
  if (!invoice) throw new DomainError("NOT_FOUND", "Invoice not found");
  return invoice;
}

async function lockPayments(
  tx: DbTransaction,
  invoiceId: string,
): Promise<PaymentRow[]> {
  return tx
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(payments.id)
    .for("update");
}

function sumPayments(rows: PaymentRow[]): number {
  return rows.reduce((total, row) => total + row.amountCents, 0);
}

function verifyExistingPayment(
  existing: PaymentRow,
  input: PaymentOperationInput,
  expectedAmountCents: number | undefined,
): void {
  if (
    existing.invoiceId !== input.invoiceId ||
    (expectedAmountCents !== undefined &&
      existing.amountCents !== expectedAmountCents) ||
    existing.method !== input.method ||
    existing.paidAt.getTime() !== input.paidAt.getTime()
  ) {
    throw new DomainError(
      "IDEMPOTENCY_CONFLICT",
      "Idempotency key was already used for a different payment",
    );
  }
}

async function reconcileInvoicePaymentCache(
  tx: DbTransaction,
  invoice: InvoiceRow,
  authoritativePayments: PaymentRow[],
  completionPaidAt?: Date,
): Promise<boolean> {
  const authoritativePaidCents = sumPayments(authoritativePayments);
  const fullyPaid = authoritativePaidCents >= invoice.totalCents;
  let paidAt: Date | null = null;

  if (fullyPaid) {
    if (invoice.status === "paid" && invoice.paidAt) {
      // An idempotent replay must not move the completion timestamp backward.
      paidAt = invoice.paidAt;
    } else if (completionPaidAt) {
      paidAt = completionPaidAt;
    } else {
      const creationOrder = [...authoritativePayments].sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.id.localeCompare(right.id),
      );
      let cumulative = 0;
      for (const payment of creationOrder) {
        cumulative += payment.amountCents;
        if (cumulative >= invoice.totalCents) {
          paidAt = payment.paidAt;
          break;
        }
      }
    }
  }

  await tx
    .update(invoices)
    .set({
      amountPaidCents: authoritativePaidCents,
      status: fullyPaid ? "paid" : "issued",
      paidAt,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id));
  return fullyPaid;
}

/**
 * Shared payment primitive used by both explicit payments and “mark paid”.
 * `amountCents` undefined means use the authoritative remaining balance.
 */
async function recordPaymentAgainstLockedInvoice(
  tx: DbTransaction,
  invoice: InvoiceRow,
  lockedPayments: PaymentRow[],
  input: PaymentOperationInput,
  amountCents: number | undefined,
): Promise<PaymentOperationResult> {
  let existing = lockedPayments.find(
    (payment) => payment.idempotencyKey === input.idempotencyKey,
  );
  if (!existing) {
    // Detect a reused global key that belongs to another invoice. This lookup
    // occurs only after the target aggregate and its child rows are locked.
    [existing] = await tx
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, input.idempotencyKey))
      .limit(1);
  }

  if (existing) {
    const expectedAmount =
      amountCents ??
      invoice.totalCents -
        sumPayments(
          lockedPayments.filter((payment) => payment.id !== existing?.id),
        );
    verifyExistingPayment(existing, input, expectedAmount);
    const authoritativePaidCents = sumPayments(lockedPayments);
    const fullyPaid = await reconcileInvoicePaymentCache(
      tx,
      invoice,
      lockedPayments,
    );
    return {
      paymentId: existing.id,
      number: existing.number,
      amountCents: existing.amountCents,
      authoritativePaidCents,
      fullyPaid,
      idempotent: true,
    };
  }

  if (invoice.status === "draft") {
    throw new DomainError(
      "INVALID_STATE",
      "Issue the invoice before recording payment",
    );
  }
  if (invoice.status === "void") {
    throw new DomainError("INVALID_STATE", "Cannot pay a void invoice");
  }

  const alreadyPaidCents = sumPayments(lockedPayments);
  const remainingCents = invoice.totalCents - alreadyPaidCents;
  if (remainingCents <= 0) {
    await reconcileInvoicePaymentCache(
      tx,
      invoice,
      lockedPayments,
    );
    throw new DomainError("INVALID_STATE", "Invoice is already fully paid");
  }

  const effectiveAmount = amountCents ?? remainingCents;
  if (!Number.isInteger(effectiveAmount) || effectiveAmount <= 0) {
    throw new DomainError(
      "INVALID_INPUT",
      "Payment amount must be a positive integer number of cents",
    );
  }
  if (effectiveAmount > remainingCents) {
    throw new DomainError(
      "OVERPAYMENT",
      `Payment exceeds balance. Remaining: INR ${(remainingCents / 100).toFixed(2)}`,
    );
  }

  const number = await allocateDocumentNumberInTransaction(
    tx,
    "payment",
    input.paidAt,
    input.timeZone ?? BUSINESS_TIMEZONE,
  );
  const [payment] = await tx
    .insert(payments)
    .values({
      number,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      method: input.method,
      amountCents: effectiveAmount,
      paidAt: input.paidAt,
      reference: input.reference ?? null,
      note: input.note ?? null,
      idempotencyKey: input.idempotencyKey,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  if (!payment) {
    throw new DomainError("CONFLICT", "Failed to record payment");
  }

  const authoritativePaidCents = alreadyPaidCents + effectiveAmount;
  const authoritativePayments = [...lockedPayments, payment];
  const fullyPaid = await reconcileInvoicePaymentCache(
    tx,
    invoice,
    authoritativePayments,
    input.paidAt,
  );

  return {
    paymentId: payment.id,
    number: payment.number,
    amountCents: payment.amountCents,
    authoritativePaidCents,
    fullyPaid,
    idempotent: false,
  };
}

function mapPaymentConstraint(error: unknown): never {
  if (!isUniqueViolation(error)) throw error;
  const constraint = postgresConstraint(error);

  if (constraint === "payments_idempotency_key_unique") {
    throw new DomainError(
      "IDEMPOTENCY_CONFLICT",
      "Idempotency key was already used by a concurrent payment",
      { cause: error },
    );
  }
  if (constraint === "payments_number_unique") {
    throw new DomainError("CONFLICT", "Payment number collision", {
      cause: error,
    });
  }
  throw new DomainError("CONFLICT", "Payment conflicts with existing data", {
    cause: error,
  });
}

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<PaymentOperationResult> {
  try {
    return await runDomainTransaction(async (tx) => {
      const invoice = await lockInvoice(tx, input.invoiceId);
      const lockedPayments = await lockPayments(tx, input.invoiceId);
      return recordPaymentAgainstLockedInvoice(
        tx,
        invoice,
        lockedPayments,
        input,
        input.amountCents,
      );
    });
  } catch (error) {
    mapPaymentConstraint(error);
  }
}

export async function recordRemainingInvoiceBalance(
  input: PaymentOperationInput,
): Promise<PaymentOperationResult> {
  try {
    return await runDomainTransaction(async (tx) => {
      const invoice = await lockInvoice(tx, input.invoiceId);
      const lockedPayments = await lockPayments(tx, input.invoiceId);
      return recordPaymentAgainstLockedInvoice(
        tx,
        invoice,
        lockedPayments,
        input,
        undefined,
      );
    });
  } catch (error) {
    mapPaymentConstraint(error);
  }
}
