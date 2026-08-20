import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@perfume-aura/ui/components/card";
import { CatalogPublicationForm, type CatalogPublicationInitial } from "@/components/commerce/catalog-publication-form";
import { CatalogMediaControl, CatalogVariantPriceControl } from "@/components/commerce/catalog-commercial-controls";
import { DbUnavailableState } from "@/components/db-empty-state";
import { getCommerceCatalogProduct } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CatalogProductReviewPage({ params }: Readonly<{ params: Promise<{ productId: string }> }>) {
  await requireCapability("catalog.manage-commercials", { redirectToLogin: true });
  const { productId } = await params;
  const result = await safeDbQuery(() => getCommerceCatalogProduct(productId));
  if (result.error) return <DbUnavailableState message={result.error} />;
  if (!result.data) notFound();
  const { product, variants, media } = result.data;
  const initial: CatalogPublicationInitial = {
    productId: product.productId,
    expectedUpdatedAt: product.updatedAt?.toISOString() ?? "missing",
    publicName: product.publicName ?? "",
    publicSlug: product.publicSlug ?? "",
    scentFamily: product.scentFamily ?? "",
    topNotes: product.topNotes ?? [],
    heartNotes: product.heartNotes ?? [],
    baseNotes: product.baseNotes ?? [],
    intensity: product.intensity ?? "",
    occasion: product.occasion ?? "",
    longevityGuidance: product.longevityGuidance ?? "",
    ingredients: product.ingredients ?? "",
    usageInstructions: product.usageInstructions ?? "",
    shortDescription: product.shortDescription ?? "",
    longDescription: product.longDescription ?? "",
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    status: product.status ?? "draft",
    legalApproved: Boolean(product.legalApprovedAt),
    legalApprovalReference: product.legalApprovalReference ?? "",
    contentApproved: Boolean(product.contentApprovedAt),
    contentApprovalReference: product.contentApprovalReference ?? "",
    mediaApproved: Boolean(product.mediaApprovedAt),
    mediaApprovalReference: product.mediaApprovalReference ?? "",
    featuredRank: product.featuredRank,
  };

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/commerce/catalog" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Back to catalog approval</Link><h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">{product.internalName}</h1><p className="mt-1 text-sm text-muted-foreground">Review public copy and record evidence without changing internal inventory history.</p></div><Badge variant="secondary">{product.status ?? "not started"}</Badge></div>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Variant price approvals</CardTitle></CardHeader><CardContent className="grid gap-3">{variants.length === 0 ? <p className="text-sm text-muted-foreground">No variants exist.</p> : variants.map((variant) => <CatalogVariantPriceControl key={variant.id} value={{ productId: product.productId, variantId: variant.id, sku: variant.sku, sizeMl: variant.sizeMl, amountMinor: variant.amountMinor, active: variant.priceActive ?? false, approvedAt: variant.priceApprovedAt, approvalReference: variant.priceApprovalReference, expectedUpdatedAt: variant.priceUpdatedAt?.toISOString() ?? "missing" }} />)}</CardContent></Card><Card><CardHeader><CardTitle>Media metadata approvals</CardTitle></CardHeader><CardContent className="grid gap-3">{media.length === 0 ? <p className="text-sm text-muted-foreground">No product media exists.</p> : media.map((asset) => <CatalogMediaControl key={asset.id} value={{ productId: product.productId, mediaId: asset.id, kind: asset.kind, storageKey: asset.storageKey, altText: asset.altText, dimensions: `${asset.width}×${asset.height}`, position: asset.position, approvedAt: asset.approvedAt, approvalReference: asset.approvalReference, expectedUpdatedAt: asset.updatedAt.toISOString() }} />)}</CardContent></Card></div>
    <CatalogPublicationForm initial={initial} />
  </div>;
}
