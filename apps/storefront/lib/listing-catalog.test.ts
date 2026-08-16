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
  it("lists 21 Signature and 48 Inspired products and hides incomplete rows", () => {
    const products = loadListedWorkbookProducts();
    assert.equal(products.length, 69);
    assert.equal(
      products.filter((product) => product.collectionSlug === "signature").length,
      21,
    );
    assert.equal(
      products.filter((product) => product.collectionSlug === "inspired").length,
      48,
    );
    assert.ok(products.every((product) => product.publicationState === "listed"));
    assert.ok(products.every((product) => product.variants.every((variant) => !variant.purchasable)));
    assert.equal(
      products.some((product) => /heaven rose|green creed|pawake/i.test(product.name)),
      false,
    );
    assert.ok(products.some((product) => product.slug === "inspired-by-louis-vuitton-ombre-nomade"));
    assert.ok(products.some((product) => product.slug === "regent-noir"));
  });

  it("keeps Signature unpriced and Standard sizes at the approved INR amounts", () => {
    const products = loadListedWorkbookProducts();
    const signature = products.find((product) => product.slug === "regent-noir");
    const inspired = products.find((product) => product.slug === "inspired-by-bvlgari-tygar");
    assert.ok(signature);
    assert.ok(inspired);
    assert.deepEqual(
      signature.variants.map((variant) => [variant.sizeMl, variant.price]),
      [
        [50, null],
        [105, null],
      ],
    );
    assert.deepEqual(
      inspired.variants.map((variant) => [variant.sizeMl, variant.price?.amountMinor]),
      [
        [30, 60_000],
        [50, 80_000],
        [100, 140_000],
      ],
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
    assert.equal(listed.length, 48);
    for (const row of listed) {
      const expected = inspiredListingTitle(row[brandIndex] ?? "", row[fragranceIndex] ?? "");
      assert.equal(row[nameIndex], expected);
      assert.equal(row[slugIndex], listingSlug(expected));
    }
  });
});
