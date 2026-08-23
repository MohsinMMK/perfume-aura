import type { MetadataRoute } from "next";
import { getStorefrontOrigin, privateCrawlerPaths } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...privateCrawlerPaths],
    },
    sitemap: `${getStorefrontOrigin()}/sitemap.xml`,
    host: getStorefrontOrigin(),
  };
}
