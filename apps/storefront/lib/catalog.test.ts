import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPreviewCatalogEnabled,
  isPublicCatalogEnabled,
} from "./catalog-policy";
import { getFeaturedProducts, getStorefrontCollection, getStorefrontCollectionSlugs, getStorefrontProducts } from "./catalog";
import { readReleaseLockedCart } from "./cart-store";

describe("storefront public release boundary", () => {
  it("requires an explicit public release flag", () => {
    assert.equal(isPublicCatalogEnabled({}), false);
    assert.equal(
      isPublicCatalogEnabled({ STOREFRONT_PUBLIC_RELEASE: "false" }),
      false,
    );
    assert.equal(
      isPublicCatalogEnabled({ STOREFRONT_PUBLIC_RELEASE: "true" }),
      true,
    );
  });

  it("enables preview data only for development or an explicit flag", () => {
    assert.equal(isPreviewCatalogEnabled({}), false);
    assert.equal(isPreviewCatalogEnabled({ NODE_ENV: "production" }), false);
    assert.equal(isPreviewCatalogEnabled({ NODE_ENV: "development" }), true);
    assert.equal(
      isPreviewCatalogEnabled({ STOREFRONT_PREVIEW_CATALOG: "true" }),
      true,
    );
  });

  it("serves the 114-product listing workbook without a public-release flag", async () => {
    const previous = process.env.STOREFRONT_PUBLIC_RELEASE;
    delete process.env.STOREFRONT_PUBLIC_RELEASE;
    try {
      const products = await getStorefrontProducts();
      const inspired = await getStorefrontCollection("inspired");
      const unknown = await getStorefrontCollection("unknown");
      const featured = await getFeaturedProducts();
      assert.equal(products.length, 114);
      assert.equal(inspired?.products.length, 79);
      assert.equal(unknown?.products.length, 15);
      assert.equal(featured.length, 3);
      assert.equal(
        products.some((product) => product.slug === "standard-preview-1"),
        false,
      );
    } finally {
      if (previous === undefined) delete process.env.STOREFRONT_PUBLIC_RELEASE;
      else process.env.STOREFRONT_PUBLIC_RELEASE = previous;
    }
  });

  it("fails public mode closed when no approved database projection exists", async () => {
    const previousPublicRelease = process.env.STOREFRONT_PUBLIC_RELEASE;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.STOREFRONT_PUBLIC_RELEASE = "true";
    delete process.env.DATABASE_URL;
    try {
      assert.deepEqual(await getStorefrontProducts(), []);
      assert.deepEqual(await getFeaturedProducts(), []);
      assert.deepEqual(await getStorefrontCollectionSlugs(), []);
      assert.equal(await getStorefrontCollection("inspired"), null);
    } finally {
      if (previousPublicRelease === undefined) delete process.env.STOREFRONT_PUBLIC_RELEASE;
      else process.env.STOREFRONT_PUBLIC_RELEASE = previousPublicRelease;
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it("returns an empty disabled cart while commerce is release-locked", () => {
    assert.deepEqual(readReleaseLockedCart(), {
      lines: [],
      subtotal: { currency: "INR", amountMinor: 0 },
      quantity: 0,
      checkoutEnabled: false,
      checkoutBlockReason: "Online checkout is not available yet.",
    });
  });
});
