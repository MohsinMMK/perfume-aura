import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadListedWorkbookProducts } from "./listing-catalog";
import {
  applyShopListingQuery,
  countShopListingSizes,
  emptyShopListingQuery,
  foldShopListingText,
  parseShopListingQuery,
  serializeShopListingQuery,
  shopListingHref,
  shopListingSizesForSegment,
  withShopListingSegment,
  withShopListingSize,
  withShopListingSort,
} from "./shop-listing-query";

describe("shop listing query", () => {
  const products = loadListedWorkbookProducts();
  const sourceIds = products.map((product) => product.id);

  it("parses empty params as the catalog default", () => {
    assert.deepEqual(parseShopListingQuery({}), emptyShopListingQuery);
    assert.deepEqual(parseShopListingQuery(new URLSearchParams()), emptyShopListingQuery);
  });

  it("treats empty and whitespace-only q as no query and keeps 65 products", () => {
    assert.deepEqual(parseShopListingQuery({ q: "" }), emptyShopListingQuery);
    assert.deepEqual(parseShopListingQuery({ q: "   " }), emptyShopListingQuery);
    assert.deepEqual(
      parseShopListingQuery(new URLSearchParams("q=")),
      emptyShopListingQuery,
    );
    assert.deepEqual(
      parseShopListingQuery(new URLSearchParams("q=+%20")),
      emptyShopListingQuery,
    );
    assert.equal(
      applyShopListingQuery(products, parseShopListingQuery({ q: "" })).length,
      65,
    );
    assert.equal(
      applyShopListingQuery(products, parseShopListingQuery({ q: "   " })).length,
      65,
    );
  });

  it("canonicalizes duplicate and mixed comma/repeated size tokens", () => {
    assert.deepEqual(
      parseShopListingQuery(new URLSearchParams("size=30&size=30")).sizes,
      [30],
    );
    assert.deepEqual(
      parseShopListingQuery(new URLSearchParams("size=30,30&size=30")).sizes,
      [30],
    );
    assert.deepEqual(
      parseShopListingQuery({ size: ["30", "30,50", "50"] }).sizes,
      [30, 50],
    );
  });

  it("round-trips a canonical query through serialize then parse", () => {
    const query = {
      q: "rose",
      collection: "inspired" as const,
      sizes: [30, 50] as const,
      sort: "name-asc" as const,
    };
    assert.deepEqual(parseShopListingQuery(serializeShopListingQuery(query)), {
      q: "rose",
      collection: "inspired",
      sizes: [30, 50],
      sort: "name-asc",
    });
    assert.deepEqual(
      parseShopListingQuery(serializeShopListingQuery(emptyShopListingQuery)),
      emptyShopListingQuery,
    );
  });

  it("parses q, exclusive collection, repeated sizes, and sort", () => {
    assert.deepEqual(
      parseShopListingQuery({
        q: "  Noir  ",
        collection: "signature",
        size: ["30", "105"],
        sort: "name-desc",
      }),
      {
        q: "Noir",
        collection: "signature",
        sizes: [30, 105],
        sort: "name-desc",
      },
    );
    assert.deepEqual(parseShopListingQuery({ size: "100,30,40" }).sizes, [30, 100]);
  });

  it("ignores invalid collection, size, and sort tokens", () => {
    assert.deepEqual(
      parseShopListingQuery({
        collection: "featured",
        size: ["40", "abc"],
        sort: "price-asc",
      }),
      emptyShopListingQuery,
    );
  });

  it("serializes only active params and keeps default catalog order omitted", () => {
    assert.equal(serializeShopListingQuery(emptyShopListingQuery).toString(), "");
    assert.equal(shopListingHref(emptyShopListingQuery), "/shop");
    assert.equal(
      shopListingHref({
        q: "rose",
        collection: "inspired",
        sizes: [50, 30],
        sort: "name-asc",
      }),
      "/shop?q=rose&collection=inspired&size=30&size=50&sort=name-asc",
    );
  });

  it("keeps the unfiltered 65-product catalog order", () => {
    const visible = applyShopListingQuery(products, emptyShopListingQuery);
    assert.equal(visible.length, 65);
    assert.deepEqual(
      visible.map((product) => product.id),
      sourceIds,
    );
  });

  it("segments Signature 20 and Inspired 45 without extra products", () => {
    const signature = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      collection: "signature",
    });
    const inspired = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      collection: "inspired",
    });
    assert.equal(signature.length, 20);
    assert.equal(inspired.length, 45);
    assert.ok(signature.every((product) => sourceIds.includes(product.id)));
    assert.ok(inspired.every((product) => sourceIds.includes(product.id)));
    assert.deepEqual(
      signature.map((product) => product.id),
      products
        .filter((product) => product.collectionSlug === "signature")
        .map((product) => product.id),
    );
  });

  it("searches name and collection label with flexible normalized tokens", () => {
    const byName = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "régent",
    });
    assert.equal(byName.length, 1);
    assert.equal(byName[0]?.slug, "regent-noir");

    const reorderedWords = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "sauvage, dior",
    });
    assert.equal(reorderedWords.length, 1);
    assert.equal(reorderedWords[0]?.slug, "inspired-by-dior-sauvage");

    const byLabel = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "signature series",
    });
    assert.equal(byLabel.length, 20);
    assert.ok(byLabel.every((product) => product.collectionSlug === "signature"));

    const placeholder = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "details coming soon",
    });
    assert.equal(placeholder.length, 0);

    const summaryLeak = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "composition details will appear",
    });
    assert.equal(summaryLeak.length, 0);
    assert.equal(foldShopListingText("Régent"), "regent");
    assert.equal(foldShopListingText("Sauvage, Dior"), "sauvage dior");
  });

  it("ORs sizes and ANDs size with segment and query", () => {
    const thirty = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      sizes: [30],
    });
    const mixed = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      sizes: [30, 105],
    });
    const signatureThirty = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      collection: "signature",
      sizes: [30],
    });
    const named = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "regent",
      collection: "signature",
      sizes: [50],
    });
    const namedInspired = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "regent",
      collection: "inspired",
    });

    assert.equal(thirty.length, 45);
    assert.ok(thirty.every((product) => product.collectionSlug === "inspired"));
    assert.equal(mixed.length, 65);
    assert.equal(signatureThirty.length, 0);
    assert.equal(named.length, 1);
    assert.equal(named[0]?.slug, "regent-noir");
    assert.equal(namedInspired.length, 0);
    assert.ok(
      mixed.every((product) =>
        product.variants.some((variant) => variant.sizeMl === 30 || variant.sizeMl === 105),
      ),
    );
  });

  it("returns an empty list without inventing products", () => {
    const visible = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      q: "no-such-perfume-name",
    });
    assert.equal(visible.length, 0);
    assert.equal(
      visible.some((product) => !sourceIds.includes(product.id)),
      false,
    );
  });

  it("sorts by name only when requested and keeps catalog order by default", () => {
    const signature = products.filter((product) => product.collectionSlug === "signature");
    const filtered = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      collection: "signature",
    });
    const ascending = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      collection: "signature",
      sort: "name-asc",
    });
    const descending = applyShopListingQuery(products, {
      ...emptyShopListingQuery,
      collection: "signature",
      sort: "name-desc",
    });

    assert.deepEqual(
      filtered.map((product) => product.id),
      signature.map((product) => product.id),
    );
    assert.deepEqual(
      ascending.map((product) => product.name),
      [...signature.map((product) => product.name)].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    );
    assert.deepEqual(
      descending.map((product) => product.name),
      [...signature.map((product) => product.name)].sort((left, right) =>
        right.localeCompare(left, "en"),
      ),
    );
  });

  it("counts sizes from the other active filters", () => {
    const counts = countShopListingSizes(products, {
      ...emptyShopListingQuery,
      collection: "signature",
    });
    assert.deepEqual(counts, { 30: 0, 50: 20, 100: 0, 105: 20 });
  });

  it("selects one size without disturbing the rest of the query", () => {
    const next = withShopListingSize(
      { q: "oud", collection: "inspired", sizes: [30], sort: "name-asc" },
      50,
    );
    assert.deepEqual(next, {
      q: "oud",
      collection: "inspired",
      sizes: [50],
      sort: "name-asc",
    });
    assert.deepEqual(withShopListingSize(next).sizes, []);
  });

  it("shows only sizes offered by the active collection", () => {
    assert.deepEqual(shopListingSizesForSegment("all"), [30, 50, 100, 105]);
    assert.deepEqual(shopListingSizesForSegment("signature"), [50, 105]);
    assert.deepEqual(shopListingSizesForSegment("inspired"), [30, 50, 100]);
  });

  it("drops incompatible sizes when switching collections", () => {
    const query = {
      q: "oud",
      collection: "all" as const,
      sizes: [30, 50, 105] as const,
      sort: "name-asc" as const,
    };

    assert.deepEqual(withShopListingSegment(query, "signature"), {
      ...query,
      collection: "signature",
      sizes: [50, 105],
    });
    assert.deepEqual(withShopListingSegment(query, "inspired"), {
      ...query,
      collection: "inspired",
      sizes: [30, 50],
    });
  });

  it("sets and clears the compact sort order", () => {
    const ascending = withShopListingSort(emptyShopListingQuery, "name-asc");
    assert.equal(ascending.sort, "name-asc");
    assert.equal(withShopListingSort(ascending, "catalog").sort, "catalog");
    assert.equal(withShopListingSort(ascending, "name-desc").sort, "name-desc");
  });
});
