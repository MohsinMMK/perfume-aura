"use server";

import { randomUUID } from "node:crypto";

import {
  commerceInquiries,
  inquiryNotificationOutbox,
  commerceOrders,
  commerceOrderEvents,
  commerceOrderItems,
  commerceRefunds,
  commerceReturns,
  commerceSettings,
  and,
  count,
  db,
  desc,
  eq,
  notificationOutbox,
  opsAuditEvents,
  paymentAttempts,
  productPublications,
  productMedia,
  productVariants,
  products,
  promotions,
  reviews,
  shippingServiceability,
  shipments,
  sql,
  variantPrices,
} from "@perfume-aura/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionOk, type ActionResult, zodFieldErrors } from "@/lib/action-result";
import {
  changedApprovedRecordRequiresReset,
  reviewedPublicationContentChanged,
  type ReviewedPublicationContent,
} from "@/lib/catalog-approval-policy";
import { requestCashfreeRefund } from "@/lib/cashfree-refunds";
import { hasOpsCapability } from "@/lib/ops-access";
import { safeAuditMetadata } from "@/lib/ops-audit";
import { requireCapability } from "@/lib/session";

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
      legalApprovalReference: productPublications.legalApprovalReference,
      contentApprovedAt: productPublications.contentApprovedAt,
      contentApprovalReference: productPublications.contentApprovalReference,
      mediaApprovedAt: productPublications.mediaApprovedAt,
      mediaApprovalReference: productPublications.mediaApprovalReference,
      pricedVariantCount: sql<number>`(
        select count(*)::int from product_variants pv
        inner join variant_prices vp on vp.variant_id = pv.id
        where pv.product_id = ${products.id}
          and pv.status = 'active'
          and vp.active = true
          and vp.approved_at is not null
          and vp.approval_reference is not null
          and vp.amount_minor > 0
          and pv.cost_cents > 0
          and pv.quantity_on_hand - pv.qty_reserved > 0
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

export async function getCommerceCatalogProduct(productId: string) {
  await requireCapability("catalog.manage-commercials");
  const [product] = await db
    .select({
      productId: products.id,
      internalName: products.name,
      productStatus: products.status,
      publicName: productPublications.publicName,
      publicSlug: productPublications.publicSlug,
      scentFamily: productPublications.scentFamily,
      topNotes: productPublications.topNotes,
      heartNotes: productPublications.heartNotes,
      baseNotes: productPublications.baseNotes,
      intensity: productPublications.intensity,
      occasion: productPublications.occasion,
      longevityGuidance: productPublications.longevityGuidance,
      ingredients: productPublications.ingredients,
      usageInstructions: productPublications.usageInstructions,
      shortDescription: productPublications.shortDescription,
      longDescription: productPublications.longDescription,
      seoTitle: productPublications.seoTitle,
      seoDescription: productPublications.seoDescription,
      status: productPublications.status,
      legalApprovedAt: productPublications.legalApprovedAt,
      legalApprovalReference: productPublications.legalApprovalReference,
      contentApprovedAt: productPublications.contentApprovedAt,
      contentApprovalReference: productPublications.contentApprovalReference,
      mediaApprovedAt: productPublications.mediaApprovedAt,
      mediaApprovalReference: productPublications.mediaApprovalReference,
      featuredRank: productPublications.featuredRank,
      updatedAt: productPublications.updatedAt,
    })
    .from(products)
    .leftJoin(productPublications, eq(productPublications.productId, products.id))
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return null;
  const [variants, media] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        sizeMl: productVariants.sizeMl,
        status: productVariants.status,
        quantityOnHand: productVariants.quantityOnHand,
        qtyReserved: productVariants.qtyReserved,
        amountMinor: variantPrices.amountMinor,
        priceActive: variantPrices.active,
        priceApprovedAt: variantPrices.approvedAt,
        priceApprovalReference: variantPrices.approvalReference,
        priceUpdatedAt: variantPrices.updatedAt,
      })
      .from(productVariants)
      .leftJoin(variantPrices, eq(variantPrices.variantId, productVariants.id))
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.sizeMl),
    db
      .select({
        id: productMedia.id,
        kind: productMedia.kind,
        storageKey: productMedia.storageKey,
        altText: productMedia.altText,
        width: productMedia.width,
        height: productMedia.height,
        position: productMedia.position,
        approvedAt: productMedia.approvedAt,
        approvalReference: productMedia.approvalReference,
        updatedAt: productMedia.updatedAt,
      })
      .from(productMedia)
      .where(eq(productMedia.productId, productId)),
  ]);
  return { product, variants, media };
}

const catalogVariantPriceSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  expectedUpdatedAt: z.union([z.literal("missing"), z.string().datetime({ offset: true })]),
  amountMinor: z.number().int().positive(),
  active: z.boolean(),
  approved: z.boolean(),
  approvalReference: z.string().trim().max(240).optional(),
}).superRefine((value, context) => {
  if (value.approved && (!value.approvalReference || value.approvalReference.length < 3)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["approvalReference"], message: "An approved price evidence reference is required." });
  }
});

export async function updateCatalogVariantPriceAction(formData: FormData): Promise<ActionResult> {
  const session = await requireCapability("catalog.manage-commercials");
  const amountRupees = Number(String(formData.get("amount") ?? ""));
  const parsed = catalogVariantPriceSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    amountMinor: Number.isFinite(amountRupees) ? Math.round(amountRupees * 100) : Number.NaN,
    active: formData.get("active") === "on",
    approved: formData.get("approved") === "on",
    approvalReference: formData.get("approvalReference"),
  });
  if (!parsed.success) return actionError("Variant price was not saved.", zodFieldErrors(parsed.error));

  const saved = await db.transaction(async (transaction) => {
    const [variant] = await transaction.select({ id: productVariants.id, productId: productVariants.productId })
      .from(productVariants).where(eq(productVariants.id, parsed.data.variantId)).for("update").limit(1);
    if (!variant || variant.productId !== parsed.data.productId) throw new Error("Variant was not found for this product");
    const [current] = await transaction.select({
      amountMinor: variantPrices.amountMinor,
      active: variantPrices.active,
      approvedAt: variantPrices.approvedAt,
      updatedAt: variantPrices.updatedAt,
    }).from(variantPrices).where(eq(variantPrices.variantId, variant.id)).for("update").limit(1);
    if ((current && parsed.data.expectedUpdatedAt !== current.updatedAt.toISOString()) || (!current && parsed.data.expectedUpdatedAt !== "missing")) {
      throw new Error("This price changed after the page loaded. Reload and try again.");
    }
    const priceChanged = Boolean(current && (
      current.amountMinor !== parsed.data.amountMinor ||
      current.active !== parsed.data.active
    ));
    if (changedApprovedRecordRequiresReset({
      changed: priceChanged,
      existingApprovedAt: current?.approvedAt,
      requestedApproved: parsed.data.approved,
    })) return false;
    const now = new Date();
    const values = {
      currency: "INR",
      amountMinor: parsed.data.amountMinor,
      active: parsed.data.active,
      approvedAt: parsed.data.approved ? current?.approvedAt ?? now : null,
      approvalReference: parsed.data.approved ? parsed.data.approvalReference : null,
      updatedAt: now,
    } as const;
    await transaction.insert(variantPrices).values({ variantId: variant.id, ...values })
      .onConflictDoUpdate({ target: variantPrices.variantId, set: values });
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(), actorUserId: session.user.id,
      action: "commerce.catalog.variant_price_updated", targetType: "variant_price", targetId: variant.id,
      metadata: safeAuditMetadata({ from_amount_minor: current?.amountMinor ?? null, to_amount_minor: parsed.data.amountMinor, from_active: current?.active ?? false, to_active: parsed.data.active, approved: parsed.data.approved }),
    });
    return true;
  });
  if (!saved) {
    return actionError("Changed prices must first be saved unapproved, then reviewed and approved in a separate action.");
  }
  revalidatePath("/commerce/catalog");
  revalidatePath(`/commerce/catalog/${parsed.data.productId}`);
  return actionOk();
}

const catalogMediaSchema = z.object({
  productId: z.string().uuid(),
  mediaId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  altText: z.string().trim().min(5).max(500),
  position: z.number().int().nonnegative(),
  approved: z.boolean(),
  approvalReference: z.string().trim().max(240).optional(),
}).superRefine((value, context) => {
  if (value.approved && (!value.approvalReference || value.approvalReference.length < 3)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["approvalReference"], message: "An approved media evidence reference is required." });
  }
});

export async function updateCatalogMediaAction(formData: FormData): Promise<ActionResult> {
  const session = await requireCapability("catalog.manage-commercials");
  const parsed = catalogMediaSchema.safeParse({
    productId: formData.get("productId"), mediaId: formData.get("mediaId"), expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    altText: formData.get("altText"), position: Number(formData.get("position")),
    approved: formData.get("approved") === "on", approvalReference: formData.get("approvalReference"),
  });
  if (!parsed.success) return actionError("Media metadata was not saved.", zodFieldErrors(parsed.error));
  const saved = await db.transaction(async (transaction) => {
    const [current] = await transaction.select({
      id: productMedia.id, productId: productMedia.productId, altText: productMedia.altText,
      position: productMedia.position, approvedAt: productMedia.approvedAt,
      updatedAt: productMedia.updatedAt,
    }).from(productMedia).where(eq(productMedia.id, parsed.data.mediaId)).for("update").limit(1);
    if (!current || current.productId !== parsed.data.productId) throw new Error("Media was not found for this product");
    if (current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) throw new Error("This media record changed after the page loaded. Reload and try again.");
    const metadataChanged = current.altText !== parsed.data.altText ||
      current.position !== parsed.data.position;
    if (changedApprovedRecordRequiresReset({
      changed: metadataChanged,
      existingApprovedAt: current.approvedAt,
      requestedApproved: parsed.data.approved,
    })) return false;
    const now = new Date();
    await transaction.update(productMedia).set({
      altText: parsed.data.altText, position: parsed.data.position,
      approvedAt: parsed.data.approved ? current.approvedAt ?? now : null,
      approvalReference: parsed.data.approved ? parsed.data.approvalReference : null,
      updatedAt: now,
    }).where(eq(productMedia.id, current.id));
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(), actorUserId: session.user.id,
      action: "commerce.catalog.media_metadata_updated", targetType: "product_media", targetId: current.id,
      metadata: safeAuditMetadata({ from_position: current.position, to_position: parsed.data.position, alt_text_changed: current.altText !== parsed.data.altText, approved: parsed.data.approved }),
    });
    return true;
  });
  if (!saved) {
    return actionError("Changed media metadata must first be saved unapproved, then reviewed and approved in a separate action.");
  }
  revalidatePath(`/commerce/catalog/${parsed.data.productId}`);
  return actionOk();
}

const catalogPublicationSchema = z.object({
  productId: z.string().uuid(),
  expectedUpdatedAt: z.union([z.literal("missing"), z.string().datetime({ offset: true })]),
  publicName: z.string().trim().min(2).max(200),
  publicSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(220),
  scentFamily: z.string().trim().max(120).optional(),
  topNotes: z.string().trim().max(500).optional(),
  heartNotes: z.string().trim().max(500).optional(),
  baseNotes: z.string().trim().max(500).optional(),
  intensity: z.string().trim().max(120).optional(),
  occasion: z.string().trim().max(240).optional(),
  longevityGuidance: z.string().trim().max(500).optional(),
  ingredients: z.string().trim().max(2_000).optional(),
  usageInstructions: z.string().trim().max(2_000).optional(),
  shortDescription: z.string().trim().min(10).max(500),
  longDescription: z.string().trim().min(20).max(5_000),
  seoTitle: z.string().trim().min(5).max(70),
  seoDescription: z.string().trim().min(20).max(170),
  status: z.enum(["draft", "blocked", "approved", "published", "withdrawn"]),
  featuredRank: z.number().int().nonnegative().nullable(),
  legalApproved: z.boolean(),
  legalApprovalReference: z.string().trim().max(240).optional(),
  contentApproved: z.boolean(),
  contentApprovalReference: z.string().trim().max(240).optional(),
  mediaApproved: z.boolean(),
  mediaApprovalReference: z.string().trim().max(240).optional(),
}).superRefine((value, context) => {
  for (const [approved, reference, path] of [
    [value.legalApproved, value.legalApprovalReference, "legalApprovalReference"],
    [value.contentApproved, value.contentApprovalReference, "contentApprovalReference"],
    [value.mediaApproved, value.mediaApprovalReference, "mediaApprovalReference"],
  ] as const) {
    if (approved && (!reference || reference.length < 3)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message: "Record the approved evidence reference.",
      });
    }
  }
});

function optionalText(value: string | undefined): string | null {
  return value?.trim() || null;
}

function noteList(value: string | undefined): string[] | null {
  const notes = value?.split(",").map((note) => note.trim()).filter(Boolean) ?? [];
  return notes.length > 0 ? [...new Set(notes)] : null;
}

export async function updateCatalogPublicationAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCapability("catalog.manage-commercials");
  const featuredRankRaw = String(formData.get("featuredRank") ?? "").trim();
  const parsed = catalogPublicationSchema.safeParse({
    productId: formData.get("productId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    publicName: formData.get("publicName"),
    publicSlug: formData.get("publicSlug"),
    scentFamily: formData.get("scentFamily"),
    topNotes: formData.get("topNotes"),
    heartNotes: formData.get("heartNotes"),
    baseNotes: formData.get("baseNotes"),
    intensity: formData.get("intensity"),
    occasion: formData.get("occasion"),
    longevityGuidance: formData.get("longevityGuidance"),
    ingredients: formData.get("ingredients"),
    usageInstructions: formData.get("usageInstructions"),
    shortDescription: formData.get("shortDescription"),
    longDescription: formData.get("longDescription"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    status: formData.get("status"),
    featuredRank: featuredRankRaw === "" ? null : Number(featuredRankRaw),
    legalApproved: formData.get("legalApproved") === "on",
    legalApprovalReference: formData.get("legalApprovalReference"),
    contentApproved: formData.get("contentApproved") === "on",
    contentApprovalReference: formData.get("contentApprovalReference"),
    mediaApproved: formData.get("mediaApproved") === "on",
    mediaApprovalReference: formData.get("mediaApprovalReference"),
  });
  if (!parsed.success) {
    return actionError("Catalog review was not saved.", zodFieldErrors(parsed.error));
  }

  const saved = await db.transaction(async (transaction) => {
    const [product] = await transaction
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.id, parsed.data.productId))
      .for("update")
      .limit(1);
    if (!product) throw new Error("Product was not found");
    const [current] = await transaction
      .select({
        status: productPublications.status,
        publicName: productPublications.publicName,
        publicSlug: productPublications.publicSlug,
        scentFamily: productPublications.scentFamily,
        topNotes: productPublications.topNotes,
        heartNotes: productPublications.heartNotes,
        baseNotes: productPublications.baseNotes,
        intensity: productPublications.intensity,
        occasion: productPublications.occasion,
        longevityGuidance: productPublications.longevityGuidance,
        ingredients: productPublications.ingredients,
        usageInstructions: productPublications.usageInstructions,
        shortDescription: productPublications.shortDescription,
        longDescription: productPublications.longDescription,
        seoTitle: productPublications.seoTitle,
        seoDescription: productPublications.seoDescription,
        updatedAt: productPublications.updatedAt,
        legalApprovedAt: productPublications.legalApprovedAt,
        contentApprovedAt: productPublications.contentApprovedAt,
        mediaApprovedAt: productPublications.mediaApprovedAt,
        publishedAt: productPublications.publishedAt,
      })
      .from(productPublications)
      .where(eq(productPublications.productId, product.id))
      .for("update")
      .limit(1);
    if (
      (current && parsed.data.expectedUpdatedAt !== current.updatedAt.toISOString()) ||
      (!current && parsed.data.expectedUpdatedAt !== "missing")
    ) {
      throw new Error("This catalog review changed after the page loaded. Reload and try again.");
    }

    const reviewedContent: ReviewedPublicationContent = {
      baseNotes: noteList(parsed.data.baseNotes),
      heartNotes: noteList(parsed.data.heartNotes),
      topNotes: noteList(parsed.data.topNotes),
      contentFields: {
        publicName: parsed.data.publicName,
        publicSlug: parsed.data.publicSlug,
        scentFamily: optionalText(parsed.data.scentFamily),
        intensity: optionalText(parsed.data.intensity),
        occasion: optionalText(parsed.data.occasion),
        longevityGuidance: optionalText(parsed.data.longevityGuidance),
        ingredients: optionalText(parsed.data.ingredients),
        usageInstructions: optionalText(parsed.data.usageInstructions),
        shortDescription: parsed.data.shortDescription,
        longDescription: parsed.data.longDescription,
        seoTitle: parsed.data.seoTitle,
        seoDescription: parsed.data.seoDescription,
      },
    };
    const contentChanged = Boolean(current && reviewedPublicationContentChanged({
      baseNotes: current.baseNotes,
      heartNotes: current.heartNotes,
      topNotes: current.topNotes,
      contentFields: {
        publicName: current.publicName,
        publicSlug: current.publicSlug,
        scentFamily: current.scentFamily,
        intensity: current.intensity,
        occasion: current.occasion,
        longevityGuidance: current.longevityGuidance,
        ingredients: current.ingredients,
        usageInstructions: current.usageInstructions,
        shortDescription: current.shortDescription,
        longDescription: current.longDescription,
        seoTitle: current.seoTitle,
        seoDescription: current.seoDescription,
      },
    }, reviewedContent));
    if (contentChanged && (parsed.data.legalApproved || parsed.data.contentApproved)) {
      return { approvalResetRequired: true as const };
    }

    if (parsed.data.status === "approved" || parsed.data.status === "published") {
      if (!parsed.data.legalApproved || !parsed.data.contentApproved || !parsed.data.mediaApproved) {
        throw new Error("Legal, content, and media approvals are required before approval or publication");
      }
      const [readiness] = await transaction
        .select({
          activeVariants: sql<number>`count(*) filter (where ${productVariants.status} = 'active')::int`,
          pricedVariants: sql<number>`count(*) filter (where ${productVariants.status} = 'active' and ${variantPrices.active} = true and ${variantPrices.approvedAt} is not null and ${variantPrices.approvalReference} is not null and ${variantPrices.amountMinor} > 0 and ${productVariants.costCents} > 0 and ${productVariants.quantityOnHand} - ${productVariants.qtyReserved} > 0)::int`,
        })
        .from(productVariants)
        .leftJoin(variantPrices, eq(variantPrices.variantId, productVariants.id))
        .where(eq(productVariants.productId, product.id));
      const [mediaCount] = await transaction
        .select({
          total: sql<number>`count(*)::int`,
          approved: sql<number>`count(*) filter (where ${productMedia.approvedAt} is not null and ${productMedia.approvalReference} is not null and btrim(${productMedia.altText}) <> '')::int`,
        })
        .from(productMedia)
        .where(eq(productMedia.productId, product.id));
      if (
        product.status !== "active" ||
        !readiness ||
        readiness.activeVariants < 1 ||
        readiness.pricedVariants !== readiness.activeVariants ||
        Number(mediaCount?.total ?? 0) < 1 ||
        Number(mediaCount?.approved ?? 0) !== Number(mediaCount?.total ?? 0)
      ) {
        throw new Error("Active variants, approved prices, and approved media must be complete before approval or publication");
      }
    }

    const now = new Date();
    const values = {
      publicName: parsed.data.publicName,
      publicSlug: parsed.data.publicSlug,
      scentFamily: reviewedContent.contentFields.scentFamily,
      topNotes: reviewedContent.topNotes ? [...reviewedContent.topNotes] : null,
      heartNotes: reviewedContent.heartNotes ? [...reviewedContent.heartNotes] : null,
      baseNotes: reviewedContent.baseNotes ? [...reviewedContent.baseNotes] : null,
      intensity: reviewedContent.contentFields.intensity,
      occasion: reviewedContent.contentFields.occasion,
      longevityGuidance: reviewedContent.contentFields.longevityGuidance,
      ingredients: reviewedContent.contentFields.ingredients,
      usageInstructions: reviewedContent.contentFields.usageInstructions,
      shortDescription: parsed.data.shortDescription,
      longDescription: parsed.data.longDescription,
      seoTitle: parsed.data.seoTitle,
      seoDescription: parsed.data.seoDescription,
      status: parsed.data.status,
      legalApprovedAt: parsed.data.legalApproved ? current?.legalApprovedAt ?? now : null,
      legalApprovalReference: parsed.data.legalApproved ? parsed.data.legalApprovalReference : null,
      contentApprovedAt: parsed.data.contentApproved ? current?.contentApprovedAt ?? now : null,
      contentApprovalReference: parsed.data.contentApproved ? parsed.data.contentApprovalReference : null,
      mediaApprovedAt: parsed.data.mediaApproved ? current?.mediaApprovedAt ?? now : null,
      mediaApprovalReference: parsed.data.mediaApproved ? parsed.data.mediaApprovalReference : null,
      publishedAt:
        parsed.data.status === "published"
          ? contentChanged ? now : current?.publishedAt ?? now
          : null,
      featuredRank: parsed.data.featuredRank,
      updatedAt: now,
    } as const;
    await transaction
      .insert(productPublications)
      .values({ productId: product.id, ...values })
      .onConflictDoUpdate({ target: productPublications.productId, set: values });
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(),
      actorUserId: session.user.id,
      action: "commerce.catalog.publication_updated",
      targetType: "product_publication",
      targetId: product.id,
      metadata: safeAuditMetadata({
        from_status: current?.status ?? "not_started",
        to_status: parsed.data.status,
        legal_approved: parsed.data.legalApproved,
        content_approved: parsed.data.contentApproved,
        media_approved: parsed.data.mediaApproved,
      }),
    });
    return { approvalResetRequired: false as const };
  });

  if (saved.approvalResetRequired) {
    return actionError("Changed public content must first be saved as draft with legal and content approvals cleared, then reviewed and approved in a separate action.");
  }

  revalidatePath("/commerce/catalog");
  revalidatePath(`/commerce/catalog/${parsed.data.productId}`);
  revalidatePath(`/products/${parsed.data.productId}`);
  return actionOk();
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
    db.select({
      id: commerceInquiries.id,
      kind: commerceInquiries.kind,
      status: commerceInquiries.status,
      name: commerceInquiries.name,
      email: commerceInquiries.email,
      businessName: commerceInquiries.businessName,
      message: commerceInquiries.message,
      consentVersion: commerceInquiries.consentVersion,
      assignedTo: commerceInquiries.assignedTo,
      createdAt: commerceInquiries.createdAt,
      updatedAt: commerceInquiries.updatedAt,
      notificationStatus: inquiryNotificationOutbox.status,
      notificationAttemptCount: inquiryNotificationOutbox.attemptCount,
    }).from(commerceInquiries)
      .leftJoin(inquiryNotificationOutbox, eq(inquiryNotificationOutbox.inquiryId, commerceInquiries.id))
      .orderBy(desc(commerceInquiries.createdAt)).limit(100),
    db.select().from(commerceReturns).orderBy(desc(commerceReturns.requestedAt)).limit(100),
  ]);
  return { inquiries, returns };
}

const inquiryStatusSchema = z.object({
  inquiryId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  status: z.enum(["new", "in_progress", "resolved", "archived"]),
});

const inquiryStatusTransitions = {
  new: ["new", "in_progress", "resolved", "archived"],
  in_progress: ["new", "in_progress", "resolved", "archived"],
  resolved: ["in_progress", "resolved", "archived"],
  archived: ["archived"],
} as const;

export async function updateInquiryStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCapability("commerce.support.manage");
  const parsed = inquiryStatusSchema.safeParse({
    inquiryId: formData.get("inquiryId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return actionError("Inquiry status was not updated.", zodFieldErrors(parsed.error));
  }

  await db.transaction(async (transaction) => {
    const [inquiry] = await transaction
      .select({
        id: commerceInquiries.id,
        kind: commerceInquiries.kind,
        status: commerceInquiries.status,
        assignedTo: commerceInquiries.assignedTo,
        updatedAt: commerceInquiries.updatedAt,
      })
      .from(commerceInquiries)
      .where(eq(commerceInquiries.id, parsed.data.inquiryId))
      .for("update")
      .limit(1);
    if (!inquiry) throw new Error("Inquiry was not found");
    if (inquiry.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
      throw new Error("This inquiry changed after the page loaded. Reload and try again.");
    }
    if (!inquiryStatusTransitions[inquiry.status].includes(parsed.data.status as never)) {
      throw new Error("Inquiry status cannot move from its current state");
    }

    const updatedAt = new Date();
    const assignedTo = parsed.data.status === "new"
      ? null
      : inquiry.assignedTo ?? session.user.id;
    await transaction
      .update(commerceInquiries)
      .set({ status: parsed.data.status, assignedTo, updatedAt })
      .where(eq(commerceInquiries.id, inquiry.id));
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(),
      actorUserId: session.user.id,
      action: "commerce.inquiry.status_updated",
      targetType: "commerce_inquiry",
      targetId: inquiry.id,
      metadata: safeAuditMetadata({
        inquiry_kind: inquiry.kind,
        from_status: inquiry.status,
        to_status: parsed.data.status,
      }),
    });
  });

  revalidatePath("/commerce");
  revalidatePath("/commerce/support");
  return actionOk();
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

export async function listShippingServiceability() {
  await requireCapability("commerce.release-gates.manage");
  return db.select().from(shippingServiceability).orderBy(shippingServiceability.postalCode);
}

const shippingServiceabilitySchema = z.object({
  postalCode: z.string().regex(/^[1-9][0-9]{5}$/),
  expectedUpdatedAt: z.union([z.literal("missing"), z.string().datetime({ offset: true })]),
  delhiveryEnabled: z.boolean(),
  indiaPostEnabled: z.boolean(),
  deliveryMinBusinessDays: z.literal(3),
  deliveryMaxBusinessDays: z.literal(7),
  active: z.boolean(),
}).superRefine((value, context) => {
  if (value.active && !value.delhiveryEnabled && !value.indiaPostEnabled) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["active"], message: "Select at least one approved courier for an active PIN code." });
  }
});

export async function updateShippingServiceabilityAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCapability("commerce.release-gates.manage");
  const parsed = shippingServiceabilitySchema.safeParse({
    postalCode: formData.get("postalCode"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt") ?? "missing",
    delhiveryEnabled: formData.get("delhiveryEnabled") === "on",
    indiaPostEnabled: formData.get("indiaPostEnabled") === "on",
    deliveryMinBusinessDays: Number(formData.get("deliveryMinBusinessDays")),
    deliveryMaxBusinessDays: Number(formData.get("deliveryMaxBusinessDays")),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return actionError("Delivery serviceability was not saved.", zodFieldErrors(parsed.error));
  }
  await db.transaction(async (transaction) => {
    const [current] = await transaction.select({
      updatedAt: shippingServiceability.updatedAt,
      active: shippingServiceability.active,
    }).from(shippingServiceability)
      .where(eq(shippingServiceability.postalCode, parsed.data.postalCode))
      .for("update").limit(1);
    if (
      (current && parsed.data.expectedUpdatedAt !== current.updatedAt.toISOString()) ||
      (!current && parsed.data.expectedUpdatedAt !== "missing")
    ) {
      throw new Error("This PIN-code record changed after the page loaded. Reload and try again.");
    }
    const now = new Date();
    await transaction.insert(shippingServiceability).values({
      postalCode: parsed.data.postalCode,
      delhiveryEnabled: parsed.data.delhiveryEnabled,
      indiaPostEnabled: parsed.data.indiaPostEnabled,
      deliveryMinBusinessDays: parsed.data.deliveryMinBusinessDays,
      deliveryMaxBusinessDays: parsed.data.deliveryMaxBusinessDays,
      active: parsed.data.active,
      updatedBy: session.user.id,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: shippingServiceability.postalCode,
      set: {
        delhiveryEnabled: parsed.data.delhiveryEnabled,
        indiaPostEnabled: parsed.data.indiaPostEnabled,
        deliveryMinBusinessDays: parsed.data.deliveryMinBusinessDays,
        deliveryMaxBusinessDays: parsed.data.deliveryMaxBusinessDays,
        active: parsed.data.active,
        updatedBy: session.user.id,
        updatedAt: now,
      },
    });
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(),
      actorUserId: session.user.id,
      action: "commerce.shipping.serviceability_updated",
      targetType: "shipping_postal_code",
      targetId: parsed.data.postalCode,
      metadata: safeAuditMetadata({
        from_active: current?.active ?? false,
        to_active: parsed.data.active,
        delhivery_enabled: parsed.data.delhiveryEnabled,
        india_post_enabled: parsed.data.indiaPostEnabled,
        min_business_days: parsed.data.deliveryMinBusinessDays,
        max_business_days: parsed.data.deliveryMaxBusinessDays,
      }),
    });
  });
  revalidatePath("/commerce/settings");
  return actionOk();
}

const settingsSchema = z
  .object({
    flatShippingAmountMinor: z.number().int().nonnegative(),
    freeShippingThresholdMinor: z.number().int().nonnegative().nullable(),
    taxTreatment: z.enum([
      "prices_include_approved_tax",
      "no_tax_collected_owner_approved",
    ]),
    taxPolicyApproved: z.boolean(),
    taxApprovalReference: z.string().trim().max(240),
    catalogLegalApproved: z.boolean(),
    legalApprovalReference: z.string().trim().max(240),
    supportChannel: z.string().trim().min(3).max(500),
    supportOperationsApproved: z.boolean(),
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
        !value.cancellationPolicyApproved ||
        !value.taxPolicyApproved ||
        !value.catalogLegalApproved ||
        !value.supportOperationsApproved ||
        value.taxApprovalReference.length < 3 ||
        value.legalApprovalReference.length < 3 ||
        value.flatShippingAmountMinor !== 9_900 ||
        value.freeShippingThresholdMinor !== 99_900 ||
        value.taxTreatment !== "prices_include_approved_tax" ||
        value.supportChannel.toLowerCase() !== "support@perfumeaura.com")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkoutEnabled"],
        message: "Checkout requires every approval plus the locked INR 99/999 shipping, GST-inclusive pricing, and support@perfumeaura.com policy.",
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
    taxPolicyApproved: formData.get("taxPolicyApproved") === "on",
    taxApprovalReference: formData.get("taxApprovalReference"),
    catalogLegalApproved: formData.get("catalogLegalApproved") === "on",
    legalApprovalReference: formData.get("legalApprovalReference"),
    supportChannel: formData.get("supportChannel"),
    supportOperationsApproved: formData.get("supportOperationsApproved") === "on",
    shippingPolicyApproved: formData.get("shippingPolicyApproved") === "on",
    returnsPolicyApproved: formData.get("returnsPolicyApproved") === "on",
    cancellationPolicyApproved: formData.get("cancellationPolicyApproved") === "on",
    checkoutEnabled: formData.get("checkoutEnabled") === "on",
  });

  if (!parsed.success) {
    return actionError("Commerce settings were not saved.", zodFieldErrors(parsed.error));
  }

  const saved = await db.transaction(async (transaction) => {
    const [current] = await transaction
      .select({ checkoutEnabled: commerceSettings.checkoutEnabled })
      .from(commerceSettings)
      .where(eq(commerceSettings.id, "primary"))
      .for("update")
      .limit(1);
    if (parsed.data.checkoutEnabled) {
      const [catalogReadiness] = await transaction.select({
        total: sql<number>`count(distinct ${products.id})::int`,
      }).from(products)
        .innerJoin(productPublications, eq(productPublications.productId, products.id))
        .innerJoin(productVariants, and(
          eq(productVariants.productId, products.id),
          eq(productVariants.status, "active"),
          sql`${productVariants.costCents} > 0`,
          sql`${productVariants.quantityOnHand} - ${productVariants.qtyReserved} > 0`,
        ))
        .innerJoin(variantPrices, and(
          eq(variantPrices.variantId, productVariants.id),
          eq(variantPrices.active, true),
          sql`${variantPrices.approvedAt} IS NOT NULL`,
          sql`${variantPrices.approvalReference} IS NOT NULL`,
          sql`${variantPrices.amountMinor} > 0`,
        ))
        .innerJoin(productMedia, and(
          eq(productMedia.productId, products.id),
          eq(productMedia.kind, "pack"),
          eq(productMedia.position, 0),
          sql`${productMedia.approvedAt} IS NOT NULL`,
          sql`${productMedia.approvalReference} IS NOT NULL`,
        ))
        .where(and(
          eq(products.status, "active"),
          eq(productPublications.status, "published"),
          sql`${productPublications.legalApprovedAt} IS NOT NULL`,
          sql`${productPublications.legalApprovalReference} IS NOT NULL`,
          sql`${productPublications.contentApprovedAt} IS NOT NULL`,
          sql`${productPublications.contentApprovalReference} IS NOT NULL`,
          sql`${productPublications.mediaApprovedAt} IS NOT NULL`,
          sql`${productPublications.mediaApprovalReference} IS NOT NULL`,
        ));
      const [deliveryReadiness] = await transaction.select({ total: count(shippingServiceability.postalCode) })
        .from(shippingServiceability)
        .where(and(
          eq(shippingServiceability.active, true),
          sql`${shippingServiceability.delhiveryEnabled} OR ${shippingServiceability.indiaPostEnabled}`,
        ));
      if (Number(catalogReadiness?.total ?? 0) < 1 || Number(deliveryReadiness?.total ?? 0) < 1) {
        throw new Error("Checkout requires a published, stocked, fully approved product and an approved delivery PIN code");
      }
    }
    const [updated] = await transaction
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
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(),
      actorUserId: session.user.id,
      action: "commerce.settings.updated",
      targetType: "commerce_settings",
      targetId: "primary",
      metadata: safeAuditMetadata({
        from_checkout_enabled: current?.checkoutEnabled ?? false,
        to_checkout_enabled: parsed.data.checkoutEnabled,
        tax_policy_approved: parsed.data.taxPolicyApproved,
        catalog_legal_approved: parsed.data.catalogLegalApproved,
        support_operations_approved: parsed.data.supportOperationsApproved,
        shipping_policy_approved: parsed.data.shippingPolicyApproved,
        returns_policy_approved: parsed.data.returnsPolicyApproved,
        cancellation_policy_approved: parsed.data.cancellationPolicyApproved,
      }),
    });
    return updated;
  });

  revalidatePath("/commerce");
  revalidatePath("/commerce/settings");
  return actionOk({ checkoutEnabled: saved?.checkoutEnabled ?? false });
}
