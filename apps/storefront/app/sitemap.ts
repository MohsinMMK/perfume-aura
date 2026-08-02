import type { MetadataRoute } from "next";
import { getStorefrontCollectionSlugs, getStorefrontProducts } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.STOREFRONT_URL ?? "https://shop.perfumeaura.com";
  const paths = ["", "/shop", "/search", "/find-your-scent", "/about", "/faq", "/contact", "/wholesale", "/shipping", "/returns", "/privacy", "/terms"];
  const collectionPaths = (await getStorefrontCollectionSlugs()).map((slug) => `/collections/${slug}`);
  const productPaths = (await getStorefrontProducts())
    .filter((product) => product.publicationState !== "design_preview")
    .map((product) => `/products/${product.slug}`);
  return [...paths, ...collectionPaths, ...productPaths].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "weekly" : "monthly" }));
}
