export const siteName = "Perfume Aura";

export const defaultSiteDescription =
  "Perfume Aura is a fragrance store in Kondapur, Hyderabad, helping people choose perfume by mood, intensity, occasion, and composition.";

export const discoverySitemapEntries = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/fragrance-guide", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  {
    path: "/guides/perfume-for-hyderabad-weather",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/guides/fragrance-families",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/guides/perfume-for-occasions",
    changeFrequency: "monthly",
    priority: 0.8,
  },
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
        areaServed: [
          { "@type": "City", name: "Hyderabad" },
          { "@type": "Country", name: "India" },
        ],
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

export type EditorialStructuredDataInput = Readonly<{
  path: string;
  title: string;
  description: string;
  image: string;
  publishedDate: string;
  reviewedDate: string;
  breadcrumbLabel: string;
}>;

export function createEditorialStructuredData(
  input: EditorialStructuredDataInput,
  origin = getStorefrontOrigin(),
) {
  const pageUrl = `${origin}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: input.title,
        description: input.description,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        author: { "@id": `${origin}/#organization` },
        publisher: { "@id": `${origin}/#organization` },
        image: new URL(input.image, origin).toString(),
        datePublished: input.publishedDate,
        dateModified: input.reviewedDate,
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
            item: `${origin}/fragrance-guide`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: input.breadcrumbLabel,
            item: pageUrl,
          },
        ],
      },
    ],
  } as const;
}

export function createProductStructuredData(
  product: Readonly<{
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    publicSku: string | null;
  }>,
  origin = getStorefrontOrigin(),
) {
  const pageUrl = `${origin}/products/${product.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${pageUrl}#product`,
        name: product.name,
        image: [new URL(product.image, origin).toString()],
        description: product.description,
        brand: { "@type": "Brand", name: siteName },
        productID: product.id,
        ...(product.publicSku ? { sku: product.publicSku } : {}),
        url: pageUrl,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: origin },
          {
            "@type": "ListItem",
            position: 2,
            name: "Shop",
            item: `${origin}/shop`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: pageUrl,
          },
        ],
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
