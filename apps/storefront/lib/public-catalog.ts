import {
  and,
  db,
  eq,
  productMedia,
  productPublications,
  products,
  productVariants,
  sql,
  variantPrices,
  commerceCollections,
  commerceCollectionProducts,
  commerceOrderItems,
  reviews,
} from "@perfume-aura/db";
import type { StorefrontProduct, StorefrontVariant } from "./catalog";

type PublicProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  family: string;
  audience: string;
  season: string;
  concentration: string;
  intensity: string;
  occasion: string;
  longevity: string;
  sillage: string;
  ingredients: string;
  usage: string;
  summary: string;
  story: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  seoTitle: string;
  seoDescription: string;
  publishedAt: Date;
  updatedAt: Date;
  featuredRank: number | null;
  storageKey: string;
  altText: string;
};

type PublicVariantRow = {
  id: string;
  productId: string;
  sizeMl: number;
  amountMinor: number;
  sku: string;
  available: boolean;
};

function mediaPath(storageKey: string): string | null {
  if (storageKey.startsWith("/") && !storageKey.startsWith("//")) {
    return storageKey;
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/i.test(storageKey)) {
    return `/media/${storageKey}`;
  }
  return null;
}

function accentForFamily(family: string): StorefrontProduct["accent"] {
  const normalized = family.toLowerCase();
  if (normalized.includes("aquatic") || normalized.includes("fresh")) return "blue";
  if (normalized.includes("floral") || normalized.includes("fruity")) return "blush";
  if (normalized.includes("oud") || normalized.includes("woody")) return "wine";
  return "brass";
}

function isSellableSize(sizeMl: number): sizeMl is StorefrontVariant["sizeMl"] {
  return sizeMl === 30 || sizeMl === 50 || sizeMl === 100 || sizeMl === 105;
}

/**
 * Controlled public projection. The query deliberately omits cost, raw stock,
 * internal product descriptions, archived rows, unapproved prices, and all
 * non-approved media. Missing required public fields fail the row closed.
 */
export async function loadPublishedProducts(): Promise<readonly StorefrontProduct[]> {
  if (!process.env.DATABASE_URL) return [];

  const [productRows, variantRows] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: productPublications.publicSlug,
        name: productPublications.publicName,
        brand: products.brand,
        family: productPublications.scentFamily,
        audience: productPublications.audience,
        season: productPublications.season,
        concentration: productPublications.concentration,
        intensity: productPublications.intensity,
        occasion: productPublications.occasion,
        longevity: productPublications.longevityGuidance,
        sillage: productPublications.sillage,
        ingredients: productPublications.ingredients,
        usage: productPublications.usageInstructions,
        summary: productPublications.shortDescription,
        story: productPublications.longDescription,
        topNotes: productPublications.topNotes,
        heartNotes: productPublications.heartNotes,
        baseNotes: productPublications.baseNotes,
        seoTitle: productPublications.seoTitle,
        seoDescription: productPublications.seoDescription,
        publishedAt: productPublications.publishedAt,
        updatedAt: productPublications.updatedAt,
        featuredRank: productPublications.featuredRank,
        storageKey: productMedia.storageKey,
        altText: productMedia.altText,
      })
      .from(products)
      .innerJoin(productPublications, eq(productPublications.productId, products.id))
      .innerJoin(
        productMedia,
        and(
          eq(productMedia.productId, products.id),
          eq(productMedia.kind, "pack"),
          eq(productMedia.position, 0),
        ),
      )
      .where(
        and(
          eq(products.status, "active"),
          eq(productPublications.status, "published"),
          sql`${productPublications.publicSlug} IS NOT NULL`,
          sql`${productPublications.publicName} IS NOT NULL`,
          sql`${productPublications.scentFamily} IS NOT NULL`,
          sql`${productPublications.audience} IS NOT NULL`,
          sql`${productPublications.season} IS NOT NULL`,
          sql`${productPublications.concentration} IS NOT NULL`,
          sql`${productPublications.intensity} IS NOT NULL`,
          sql`${productPublications.occasion} IS NOT NULL`,
          sql`${productPublications.longevityGuidance} IS NOT NULL`,
          sql`${productPublications.sillage} IS NOT NULL`,
          sql`${productPublications.ingredients} IS NOT NULL`,
          sql`${productPublications.usageInstructions} IS NOT NULL`,
          sql`${productPublications.shortDescription} IS NOT NULL`,
          sql`${productPublications.longDescription} IS NOT NULL`,
          sql`${productPublications.topNotes} IS NOT NULL`,
          sql`${productPublications.heartNotes} IS NOT NULL`,
          sql`${productPublications.baseNotes} IS NOT NULL`,
          sql`${productPublications.seoTitle} IS NOT NULL`,
          sql`${productPublications.seoDescription} IS NOT NULL`,
          sql`${productPublications.legalApprovedAt} IS NOT NULL`,
          sql`${productPublications.legalApprovalReference} IS NOT NULL`,
          sql`${productPublications.contentApprovedAt} IS NOT NULL`,
          sql`${productPublications.contentApprovalReference} IS NOT NULL`,
          sql`${productPublications.mediaApprovedAt} IS NOT NULL`,
          sql`${productPublications.mediaApprovalReference} IS NOT NULL`,
          sql`${productPublications.publishedAt} IS NOT NULL`,
          sql`${productMedia.approvedAt} IS NOT NULL`,
          sql`${productMedia.approvalReference} IS NOT NULL`,
        ),
      )
      .orderBy(sql`${productPublications.featuredRank} nulls last`, productPublications.publicName),
    db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        sizeMl: productVariants.sizeMl,
        amountMinor: variantPrices.amountMinor,
        sku: productVariants.sku,
        available: sql<boolean>`${productVariants.quantityOnHand} - ${productVariants.qtyReserved} > 0`,
      })
      .from(productVariants)
      .innerJoin(variantPrices, eq(variantPrices.variantId, productVariants.id))
      .innerJoin(productPublications, eq(productPublications.productId, productVariants.productId))
      .where(
        and(
          eq(productVariants.status, "active"),
          eq(productPublications.status, "published"),
          eq(variantPrices.active, true),
          eq(variantPrices.currency, "INR"),
          sql`${variantPrices.approvedAt} IS NOT NULL`,
          sql`${variantPrices.approvalReference} IS NOT NULL`,
          sql`${variantPrices.amountMinor} > 0`,
        ),
      )
      .orderBy(productVariants.sizeMl),
  ]);

  const variantsByProduct = new Map<string, StorefrontVariant[]>();
  for (const row of variantRows as PublicVariantRow[]) {
    if (!isSellableSize(row.sizeMl)) continue;
    const variants = variantsByProduct.get(row.productId) ?? [];
    variants.push({
      id: row.id,
      sku: row.sku,
      sizeMl: row.sizeMl,
      price: { currency: "INR", amountMinor: row.amountMinor },
      purchasable: row.available,
    });
    variantsByProduct.set(row.productId, variants);
  }

  const output: StorefrontProduct[] = [];
  for (const rawRow of productRows) {
    const row = rawRow as PublicProductRow;
    const variants = variantsByProduct.get(row.id) ?? [];
    const image = mediaPath(row.storageKey);
    if (!image || variants.length === 0) continue;
    output.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      brand: row.brand,
      eyebrow: "Perfume Aura collection",
      collectionSlug: "all",
      family: row.family,
      audience: row.audience,
      season: row.season,
      concentration: row.concentration,
      intensity: row.intensity,
      occasion: row.occasion,
      longevity: row.longevity,
      sillage: row.sillage,
      ingredients: row.ingredients,
      usage: row.usage,
      summary: row.summary,
      story: row.story,
      notes: { top: row.topNotes, heart: row.heartNotes, base: row.baseNotes },
      image,
      imageAlt: row.altText,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      publicSku: variants[0]?.sku ?? null,
      socialImage: image,
      socialImageAlt: row.altText,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      accent: accentForFamily(row.family),
      publicationState: "published",
      variants,
    });
  }
  return output;
}

