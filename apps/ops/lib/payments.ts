"use server";

import {
  customers,
  db,
  desc,
  eq,
  invoices,
  isFullyPaid,
  payments,
  sql,
  wouldOverpay,
} from "@perfume-aura/db";
import { recordPaymentSchema } from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { rupeesToCents } from "@/lib/money";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";

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
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/${invoiceId}/print`);
}

async function allocatePaymentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const [row] = await db
    .select({
      maxNum: sql<string | null>`max(${payments.number})`,
    })
    .from(payments)
    .where(sql`${payments.number} like ${prefix + "%"}`);

  let next = 1;
  if (row?.maxNum) {
    const tail = row.maxNum.slice(prefix.length);
    const n = Number.parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listPayments(opts?: {
  invoiceId?: string;
}): Promise<PaymentListItem[]> {
  await requireSession();

  const where = opts?.invoiceId
    ? eq(payments.invoiceId, opts.invoiceId)
    : undefined;

  const rows = await db
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
    .orderBy(desc(payments.paidAt), desc(payments.createdAt));

  return rows;
}

/** Sum of payments with paid_at in [start, end). */
export async function getCashCollectedCents(
  from: Date,
  to: Date,
): Promise<number> {
  await requireSession();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint`,
    })
    .from(payments)
    .where(sql`${payments.paidAt} >= ${from} and ${payments.paidAt} < ${to}`);
  return Number(row?.total ?? 0);
}

export async function getCashCollectedThisMonthCents(): Promise<number> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return getCashCollectedCents(from, to);
}

/**
 * Record a manual payment against an invoice.
 * Syncs invoices.amount_paid_cents and status (issued → paid when full).
 * Never touches stock.
 */
export async function recordPaymentAction(
  raw: unknown,
): Promise<ActionResult<{ paymentId: string; fullyPaid: boolean }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = recordPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const amountCents = rupeesToCents(parsed.data.amount);
  if (amountCents <= 0) {
    return actionError("Amount must be greater than zero");
  }

  try {
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, parsed.data.invoiceId))
      .limit(1);

    if (!inv) return actionError("Invoice not found");
    if (inv.status === "draft") {
      return actionError("Issue the invoice before recording payment");
    }
    if (inv.status === "void") {
      return actionError("Cannot pay a void invoice");
    }
    if (inv.status === "paid") {
      return actionError("Invoice is already fully paid");
    }

    if (wouldOverpay(inv.totalCents, inv.amountPaidCents, amountCents)) {
      const remaining = inv.totalCents - inv.amountPaidCents;
      return actionError(
        `Payment exceeds balance. Remaining: ${(remaining / 100).toFixed(2)} PKR`,
      );
    }

    let paidAt = new Date();
    if (parsed.data.paidAt) {
      const d = new Date(parsed.data.paidAt);
      if (!Number.isNaN(d.getTime())) paidAt = d;
    }

    const number = await allocatePaymentNumber();
    const newPaid = inv.amountPaidCents + amountCents;
    const fullyPaid = isFullyPaid(inv.totalCents, newPaid);

    const [payment] = await db
      .insert(payments)
      .values({
        number,
        invoiceId: inv.id,
        customerId: inv.customerId,
        method: parsed.data.method,
        amountCents,
        paidAt,
        reference: parsed.data.reference?.trim() || null,
        note: parsed.data.note?.trim() || null,
        createdBy: session.user.id,
      })
      .returning({ id: payments.id });

    if (!payment) return actionError("Failed to record payment");

    await db
      .update(invoices)
      .set({
        amountPaidCents: newPaid,
        status: fullyPaid ? "paid" : "issued",
        paidAt: fullyPaid ? paidAt : inv.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, inv.id));

    revalidatePaymentPaths(inv.id);
    return actionOk({ paymentId: payment.id, fullyPaid });
  } catch (err) {
    console.error("[recordPayment]", err);
    return actionError("Could not record payment");
  }
}
