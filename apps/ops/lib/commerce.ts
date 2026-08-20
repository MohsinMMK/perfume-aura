"use server";

import { randomUUID } from "node:crypto";

import {
  commerceInquiries,
  commerceOrders,
  commerceOrderEvents,
  commerceOrderItems,
  commerceRefunds,
  commerceReturns,
  commerceSettings,
  count,
  db,
  desc,
  eq,
  notificationOutbox,
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
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import { requestCashfreeRefund } from "@/lib/cashfree-refunds";

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
  const session = await requireCapability("commerce.view");
  const canManagePayments = hasOpsCapability(
    session.user.role,
    "commerce.refunds.manage",
  );
  const canManageReleaseGates = hasOpsCapability(
    session.user.role,
    "commerce.release-gates.manage",
  );

  const [catalogRows, orderRows, paymentRows, reviewRows, inquiryRows, returnRows, settingsRows] =
    await Promise.all([
      db.select({ total: count(productPublications.productId) }).from(productPublications).where(sql`${productPublications.status} <> 'published'`),
      db.select({ total: count(commerceOrders.id) }).from(commerceOrders).where(sql`${commerceOrders.status} NOT IN ('delivered', 'cancelled', 'returned')`),
      canManagePayments
        ? db.select({ total: count(paymentAttempts.id) }).from(paymentAttempts).where(sql`${paymentAttempts.provider} = 'cashfree' AND ${paymentAttempts.status} IN ('pending', 'failed')`)
        : Promise.resolve([{ total: 0 }]),
      db.select({ total: count(reviews.id) }).from(reviews).where(eq(reviews.status, "pending")),
      db.select({ total: count(commerceInquiries.id) }).from(commerceInquiries).where(eq(commerceInquiries.status, "new")),
      db.select({ total: count(commerceReturns.id) }).from(commerceReturns).where(sql`${commerceReturns.status} NOT IN ('refunded', 'rejected', 'cancelled')`),
      canManageReleaseGates
        ? db.select({ checkoutEnabled: commerceSettings.checkoutEnabled }).from(commerceSettings).where(eq(commerceSettings.id, "primary")).limit(1)
        : Promise.resolve([]),
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
  await requireCapability("catalog.manage-commercials");
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
  paymentState: string | null;
  totalAmountMinor: number | null;
  guestEmail: string | null;
  placedAt: Date;
  shipmentStatus: string | null;
  courier: string | null;
  trackingNumber: string | null;
};

export async function listCommerceOrders(): Promise<CommerceOrderRow[]> {
  const session = await requireCapability("commerce.view");
  const canManagePayments = hasOpsCapability(
    session.user.role,
    "commerce.refunds.manage",
  );
  return db
    .select({
      id: commerceOrders.id,
      orderNumber: commerceOrders.orderNumber,
      status: commerceOrders.status,
      paymentState: canManagePayments
        ? sql<string | null>`CASE WHEN ${commerceOrders.paymentState} IN ('cod_due', 'cod_collected') THEN NULL ELSE ${commerceOrders.paymentState}::text END`
        : sql<string | null>`null::text`,
      totalAmountMinor: canManagePayments
        ? commerceOrders.totalAmountMinor
        : sql<number | null>`null::bigint`,
      guestEmail: commerceOrders.guestEmail,
      placedAt: commerceOrders.placedAt,
      shipmentStatus: shipments.status,
      courier: shipments.courier,
      trackingNumber: shipments.trackingNumber,
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
}).superRefine((value, context) => {
  if (value.status === "shipped" && (!value.courier || !value.trackingNumber)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["trackingNumber"], message: "Courier and tracking number are required before marking shipped." });
  }
});

export async function updateShipmentAction(formData: FormData): Promise<ActionResult> {
  const session = await requireCapability("commerce.shipments.update");
  const parsed = shipmentUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    courier: String(formData.get("courier") ?? "").trim() || undefined,
    trackingNumber: String(formData.get("trackingNumber") ?? "").trim() || undefined,
  });
  if (!parsed.success) return actionError("Shipment was not updated.", zodFieldErrors(parsed.error));

  await db.transaction(async (transaction) => {
    const [order] = await transaction.select({
      id: commerceOrders.id,
      status: commerceOrders.status,
      paymentState: commerceOrders.paymentState,
    }).from(commerceOrders).where(eq(commerceOrders.id, parsed.data.orderId)).for("update").limit(1);
    if (!order) throw new Error("Order was not found");
    const [shipment] = await transaction.select({
      id: shipments.id,
      status: shipments.status,
    }).from(shipments).where(eq(shipments.orderId, order.id)).for("update").limit(1);
    const shipmentTransitions = {
      pending: ["pending", "booked", "cancelled"],
      booked: ["booked", "shipped", "cancelled"],
      shipped: ["shipped", "delivered", "rto"],
      delivered: ["delivered", "rto"],
      rto: ["rto"],
      cancelled: ["cancelled", "booked"],
    } as const;
    if (
      shipment &&
      !shipmentTransitions[shipment.status].includes(parsed.data.status as never)
    ) {
      throw new Error("Shipment status cannot move backwards");
    }
    const orderTransitionSources = {
      booked: ["confirmed", "processing"],
      shipped: ["confirmed", "processing", "shipped"],
      delivered: ["shipped", "delivered"],
      rto: ["shipped", "delivered", "returned"],
    } as const;
    if (parsed.data.status in orderTransitionSources) {
      if (order.paymentState !== "paid") {
        throw new Error("Only a paid order can enter fulfillment");
      }
      const allowedSources = orderTransitionSources[
        parsed.data.status as keyof typeof orderTransitionSources
      ];
      if (!allowedSources.includes(order.status as never)) {
        throw new Error("Order status does not permit this shipment transition");
      }
    }
    const now = new Date();
    const values = {
      status: parsed.data.status,
      courier: parsed.data.courier ?? null,
      trackingNumber: parsed.data.trackingNumber ?? null,
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
    const orderTransition = {
      booked: { status: "processing", eventType: "shipment_booked" },
      shipped: { status: "shipped", eventType: "shipped" },
      delivered: { status: "delivered", eventType: "delivered" },
      rto: { status: "returned", eventType: "returned" },
    } as const;
    const transition = parsed.data.status in orderTransition
      ? orderTransition[parsed.data.status as keyof typeof orderTransition]
      : null;
    if (transition && order.status !== transition.status) {
      await transaction.update(commerceOrders).set({ status: transition.status, updatedAt: now }).where(eq(commerceOrders.id, order.id));
      const [orderEvent] = await transaction.insert(commerceOrderEvents).values({
        orderId: order.id,
        eventType: transition.eventType,
        fromStatus: order.status,
        toStatus: transition.status,
        idempotencyKey: `shipment:${order.id}:${parsed.data.status}`,
        actorId: session.user.id,
      }).onConflictDoNothing().returning({ id: commerceOrderEvents.id });
      if (orderEvent && (parsed.data.status === "shipped" || parsed.data.status === "delivered")) {
        await transaction.insert(notificationOutbox).values({
          orderEventId: orderEvent.id,
          kind: parsed.data.status === "shipped" ? "order_shipped" : "order_delivered",
        }).onConflictDoNothing();
      }
    }
    if (parsed.data.status === "delivered") {
      await transaction
        .update(commerceOrderItems)
        .set({ fulfilledQuantity: sql`${commerceOrderItems.quantity}` })
        .where(eq(commerceOrderItems.orderId, order.id));
    }
  });
  revalidatePath("/commerce/orders");
  revalidatePath("/commerce");
  return actionOk();
}

