import type { StorefrontProduct, StorefrontVariant } from "./catalog";
import { listingWorkbookProducts } from "./listing-workbook-data";

export const listingCollections = {
  signature: {
    title: "Signature Series",
    description:
      "In-house Perfume Aura names. Composition details and Signature prices will appear when each edition is complete.",
  },
  inspired: {
    title: "Inspired collection",
    description:
      "Perfume Aura fragrances listed with their approved Inspired by references. Composition details will appear when each edition is complete.",
  },
} as const;

export type ListingCollectionSlug = keyof typeof listingCollections;

export const featuredListingSlugs = [
  "regent-noir",
  "azure-tides",
  "petalia-noir",
] as const;

function toStorefrontVariant(
  variant: (typeof listingWorkbookProducts)[number]["variants"][number],
): StorefrontVariant {
  return {
    id: variant.id,
    sizeMl: variant.sizeMl,
    price:
      variant.priceMinor == null
        ? null
        : { currency: "INR", amountMinor: variant.priceMinor },
    purchasable: false,
  };
}

function toStorefrontProduct(
  product: (typeof listingWorkbookProducts)[number],
): StorefrontProduct {
  const isSignature = product.collectionSlug === "signature";
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    eyebrow: isSignature ? "Signature Series" : "Inspired collection",
    collectionSlug: product.collectionSlug,
    family: "Details coming soon",
    intensity: "Details coming soon",
    occasion: "Details coming soon",
    longevity: "Details coming soon",
    ingredients: "Details coming soon",
    usage: "Details coming soon",
    summary: isSignature
      ? "A Perfume Aura Signature scent. Composition details will appear when this edition is complete."
      : "A Perfume Aura fragrance listed with its approved Inspired by reference. Composition details will appear when this edition is complete.",
    story: isSignature
      ? `${product.name} is part of the Signature Series. Notes, intensity, and Signature prices are not published yet.`
      : `${product.name} is a Perfume Aura fragrance. The reference name identifies the scent it is inspired by and does not mean designer affiliation.`,
    notes: { top: [], heart: [], base: [] },
    image: product.image,
    cardImage: product.cardImage,
    imageAlt: product.imageAlt,
    accent: product.accent,
    publicationState: "listed",
    variants: product.variants.map(toStorefrontVariant),
  };
}

export function loadListedWorkbookProducts(): readonly StorefrontProduct[] {
  return listingWorkbookProducts.map(toStorefrontProduct);
}

export function loadFeaturedListingProducts(): readonly StorefrontProduct[] {
  const products = loadListedWorkbookProducts();
  return featuredListingSlugs.flatMap((slug) => {
    const product = products.find((candidate) => candidate.slug === slug);
    return product ? [product] : [];
  });
}

export function isListingCollectionSlug(
  slug: string,
): slug is ListingCollectionSlug {
  return slug === "signature" || slug === "inspired";
}
