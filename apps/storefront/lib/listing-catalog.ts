import type { StorefrontProduct, StorefrontVariant } from "./catalog";
import { isPreviewCatalogEnabled } from "./catalog-policy";
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
      "Fixed prices: 30 ml ₹600, 50 ml ₹800, and 100 ml ₹1,400. Composition details will appear when each edition is complete.",
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
  previewPurchasable: boolean,
): StorefrontVariant {
  return {
    id: variant.id,
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
  const previewPurchasable = previewCatalogEnabled && !isSignature;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    eyebrow: isSignature ? "Signature Series" : "Inspired collection",
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
  return slug === "signature" || slug === "inspired";
}