const refundRequestSchema = z.object({
  orderId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  reason: z.string().trim().min(5).max(240),
});

export async function requestRefundAction(formData: FormData): Promise<ActionResult> {
  await requireCapability("commerce.refunds.manage");
  const rupees = Number(String(formData.get("amount") ?? ""));
  const parsed = refundRequestSchema.safeParse({
    orderId: formData.get("orderId"),
    amountMinor: Number.isFinite(rupees) ? Math.round(rupees * 100) : Number.NaN,
    reason: formData.get("reason"),
  });
  if (!parsed.success) return actionError("Refund was not requested.", zodFieldErrors(parsed.error));

  const idempotencyKey = randomUUID();
  const refundReference = `refund-${idempotencyKey}`;
  const prepared = await db.transaction(async (transaction) => {
    const [order] = await transaction.select({ id: commerceOrders.id, totalAmountMinor: commerceOrders.totalAmountMinor })
      .from(commerceOrders).where(eq(commerceOrders.id, parsed.data.orderId)).for("update").limit(1);
    if (!order) throw new Error("Order was not found");
    const [attempt] = await transaction.select({ id: paymentAttempts.id, providerOrderId: paymentAttempts.providerOrderId })
      .from(paymentAttempts).where(sql`${paymentAttempts.orderId} = ${order.id} AND ${paymentAttempts.provider} = 'cashfree' AND ${paymentAttempts.status} = 'succeeded'`)
      .for("update").limit(1);
    if (!attempt?.providerOrderId) throw new Error("A captured Cashfree payment was not found");
    const [totals] = await transaction.select({
      reservedAmountMinor: sql<number>`coalesce(sum(${commerceRefunds.amountMinor}), 0)::int`,
    }).from(commerceRefunds).where(sql`${commerceRefunds.paymentAttemptId} = ${attempt.id} AND ${commerceRefunds.status} NOT IN ('failed', 'cancelled')`);
    if ((totals?.reservedAmountMinor ?? 0) + parsed.data.amountMinor > order.totalAmountMinor) {
      throw new Error("Refund amount exceeds the remaining captured payment");
    }
    const [refund] = await transaction.insert(commerceRefunds).values({
      paymentAttemptId: attempt.id,
      idempotencyKey,
      status: "requested",
      currency: "INR",
      amountMinor: parsed.data.amountMinor,
      reason: parsed.data.reason,
      providerStatus: "REQUESTED",
    }).returning({ id: commerceRefunds.id });
    if (!refund) throw new Error("Refund request could not be persisted");
    return { refundId: refund.id, providerOrderId: attempt.providerOrderId, orderId: order.id };
  });

  try {
    const providerRefund = await requestCashfreeRefund({
      providerOrderId: prepared.providerOrderId,
      refundId: refundReference,
      idempotencyKey,
      amountMinor: parsed.data.amountMinor,
      reason: parsed.data.reason,
    });
    await db.transaction(async (transaction) => {
      await transaction.update(commerceRefunds).set({
        providerRefundId: providerRefund.cf_refund_id,
        providerStatus: providerRefund.refund_status,
        arn: providerRefund.refund_arn ?? null,
        status: "processing",
        lastReconciledAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(commerceRefunds.id, prepared.refundId));
      const [event] = await transaction.insert(commerceOrderEvents).values({
        orderId: prepared.orderId,
        eventType: "refund_processing",
        idempotencyKey: `refund:${prepared.refundId}:processing`,
      }).onConflictDoNothing().returning({ id: commerceOrderEvents.id });
      if (event) {
        await transaction.insert(notificationOutbox).values({
          orderEventId: event.id,
          kind: "refund_processing",
        }).onConflictDoNothing();
      }
    });
  } catch (error) {
    await db.update(commerceRefunds).set({
      status: "processing",
      providerStatus: "REQUEST_UNKNOWN",
      lastReconciledAt: null,
      updatedAt: new Date(),
    })
      .where(eq(commerceRefunds.id, prepared.refundId));
    console.error("[Cashfree refund] provider outcome requires reconciliation", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    revalidatePath("/commerce/orders");
    return actionError("Refund outcome is being verified. Do not submit another refund.");
  }
  revalidatePath("/commerce/orders");
  return actionOk();
}

export async function listCommerceReviews() {
  await requireCapability("commerce.reviews.moderate");
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
  await requireCapability("commerce.support.manage");
  const [inquiries, returns] = await Promise.all([
    db.select().from(commerceInquiries).orderBy(desc(commerceInquiries.createdAt)).limit(100),
    db.select().from(commerceReturns).orderBy(desc(commerceReturns.requestedAt)).limit(100),
  ]);
  return { inquiries, returns };
}

export async function listCommercePromotions() {
  await requireCapability("commerce.promotions.manage");
  return db.select().from(promotions).orderBy(desc(promotions.createdAt)).limit(100);
}

export async function getCommerceSettings() {
  await requireCapability("commerce.release-gates.manage");
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
  const session = await requireCapability("commerce.release-gates.manage");
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
