import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recommendScentProfiles, type ScentFinderProduct } from "./scent-finder";

const products: readonly ScentFinderProduct[] = [
  {
    slug: "quiet-bloom",
    name: "Quiet Bloom",
    family: "Soft floral musk",
    intensity: "Close and subtle",
    occasion: "Everyday office",
    notes: { top: ["bergamot"], heart: ["rose"], base: ["musk"] },
  },
  {
    slug: "midnight-oud",
    name: "Midnight Oud",
    family: "Warm woody oud",
    intensity: "Strong and commanding",
    occasion: "Evening occasion",
    notes: { top: ["saffron"], heart: ["leather"], base: ["oud"] },
  },
];

describe("scent finder", () => {
  it("returns explainable matches from approved product properties", () => {
    const result = recommendScentProfiles(products, {
      mood: "Magnetic",
      intensity: "Commanding",
      occasion: "Evening",
    });
    assert.equal(result[0]?.slug, "midnight-oud");
    assert.equal(result[0]?.reasons.length, 3);
  });

  it("does not fabricate a result when fewer than two answer axes match", () => {
    assert.deepEqual(recommendScentProfiles(products, {
      mood: "Radiant",
      intensity: "Balanced",
      occasion: "Occasion",
    }), []);
  });

  it("does not use a token from the wrong product field", () => {
    const crossFieldToken: ScentFinderProduct = {
      slug: "cross-field-token",
      name: "Cross Field Token",
      family: "Fresh citrus",
      intensity: "Balanced",
      occasion: "Everyday office",
      notes: { top: ["strong bergamot"], heart: ["rose"], base: ["musk"] },
    };
    assert.deepEqual(recommendScentProfiles([crossFieldToken], {
      mood: "Radiant",
      intensity: "Commanding",
      occasion: "Evening",
    }), []);
  });
});
