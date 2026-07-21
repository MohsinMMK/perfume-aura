"use server";

import {
  and,
  customers,
  db,
  desc,
  eq,
  ilike,
  or,
} from "@perfume-aura/db";
import {
  archiveCustomerSchema,
  customerFormSchema,
  updateCustomerSchema,
  type CustomerFormInput,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";

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

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

export async function listCustomers(opts?: {
  q?: string;
  status?: "active" | "archived" | "all";
}): Promise<CustomerListItem[]> {
  await requireSession();

  const q = opts?.q?.trim() ?? "";
  const status = opts?.status ?? "active";
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

  const rows = await db
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
    .orderBy(desc(customers.createdAt));

  return rows;
}

export async function getCustomer(
  id: string,
): Promise<CustomerDetail | null> {
  await requireSession();
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

export async function listActiveCustomersForSelect(): Promise<
  { id: string; name: string }[]
> {
  await requireSession();
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
    await requireSession();
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
    await requireSession();
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
    await requireSession();
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
