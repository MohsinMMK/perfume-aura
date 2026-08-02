import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const publicRelease = process.env.STOREFRONT_PUBLIC_RELEASE === "true";
  return {
    rules: publicRelease
      ? { userAgent: "*", allow: "/", disallow: ["/account/", "/checkout", "/cart", "/order/"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${process.env.STOREFRONT_URL ?? "https://shop.perfumeaura.com"}/sitemap.xml`,
  };
}
