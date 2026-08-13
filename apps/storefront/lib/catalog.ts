import type { Money } from "./money";
import {
  isPreviewCatalogEnabled,
  isPublicCatalogEnabled,
} from "./catalog-policy";

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
  intensity: string;
  occasion: string;
  longevity: string;
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
  publicationState: "design_preview" | "published";
  variants: readonly StorefrontVariant[];
}>;

const approvedStandardPrices = {
  30: { currency: "INR", amountMinor: 60_000 },
  50: { currency: "INR", amountMinor: 80_000 },
  100: { currency: "INR", amountMinor: 140_000 },
} as const satisfies Record<30 | 50 | 100, Money>;

const standardPreviewVariants = (productKey: string): StorefrontVariant[] =>
  ([30, 50, 100] as const).map((sizeMl) => ({
    id: `${productKey}-${sizeMl}`,
    sizeMl,
    price: approvedStandardPrices[sizeMl],
    purchasable: true,
  }));

const pendingSignatureVariants = (productKey: string): StorefrontVariant[] =>
  ([50, 105] as const).map((sizeMl) => ({
    id: `${productKey}-${sizeMl}`,
    sizeMl,
    price: null,
    purchasable: false,
  }));

/**
 * Local design fixtures only. They are deliberately unavailable in production.
 * Signature names are owner-approved identity inputs, but remain blocked on legal,
 * content, price, media, SKU, cost, and stock approval. Standard fixtures exercise
 * the approved size/price contract without claiming a publishable product identity.
 */
const previewProducts: readonly StorefrontProduct[] = [
  {
    id: "signature-regent-noir",
    slug: "regent-noir",
    name: "Regent Noir",
    eyebrow: "Signature Series · Preview",
    collectionSlug: "signature",
    family: "Details coming soon",
    intensity: "Details coming soon",
    occasion: "Details coming soon",
    longevity: "Details coming soon",
    ingredients: "Details coming soon",
    usage: "Details coming soon",
    summary: "A dark Signature study presented as a visual preview.",
    story:
      "Regent Noir is presented as a visual preview while its composition details remain unavailable.",
    notes: { top: [], heart: [], base: [] },
    image: "/images/regent-noir-50ml.webp",
    cardImage: "/images/regent-noir-flat.webp",
    imageAlt: "Perfume Aura Regent Noir 50 ml campaign bottle",
    accent: "wine",
    publicationState: "design_preview",
    variants: pendingSignatureVariants("regent-noir"),
  },
  {
    id: "signature-azure-tides",
    slug: "azure-tides",
    name: "Azure Tides",
    eyebrow: "Signature Series · Preview",
    collectionSlug: "signature",
    family: "Details coming soon",
    intensity: "Details coming soon",
    occasion: "Details coming soon",
    longevity: "Details coming soon",
    ingredients: "Details coming soon",
    usage: "Details coming soon",
    summary: "A cool-toned Signature study presented as a visual preview.",
    story:
      "Azure Tides is presented as a visual preview while its composition details remain unavailable.",
    notes: { top: [], heart: [], base: [] },
    image: "/images/azure-tides-50ml.webp",
    cardImage: "/images/azure-tides-flat.webp",
    imageAlt: "Perfume Aura Azure Tides 50 ml campaign bottle",
    accent: "blue",
    publicationState: "design_preview",
    variants: pendingSignatureVariants("azure-tides"),
  },
  {
    id: "signature-petalia-noir",
    slug: "petalia-noir",
    name: "Petalia Noir",
    eyebrow: "Signature Series · Preview",
    collectionSlug: "signature",
    family: "Details coming soon",
    intensity: "Details coming soon",
    occasion: "Details coming soon",
    longevity: "Details coming soon",
    ingredients: "Details coming soon",
    usage: "Details coming soon",
    summary: "A warm floral Signature study presented as a visual preview.",
    story:
      "Petalia Noir is presented as a visual preview while its composition details remain unavailable.",
    notes: { top: [], heart: [], base: [] },
    image: "/images/petalia-noir-50ml.webp",
    cardImage: "/images/petalia-noir-flat.webp",
    imageAlt: "Perfume Aura Petalia Noir 50 ml campaign bottle",
    accent: "blush",
    publicationState: "design_preview",
    variants: pendingSignatureVariants("petalia-noir"),
  },
  ...[1, 2, 3].map(
    (number): StorefrontProduct => ({
      id: `standard-preview-${number}`,
      slug: `standard-preview-${number}`,
      name: `Standard scent ${String(number).padStart(2, "0")}`,
      eyebrow: "Standard Series · Preview",
      collectionSlug: "standard-preview",
      family: "Details coming soon",
      intensity: "Details coming soon",
      occasion: "Details coming soon",
      longevity: "Details coming soon",
      ingredients: "Details coming soon",
      usage: "Details coming soon",
      summary:
        "A standard-size scent presented as a private shopping preview.",
      story:
        "This private preview demonstrates the shopping journey and is not part of the public collection.",
      notes: { top: [], heart: [], base: [] },
      image: `/images/bottle-${number === 1 ? 30 : number === 2 ? 50 : 100}ml.webp`,
      imageAlt: `Perfume Aura standard bottle preview ${number}`,
      accent: "brass",
      publicationState: "design_preview",
      variants: standardPreviewVariants(`standard-preview-${number}`),
    }),
  ),
];

export async function getStorefrontProducts(): Promise<readonly StorefrontProduct[]> {
  if (isPreviewCatalogEnabled()) return previewProducts;
  if (!isPublicCatalogEnabled()) return [];
  const { loadPublishedProducts } = await import("./public-catalog");
  return loadPublishedProducts();
}

export async function getFeaturedProducts(): Promise<readonly StorefrontProduct[]> {
  const products = await getStorefrontProducts();
  return (isPreviewCatalogEnabled()
    ? products.filter((product) => product.collectionSlug === "signature")
    : products.filter((product) => product.publicationState === "published")
  ).slice(0, 3);
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
    const variant = product.variants.find((candidate) => candidate.id === variantId);
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
  const products = await getStorefrontProducts();
  if (isPreviewCatalogEnabled()) {
    const previewCopy: Record<string, { title: string; description: string }> = {
      signature: {
        title: "Signature Series",
        description: "Perfume Aura Signature studies presented as private visual previews. Prices are not available yet.",
      },
      "standard-preview": {
        title: "Standard Series Preview",
        description: "A private preview of the planned 30, 50, and 100 ml shopping experience.",
      },
    };
    const collection = previewCopy[slug];
    return collection
      ? { ...collection, products: products.filter((product) => product.collectionSlug === slug) }
      : null;
  }
  if (!isPublicCatalogEnabled()) return null;
  const { loadPublishedCollection } = await import("./public-catalog");
  const collection = await loadPublishedCollection(slug);
  if (!collection) return null;
  const productIds = new Set(collection.productIds);
  return { ...collection, products: products.filter((product) => productIds.has(product.id)) };
}

export async function getStorefrontCollectionSlugs(): Promise<readonly string[]> {
  if (isPreviewCatalogEnabled()) return ["signature", "standard-preview"];
  if (!isPublicCatalogEnabled()) return [];
  const { loadPublishedCollectionSlugs } = await import("./public-catalog");
  return loadPublishedCollectionSlugs();
}
