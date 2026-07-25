import { and, eq, inArray, sql } from "drizzle-orm";
import { businessDateAt, BUSINESS_TIMEZONE } from "./business-time";
import { allocateDocumentNumberInTransaction } from "./document-numbers";
import { DomainError } from "./domain-errors";
import { applyMovementInTransaction } from "./inventory";
import { availableQuantity } from "./inventory-math";
import {
  customers,
  invoiceLines,
  invoices,
  payments,
  products,
  productVariants,
  stockMovements,
} from "./schema";
import {
  runDomainTransaction,
  type DbTransaction,
} from "./transactions";

type InvoiceRow = typeof invoices.$inferSelect;
type InvoiceLineRow = typeof invoiceLines.$inferSelect;

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

async function lockInvoiceLines(
  tx: DbTransaction,
  invoiceId: string,
): Promise<InvoiceLineRow[]> {
  return tx
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId))
    .orderBy(invoiceLines.id)
    .for("update");
}

function authoritativeSubtotal(lines: InvoiceLineRow[]): number {
  return lines.reduce((total, line) => total + line.lineTotalCents, 0);
}

export async function recalculateInvoiceTotalsInTransaction(
  tx: DbTransaction,
  invoiceId: string,
  lockedLines?: InvoiceLineRow[],
): Promise<{ subtotalCents: number; totalCents: number }> {
  const lines = lockedLines ?? (await lockInvoiceLines(tx, invoiceId));
  const subtotalCents = authoritativeSubtotal(lines);

  await tx
    .update(invoices)
    .set({
      subtotalCents,
      taxCents: 0,
      totalCents: subtotalCents,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return { subtotalCents, totalCents: subtotalCents };
}

export async function createInvoiceDraft(input: {
  customerId: string;
  notes?: string | null;
  createdBy?: string | null;
}): Promise<{ invoiceId: string }> {
  return runDomainTransaction(async (tx) => {
    const [customer] = await tx
      .select({ id: customers.id, status: customers.status })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer || customer.status !== "active") {
      throw new DomainError("INVALID_STATE", "Select an active customer");
    }

    const [invoice] = await tx
      .insert(invoices)
      .values({
        customerId: input.customerId,
        status: "draft",
        notes: input.notes ?? null,
        createdBy: input.createdBy ?? null,
      })
      .returning({ id: invoices.id });

    if (!invoice) {
      throw new DomainError("CONFLICT", "Failed to create invoice");
    }
    return { invoiceId: invoice.id };
  });
}

export async function addInvoiceLine(input: {
  invoiceId: string;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
}): Promise<{
  lineId: string;
  subtotalCents: number;
  totalCents: number;
}> {
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0 ||
    !Number.isInteger(input.unitPriceCents) ||
    input.unitPriceCents < 0
  ) {
    throw new DomainError("INVALID_INPUT", "Invalid invoice line");
  }

  return runDomainTransaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId);
    if (invoice.status !== "draft") {
      throw new DomainError(
        "INVALID_STATE",
        "Only draft invoices can be edited",
      );
    }

    let description = input.description.trim();
    let unitPriceCents = input.unitPriceCents;

    if (input.variantId) {
      // Discover the aggregate without taking a row lock, then share the
      // product-first lock order used by lifecycle workflows. If archive wins
      // the product lock, the locked re-read below observes archived state and
      // this transaction cannot add a stale selection.
      const [candidate] = await tx
        .select({ productId: productVariants.productId })
        .from(productVariants)
        .where(eq(productVariants.id, input.variantId))
        .limit(1);
      if (!candidate) {
        throw new DomainError(
          "INVALID_STATE",
          "Variant not found or inactive",
        );
      }

      const [product] = await tx
        .select({ name: products.name, status: products.status })
        .from(products)
        .where(eq(products.id, candidate.productId))
        .for("update")
        .limit(1);
      if (!product || product.status !== "active") {
        throw new DomainError(
          "INVALID_STATE",
          "Product not found or inactive",
        );
      }

      const [variant] = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          sku: productVariants.sku,
          sizeMl: productVariants.sizeMl,
          retailCents: productVariants.retailCents,
          status: productVariants.status,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, input.variantId),
            eq(productVariants.productId, candidate.productId),
          ),
        )
        .for("update")
        .limit(1);

      if (!variant || variant.status !== "active") {
        throw new DomainError(
          "INVALID_STATE",
          "Variant not found or inactive",
        );
      }

      description =
        description || `${product.name} · ${variant.sizeMl}ml · ${variant.sku}`;
      if (unitPriceCents === 0) unitPriceCents = variant.retailCents;
    }

    if (!description) {
      throw new DomainError("INVALID_INPUT", "Description is required");
    }

    const lockedLines = await lockInvoiceLines(tx, input.invoiceId);
    const position =
      lockedLines.reduce(
        (maximum, line) => Math.max(maximum, line.position),
        -1,
      ) + 1;
    const lineTotalCents = input.quantity * unitPriceCents;
    const [line] = await tx
      .insert(invoiceLines)
      .values({
        invoiceId: input.invoiceId,
        position,
        variantId: input.variantId ?? null,
        description,
        quantity: input.quantity,
        unitPriceCents,
        lineTotalCents,
        quantityFulfilled: 0,
      })
      .returning();

    if (!line) throw new DomainError("CONFLICT", "Failed to add invoice line");

    const totals = await recalculateInvoiceTotalsInTransaction(tx, input.invoiceId, [
      ...lockedLines,
      line,
    ]);
    return { lineId: line.id, ...totals };
  });
}

