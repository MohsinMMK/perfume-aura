import type { Metadata } from "next";
import { editorialGuideSlugs, editorialGuides } from "@/lib/editorial-guides";

export const siteName = "Perfume Aura";

export const defaultSiteDescription =
  "Perfume Aura is a fragrance store in Kondapur, Hyderabad, helping people choose perfume by mood, intensity, occasion, and composition.";

export const fragranceGuidePublishedDate = "2026-08-28";

// The date each page's visible content was last reviewed. The sitemap lastmod
// and any JSON-LD dateModified read from here (guides use their own
// reviewedDate), so the two cannot drift. Update a date only when that page's
// copy actually changes, not for styling or motion work.
export const discoveryReviewedDates = {
  home: "2026-10-26",
  fragranceGuide: "2026-09-01",
  about: "2026-10-26",
  faq: "2026-10-09",
} as const;

export const discoverySitemapEntries = [
  { path: "", changeFrequency: "weekly", priority: 1, lastModified: discoveryReviewedDates.home },
  {
    path: "/fragrance-guide",
    changeFrequency: "monthly",
    priority: 0.9,
    lastModified: discoveryReviewedDates.fragranceGuide,
  },
  { path: "/about", changeFrequency: "monthly", priority: 0.7, lastModified: discoveryReviewedDates.about },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6, lastModified: discoveryReviewedDates.faq },
  ...editorialGuideSlugs.map((slug) => ({
    path: editorialGuides[slug].path,
    changeFrequency: "monthly",
    priority: 0.8,
    lastModified: editorialGuides[slug].reviewedDate,
  } as const)),
] as const;

// Account pages are left crawlable on purpose: each one sends noindex, and a
// Disallow would stop crawlers from ever seeing that noindex.
export const privateCrawlerPaths = [
  "/api/",
  "/cart",
  "/checkout",
  "/order/",
] as const;

// 1200x630 JPEG share copies of these public/images WebPs live in
// public/images/share/, because link previews (WhatsApp, Facebook, X, LinkedIn)
// handle WebP and square images unreliably.
const shareImageNames = new Set([
  "hero-bottle-still-life",
  "azure-tides-50ml",
  "regent-noir-50ml",
  "petalia-noir-50ml",
  "azure-tides-flat",
  "regent-noir-flat",
  "petalia-noir-flat",
  "bottle-50ml",
]);

export type ShareImage = Readonly<{
  url: string;
  width?: number;
  height?: number;
  alt: string;
}>;

export function shareImageFor(source: string, alt: string): ShareImage {
  const name = /^\/images\/([a-z0-9-]+)\.webp$/u.exec(source)?.[1];
  return name && shareImageNames.has(name)
    ? { url: `/images/share/${name}.jpg`, width: 1200, height: 630, alt }
    : { url: source, alt };
}

export const defaultShareImage = shareImageFor(
  "/images/hero-bottle-still-life.webp",
  "Perfume Aura fragrance bottles arranged on a dark stone plinth",
);

// Next.js replaces a parent openGraph/twitter object instead of merging it, so
// every page that sets its own preview passes the complete set here.
export function createShareMetadata(input: Readonly<{
  path: string;
  title: string;
  description: string;
  type?: "website" | "article";
  image?: ShareImage;
}>): Pick<Metadata, "openGraph" | "twitter"> {
  const title = input.title.includes(siteName) ? input.title : `${input.title} | ${siteName}`;
  const image = input.image ?? defaultShareImage;
  return {
    openGraph: {
      type: input.type ?? "website",
      locale: "en_IN",
      siteName,
      url: input.path,
      title,
      description: input.description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      images: [image],
    },
  };
}

export const noIndexRobots = { index: false, follow: false } as const;

export const indexableRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
} as const;

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
        alternateName: "Perfume Aura Hyderabad",
        url: origin,
        logo: `${origin}/brand/perfume-aura-icon-512.png`,
        image: `${origin}/images/hero-bottle-still-life.webp`,
        description: defaultSiteDescription,
        sameAs: ["https://www.instagram.com/perfume.aura.hyd/"],
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
      {
        "@type": "WebPage",
        "@id": `${origin}/#webpage`,
        url: origin,
        name: siteName,
        description: defaultSiteDescription,
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": organizationId },
        primaryImageOfPage: `${origin}/images/hero-bottle-still-life.webp`,
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
        author: { "@type": "Organization", "@id": `${origin}/#organization`, name: siteName, url: origin },
        publisher: { "@type": "Organization", "@id": `${origin}/#organization`, name: siteName, url: origin },
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
        author: { "@type": "Organization", "@id": `${origin}/#organization`, name: siteName, url: origin },
        publisher: { "@type": "Organization", "@id": `${origin}/#organization`, name: siteName, url: origin },
        image: `${origin}/images/hero-bottle-still-life.webp`,
        datePublished: fragranceGuidePublishedDate,
        dateModified: discoveryReviewedDates.fragranceGuide,
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

export const aboutPageDescription =
  "Find Perfume Aura in Kondapur, Hyderabad. Explore the Inspired Series and Signature Series, plan your store visit, and learn how to choose a perfume.";

export function createAboutStructuredData(origin = getStorefrontOrigin()) {
  const pageUrl = `${origin}/about`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${pageUrl}#about`,
        name: "Our story",
        description: aboutPageDescription,
        url: pageUrl,
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": `${origin}/#organization` },
        inLanguage: "en-IN",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: origin },
          { "@type": "ListItem", position: 2, name: "About", item: pageUrl },
        ],
      },
    ],
  } as const;
}

export type FaqStructuredDataItem = Readonly<{
  question: string;
  answer: string;
}>;

export function createFaqStructuredData(
  items: readonly FaqStructuredDataItem[],
  origin = getStorefrontOrigin(),
) {
  const pageUrl = `${origin}/faq`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${origin}/#website` },
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: origin },
          { "@type": "ListItem", position: 2, name: "FAQ", item: pageUrl },
        ],
      },
    ],
  } as const;
}
