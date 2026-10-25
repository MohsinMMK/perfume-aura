"use server";

import {
  and,
  completeOpsSale,
  db,
  DomainError,
  eq,
  loadVariantCapacity,
  oilLots,
  products,
  productVariants,
  sql,
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
  reservedOilMl: number;
  availableOilMl: number;
  seriesName: string | null;
  concentrationPercent: number | null;
  /** Oil and base one bottle made at sale uses; null without a recipe. */
  oilMlPerBottle: number | null;
  baseMlPerBottle: number | null;
  /** Extra bottles the shelf can make at sale, beyond finished stock. */
  canMake: number;
  limitedBy: "oil" | "base" | "bottle" | "box" | null;
  blocker: string | null;
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
        reservedMl: oilLots.reservedQuantityMl,
        availableMl: sql<number>`${oilLots.remainingQuantityMl} - ${oilLots.reservedQuantityMl}`,
      })
      .from(oilLots),
  ]);

  const oilByProduct = new Map<
    string,
    { remainingMl: number; reservedMl: number; availableMl: number }
  >();
  for (const lot of lots) {
    const current = oilByProduct.get(lot.productId);
    oilByProduct.set(lot.productId, {
      remainingMl: (current?.remainingMl ?? 0) + lot.remainingMl,
      reservedMl: (current?.reservedMl ?? 0) + lot.reservedMl,
      availableMl: (current?.availableMl ?? 0) + lot.availableMl,
    });
  }

  const capacity = await loadVariantCapacity(
    variants.map((variant) => variant.variantId),
  );

  return variants.map((variant) => {
    const made = capacity.get(variant.variantId);
    return {
      ...variant,
      remainingOilMl: oilByProduct.get(variant.productId)?.remainingMl ?? 0,
      reservedOilMl: oilByProduct.get(variant.productId)?.reservedMl ?? 0,
      availableOilMl: oilByProduct.get(variant.productId)?.availableMl ?? 0,
      seriesName: made?.seriesName ?? null,
      concentrationPercent: made?.concentrationPercent ?? null,
      oilMlPerBottle: made?.recipe?.oilMl ?? null,
      baseMlPerBottle: made?.recipe?.baseMl ?? null,
      canMake: made?.canMake ?? 0,
      limitedBy: made?.limitedBy ?? null,
      blocker: made?.blocker ?? null,
    };
  });
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
    revalidatePath("/stock/supplies");
    revalidatePath("/stock/low");
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
