"use server";

import {
  and,
  applyMovement,
  customers,
  db,
  desc,
  eq,
  InventoryError,
  invoiceBalanceCents,
  invoiceLines,
  invoices,
  lineTotalCents,
  productVariants,
  products,
  remainingToFulfill,
  sql,
} from "@perfume-aura/db";
import {
  createInvoiceDraftSchema,
  fulfillInvoiceSchema,
  invoiceIdSchema,
  invoiceLineSchema,
  removeInvoiceLineSchema,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { rupeesToCents } from "@/lib/money";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";

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

export type InvoiceLineRow = {
  id: string;
  position: number;
  variantId: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  quantityFulfilled: number;
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

async function recalcInvoiceTotals(invoiceId: string) {
  const lines = await db
    .select({ lineTotalCents: invoiceLines.lineTotalCents })
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId));

  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  await db
    .update(invoices)
    .set({
      subtotalCents: subtotal,
      taxCents: 0,
      totalCents: subtotal,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));
}

async function assertDraft(invoiceId: string) {
  const [inv] = await db
    .select({ status: invoices.status })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "draft") throw new Error("Only draft invoices can be edited");
  return inv;
}

/** Next INV-YYYY-#### within a transaction-friendly query. */
async function allocateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const [row] = await db
    .select({
      maxNum: sql<string | null>`max(${invoices.number})`,
    })
    .from(invoices)
    .where(sql`${invoices.number} like ${prefix + "%"}`);

  let next = 1;
  if (row?.maxNum) {
    const tail = row.maxNum.slice(prefix.length);
    const n = Number.parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listInvoices(opts?: {
  status?: "draft" | "issued" | "paid" | "void" | "all" | "ar";
}): Promise<InvoiceListItem[]> {
  await requireSession();
  const status = opts?.status ?? "all";

  const conditions = [];
  if (status === "ar") {
    conditions.push(eq(invoices.status, "issued"));
  } else if (status !== "all") {
    conditions.push(eq(invoices.status, status));
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const rows = await db
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
    .orderBy(desc(invoices.createdAt));

  return rows.map((r) => ({
    ...r,
    balanceCents: invoiceBalanceCents(r.totalCents, r.amountPaidCents),
  }));
}

export async function getOpenArTotalCents(): Promise<number> {
  await requireSession();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${invoices.totalCents} - ${invoices.amountPaidCents}), 0)::bigint`,
    })
    .from(invoices)
    .where(eq(invoices.status, "issued"));
  return Number(row?.total ?? 0);
}

export async function getInvoice(
  id: string,
): Promise<InvoiceDetail | null> {
  await requireSession();

  const [inv] = await db
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

  if (!inv) return null;

  const lines = await db
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

  return {
    ...inv,
    balanceCents: invoiceBalanceCents(inv.totalCents, inv.amountPaidCents),
    lines,
  };
}

export async function createInvoiceDraftAction(
  raw: unknown,
): Promise<ActionResult<{ invoiceId: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = createInvoiceDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  try {
    const [cust] = await db
      .select({ id: customers.id, status: customers.status })
      .from(customers)
      .where(eq(customers.id, parsed.data.customerId))
      .limit(1);
    if (!cust || cust.status !== "active") {
      return actionError("Select an active customer");
    }

    const [inv] = await db
      .insert(invoices)
      .values({
        customerId: parsed.data.customerId,
        status: "draft",
        notes: parsed.data.notes?.trim() || null,
        createdBy: session.user.id,
      })
      .returning({ id: invoices.id });

    if (!inv) return actionError("Failed to create invoice");
    revalidateInvoicePaths(inv.id);
    return actionOk({ invoiceId: inv.id });
  } catch (err) {
    console.error("[createInvoiceDraft]", err);
    return actionError("Could not create invoice");
  }
}

export async function addInvoiceLineAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = invoiceLineSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  try {
    await assertDraft(parsed.data.invoiceId);

    let description = parsed.data.description.trim();
    const variantId: string | null =
      parsed.data.variantId && parsed.data.variantId.length > 0
        ? parsed.data.variantId
        : null;
    let unitPriceCents = rupeesToCents(parsed.data.unitPrice);

    if (variantId) {
      const [v] = await db
        .select({
          id: productVariants.id,
          sku: productVariants.sku,
          sizeMl: productVariants.sizeMl,
          retailCents: productVariants.retailCents,
          productName: products.name,
          status: productVariants.status,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(eq(productVariants.id, variantId))
        .limit(1);

      if (!v || v.status !== "active") {
        return actionError("Variant not found or inactive");
      }
      description =
        description ||
        `${v.productName} · ${v.sizeMl}ml · ${v.sku}`;
      if (parsed.data.unitPrice === 0) {
        unitPriceCents = v.retailCents;
      }
    }

    const [posRow] = await db
      .select({
        maxPos: sql<number>`coalesce(max(${invoiceLines.position}), -1)::int`,
      })
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, parsed.data.invoiceId));

    const position = Number(posRow?.maxPos ?? -1) + 1;
    const total = lineTotalCents(parsed.data.quantity, unitPriceCents);

    await db.insert(invoiceLines).values({
      invoiceId: parsed.data.invoiceId,
      position,
      variantId,
      description,
      quantity: parsed.data.quantity,
      unitPriceCents,
      lineTotalCents: total,
      quantityFulfilled: 0,
    });

    await recalcInvoiceTotals(parsed.data.invoiceId);
    revalidateInvoicePaths(parsed.data.invoiceId);
    return actionOk();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not add line";
    return actionError(msg);
  }
}

export async function removeInvoiceLineAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = removeInvoiceLineSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid line");

  try {
    await assertDraft(parsed.data.invoiceId);
    await db
      .delete(invoiceLines)
      .where(
        and(
          eq(invoiceLines.id, parsed.data.lineId),
          eq(invoiceLines.invoiceId, parsed.data.invoiceId),
        ),
      );
    await recalcInvoiceTotals(parsed.data.invoiceId);
    revalidateInvoicePaths(parsed.data.invoiceId);
    return actionOk();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not remove line";
    return actionError(msg);
  }
}

export async function issueInvoiceAction(
  raw: unknown,
): Promise<ActionResult<{ number: string }>> {
  try {
    await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = invoiceIdSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid invoice");

  try {
    const detail = await getInvoice(parsed.data.invoiceId);
    if (!detail) return actionError("Invoice not found");
    if (detail.status !== "draft") {
      return actionError("Only draft invoices can be issued");
    }
    if (detail.lines.length === 0) {
      return actionError("Add at least one line before issuing");
    }

    const number = await allocateInvoiceNumber();
    const today = new Date().toISOString().slice(0, 10);

    await db
      .update(invoices)
      .set({
        status: "issued",
        number,
        issueDate: today,
        issuedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parsed.data.invoiceId));

    revalidateInvoicePaths(parsed.data.invoiceId);
    return actionOk({ number });
  } catch (err) {
    console.error("[issueInvoice]", err);
    return actionError("Could not issue invoice");
  }
}

export async function voidInvoiceAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = invoiceIdSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid invoice");

  try {
    const [inv] = await db
      .select({
        status: invoices.status,
        id: invoices.id,
      })
      .from(invoices)
      .where(eq(invoices.id, parsed.data.invoiceId))
      .limit(1);

    if (!inv) return actionError("Invoice not found");
    if (inv.status !== "issued") {
      return actionError("Only issued invoices can be voided");
    }

    const lines = await db
      .select({ quantityFulfilled: invoiceLines.quantityFulfilled })
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, inv.id));

    const anyFulfilled = lines.some((l) => l.quantityFulfilled > 0);
    if (anyFulfilled) {
      return actionError(
        "Cannot void: stock already fulfilled. Reverse stock with receive/return first.",
      );
    }

    await db
      .update(invoices)
      .set({
        status: "void",
        voidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, inv.id));

    revalidateInvoicePaths(inv.id);
    return actionOk();
  } catch (err) {
    console.error("[voidInvoice]", err);
    return actionError("Could not void invoice");
  }
}

/**
 * Mark remaining balance as paid via a cash payment row (Phase 3 path).
 * Prefer explicit recordPaymentAction for partials / other methods.
 */
export async function markInvoicePaidAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = invoiceIdSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid invoice");

  try {
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, parsed.data.invoiceId))
      .limit(1);

    if (!inv) return actionError("Invoice not found");
    if (inv.status !== "issued") {
      return actionError("Only issued invoices can be marked paid");
    }

    const remaining = inv.totalCents - inv.amountPaidCents;
    if (remaining <= 0) {
      return actionError("Nothing left to pay");
    }

    // Delegate to payment ledger (no stock side effects)
    const { recordPaymentAction } = await import("@/lib/payments");
    const result = await recordPaymentAction({
      invoiceId: inv.id,
      amount: remaining / 100,
      method: "cash",
      note: "Marked paid (full remaining balance)",
    });
    if (!result.ok) return result;
    return actionOk();
  } catch (err) {
    console.error("[markInvoicePaid]", err);
    return actionError("Could not mark paid");
  }
}

/**
 * Fulfill remaining (or selected) variant lines → sale movements with invoice ref.
 * Does not run on free-text lines (no variant).
 */
export async function fulfillInvoiceAction(
  raw: unknown,
): Promise<ActionResult<{ fulfilledLines: number }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = fulfillInvoiceSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid request");

  try {
    const [inv] = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, parsed.data.invoiceId))
      .limit(1);

    if (!inv) return actionError("Invoice not found");
    if (inv.status !== "issued" && inv.status !== "paid") {
      return actionError("Only issued or paid invoices can be fulfilled");
    }

    let lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, inv.id));

    if (parsed.data.lineIds && parsed.data.lineIds.length > 0) {
      const set = new Set(parsed.data.lineIds);
      lines = lines.filter((l) => set.has(l.id));
    }

    let fulfilledLines = 0;

    for (const line of lines) {
      if (!line.variantId) continue;
      const remaining = remainingToFulfill(
        line.quantity,
        line.quantityFulfilled,
      );
      if (remaining <= 0) continue;

      try {
        await applyMovement({
          variantId: line.variantId,
          type: "sale",
          quantity: remaining,
          note: `Fulfill invoice ${inv.id.slice(0, 8)}`,
          userId: session.user.id,
          refType: "invoice",
          refId: inv.id,
          idempotencyKey: `fulfill:${line.id}:${line.quantityFulfilled + remaining}`,
        });
      } catch (err) {
        if (err instanceof InventoryError) {
          return actionError(
            `Stock: ${err.message} (line: ${line.description})`,
          );
        }
        throw err;
      }

      await db
        .update(invoiceLines)
        .set({ quantityFulfilled: line.quantityFulfilled + remaining })
        .where(eq(invoiceLines.id, line.id));

      fulfilledLines += 1;
    }

    if (fulfilledLines === 0) {
      return actionError(
        "Nothing to fulfill (no variant lines with remaining qty)",
      );
    }

    revalidateInvoicePaths(inv.id);
    revalidatePath("/stock");
    revalidatePath("/stock/low");
    revalidatePath("/products");
    return actionOk({ fulfilledLines });
  } catch (err) {
    console.error("[fulfillInvoice]", err);
    return actionError("Fulfill failed");
  }
}
