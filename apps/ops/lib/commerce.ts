"use server";

import {
  and,
  commerceInquiries,
  commerceOrders,
  commerceOrderItems,
  commerceReturns,
  commerceSettings,
  count,
  db,
  desc,
  eq,
  paymentAttempts,
  productPublications,
  products,
  promotions,
  reviews,
  shipments,
  sql,
} from "@perfume-aura/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionOk, type ActionResult, zodFieldErrors } from "@/lib/action-result";
import { requireOwnerSession } from "@/lib/session";

export type CommerceOverview = {
  catalogBlocked: number;
  openOrders: number;
  paymentAttention: number;
  pendingReviews: number;
  newInquiries: number;
  openReturns: number;
  checkoutEnabled: boolean;
};

export async function getCommerceOverview(): Promise<CommerceOverview> {
  await requireOwnerSession();

  const [catalogRows, orderRows, paymentRows, reviewRows, inquiryRows, returnRows, settingsRows] =
    await Promise.all([
      db.select({ total: count(productPublications.productId) }).from(productPublications).where(sql`${productPublications.status} <> 'published'`),
      db.select({ total: count(commerceOrders.id) }).from(commerceOrders).where(sql`${commerceOrders.status} NOT IN ('delivered', 'cancelled', 'returned')`),
      db.select({ total: count(paymentAttempts.id) }).from(paymentAttempts).where(sql`${paymentAttempts.status} IN ('pending', 'failed')`),
      db.select({ total: count(reviews.id) }).from(reviews).where(eq(reviews.status, "pending")),
      db.select({ total: count(commerceInquiries.id) }).from(commerceInquiries).where(eq(commerceInquiries.status, "new")),
      db.select({ total: count(commerceReturns.id) }).from(commerceReturns).where(sql`${commerceReturns.status} NOT IN ('refunded', 'rejected', 'cancelled')`),
      db.select({ checkoutEnabled: commerceSettings.checkoutEnabled }).from(commerceSettings).where(eq(commerceSettings.id, "primary")).limit(1),
    ]);

  return {
    catalogBlocked: Number(catalogRows[0]?.total ?? 0),
    openOrders: Number(orderRows[0]?.total ?? 0),
    paymentAttention: Number(paymentRows[0]?.total ?? 0),
    pendingReviews: Number(reviewRows[0]?.total ?? 0),
    newInquiries: Number(inquiryRows[0]?.total ?? 0),
    openReturns: Number(returnRows[0]?.total ?? 0),
    checkoutEnabled: settingsRows[0]?.checkoutEnabled ?? false,
  };
}

export type CommerceCatalogRow = {
  productId: string;
  internalName: string;
  publicName: string | null;
  publicSlug: string | null;
  status: "draft" | "blocked" | "approved" | "published" | "withdrawn" | null;
  legalApprovedAt: Date | null;
  contentApprovedAt: Date | null;
  mediaApprovedAt: Date | null;
  pricedVariantCount: number;
  activeVariantCount: number;
  featuredRank: number | null;
};

export async function listCommerceCatalog(): Promise<CommerceCatalogRow[]> {
  await requireOwnerSession();
  return db
    .select({
      productId: products.id,
      internalName: products.name,
      publicName: productPublications.publicName,
      publicSlug: productPublications.publicSlug,
      status: productPublications.status,
      legalApprovedAt: productPublications.legalApprovedAt,
      contentApprovedAt: productPublications.contentApprovedAt,
      mediaApprovedAt: productPublications.mediaApprovedAt,
      pricedVariantCount: sql<number>`(
        select count(*)::int from product_variants pv
        inner join variant_prices vp on vp.variant_id = pv.id
        where pv.product_id = ${products.id}
          and pv.status = 'active'
          and vp.active = true
          and vp.approved_at is not null
      )`,
      activeVariantCount: sql<number>`(
        select count(*)::int from product_variants pv
        where pv.product_id = ${products.id} and pv.status = 'active'
      )`,
      featuredRank: productPublications.featuredRank,
    })
    .from(products)
    .leftJoin(productPublications, eq(productPublications.productId, products.id))
    .where(eq(products.status, "active"))
    .orderBy(sql`${productPublications.featuredRank} nulls last`, products.name);
}

