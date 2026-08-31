"use server";

import {
  addInvoiceLine,
  and,
  count,
  createInvoiceDraft,
  customers,
  db,
  desc,
  DomainError,
  eq,
  fulfillInvoice,
  invoiceBalanceCents,
  invoiceLines,
  invoices,
  inArray,
  issueInvoice,
  parseBusinessDateTime,
  recordRemainingInvoiceBalance,
  receiveInvoiceLineReturn,
  removeInvoiceLine,
  sql,
  stockMovements,
  voidInvoice,
} from "@perfume-aura/db";
import {
  createInvoiceDraftSchema,
  fulfillInvoiceSchema,
  invoiceIdSchema,
  invoiceLineSchema,
  markInvoicePaidSchema,
  removeInvoiceLineSchema,
  returnInvoiceLineSchema,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/session";
import { rupeesToPaise } from "@/lib/money";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";
import {
  normalizePageSize,
  pageOffset,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from "@/lib/pagination";

export type InvoiceListItem = {
  id: string;
  number: string | null;
  status: "draft" | "issued" | "paid" | "void";
  customerId: string;
  customerName: string;
  totalCents: number;
  amountPaidCents: number;
  balanceCents: number;
  issueDate: string | null;
  createdAt: Date;
};

type InvoiceLineRow = {
  id: string;
  position: number;
  variantId: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  quantityFulfilled: number;
  quantityReturned: number;
};

export type InvoiceDetail = {
  id: string;
  number: string | null;
  status: "draft" | "issued" | "paid" | "void";
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  issueDate: string | null;
  dueDate: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  amountPaidCents: number;
  balanceCents: number;
  notes: string | null;
  issuedAt: Date | null;
  voidedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  lines: InvoiceLineRow[];
};

function revalidateInvoicePaths(invoiceId?: string) {
  revalidatePath("/invoices");
  revalidatePath("/invoices/ar");
  revalidatePath("/dashboard");
  if (invoiceId) {
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/${invoiceId}/print`);
  }
}

function expectedDomainFailure(error: unknown, fallback: string) {
  if (error instanceof DomainError) return actionError(error.message);
  console.error(`[invoice-action] ${fallback}`, error);
  return actionError(fallback);
}

export async function listInvoices(opts?: {
  status?: "draft" | "issued" | "paid" | "void" | "all" | "ar";
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<InvoiceListItem>> {
  await requireCapability("invoices.view");
  const status = opts?.status ?? "all";
  const page = parsePage(opts?.page);
  const pageSize = normalizePageSize(opts?.pageSize);
  const where =
    status === "ar"
      ? eq(invoices.status, "issued")
      : status === "all"
        ? undefined
        : eq(invoices.status, status);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        customerId: invoices.customerId,
        customerName: customers.name,
        totalCents: invoices.totalCents,
        amountPaidCents: invoices.amountPaidCents,
        issueDate: invoices.issueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(where)
      .orderBy(desc(invoices.createdAt), desc(invoices.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ total: count(invoices.id) }).from(invoices).where(where),
  ]);

  const items = rows.map((row) => ({
    ...row,
    balanceCents: invoiceBalanceCents(
      row.totalCents,
      row.amountPaidCents,
    ),
  }));
  return paginatedResult(
    items,
    Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  );
}

export async function getOpenArTotalCents(): Promise<number> {
  await requireCapability("finance.view");
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${invoices.totalCents} - ${invoices.amountPaidCents}), 0)::bigint`,
    })
    .from(invoices)
    .where(eq(invoices.status, "issued"));
  return Number(row?.total ?? 0);
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  await requireCapability("invoices.view");

  const [invoice] = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      customerId: invoices.customerId,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotalCents: invoices.subtotalCents,
      taxCents: invoices.taxCents,
      totalCents: invoices.totalCents,
      amountPaidCents: invoices.amountPaidCents,
      notes: invoices.notes,
      issuedAt: invoices.issuedAt,
      voidedAt: invoices.voidedAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!invoice) return null;

  const lineRows = await db
    .select({
      id: invoiceLines.id,
      position: invoiceLines.position,
      variantId: invoiceLines.variantId,
      description: invoiceLines.description,
      quantity: invoiceLines.quantity,
      unitPriceCents: invoiceLines.unitPriceCents,
      lineTotalCents: invoiceLines.lineTotalCents,
      quantityFulfilled: invoiceLines.quantityFulfilled,
    })
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, id))
    .orderBy(invoiceLines.position, invoiceLines.createdAt);

  const returnedRows = lineRows.length > 0
    ? await db
        .select({
          lineId: stockMovements.refId,
          quantityReturned: sql<number>`coalesce(sum(${stockMovements.quantityDelta}), 0)::int`,
        })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.type, "return"),
            eq(stockMovements.refType, "invoice_line_return"),
            inArray(
              stockMovements.refId,
              lineRows.map((line) => line.id),
            ),
          ),
        )
        .groupBy(stockMovements.refId)
    : [];
  const returnedByLine = new Map(
    returnedRows.map((row) => [row.lineId, Number(row.quantityReturned)]),
  );
  const lines = lineRows.map((line) => ({
    ...line,
    quantityReturned: returnedByLine.get(line.id) ?? 0,
  }));

  return {
    ...invoice,
    balanceCents: invoiceBalanceCents(
      invoice.totalCents,
      invoice.amountPaidCents,
    ),
    lines,
  };
}