export async function loadPublishedCollection(slug: string): Promise<Readonly<{
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt: Date;
  productIds: readonly string[];
}> | null> {
  if (!process.env.DATABASE_URL) return null;
  const rows = await db
    .select({
      id: commerceCollections.id,
      name: commerceCollections.name,
      description: commerceCollections.description,
      seoTitle: commerceCollections.seoTitle,
      seoDescription: commerceCollections.seoDescription,
      updatedAt: commerceCollections.updatedAt,
      productId: commerceCollectionProducts.productId,
    })
    .from(commerceCollections)
    .leftJoin(
      commerceCollectionProducts,
      eq(commerceCollectionProducts.collectionId, commerceCollections.id),
    )
    .where(
      and(
        eq(commerceCollections.slug, slug),
        eq(commerceCollections.status, "published"),
        sql`${commerceCollections.seoTitle} IS NOT NULL`,
        sql`${commerceCollections.seoDescription} IS NOT NULL`,
      ),
    )
    .orderBy(commerceCollectionProducts.position);
  const first = rows[0];
  if (!first || !first.seoTitle || !first.seoDescription) return null;
  return {
    title: first.name,
    description: first.description ?? "",
    seoTitle: first.seoTitle,
    seoDescription: first.seoDescription,
    updatedAt: first.updatedAt,
    productIds: rows.flatMap((row) => (row.productId ? [row.productId] : [])),
  };
}

export async function loadPublishedCollectionSlugs(): Promise<readonly string[]> {
  if (!process.env.DATABASE_URL) return [];
  const rows = await db
    .selectDistinct({ slug: commerceCollections.slug })
    .from(commerceCollections)
    .innerJoin(
      commerceCollectionProducts,
      eq(commerceCollectionProducts.collectionId, commerceCollections.id),
    )
    .innerJoin(
      productPublications,
      eq(productPublications.productId, commerceCollectionProducts.productId),
    )
    .where(
      and(
        eq(commerceCollections.status, "published"),
        eq(productPublications.status, "published"),
        sql`${commerceCollections.seoTitle} IS NOT NULL`,
        sql`${commerceCollections.seoDescription} IS NOT NULL`,
      ),
    )
    .orderBy(commerceCollections.slug);
  return rows.map((row) => row.slug);
}

export async function loadApprovedProductReviews(productId: string): Promise<readonly Readonly<{
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date;
}>[]> {
  if (!process.env.DATABASE_URL) return [];
  return db
    .select({ id: reviews.id, rating: reviews.rating, title: reviews.title, body: reviews.body, createdAt: reviews.createdAt })
    .from(reviews)
    .innerJoin(commerceOrderItems, eq(commerceOrderItems.id, reviews.orderItemId))
    .innerJoin(productVariants, eq(productVariants.id, commerceOrderItems.variantId))
    .where(and(eq(reviews.status, "approved"), eq(productVariants.productId, productId)))
    .orderBy(sql`${reviews.createdAt} desc`)
    .limit(50);
}