export type CommerceOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentState: string;
  totalAmountMinor: number;
  guestEmail: string | null;
  placedAt: Date;
  shipmentStatus: string | null;
  courier: string | null;
  trackingNumber: string | null;
  codCollectedAt: Date | null;
  codReconciledAt: Date | null;
};

export async function listCommerceOrders(): Promise<CommerceOrderRow[]> {
  await requireOwnerSession();
  return db
    .select({
      id: commerceOrders.id,
      orderNumber: commerceOrders.orderNumber,
      status: commerceOrders.status,
      paymentState: commerceOrders.paymentState,
      totalAmountMinor: commerceOrders.totalAmountMinor,
      guestEmail: commerceOrders.guestEmail,
      placedAt: commerceOrders.placedAt,
      shipmentStatus: shipments.status,
      courier: shipments.courier,
      trackingNumber: shipments.trackingNumber,
      codCollectedAt: shipments.codCollectedAt,
      codReconciledAt: shipments.codReconciledAt,
    })
    .from(commerceOrders)
    .leftJoin(shipments, eq(shipments.orderId, commerceOrders.id))
    .orderBy(desc(commerceOrders.placedAt), desc(commerceOrders.id))
    .limit(100);
}

const shipmentUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "booked", "shipped", "delivered", "rto", "cancelled"]),
  courier: z.string().trim().max(160).optional(),
  trackingNumber: z.string().trim().max(160).optional(),
  codCollected: z.boolean(),
  codReconciled: z.boolean(),
}).superRefine((value, context) => {
  if (value.status === "shipped" && (!value.courier || !value.trackingNumber)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["trackingNumber"], message: "Courier and tracking number are required before marking shipped." });
  }
  if (value.codReconciled && !value.codCollected) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["codReconciled"], message: "COD cannot be reconciled before collection is confirmed." });
  }
});

export async function updateShipmentAction(formData: FormData): Promise<ActionResult> {
  await requireOwnerSession();
  const parsed = shipmentUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    courier: String(formData.get("courier") ?? "").trim() || undefined,
    trackingNumber: String(formData.get("trackingNumber") ?? "").trim() || undefined,
    codCollected: formData.get("codCollected") === "on",
    codReconciled: formData.get("codReconciled") === "on",
  });
  if (!parsed.success) return actionError("Shipment was not updated.", zodFieldErrors(parsed.error));

  await db.transaction(async (transaction) => {
    const [order] = await transaction.select({ id: commerceOrders.id, paymentState: commerceOrders.paymentState }).from(commerceOrders).where(eq(commerceOrders.id, parsed.data.orderId)).for("update").limit(1);
    if (!order) throw new Error("Order was not found");
    const [shipment] = await transaction.select({ id: shipments.id }).from(shipments).where(eq(shipments.orderId, order.id)).for("update").limit(1);
    const now = new Date();
    const values = {
      status: parsed.data.status,
      courier: parsed.data.courier ?? null,
      trackingNumber: parsed.data.trackingNumber ?? null,
      codCollectedAt: parsed.data.codCollected ? now : null,
      codReconciledAt: parsed.data.codReconciled ? now : null,
      shippedAt: parsed.data.status === "shipped" ? now : undefined,
      deliveredAt: parsed.data.status === "delivered" ? now : undefined,
      rtoAt: parsed.data.status === "rto" ? now : undefined,
      updatedAt: now,
    } as const;
    if (shipment) {
      await transaction.update(shipments).set(values).where(eq(shipments.id, shipment.id));
    } else {
      await transaction.insert(shipments).values({ orderId: order.id, ...values });
    }
    if (parsed.data.status === "delivered") {
      const paymentState =
        order.paymentState === "cod_due" && parsed.data.codCollected && parsed.data.codReconciled
          ? "cod_collected"
          : order.paymentState;
      await transaction.update(commerceOrders).set({ status: "delivered", paymentState }).where(eq(commerceOrders.id, order.id));
      await transaction
        .update(commerceOrderItems)
        .set({ fulfilledQuantity: sql`${commerceOrderItems.quantity}` })
        .where(eq(commerceOrderItems.orderId, order.id));
      if (paymentState === "cod_collected") {
        await transaction.update(paymentAttempts).set({ status: "succeeded", verifiedAt: now }).where(and(eq(paymentAttempts.orderId, order.id), eq(paymentAttempts.provider, "cod")));
      }
    }
    if (parsed.data.status === "rto") {
      await transaction.update(commerceOrders).set({ status: "returned", paymentState: order.paymentState === "cod_due" ? "failed" : order.paymentState }).where(eq(commerceOrders.id, order.id));
    }
  });
  revalidatePath("/commerce/orders");
  revalidatePath("/commerce");
  return actionOk();
}

