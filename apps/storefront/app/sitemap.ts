import type { MetadataRoute } from "next";
import {
  getStorefrontCollectionSlugs,
  getStorefrontProducts,
} from "@/lib/catalog";
import { isPublicCatalogEnabled } from "@/lib/catalog-policy";
import {
  discoverySitemapEntries,
  getStorefrontOrigin,
} from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getStorefrontOrigin();
  const discoveryEntries: MetadataRoute.Sitemap = discoverySitemapEntries.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
  if (!isPublicCatalogEnabled()) return discoveryEntries;

  const publishedProducts = (await getStorefrontProducts()).filter(
    (product) => product.publicationState === "published",
  );
  if (publishedProducts.length === 0) return discoveryEntries;

  const collectionEntries: MetadataRoute.Sitemap = (
    await getStorefrontCollectionSlugs()
  ).map((slug) => ({
    url: `${baseUrl}/collections/${slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const productEntries: MetadataRoute.Sitemap = publishedProducts.map(
    (product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );
  return [...discoveryEntries, ...collectionEntries, ...productEntries];
}
