export const siteName = "Perfume Aura";

export const defaultSiteDescription =
  "Perfume Aura is an India-focused fragrance house helping people choose perfume by mood, intensity, occasion, and composition.";

export const discoverySitemapEntries = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/fragrance-guide", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
] as const;

export const privateCrawlerPaths = [
  "/account",
  "/account/",
  "/api/",
  "/cart",
  "/checkout",
  "/order/",
] as const;

export const noIndexRobots = { index: false, follow: false } as const;

export function getStorefrontOrigin(
  configuredUrl = process.env.STOREFRONT_URL,
): string {
  const url = new URL(configuredUrl ?? "https://perfumeaura.com");
  return url.origin;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function createHomeStructuredData(origin = getStorefrontOrigin()) {
  const organizationId = `${origin}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        url: origin,
        logo: `${origin}/brand/perfume-aura-icon.svg`,
        image: `${origin}/images/hero-bottle-still-life.webp`,
        description: defaultSiteDescription,
        areaServed: { "@type": "Country", name: "India" },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: siteName,
        description: defaultSiteDescription,
        publisher: { "@id": organizationId },
        inLanguage: "en-IN",
      },
    ],
  } as const;
}

export function createFragranceGuideStructuredData(
  origin = getStorefrontOrigin(),
) {
  const pageUrl = `${origin}/fragrance-guide`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: "How to choose a perfume: a practical fragrance guide",
        description:
          "Choose a perfume by mood, fragrance family, intensity, occasion, and a careful skin test.",
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        author: { "@id": `${origin}/#organization` },
        publisher: { "@id": `${origin}/#organization` },
        image: `${origin}/images/hero-bottle-still-life.webp`,
        inLanguage: "en-IN",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: origin,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Fragrance guide",
            item: pageUrl,
          },
        ],
      },
    ],
  } as const;
}
