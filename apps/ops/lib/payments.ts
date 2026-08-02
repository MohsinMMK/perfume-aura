"use server";

import {
  businessMonthBounds,
  count,
  customers,
  db,
  desc,
  DomainError,
  eq,
  invoices,
  parseBusinessDateTime,
  payments,
  recordPayment,
  sql,
} from "@perfume-aura/db";
import { recordPaymentSchema } from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/session";
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

export type PaymentListItem = {
  id: string;
  number: string | null;
  invoiceId: string;
  invoiceNumber: string | null;
  customerId: string | null;
  customerName: string | null;
  method: "cash" | "bank_transfer" | "card" | "other";
  amountCents: number;
  paidAt: Date;
  reference: string | null;
  note: string | null;
  createdAt: Date;
};

function revalidatePaymentPaths(invoiceId: string) {
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/invoices/ar");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/${invoiceId}/print`);
}

export async function listPayments(opts?: {
  invoiceId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<PaymentListItem>> {
  await requireOwnerSession();

  const where = opts?.invoiceId
    ? eq(payments.invoiceId, opts.invoiceId)
    : undefined;
  const page = parsePage(opts?.page);
  const pageSize = normalizePageSize(opts?.pageSize);
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: payments.id,
        number: payments.number,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.number,
        customerId: payments.customerId,
        customerName: customers.name,
        method: payments.method,
        amountCents: payments.amountCents,
        paidAt: payments.paidAt,
        reference: payments.reference,
        note: payments.note,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .leftJoin(customers, eq(customers.id, payments.customerId))
      .where(where)
      .orderBy(
        desc(payments.paidAt),
        desc(payments.createdAt),
        desc(payments.id),
      )
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ total: count(payments.id) }).from(payments).where(where),
  ]);
  return paginatedResult(
    rows,
    Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  );
}

export async function getCashCollectedCents(
  from: Date,
  to: Date,
): Promise<number> {
  await requireOwnerSession();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint`,
    })
    .from(payments)
    .where(sql`${payments.paidAt} >= ${from} and ${payments.paidAt} < ${to}`);
  return Number(row?.total ?? 0);
}

export async function getCashCollectedThisMonthCents(): Promise<number> {
  const { from, to } = businessMonthBounds();
  return getCashCollectedCents(from, to);
}

export async function recordPaymentAction(
  raw: unknown,
): Promise<ActionResult<{ paymentId: string; fullyPaid: boolean }>> {
  let session;
  try {
    session = await requireOwnerSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = recordPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError(
      "Please fix the form errors",
      zodFieldErrors(parsed.error),
    );
  }

  try {
    const result = await recordPayment({
      invoiceId: parsed.data.invoiceId,
      idempotencyKey: parsed.data.idempotencyKey,
      amountCents: rupeesToPaise(parsed.data.amount),
      method: parsed.data.method,
      paidAt: parseBusinessDateTime(parsed.data.paidAt),
      reference: parsed.data.reference?.trim() || null,
      note: parsed.data.note?.trim() || null,
      createdBy: session.user.id,
    });
    revalidatePaymentPaths(parsed.data.invoiceId);
    return actionOk({
      paymentId: result.paymentId,
      fullyPaid: result.fullyPaid,
    });
  } catch (error) {
    if (error instanceof DomainError) return actionError(error.message);
    console.error("[recordPayment]", error);
    return actionError("Could not record payment");
  }
}
