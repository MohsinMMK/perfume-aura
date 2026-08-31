"use server";

import {
  and,
  completeOpsSale,
  db,
  DomainError,
  eq,
  oilLots,
  oilMlForBottles,
  products,
  productVariants,
} from "@perfume-aura/db";
import {
  completeSaleSchema,
  type CompleteSaleInput,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { rupeesToPaise } from "@/lib/money";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";

export type SaleCatalogItem = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  sizeMl: number;
  retailCents: number;
  quantityOnHand: number;
  remainingOilMl: number;
  oilMlPerBottle: number;
};

export async function listSaleCatalog(): Promise<SaleCatalogItem[]> {
  await requireCapability("sales.complete");
  const [variants, lots] = await Promise.all([
    db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        sku: productVariants.sku,
        sizeMl: productVariants.sizeMl,
        retailCents: productVariants.retailCents,
        quantityOnHand: productVariants.quantityOnHand,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(eq(productVariants.status, "active"), eq(products.status, "active")),
      )
      .orderBy(products.name, productVariants.sizeMl, productVariants.id),
    db
      .select({
        productId: oilLots.productId,
        remainingMl: oilLots.remainingQuantityMl,
      })
      .from(oilLots),
  ]);

  const oilByProduct = new Map<string, number>();
  for (const lot of lots) {
    oilByProduct.set(
      lot.productId,
      (oilByProduct.get(lot.productId) ?? 0) + lot.remainingMl,
    );
  }

  return variants.map((variant) => ({
    ...variant,
    remainingOilMl: oilByProduct.get(variant.productId) ?? 0,
    oilMlPerBottle: oilMlForBottles(variant.sizeMl, 1),
  }));
}

export async function completeSaleAction(
  raw: unknown,
): Promise<
  ActionResult<{
    invoiceId: string;
    invoiceNumber: string;
    oilConsumedMl: number;
  }>
> {
  let session;
  try {
    session = await requireCapability("sales.complete");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = completeSaleSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data: CompleteSaleInput = parsed.data;
  const wantsPayment = Boolean(data.paymentAmount && data.paymentAmount > 0);
  if (wantsPayment && !hasOpsCapability(session.user.role, "payments.record")) {
    return actionError("Only the owner can record payment on a sale");
  }

  try {
    const result = await completeOpsSale({
      customer: data.customerId
        ? { customerId: data.customerId }
        : {
            name: data.name ?? "",
            email: data.email,
            phone: data.phone,
            addressLine: data.addressLine,
            city: data.city,
            notes: data.customerNotes,
          },
      lines: data.lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        unitPriceCents:
          line.unitPrice === undefined ? undefined : rupeesToPaise(line.unitPrice),
      })),
      payment:
        wantsPayment && data.paymentIdempotencyKey && data.paidAt
          ? {
              amountCents: rupeesToPaise(data.paymentAmount ?? 0),
              method: data.paymentMethod ?? "cash",
              reference: data.paymentReference,
              note: data.paymentNote,
              idempotencyKey: data.paymentIdempotencyKey,
              paidAt: new Date(data.paidAt),
            }
          : undefined,
      notes: data.notes,
      createdBy: session.user.id,
      idempotencyKey: data.idempotencyKey,
    });
    revalidatePath("/sales/new");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${result.invoiceId}`);
    revalidatePath("/customers");
    revalidatePath(`/customers/${result.customerId}`);
    revalidatePath("/stock");
    revalidatePath("/stock/oil");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return actionOk({
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      oilConsumedMl: result.oilConsumedMl,
    });
  } catch (error) {
    if (error instanceof DomainError) return actionError(error.message);
    console.error("[completeSale]", error);
    return actionError("Could not complete the sale");
  }
}
