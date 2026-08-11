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
    eyebrow: "Signature Series · approval pending",
    collectionSlug: "signature",
    family: "Scent family awaiting approval",
    intensity: "Intensity awaiting approval",
    occasion: "Occasion guidance awaiting approval",
    longevity: "Longevity guidance awaiting approval",
    ingredients: "Ingredients awaiting approval",
    usage: "Usage guidance awaiting approval",
    summary: "An owner-named Signature composition held behind the publication gate.",
    story:
      "This campaign composition demonstrates the intended product storytelling layout. Scent claims and selling copy remain unpublished until owner and counsel approval.",
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
    eyebrow: "Signature Series · approval pending",
    collectionSlug: "signature",
    family: "Scent family awaiting approval",
    intensity: "Intensity awaiting approval",
    occasion: "Occasion guidance awaiting approval",
    longevity: "Longevity guidance awaiting approval",
    ingredients: "Ingredients awaiting approval",
    usage: "Usage guidance awaiting approval",
    summary: "A cool-toned Signature visual direction held behind the publication gate.",
    story:
      "The layout is ready for approved notes, longevity guidance, ingredients, and usage copy. No unverified claim is exposed as product fact.",
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
    eyebrow: "Signature Series · approval pending",
    collectionSlug: "signature",
    family: "Scent family awaiting approval",
    intensity: "Intensity awaiting approval",
    occasion: "Occasion guidance awaiting approval",
    longevity: "Longevity guidance awaiting approval",
    ingredients: "Ingredients awaiting approval",
    usage: "Usage guidance awaiting approval",
    summary: "A warm floral Signature visual direction held behind the publication gate.",
    story:
      "The product gallery uses controlled Perfume Aura media while price and fragrance claims stay fail-closed.",
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
      eyebrow: "Commerce fixture · not for publication",
      collectionSlug: "standard-preview",
      family: "Content approval pending",
      intensity: "Content approval pending",
      occasion: "Content approval pending",
      longevity: "Content approval pending",
      ingredients: "Content approval pending",
      usage: "Content approval pending",
      summary:
        "A non-public staging fixture for testing approved standard sizes and INR prices.",
      story:
        "This fixture exists only to verify the cart and checkout journey. It cannot be enabled as a public product.",
      notes: { top: [], heart: [], base: [] },
      image: `/images/bottle-${number === 1 ? 30 : number === 2 ? 50 : 100}ml.webp`,
      imageAlt: `Perfume Aura standard bottle fixture ${number}`,
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
        description: "Owner-named Perfume Aura compositions. Exact prices and publication remain gated product by product.",
      },
      "standard-preview": {
        title: "Standard commerce fixtures",
        description: "Non-public fixtures used to verify the approved 30, 50, and 100 ml INR price contract.",
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
