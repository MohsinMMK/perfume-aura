import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  createFragranceGuideStructuredData,
  createEditorialStructuredData,
  createHomeStructuredData,
  createProductStructuredData,
  discoverySitemapEntries,
  getStorefrontOrigin,
  privateCrawlerPaths,
  serializeJsonLd,
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
    assert.ok(privateCrawlerPaths.includes("/account"));
    assert.ok(privateCrawlerPaths.includes("/account/"));
    assert.ok(privateCrawlerPaths.includes("/api/"));
    const discoveryPaths = new Set<string>(
      discoverySitemapEntries.map((entry) => entry.path),
    );
    assert.ok(!discoveryPaths.has("/shop"));
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
    assert.equal(guide["@graph"][0].author["@id"], `${origin}/#organization`);
    assert.equal(guide["@graph"][0].url, `${origin}/fragrance-guide`);
  });

  it("escapes markup-significant characters in JSON-LD", () => {
    assert.equal(
      serializeJsonLd({ value: "</script><script>" }),
      '{"value":"\\u003c/script>\\u003cscript>"}',
    );
  });
});
