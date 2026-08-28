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
  sizeMl: 30 | 50 | 100 | 105;
  price: Money | null;
  purchasable: boolean;
}>;

export type StorefrontProduct = Readonly<{
  id: string;
  slug: string;
  name: string;
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
  accent: "wine" | "blue" | "blush" | "brass";
  publicationState: "design_preview" | "listed" | "published";
  variants: readonly StorefrontVariant[];
}>;

export async function getStorefrontProducts(): Promise<
  readonly StorefrontProduct[]
> {
  if (isPublicCatalogEnabled()) {
    const { loadPublishedProducts } = await import("./public-catalog");
    const published = await loadPublishedProducts();
    if (published.length > 0) return published;
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
    if (published.length > 0) return published.slice(0, 3);
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
  products: readonly StorefrontProduct[];
}> | null> {
  if (isPublicCatalogEnabled()) {
    const { loadPublishedCollection } = await import("./public-catalog");
    const collection = await loadPublishedCollection(slug);
    if (collection) {
      const products = await getStorefrontProducts();
      const productIds = new Set(collection.productIds);
      return {
        ...collection,
        products: products.filter((product) => productIds.has(product.id)),
      };
    }
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
    const { loadPublishedCollectionSlugs } = await import("./public-catalog");
    const slugs = await loadPublishedCollectionSlugs();
    if (slugs.length > 0) return slugs;
  }
  return ["signature", "inspired"];
}