export async function listCommerceReviews() {
  await requireOwnerSession();
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      status: reviews.status,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .orderBy(desc(reviews.createdAt))
    .limit(100);
}

export async function listCommerceSupport() {
  await requireOwnerSession();
  const [inquiries, returns] = await Promise.all([
    db.select().from(commerceInquiries).orderBy(desc(commerceInquiries.createdAt)).limit(100),
    db.select().from(commerceReturns).orderBy(desc(commerceReturns.requestedAt)).limit(100),
  ]);
  return { inquiries, returns };
}

export async function listCommercePromotions() {
  await requireOwnerSession();
  return db.select().from(promotions).orderBy(desc(promotions.createdAt)).limit(100);
}

export async function getCommerceSettings() {
  await requireOwnerSession();
  const [row] = await db
    .select()
    .from(commerceSettings)
    .where(eq(commerceSettings.id, "primary"))
    .limit(1);
  return row ?? null;
}

const settingsSchema = z
  .object({
    flatShippingAmountMinor: z.number().int().nonnegative(),
    freeShippingThresholdMinor: z.number().int().nonnegative().nullable(),
    taxTreatment: z.enum([
      "prices_include_approved_tax",
      "no_tax_collected_owner_approved",
    ]),
    supportChannel: z.string().trim().min(3).max(500),
    shippingPolicyApproved: z.boolean(),
    returnsPolicyApproved: z.boolean(),
    cancellationPolicyApproved: z.boolean(),
    checkoutEnabled: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.checkoutEnabled &&
      (!value.shippingPolicyApproved ||
        !value.returnsPolicyApproved ||
        !value.cancellationPolicyApproved)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkoutEnabled"],
        message: "Approve shipping, returns, and cancellation policies before enabling checkout.",
      });
    }
  });

function parseRupees(value: FormDataEntryValue | null, optional = false): number | null {
  const raw = String(value ?? "").trim();
  if (optional && raw === "") return null;
  const rupees = Number(raw);
  if (!Number.isFinite(rupees)) return Number.NaN;
  return Math.round(rupees * 100);
}

export async function updateCommerceSettingsAction(
  formData: FormData,
): Promise<ActionResult<{ checkoutEnabled: boolean }>> {
  const session = await requireOwnerSession();
  const parsed = settingsSchema.safeParse({
    flatShippingAmountMinor: parseRupees(formData.get("flatShippingAmount")),
    freeShippingThresholdMinor: parseRupees(formData.get("freeShippingThreshold"), true),
    taxTreatment: formData.get("taxTreatment"),
    supportChannel: formData.get("supportChannel"),
    shippingPolicyApproved: formData.get("shippingPolicyApproved") === "on",
    returnsPolicyApproved: formData.get("returnsPolicyApproved") === "on",
    cancellationPolicyApproved: formData.get("cancellationPolicyApproved") === "on",
    checkoutEnabled: formData.get("checkoutEnabled") === "on",
  });

  if (!parsed.success) {
    return actionError("Commerce settings were not saved.", zodFieldErrors(parsed.error));
  }

  const [saved] = await db
    .insert(commerceSettings)
    .values({
      id: "primary",
      currency: "INR",
      ...parsed.data,
      updatedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: commerceSettings.id,
      set: { ...parsed.data, updatedBy: session.user.id, updatedAt: new Date() },
    })
    .returning({ checkoutEnabled: commerceSettings.checkoutEnabled });

  revalidatePath("/commerce");
  revalidatePath("/commerce/settings");
  return actionOk({ checkoutEnabled: saved?.checkoutEnabled ?? false });
}