export async function removeInvoiceLine(input: {
  invoiceId: string;
  lineId: string;
}): Promise<{ subtotalCents: number; totalCents: number }> {
  return runDomainTransaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId);
    if (invoice.status !== "draft") {
      throw new DomainError(
        "INVALID_STATE",
        "Only draft invoices can be edited",
      );
    }

    const lockedLines = await lockInvoiceLines(tx, input.invoiceId);
    const line = lockedLines.find((candidate) => candidate.id === input.lineId);
    if (!line) throw new DomainError("NOT_FOUND", "Invoice line not found");

    await tx
      .delete(invoiceLines)
      .where(
        and(
          eq(invoiceLines.id, input.lineId),
          eq(invoiceLines.invoiceId, input.invoiceId),
        ),
      );

    return recalculateInvoiceTotalsInTransaction(
      tx,
      input.invoiceId,
      lockedLines.filter((candidate) => candidate.id !== input.lineId),
    );
  });
}

export async function issueInvoice(
  invoiceId: string,
  options: { now?: Date; timeZone?: string } = {},
): Promise<{ number: string; issueDate: string; idempotent: boolean }> {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? BUSINESS_TIMEZONE;

  return runDomainTransaction(async (tx) => {
    const invoice = await lockInvoice(tx, invoiceId);

    if (
      (invoice.status === "issued" || invoice.status === "paid") &&
      invoice.number &&
      invoice.issueDate
    ) {
      return {
        number: invoice.number,
        issueDate: invoice.issueDate,
        idempotent: true,
      };
    }
    if (invoice.status !== "draft") {
      throw new DomainError(
        "INVALID_STATE",
        "Only draft invoices can be issued",
      );
    }

    const lines = await lockInvoiceLines(tx, invoiceId);
    if (lines.length === 0) {
      throw new DomainError(
        "INVALID_STATE",
        "Add at least one line before issuing",
      );
    }

    const subtotalCents = authoritativeSubtotal(lines);
    const number = await allocateDocumentNumberInTransaction(
      tx,
      "invoice",
      now,
      timeZone,
    );
    const issueDate = businessDateAt(now, timeZone);

    const [updated] = await tx
      .update(invoices)
      .set({
        status: "issued",
        number,
        issueDate,
        issuedAt: now,
        subtotalCents,
        taxCents: 0,
        totalCents: subtotalCents,
        updatedAt: now,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "draft")))
      .returning({ id: invoices.id });

    if (!updated) {
      throw new DomainError("CONFLICT", "Invoice state changed while issuing");
    }

    return { number, issueDate, idempotent: false };
  });
}

export async function voidInvoice(
  invoiceId: string,
  now = new Date(),
): Promise<{ idempotent: boolean }> {
  return runDomainTransaction(async (tx) => {
    const invoice = await lockInvoice(tx, invoiceId);
    if (invoice.status === "void") return { idempotent: true };
    if (invoice.status !== "issued") {
      throw new DomainError(
        "INVALID_STATE",
        "Only an unpaid issued invoice can be voided",
      );
    }

    const lines = await lockInvoiceLines(tx, invoiceId);
    const lockedPayments = await tx
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(payments.id)
      .for("update");

    const paymentTotal = lockedPayments.reduce(
      (total, payment) => total + payment.amountCents,
      0,
    );
    const fulfilledTotal = lines.reduce(
      (total, line) => total + line.quantityFulfilled,
      0,
    );
    const [saleLedger] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.refType, "invoice"),
          eq(stockMovements.refId, invoiceId),
          eq(stockMovements.type, "sale"),
        ),
      );

    if (paymentTotal !== 0) {
      throw new DomainError(
        "INVALID_STATE",
        "Cannot void an invoice with payments",
      );
    }
    if (fulfilledTotal !== 0 || Number(saleLedger?.count ?? 0) !== 0) {
      throw new DomainError(
        "INVALID_STATE",
        "Cannot void an invoice with fulfilled stock",
      );
    }

    const [updated] = await tx
      .update(invoices)
      .set({
        status: "void",
        amountPaidCents: 0,
        paidAt: null,
        voidedAt: now,
        updatedAt: now,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "issued")))
      .returning({ id: invoices.id });

    if (!updated) {
      throw new DomainError("CONFLICT", "Invoice state changed while voiding");
    }
    return { idempotent: false };
  });
}

