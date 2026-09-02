import type { Money } from "./money";
import { isPublicCatalogEnabled } from "./catalog-policy";
import {
  isListingCollectionSlug,
  listingCollections,
  loadFeaturedListingProducts,
  loadListedWorkbookProducts,
} from "./listing-catalog";

export type StorefrontVariant = Readonly<{
  id: string;
  sku: string | null;
  sizeMl: 30 | 50 | 100 | 105;
  price: Money | null;
  purchasable: boolean;
}>;

export type StorefrontProduct = Readonly<{
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  eyebrow: string;
  collectionSlug: string;
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
  notes: Readonly<{
    top: readonly string[];
    heart: readonly string[];
    base: readonly string[];
  }>;
  image: string;
  cardImage?: string;
  imageAlt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publicSku: string | null;
  socialImage: string;
  socialImageAlt: string;
  publishedAt: Date | null;
  updatedAt: Date | null;
  accent: "wine" | "blue" | "blush" | "brass";
  publicationState: "design_preview" | "listed" | "published";
  variants: readonly StorefrontVariant[];
}>;

export async function getStorefrontProducts(): Promise<
  readonly StorefrontProduct[]
> {
  if (isPublicCatalogEnabled()) {
    const { loadPublishedProducts } = await import("./public-catalog");
    return loadPublishedProducts();
  }
  return loadListedWorkbookProducts();
}

export async function getFeaturedProducts(): Promise<
  readonly StorefrontProduct[]
> {
  if (isPublicCatalogEnabled()) {
    const products = await getStorefrontProducts();
    const published = products.filter(
      (product) => product.publicationState === "published",
    );
    const signature = published.find(
      (product) => product.collectionSlug === "signature",
    );
    const inspired = published.find(
      (product) => product.collectionSlug === "inspired",
    );
    return [signature, inspired].filter(
      (product): product is StorefrontProduct => product !== undefined,
    );
  }
  return loadFeaturedListingProducts();
}

export async function findStorefrontProduct(
  slug: string,
): Promise<StorefrontProduct | undefined> {
  return (await getStorefrontProducts()).find((product) => product.slug === slug);
}

export async function findStorefrontVariant(variantId: string): Promise<
  | Readonly<{
      product: StorefrontProduct;
      variant: StorefrontVariant;
    }>
  | undefined
> {
  for (const product of await getStorefrontProducts()) {
    const variant = product.variants.find(
      (candidate) => candidate.id === variantId,
    );
    if (variant) {
      return { product, variant };
    }
  }

  return undefined;
}

export async function getStorefrontCollection(slug: string): Promise<Readonly<{
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt: Date | null;
  products: readonly StorefrontProduct[];
}> | null> {
  if (isPublicCatalogEnabled()) {
    const { loadPublishedCollection } = await import("./public-catalog");
    const collection = await loadPublishedCollection(slug);
    if (collection) {
      const products = await getStorefrontProducts();
      const productIds = new Set(collection.productIds);
      const publishedProducts = products.filter((product) =>
        productIds.has(product.id),
      );
      if (publishedProducts.length === 0) return null;
      return {
        ...collection,
        products: publishedProducts,
      };
    }
    return null;
  }

  if (!isListingCollectionSlug(slug)) return null;
  const products = loadListedWorkbookProducts().filter(
    (product) => product.collectionSlug === slug,
  );
  return { ...listingCollections[slug], products };
}

export async function getStorefrontCollectionSlugs(): Promise<
  readonly string[]
> {
  if (isPublicCatalogEnabled()) {
    const { loadPublishedCollection, loadPublishedCollectionSlugs } = await import("./public-catalog");
    const [candidateSlugs, products] = await Promise.all([
      loadPublishedCollectionSlugs(),
      getStorefrontProducts(),
    ]);
    const productIds = new Set(products.map((product) => product.id));
    const collections = await Promise.all(
      candidateSlugs.map(async (slug) => ({
        slug,
        collection: await loadPublishedCollection(slug),
      })),
    );
    return collections.flatMap(({ slug, collection }) =>
      collection?.productIds.some((productId) => productIds.has(productId))
        ? [slug]
        : [],
    );
  }
  return ["signature", "inspired", "unknown"];
}
