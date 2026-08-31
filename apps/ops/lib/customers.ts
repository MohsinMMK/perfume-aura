"use server";

import {
  and,
  count,
  customers,
  db,
  desc,
  eq,
  ilike,
  invoiceLines,
  invoices,
  or,
  payments,
  sql,
} from "@perfume-aura/db";
import {
  archiveCustomerSchema,
  customerFormSchema,
  updateCustomerSchema,
  type CustomerFormInput,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/session";
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

export type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: "active" | "archived";
  createdAt: Date;
};

export type CustomerDetail = CustomerListItem & {
  addressLine: string | null;
  notes: string | null;
  updatedAt: Date;
};

export type CustomerOverview = {
  invoiceCount: number;
  lifetimeValueCents: number;
  amountPaidCents: number;
  openBalanceCents: number;
  lastPurchaseAt: Date | null;
  invoices: Array<{
    id: string;
    number: string | null;
    status: "draft" | "issued" | "paid" | "void";
    totalCents: number;
    balanceCents: number;
    createdAt: Date;
  }>;
  favoriteProducts: Array<{
    description: string;
    quantity: number;
    spentCents: number;
  }>;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

export async function listCustomers(opts?: {
  q?: string;
  status?: "active" | "archived" | "all";
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<CustomerListItem>> {
  await requireCapability("customers.view");

  const q = opts?.q?.trim() ?? "";
  const status = opts?.status ?? "active";
  const page = parsePage(opts?.page);
  const pageSize = normalizePageSize(opts?.pageSize);
  const conditions = [];

  if (status !== "all") {
    conditions.push(eq(customers.status, status));
  }
  if (q.length > 0) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(customers.name, pattern),
        ilike(customers.email, pattern),
        ilike(customers.phone, pattern),
        ilike(customers.city, pattern),
      ),
    );
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        city: customers.city,
        status: customers.status,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt), desc(customers.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ total: count(customers.id) })
      .from(customers)
      .where(where),
  ]);

  return paginatedResult(
    rows,
    Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  );
}

export async function getCustomer(
  id: string,
): Promise<CustomerDetail | null> {
  await requireCapability("customers.view");
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    addressLine: row.addressLine,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCustomerOverview(
  customerId: string,
): Promise<CustomerOverview> {
  await requireCapability("customers.view");

  const [summaryRows, invoiceRows, productRows, paymentRows] = await Promise.all([
    db
      .select({
        invoiceCount: sql<number>`count(*) filter (where ${invoices.status} in ('issued', 'paid'))::int`,
        lifetimeValueCents: sql<number>`coalesce(sum(${invoices.totalCents}) filter (where ${invoices.status} in ('issued', 'paid')), 0)::bigint`,
        openBalanceCents: sql<number>`coalesce(sum(${invoices.totalCents} - ${invoices.amountPaidCents}) filter (where ${invoices.status} = 'issued'), 0)::bigint`,
        lastPurchaseAt: sql<string | null>`max(${invoices.issuedAt}) filter (where ${invoices.status} in ('issued', 'paid'))`,
      })
      .from(invoices)
      .where(eq(invoices.customerId, customerId)),
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        totalCents: invoices.totalCents,
        amountPaidCents: invoices.amountPaidCents,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.createdAt), desc(invoices.id))
      .limit(8),
    db
      .select({
        description: invoiceLines.description,
        quantity: sql<number>`coalesce(sum(${invoiceLines.quantity}), 0)::int`,
        spentCents: sql<number>`coalesce(sum(${invoiceLines.lineTotalCents}), 0)::bigint`,
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(
        sql`${invoices.customerId} = ${customerId} and ${invoices.status} in ('issued', 'paid')`,
      )
      .groupBy(invoiceLines.description)
      .orderBy(desc(sql`sum(${invoiceLines.quantity})`), invoiceLines.description)
      .limit(5),
    db
      .select({
        amountPaidCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint`,
      })
      .from(payments)
      .where(eq(payments.customerId, customerId)),
  ]);

  const summary = summaryRows[0];
  const lastPurchaseAt = summary?.lastPurchaseAt
    ? new Date(summary.lastPurchaseAt)
    : null;
  return {
    invoiceCount: Number(summary?.invoiceCount ?? 0),
    lifetimeValueCents: Number(summary?.lifetimeValueCents ?? 0),
    amountPaidCents: Number(paymentRows[0]?.amountPaidCents ?? 0),
    openBalanceCents: Number(summary?.openBalanceCents ?? 0),
    lastPurchaseAt:
      lastPurchaseAt && !Number.isNaN(lastPurchaseAt.getTime())
        ? lastPurchaseAt
        : null,
    invoices: invoiceRows.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      totalCents: invoice.totalCents,
      balanceCents: Math.max(0, invoice.totalCents - invoice.amountPaidCents),
      createdAt: invoice.createdAt,
    })),
    favoriteProducts: productRows.map((product) => ({
      description: product.description,
      quantity: Number(product.quantity),
      spentCents: Number(product.spentCents),
    })),
  };
}

export async function listActiveCustomersForSelect(): Promise<
  { id: string; name: string }[]
> {
  await requireCapability("customers.view");
  return db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.status, "active"))
    .orderBy(customers.name);
}

export async function createCustomerAction(
  raw: unknown,
): Promise<ActionResult<{ customerId: string }>> {
  try {
    await requireCapability("customers.create");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = customerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data: CustomerFormInput = parsed.data;

  try {
    const [row] = await db
      .insert(customers)
      .values({
        name: data.name.trim(),
        email: emptyToNull(data.email),
        phone: emptyToNull(data.phone),
        addressLine: emptyToNull(data.addressLine),
        city: emptyToNull(data.city),
        notes: emptyToNull(data.notes),
        status: "active",
      })
      .returning({ id: customers.id });

    if (!row) return actionError("Failed to create customer");
    revalidatePath("/customers");
    revalidatePath("/invoices");
    return actionOk({ customerId: row.id });
  } catch (err) {
    console.error("[createCustomer]", err);
    return actionError("Could not create customer");
  }
}

export async function updateCustomerAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireCapability("customers.update");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = updateCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  try {
    const updated = await db
      .update(customers)
      .set({
        name: parsed.data.name.trim(),
        email: emptyToNull(parsed.data.email),
        phone: emptyToNull(parsed.data.phone),
        addressLine: emptyToNull(parsed.data.addressLine),
        city: emptyToNull(parsed.data.city),
        notes: emptyToNull(parsed.data.notes),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, parsed.data.customerId))
      .returning({ id: customers.id });

    if (updated.length === 0) return actionError("Customer not found");
    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return actionOk();
  } catch (err) {
    console.error("[updateCustomer]", err);
    return actionError("Could not update customer");
  }
}

export async function archiveCustomerAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireCapability("customers.archive");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = archiveCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Invalid customer");
  }

  try {
    await db
      .update(customers)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(customers.id, parsed.data.customerId));
    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return actionOk();
  } catch (err) {
    console.error("[archiveCustomer]", err);
    return actionError("Could not archive customer");
  }
}
