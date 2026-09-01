import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StorefrontProduct } from "@/lib/catalog";
import { buildStorefrontSitemap, dynamic } from "../app/sitemap";

const publishedProduct = {
  slug: "launch-one",
  publicationState: "published",
  publishedAt: new Date("2026-08-27T00:00:00.000Z"),
  updatedAt: new Date("2026-08-28T00:00:00.000Z"),
} as StorefrontProduct;

describe("runtime storefront sitemap", () => {
  it("is explicitly request-time dynamic", () => {
    assert.equal(dynamic, "force-dynamic");
  });

  it("keeps catalog URLs absent while release is closed or empty", () => {
    const closed = buildStorefrontSitemap({ baseUrl: "https://perfumeaura.com", publicCatalogEnabled: false });
    const empty = buildStorefrontSitemap({ baseUrl: "https://perfumeaura.com", publicCatalogEnabled: true, publishedProducts: [] });
    assert.deepEqual(closed, empty);
    assert.equal(closed.some((entry) => entry.url.endsWith("/shop")), false);
    assert.ok(closed.every((entry) => entry.lastModified === "2026-08-28"));
  });

  it("adds only approved nonempty catalog paths with database timestamps", () => {
    const sitemap = buildStorefrontSitemap({
      baseUrl: "https://perfumeaura.com",
      publicCatalogEnabled: true,
      publishedProducts: [publishedProduct],
      collectionSlugs: ["signature"],
    });
    assert.equal(sitemap.some((entry) => entry.url.endsWith("/shop")), true);
    assert.equal(sitemap.some((entry) => entry.url.endsWith("/collections/signature")), true);
    assert.deepEqual(
      sitemap.find((entry) => entry.url.endsWith("/products/launch-one"))?.lastModified,
      publishedProduct.updatedAt,
    );
  });
});
