import type { StorefrontProduct, StorefrontVariant } from "./catalog";
import { isPreviewCatalogEnabled } from "./catalog-policy";
import { listingWorkbookProducts } from "./listing-workbook-data";

export const listingCollections = {
  signature: {
    title: "Signature Series",
    description:
      "In-house Perfume Aura names with owner-supplied size pricing. Composition details will appear when each edition is complete.",
    seoTitle: "Signature Series",
    seoDescription: "Perfume Aura Signature Series preview.",
    updatedAt: null,
  },
  inspired: {
    title: "Inspired collection",
    description:
      "Owner-supplied size pricing is shown for each fragrance. Composition details will appear when each edition is complete.",
    seoTitle: "Inspired collection",
    seoDescription: "Perfume Aura inspired fragrance listing preview.",
    updatedAt: null,
  },
  unknown: {
    title: "Unknown",
    description:
      "Temporary catalog names for fragrances without one defensible brand reference. Owner-supplied size pricing is unchanged while permanent naming is reviewed.",
    seoTitle: "Unknown fragrance collection",
    seoDescription: "Perfume Aura temporary fragrance-name listing preview.",
    updatedAt: null,
  },
} as const;

export type ListingCollectionSlug = keyof typeof listingCollections;

export const featuredListingSlugs = [
  "regent-noir",
  "inspired-by-bvlgari-tygar",
] as const;

function toStorefrontVariant(
  variant: (typeof listingWorkbookProducts)[number]["variants"][number],
  previewPurchasable: boolean,
): StorefrontVariant {
  return {
    id: variant.id,
    sku: null,
    sizeMl: variant.sizeMl,
    price:
      variant.priceMinor == null
        ? null
        : { currency: "INR", amountMinor: variant.priceMinor },
    purchasable: previewPurchasable && variant.priceMinor != null,
  };
}

function toStorefrontProduct(
  product: (typeof listingWorkbookProducts)[number],
  previewCatalogEnabled: boolean,
): StorefrontProduct {
  const isSignature = product.collectionSlug === "signature";
  const isUnknown = product.collectionSlug === "unknown";
  const previewPurchasable = previewCatalogEnabled;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    eyebrow: isSignature
      ? "Signature Series"
      : isUnknown
        ? "Unknown"
        : "Inspired collection",
    collectionSlug: product.collectionSlug,
    family: "Details coming soon",
    audience: "Details coming soon",
    season: "Details coming soon",
    concentration: "Details coming soon",
    intensity: "Details coming soon",
    occasion: "Details coming soon",
    longevity: "Details coming soon",
    sillage: "Details coming soon",
    ingredients: "Details coming soon",
    usage: "Details coming soon",
    summary: isSignature
      ? "A Perfume Aura Signature scent. Composition details will appear when this edition is complete."
      : isUnknown
        ? "A temporary literal catalog name with owner-supplied pricing. Brand and composition details remain under review."
        : "A Perfume Aura fragrance listed with its approved Inspired by reference. Composition details will appear when this edition is complete.",
    story: isSignature
      ? `${product.name} is part of the Signature Series. Notes and intensity are not published yet.`
      : isUnknown
        ? `${product.name} is temporarily grouped in Unknown because no single brand or fragrance reference could be mapped reliably.`
        : `${product.name} is a Perfume Aura fragrance. The reference name identifies the scent it is inspired by and does not mean designer affiliation.`,
    notes: { top: [], heart: [], base: [] },
    image: product.image,
    cardImage: product.cardImage,
    imageAlt: product.imageAlt,
    seoTitle: null,
    seoDescription: null,
    publicSku: null,
    socialImage: product.cardImage,
    socialImageAlt: product.imageAlt,
    publishedAt: null,
    updatedAt: null,
    accent: product.accent,
    publicationState: "listed",
    variants: product.variants.map((variant) =>
      toStorefrontVariant(variant, previewPurchasable),
    ),
  };
}

export function loadListedWorkbookProducts(
  previewCatalogEnabled = isPreviewCatalogEnabled(),
): readonly StorefrontProduct[] {
  return listingWorkbookProducts.map((product) =>
    toStorefrontProduct(product, previewCatalogEnabled),
  );
}

export function loadFeaturedListingProducts(
  previewCatalogEnabled = isPreviewCatalogEnabled(),
): readonly StorefrontProduct[] {
  const products = loadListedWorkbookProducts(previewCatalogEnabled);
  return featuredListingSlugs.flatMap((slug) => {
    const product = products.find((candidate) => candidate.slug === slug);
    return product ? [product] : [];
  });
}

export function isListingCollectionSlug(
  slug: string,
): slug is ListingCollectionSlug {
  return slug === "signature" || slug === "inspired" || slug === "unknown";
}
