import assert from "node:assert/strict";
import test from "node:test";
import { resolveCartMedia } from "./cart-media";

test("preview cart media uses the matching clean bottle size for Inspired and Unknown listings", () => {
  for (const [sizeMl, image] of [
    [30, "/images/bottle-30ml.webp"],
    [50, "/images/bottle-50ml.webp"],
    [100, "/images/bottle-100ml.webp"],
  ] as const) {
    for (const collectionSlug of ["inspired", "unknown"] as const) {
    assert.deepEqual(
      resolveCartMedia({
        collectionSlug,
        image: "/images/legacy-product.webp",
      }, { sizeMl }),
      {
        image,
        imageTone: "inspired",
      },
    );
    }
  }
});

test("preview cart media preserves product-specific Signature artwork", () => {
  assert.deepEqual(
    resolveCartMedia({
      collectionSlug: "signature",
      image: "/images/regent-noir-50ml.webp",
    }, { sizeMl: 50 }),
    {
      image: "/images/regent-noir-50ml.webp",
      imageTone: "signature",
    },
  );
});

test("published collection media remains product-specific", () => {
  assert.deepEqual(
    resolveCartMedia({
      collectionSlug: "seasonal",
      image: "/media/approved-product.webp",
    }, { sizeMl: 50 }),
    { image: "/media/approved-product.webp" },
  );
});
