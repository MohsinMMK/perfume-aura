import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { editorialGuides } from "./editorial-guides";
import { faqItems } from "./faq";
import {
  createAboutStructuredData,
  createFaqStructuredData,
  createFragranceGuideStructuredData,
  createEditorialStructuredData,
  createHomeStructuredData,
  createProductStructuredData,
  createShareMetadata,
  defaultShareImage,
  discoveryReviewedDates,
  discoverySitemapEntries,
  fragranceGuidePublishedDate,
  getStorefrontOrigin,
  privateCrawlerPaths,
  serializeJsonLd,
  shareImageFor,
} from "./seo";
import robots from "../app/robots";

describe("storefront SEO contracts", () => {
  it("declares the storefront document language as Indian English", async () => {
    const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /<html\s+lang="en-IN"/u);
  });
  it("normalizes the configured storefront URL to its origin", () => {
    assert.equal(
      getStorefrontOrigin("https://perfumeaura.com/a/path?ignored=true"),
      "https://perfumeaura.com",
    );
  });

  it("keeps the discovery sitemap focused on truthful evergreen pages", () => {
    assert.deepEqual(
      discoverySitemapEntries.map((entry) => entry.path),
      [
        "",
        "/fragrance-guide",
        "/about",
        "/faq",
        "/guides/perfume-for-hyderabad-weather",
        "/guides/fragrance-families",
        "/guides/perfume-for-occasions",
      ],
    );
    assert.ok(privateCrawlerPaths.includes("/api/"));
    const discoveryPaths = new Set<string>(
      discoverySitemapEntries.map((entry) => entry.path),
    );
    assert.ok(!discoveryPaths.has("/shop"));
    assert.ok(
      discoverySitemapEntries.every((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.lastModified)),
    );
  });

  it("dates each sitemap entry from the same reviewed date as its structured data", () => {
    const lastModifiedByPath = new Map<string, string>(
      discoverySitemapEntries.map((entry) => [entry.path, entry.lastModified]),
    );
    for (const guide of Object.values(editorialGuides)) {
      assert.equal(lastModifiedByPath.get(guide.path), guide.reviewedDate);
    }
    assert.equal(
      lastModifiedByPath.get("/fragrance-guide"),
      createFragranceGuideStructuredData("https://perfumeaura.com")["@graph"][0].dateModified,
    );
  });

  it("leaves account pages crawlable so their noindex is seen", async () => {
    assert.equal(privateCrawlerPaths.some((path) => path.startsWith("/account")), false);
    const accountPages = [
      "page.tsx",
      "sign-in/page.tsx",
      "register/page.tsx",
      "recover/page.tsx",
      "settings/page.tsx",
      "delivery/page.tsx",
      "orders/page.tsx",
      "orders/[orderNumber]/page.tsx",
    ];
    for (const page of accountPages) {
      const source = await readFile(new URL(`../app/account/${page}`, import.meta.url), "utf8");
      assert.match(source, /robots: noIndexRobots/u, page);
    }
  });

  it("serves 1200x630 JPEG share images that exist on disk", async () => {
    const images = [
      defaultShareImage,
      ...Object.values(editorialGuides).map((guide) => shareImageFor(guide.image, guide.imageAlt)),
      shareImageFor("/images/bottle-50ml.webp", "Bottle"),
    ];
    for (const image of images) {
      assert.match(image.url, /^\/images\/share\/[a-z0-9-]+\.jpg$/u);
      assert.equal(image.width, 1200);
      assert.equal(image.height, 630);
      const file = await readFile(new URL(`../public${image.url}`, import.meta.url));
      assert.equal(file.readUInt16BE(0), 0xffd8, image.url);
    }
    assert.deepEqual(shareImageFor("/media/upload.webp", "Upload"), { url: "/media/upload.webp", alt: "Upload" });
  });

  it("gives every page preview its own URL, branded title and sized image", () => {
    const share = createShareMetadata({ path: "/products/regent-noir", title: "Regent Noir", description: "A scent." });
    assert.deepEqual(share.openGraph, {
      type: "website",
      locale: "en_IN",
      siteName: "Perfume Aura",
      url: "/products/regent-noir",
      title: "Regent Noir | Perfume Aura",
      description: "A scent.",
      images: [defaultShareImage],
    });
    assert.equal(
      createShareMetadata({ path: "/", title: "Perfume Aura | Home", description: "x" }).openGraph?.title,
      "Perfume Aura | Home",
    );
  });

  it("keeps page-specific preview fields out of the root layout", async () => {
    const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
    const openGraph = /openGraph: \{([^}]*)\}/u.exec(layout)?.[1] ?? "";
    assert.ok(openGraph.includes("images"));
    assert.doesNotMatch(openGraph, /\b(url|title|description):/u);
  });

  it("keeps search and AI crawlers on the same wildcard public-page policy", () => {
    const policy = robots();
    assert.equal(Array.isArray(policy.rules), false);
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    assert.equal(rule?.userAgent, "*");
    assert.equal(rule?.allow, "/");
  });

  it("builds article breadcrumbs and product data without premature offers", () => {
    const origin = "https://perfumeaura.com";
    const editorial = createEditorialStructuredData({
      path: "/guides/fragrance-families",
      title: "Fragrance families",
      description: "A guide.",
      image: "/images/regent-noir-50ml.webp",
      publishedDate: "2026-08-28",
      reviewedDate: "2026-08-28",
      breadcrumbLabel: "Fragrance families",
    }, origin);
    assert.equal(editorial["@graph"][0].dateModified, "2026-08-28");
    assert.equal(editorial["@graph"][1].itemListElement[2].item, `${origin}/guides/fragrance-families`);

    const product = createProductStructuredData({
      id: "product-1",
      name: "Launch One",
      slug: "launch-one",
      description: "A complete fragrance.",
      image: "/images/regent-noir-50ml.webp",
      publicSku: "LAUNCH-ONE-100",
    }, origin);
    assert.equal(product["@graph"][0].brand.name, "Perfume Aura");
    assert.equal("offers" in product["@graph"][0], false);
    assert.equal("aggregateRating" in product["@graph"][0], false);
  });

  it("requires a complete verified identity before creating Store data", async () => {
    const { createStoreStructuredData } = await import("./public-business");
    const store = createStoreStructuredData({
      name: "Perfume Aura",
      canonicalUrl: "https://perfumeaura.com",
      locationUrl: "https://perfumeaura.com/stores/kondapur-hyderabad",
      telephone: "+91 00000 00000",
      address: { streetAddress: "Verified address", addressLocality: "Hyderabad", addressRegion: "Telangana", postalCode: "500000", addressCountry: "IN" },
      geo: { latitude: 17.4, longitude: 78.3 },
      openingHours: [{ days: ["Monday"], opens: "10:00", closes: "20:00" }],
      images: ["https://perfumeaura.com/images/store.webp"],
      sameAs: ["https://www.instagram.com/perfume.aura.hyd/"],
    });
    assert.equal(store["@type"], "Store");
    assert.equal(store.address.addressLocality, "Hyderabad");
    assert.equal(store.telephone, "+91 00000 00000");
  });

  it("publishes one consistent organization identity across structured data", () => {
    const origin = "https://perfumeaura.com";
    const home = createHomeStructuredData(origin);
    const guide = createFragranceGuideStructuredData(origin);
    assert.equal(home["@graph"][0]["@type"], "Organization");
    assert.equal(home["@graph"][0]["@id"], `${origin}/#organization`);
    assert.equal(home["@graph"][0].alternateName, "Perfume Aura Hyderabad");
    assert.deepEqual(home["@graph"][0].sameAs, [
      "https://www.instagram.com/perfume.aura.hyd/",
    ]);
    assert.equal(home["@graph"][2]["@type"], "WebPage");
    assert.equal(guide["@graph"][0].author["@id"], `${origin}/#organization`);
    assert.equal(guide["@graph"][0].url, `${origin}/fragrance-guide`);
    assert.equal(guide["@graph"][0].datePublished, fragranceGuidePublishedDate);
    assert.equal(guide["@graph"][0].dateModified, discoveryReviewedDates.fragranceGuide);
    assert.equal("telephone" in home["@graph"][0], false);
    assert.equal("address" in home["@graph"][0], false);
  });

  it("publishes About and FAQ graphs from visible copy without store facts",
    () => {
      const origin = "https://perfumeaura.com";
      const about = createAboutStructuredData(origin);
      const faq = createFaqStructuredData(faqItems, origin);
      assert.equal(about["@graph"][0]["@type"], "AboutPage");
      assert.equal(about["@graph"][0].url, `${origin}/about`);
      assert.equal(faq["@graph"][0]["@type"], "FAQPage");
      assert.deepEqual(
        faq["@graph"][0].mainEntity.map((item) => item.name),
        faqItems.map((item) => item.question),
      );
      assert.deepEqual(
        faq["@graph"][0].mainEntity.map((item) => item.acceptedAnswer.text),
        faqItems.map((item) => item.answer),
      );
      assert.equal("telephone" in about["@graph"][0], false);
      assert.equal("address" in about["@graph"][0], false);
    },
  );

  it("escapes markup-significant characters in JSON-LD", () => {
    assert.equal(
      serializeJsonLd({ value: "</script><script>" }),
      '{"value":"\\u003c/script>\\u003cscript>"}',
    );
  });
});
