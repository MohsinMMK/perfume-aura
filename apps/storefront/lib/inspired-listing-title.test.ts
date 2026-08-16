import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inspiredListingTitle, listingSlug } from "./inspired-listing-title";

describe("inspired listing titles", () => {
  it("uses brand plus cleaned reference", () => {
    assert.equal(
      inspiredListingTitle("Dior", "Sauvage family"),
      "Inspired by Dior Sauvage",
    );
    assert.equal(
      inspiredListingTitle("Louis Vuitton", "Ombre Nomade"),
      "Inspired by Louis Vuitton Ombre Nomade",
    );
  });

  it("does not repeat a brand already present in the reference", () => {
    assert.equal(
      inspiredListingTitle("Dior", "Dior Homme Intense"),
      "Inspired by Dior Homme Intense",
    );
  });

  it("builds unique URL slugs without accents or apostrophes", () => {
    assert.equal(
      listingSlug("Inspired by Hermès Terre d'Hermès"),
      "inspired-by-hermes-terre-dhermes",
    );
    assert.equal(
      listingSlug("Inspired by Tom Ford Ombré Leather"),
      "inspired-by-tom-ford-ombre-leather",
    );
  });
});
