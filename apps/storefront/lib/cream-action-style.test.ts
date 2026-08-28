import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readStorefront = (relativePath: string) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

describe("cream action design contract", () => {
  it("inverts cream actions to ink with a retained cream border", async () => {
    const globals = await readStorefront("../app/globals.css");

    assert.match(
      globals,
      /\.aura-cream-action \{[\s\S]*border: 1px solid var\(--aura-ivory\);[\s\S]*background: var\(--aura-ivory\);[\s\S]*color: var\(--aura-ink\);/u,
    );
    assert.match(
      globals,
      /\.aura-cream-action:hover,[\s\S]*\.aura-cream-action:focus-visible \{[\s\S]*border-color: var\(--aura-ivory\) !important;[\s\S]*background-color: var\(--aura-ink\) !important;[\s\S]*color: var\(--aura-ivory\) !important;/u,
    );
  });

  it("applies the shared interaction to storefront cream CTA controls", async () => {
    const files = await Promise.all([
      readStorefront("../components/site-header.tsx"),
      readStorefront("../components/home-hero.tsx"),
      readStorefront("../app/page.tsx"),
      readStorefront("../components/product-card.tsx"),
      readStorefront("../components/gated-inquiry-form.tsx"),
      readStorefront("../components/shop-listing-controls.tsx"),
      readStorefront("../app/not-found.tsx"),
      readStorefront("../app/search/page.tsx"),
    ]);

    for (const file of files) {
      assert.match(file, /aura-cream-action/u);
    }

    assert.match(files[0], /aura-cream-action[^"]*[\s\S]*Get scent/u);
    assert.match(
      files[0],
      /\{ href: "\/fragrance-guide", label: "Scent guide", showCurrent: true \}/u,
    );
    assert.match(files[0], /render=\{<Link href="\/shop" \/>\}[\s\S]*Get scent/u);
    assert.match(files[1], /aura-cream-action[^"]*[\s\S]*Show previous featured scent/u);
    assert.match(files[1], /aura-cream-action[^"]*[\s\S]*Show next featured scent/u);
    assert.match(files[1], /aura-cream-action[^"]*[\s\S]*Choose your scent/u);
    assert.match(
      files[1],
      /render=\{<Link href=\{activeProduct\.slug \? `\/products\/\$\{activeProduct\.slug\}` : "\/shop\?collection=inspired"\} \/>\}/u,
    );
    assert.match(
      files[1],
      /aria-label=\{activeProduct\.slug \? `View scent: \$\{activeProduct\.name\}` : "Shop the Inspired collection"\}/u,
    );
    assert.match(files[2], /aura-cream-action[^"]*[\s\S]*Learn how to choose a scent/u);
    assert.match(files[3], /aura-cream-action[^"]*[\s\S]*Add to cart/u);
    assert.match(
      files[3],
      /aura-cream-action[^"]*focus-visible:outline-2[^"]*focus-visible:outline-offset-2[^"]*focus-visible:outline-\[var\(--aura-ivory\)\]/u,
    );
  });
});
