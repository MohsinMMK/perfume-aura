import { notFound } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { CatalogPublicationForm, type CatalogPublicationInitial } from "@/components/commerce/catalog-publication-form";
import { CatalogMediaControl, CatalogVariantPriceControl } from "@/components/commerce/catalog-commercial-controls";
import { DbUnavailableState } from "@/components/db-empty-state";
import { getCommerceCatalogProduct } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

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
    audience: product.audience ?? "",
    season: product.season ?? "",
    concentration: product.concentration ?? "",
    topNotes: product.topNotes ?? [],
    heartNotes: product.heartNotes ?? [],
    baseNotes: product.baseNotes ?? [],
    intensity: product.intensity ?? "",
    occasion: product.occasion ?? "",
    longevityGuidance: product.longevityGuidance ?? "",
    sillage: product.sillage ?? "",
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

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <HStack justify="between" align="start" gap={4} wrap="wrap">
        <VStack gap={2}>
          <PageBreadcrumbs
            items={[
              { label: "Store catalog", href: "/commerce/catalog" },
              { label: product.internalName },
            ]}
          />
          <VStack gap={1}>
            <Heading level={1}>{product.internalName}</Heading>
            <Text as="p" color="secondary">Review public copy and record evidence without changing internal inventory history.</Text>
          </VStack>
        </VStack>
        <Token size="sm" label={product.status ?? "not started"} color={publicationColor(product.status)} />
      </HStack>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <VStack gap={3}>
            <Heading level={2}>Variant price approvals</Heading>
            {variants.length === 0 ? <Text as="p" color="secondary">No variants exist.</Text> : variants.map((variant) => <CatalogVariantPriceControl key={variant.id} value={{ productId: product.productId, variantId: variant.id, sku: variant.sku, sizeMl: variant.sizeMl, amountMinor: variant.amountMinor, active: variant.priceActive ?? false, approvedAt: variant.priceApprovedAt, approvalReference: variant.priceApprovalReference, expectedUpdatedAt: variant.priceUpdatedAt?.toISOString() ?? "missing" }} />)}
          </VStack>
        </Card>
        <Card>
          <VStack gap={3}>
            <Heading level={2}>Media metadata approvals</Heading>
            {media.length === 0 ? <Text as="p" color="secondary">No product media exists.</Text> : media.map((asset) => <CatalogMediaControl key={asset.id} value={{ productId: product.productId, mediaId: asset.id, kind: asset.kind, storageKey: asset.storageKey, altText: asset.altText, dimensions: `${asset.width}×${asset.height}`, position: asset.position, approvedAt: asset.approvedAt, approvalReference: asset.approvalReference, expectedUpdatedAt: asset.updatedAt.toISOString() }} />)}
          </VStack>
        </Card>
      </div>
      <CatalogPublicationForm initial={initial} />
    </VStack>
  );
}

function publicationColor(status: string | null) {
  if (status === "published") return "green" as const;
  if (status === "approved") return "blue" as const;
  if (status === "blocked") return "red" as const;
  if (status === "withdrawn") return "orange" as const;
  return "gray" as const;
}