export async function createInvoiceDraftAction(
  raw: unknown,
): Promise<ActionResult<{ invoiceId: string }>> {
  let session;
  try {
    session = await requireCapability("invoices.draft");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = createInvoiceDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError(
      "Please fix the form errors",
      zodFieldErrors(parsed.error),
    );
  }

  try {
    const result = await createInvoiceDraft({
      customerId: parsed.data.customerId,
      notes: parsed.data.notes?.trim() || null,
      createdBy: session.user.id,
    });
    revalidateInvoicePaths(result.invoiceId);
    return actionOk(result);
  } catch (error) {
    return expectedDomainFailure(error, "Could not create invoice");
  }
}

export async function addInvoiceLineAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireCapability("invoices.draft");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = invoiceLineSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError(
      "Please fix the form errors",
      zodFieldErrors(parsed.error),
    );
  }

  try {
    await addInvoiceLine({
      invoiceId: parsed.data.invoiceId,
      variantId: parsed.data.variantId || null,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPriceCents: rupeesToPaise(parsed.data.unitPrice),
    });
    revalidateInvoicePaths(parsed.data.invoiceId);
    return actionOk();
  } catch (error) {
    return expectedDomainFailure(error, "Could not add line");
  }
}

export async function removeInvoiceLineAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireCapability("invoices.draft");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = removeInvoiceLineSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid line");

  try {
    await removeInvoiceLine(parsed.data);
    revalidateInvoicePaths(parsed.data.invoiceId);
    return actionOk();
  } catch (error) {
    return expectedDomainFailure(error, "Could not remove line");
  }
}

export async function issueInvoiceAction(
  raw: unknown,
): Promise<ActionResult<{ number: string }>> {
  try {
    await requireCapability("invoices.issue");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = invoiceIdSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid invoice");

  try {
    const result = await issueInvoice(parsed.data.invoiceId);
    revalidateInvoicePaths(parsed.data.invoiceId);
    return actionOk({ number: result.number });
  } catch (error) {
    return expectedDomainFailure(error, "Could not issue invoice");
  }
}

export async function voidInvoiceAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireCapability("invoices.void");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = invoiceIdSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid invoice");

  try {
    await voidInvoice(parsed.data.invoiceId);
    revalidateInvoicePaths(parsed.data.invoiceId);
    return actionOk();
  } catch (error) {
    return expectedDomainFailure(error, "Could not void invoice");
  }
}

/** Record the authoritative remaining balance through the payment primitive. */
export async function markInvoicePaidAction(
  raw: unknown,
): Promise<ActionResult> {
  let session;
  try {
    session = await requireCapability("payments.record");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = markInvoicePaidSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid payment request");

  try {
    await recordRemainingInvoiceBalance({
      invoiceId: parsed.data.invoiceId,
      idempotencyKey: parsed.data.idempotencyKey,
      method: "cash",
      paidAt: parseBusinessDateTime(parsed.data.paidAt),
      note: "Marked paid (full remaining balance)",
      createdBy: session.user.id,
    });
    revalidateInvoicePaths(parsed.data.invoiceId);
    revalidatePath("/payments");
    revalidatePath("/finance");
    return actionOk();
  } catch (error) {
    return expectedDomainFailure(error, "Could not mark paid");
  }
}

export async function fulfillInvoiceAction(
  raw: unknown,
): Promise<ActionResult<{ fulfilledLines: number }>> {
  let session;
  try {
    session = await requireCapability("invoices.fulfill");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = fulfillInvoiceSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid request");

  try {
    const result = await fulfillInvoice({
      invoiceId: parsed.data.invoiceId,
      lineIds: parsed.data.lineIds,
      userId: session.user.id,
    });
    revalidateInvoicePaths(parsed.data.invoiceId);
    revalidatePath("/stock");
    revalidatePath("/stock/low");
    revalidatePath("/products");
    revalidatePath("/finance");
    return actionOk({ fulfilledLines: result.fulfilledLines });
  } catch (error) {
    return expectedDomainFailure(error, "Fulfill failed");
  }
}

export async function receiveInvoiceReturnAction(
  raw: unknown,
): Promise<ActionResult<{ quantityAfter: number }>> {
  let session;
  try {
    session = await requireCapability("stock.adjust");
  } catch {
    return actionError("Only the owner can receive a returned bottle");
  }

  const parsed = returnInvoiceLineSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the return details", zodFieldErrors(parsed.error));
  }

  try {
    const result = await receiveInvoiceLineReturn({
      ...parsed.data,
      userId: session.user.id,
    });
    revalidateInvoicePaths(parsed.data.invoiceId);
    revalidatePath("/stock");
    revalidatePath("/stock/low");
    revalidatePath("/reports");
    return actionOk({ quantityAfter: result.quantityAfter });
  } catch (error) {
    return expectedDomainFailure(error, "Could not receive the return");
  }
}
