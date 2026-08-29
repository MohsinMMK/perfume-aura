import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { inspiredListingTitle, listingSlug } from "./inspired-listing-title";
import {
  loadFeaturedListingProducts,
  loadListedWorkbookProducts,
} from "./listing-catalog";

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split(","));
}

describe("storefront listing workbook", () => {
  it("lists all 114 products across Signature, Inspired, and Unknown", () => {
    const products = loadListedWorkbookProducts();
    assert.equal(products.length, 114);
    assert.equal(
      products.filter((product) => product.collectionSlug === "signature").length,
      20,
    );
    assert.equal(
      products.filter((product) => product.collectionSlug === "inspired").length,
      79,
    );
    assert.equal(
      products.filter((product) => product.collectionSlug === "unknown").length,
      15,
    );
    assert.ok(products.every((product) => product.publicationState === "listed"));
    assert.ok(products.every((product) => product.variants.every((variant) => !variant.purchasable)));
    assert.equal(
      products.some((product) => product.slug === "inspired-by-creed-green-irish-tweed"),
      true,
    );
    assert.ok(products.some((product) => product.slug === "heaven-rose" && product.collectionSlug === "unknown"));
    assert.ok(products.some((product) => product.slug === "inspired-by-louis-vuitton-ombre-nomade"));
    assert.ok(products.some((product) => product.slug === "regent-noir"));
  });

  it("uses the owner-supplied INR amounts across all price tiers", () => {
    const products = loadListedWorkbookProducts();
    const signature = products.find((product) => product.slug === "regent-noir");
    const premiumSignature = products.find((product) => product.slug === "oud-of-dubai");
    const premiumMain = products.find((product) => product.slug === "inspired-by-bvlgari-tygar");
    const standardMain = products.find((product) => product.slug === "inspired-by-dunhill-icon");
    assert.ok(signature);
    assert.ok(premiumSignature);
    assert.ok(premiumMain);
    assert.ok(standardMain);
    assert.deepEqual(
      signature.variants.map((variant) => [variant.sizeMl, variant.price]),
      [
        [50, { currency: "INR", amountMinor: 120_000 }],
        [105, { currency: "INR", amountMinor: 220_000 }],
      ],
    );
    assert.deepEqual(
      premiumSignature.variants.map((variant) => [variant.sizeMl, variant.price?.amountMinor]),
      [
        [50, 180_000],
        [105, 300_000],
      ],
    );
    assert.deepEqual(
      premiumMain.variants.map((variant) => [variant.sizeMl, variant.price?.amountMinor]),
      [
        [30, 60_000],
        [50, 80_000],
        [100, 140_000],
      ],
    );
    assert.deepEqual(
      standardMain.variants.map((variant) => [variant.sizeMl, variant.price?.amountMinor]),
      [
        [30, 45_000],
        [50, 65_000],
        [100, 120_000],
      ],
    );
  });

  it("makes all supplied-price variants purchasable in catalog preview", () => {
    const products = loadListedWorkbookProducts(true);
    const inspired = products.filter(
      (product) => product.collectionSlug === "inspired",
    );
    const signature = products.filter(
      (product) => product.collectionSlug === "signature",
    );

    const unknown = products.filter(
      (product) => product.collectionSlug === "unknown",
    );

    assert.equal(inspired.length, 79);
    assert.equal(
      inspired.flatMap((product) => product.variants).length,
      237,
    );
    assert.equal(unknown.length, 15);
    assert.equal(unknown.flatMap((product) => product.variants).length, 45);
    assert.ok(
      inspired.every((product) =>
        product.variants.every(
          (variant) => variant.purchasable && variant.price != null,
        ),
      ),
    );
    assert.ok(
      signature.every((product) =>
        product.variants.every(
          (variant) => variant.purchasable && variant.price != null,
        ),
      ),
    );
    assert.ok(
      unknown.every((product) =>
        product.variants.every(
          (variant) => variant.purchasable && variant.price != null,
        ),
      ),
    );
  });

  it("features the three photographed Signature scents", () => {
    assert.deepEqual(
      loadFeaturedListingProducts().map((product) => product.slug),
      ["regent-noir", "azure-tides", "petalia-noir"],
    );
  });

  it("matches launch workbook listing titles", () => {
    const [header, ...rows] = parseCsv(
      readFileSync(new URL("../../../data/catalog/launch-products.csv", import.meta.url), "utf8"),
    );
    const nameIndex = header.indexOf("public_name");
    const slugIndex = header.indexOf("public_name_slug");
    const brandIndex = header.indexOf("reference_brand");
    const fragranceIndex = header.indexOf("reference_fragrance");
    const mappingIndex = header.indexOf("reference_mapping_status");
    const listed = rows.filter((row) => row[mappingIndex] === "owner_approved_title_reference");
    assert.equal(listed.length, 79);
    for (const row of listed) {
      const expected = inspiredListingTitle(row[brandIndex] ?? "", row[fragranceIndex] ?? "");
      assert.equal(row[nameIndex], expected);
      assert.equal(row[slugIndex], listingSlug(expected));
    }
  });

  it("keeps temporary Unknown names literal and separate from Inspired mappings", () => {
    const products = loadListedWorkbookProducts();
    const unknown = products.filter((product) => product.collectionSlug === "unknown");
    assert.equal(unknown.length, 15);
    assert.ok(unknown.some((product) => product.name === "Hugo Boss"));
    assert.ok(unknown.some((product) => product.name === "Oud Saffron"));
    assert.ok(unknown.every((product) => !product.name.startsWith("Inspired by ")));
  });
});
