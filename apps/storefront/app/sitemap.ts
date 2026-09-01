import type { MetadataRoute } from "next";
import type { StorefrontProduct } from "@/lib/catalog";
import {
  getStorefrontCollectionSlugs,
  getStorefrontProducts,
} from "@/lib/catalog";
import { isPublicCatalogEnabled } from "@/lib/catalog-policy";
import {
  discoverySitemapEntries,
  getStorefrontOrigin,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export function buildStorefrontSitemap(input: Readonly<{
  baseUrl: string;
  publicCatalogEnabled: boolean;
  publishedProducts?: readonly StorefrontProduct[];
  collectionSlugs?: readonly string[];
}>): MetadataRoute.Sitemap {
  const discoveryEntries: MetadataRoute.Sitemap = discoverySitemapEntries.map((entry) => ({
    url: `${input.baseUrl}${entry.path}`,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
  const publishedProducts = input.publishedProducts ?? [];
  if (!input.publicCatalogEnabled || publishedProducts.length === 0) {
    return discoveryEntries;
  }
  const collectionEntries: MetadataRoute.Sitemap = (
    input.collectionSlugs ?? []
  ).map((slug) => ({
    url: `${input.baseUrl}/collections/${slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const productEntries: MetadataRoute.Sitemap = publishedProducts.map(
    (product) => ({
      url: `${input.baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt ?? product.publishedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );
  return [
    ...discoveryEntries,
    { url: `${input.baseUrl}/shop`, changeFrequency: "weekly", priority: 0.9 },
    ...collectionEntries,
    ...productEntries,
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getStorefrontOrigin();
  if (!isPublicCatalogEnabled()) {
    return buildStorefrontSitemap({ baseUrl, publicCatalogEnabled: false });
  }

  const publishedProducts = (await getStorefrontProducts()).filter(
    (product) => product.publicationState === "published",
  );
  const collectionSlugs = publishedProducts.length > 0
    ? await getStorefrontCollectionSlugs()
    : [];
  return buildStorefrontSitemap({
    baseUrl,
    publicCatalogEnabled: true,
    publishedProducts,
    collectionSlugs,
  });
}