export async function fulfillInvoice(input: {
  invoiceId: string;
  lineIds?: string[];
  userId?: string | null;
}): Promise<{ fulfilledLines: number; idempotent: boolean }> {
  return runDomainTransaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId);
    if (invoice.status !== "issued" && invoice.status !== "paid") {
      throw new DomainError(
        "INVALID_STATE",
        "Only issued or paid invoices can be fulfilled",
      );
    }

    // Lock all children in primary-key order before filtering. This both
    // validates ownership and prevents opposite client line orders from
    // becoming opposite database lock orders.
    const allLines = await lockInvoiceLines(tx, input.invoiceId);
    const requestedIds =
      input.lineIds && input.lineIds.length > 0
        ? new Set(input.lineIds)
        : undefined;
    const selectedLines = requestedIds
      ? allLines.filter((line) => requestedIds.has(line.id))
      : allLines;

    if (requestedIds && selectedLines.length !== requestedIds.size) {
      throw new DomainError(
        "NOT_FOUND",
        "Every selected line must belong to this invoice",
      );
    }

    const remainingLines = selectedLines
      .filter((line) => line.variantId && line.quantity > line.quantityFulfilled)
      .map((line) => ({
        ...line,
        variantId: line.variantId as string,
        remaining: line.quantity - line.quantityFulfilled,
      }));

    if (remainingLines.length === 0) {
      return { fulfilledLines: 0, idempotent: true };
    }

    const variantIds = [
      ...new Set(remainingLines.map((line) => line.variantId)),
    ].sort();
    const lockedVariants = await tx
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds))
      .orderBy(productVariants.id)
      .for("update");

    if (lockedVariants.length !== variantIds.length) {
      throw new DomainError(
        "NOT_FOUND",
        "One or more invoice variants no longer exist",
      );
    }

    const demandByVariant = new Map<string, number>();
    for (const line of remainingLines) {
      demandByVariant.set(
        line.variantId,
        (demandByVariant.get(line.variantId) ?? 0) + line.remaining,
      );
    }

    for (const variant of lockedVariants) {
      const demand = demandByVariant.get(variant.id) ?? 0;
      const available = availableQuantity(
        variant.quantityOnHand,
        variant.qtyReserved,
      );
      if (demand > available) {
        throw new DomainError(
          "INSUFFICIENT_STOCK",
          `Insufficient stock for ${variant.sku}: available ${available}, requested ${demand}`,
        );
      }
    }

    // All variants are locked and all demand has been validated before the
    // first ledger/cache mutation. Lines are already sorted by primary key.
    for (const line of remainingLines) {
      await applyMovementInTransaction(tx, {
        variantId: line.variantId,
        type: "sale",
        quantity: line.remaining,
        note: `Fulfill invoice ${input.invoiceId.slice(0, 8)}`,
        userId: input.userId ?? undefined,
        refType: "invoice",
        refId: input.invoiceId,
        idempotencyKey: `fulfill:${input.invoiceId}:${line.id}:${line.quantity}`,
      });
    }

    for (const line of remainingLines) {
      const [updated] = await tx
        .update(invoiceLines)
        .set({ quantityFulfilled: line.quantity })
        .where(
          and(
            eq(invoiceLines.id, line.id),
            eq(invoiceLines.invoiceId, input.invoiceId),
            eq(invoiceLines.quantityFulfilled, line.quantityFulfilled),
          ),
        )
        .returning({ id: invoiceLines.id });
      if (!updated) {
        throw new DomainError(
          "CONFLICT",
          "Invoice fulfillment state changed",
        );
      }
    }

    return { fulfilledLines: remainingLines.length, idempotent: false };
  });
}
