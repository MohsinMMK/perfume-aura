import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("shop hero keeps its two-line lockup and responsive spacing", async () => {
  const [page, controls] = await Promise.all([
    readFile(new URL("../app/shop/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/shop-listing-controls.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /text-\[clamp\(2\.75rem,13vw,12\.25rem\)\]/u);
  assert.match(page, /leading-\[0\.78\]/u);
  assert.match(
    page,
    /<span className="text-outline block whitespace-nowrap">Scent made for<\/span>/u,
  );
  assert.match(
    page,
    /<span className="block whitespace-nowrap">presence<\/span>/u,
  );
  assert.match(controls, /mt-8 mb-6[^"]*sm:mt-10[^"]*lg:mt-12/u);
});

test("shop filters use compact accessible popovers", async () => {
  const [controls, popovers, mobileToolbar] = await Promise.all([
    readFile(new URL("../components/shop-listing-controls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/shop-filter-popovers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/shop-mobile-toolbar.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(controls, /<ShopFilterPopovers query=\{query\} sizeCounts=\{sizeCounts\}/u);
  assert.doesNotMatch(popovers, /Featured/u);
  assert.doesNotMatch(popovers, />Catalog</u);
  assert.match(popovers, /type FilterMenu = "collection" \| "size" \| "sort"/u);
  assert.match(popovers, /query\.sizes\.length > 1/u);
  assert.match(popovers, /aria-controls=\{sizeMenuId\}/u);
  assert.match(popovers, /document\.addEventListener\("pointerdown", handlePointerDown\)/u);
  assert.match(popovers, /event\.key !== "Escape"/u);
  assert.match(popovers, /motion-reduce:transition-none/u);
  assert.match(controls, /sticky top-\[5\.5rem\][^"]*sm:static/u);
  assert.match(controls, /data-shop-sticky-controls/u);
  assert.match(controls, /px-\[var\(--aura-gutter\)\] py-1/u);
  assert.match(controls, /<ShopMobileToolbar query=\{query\} sizeCounts=\{sizeCounts\}/u);
  assert.match(popovers, /compact && "contents"/u);
  assert.match(popovers, /compact && "min-h-11 w-full/u);
  assert.match(mobileToolbar, /const instantSearchDelayMs = 220/u);
  assert.match(mobileToolbar, /router\.replace\([\s\S]*\{ scroll: false \}/u);
  assert.match(mobileToolbar, /aria-label="Close search"/u);
  assert.match(mobileToolbar, /data-pinned=\{pinned \? "true" : "false"\}/u);
  assert.match(mobileToolbar, /fixed inset-x-0 top-0 z-0 h-\[8\.75rem\] border-b/u);
  assert.match(mobileToolbar, /grid-cols-\[repeat\(3,minmax\(0,1fr\)\)_2\.75rem\]/u);
  assert.match(mobileToolbar, /motion-reduce:transition-none/u);
});

test("mobile shop cards use a compact two-column catalog", async () => {
  const [card, styles] = await Promise.all([
    readFile(new URL("../components/product-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.aura-product-grid\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/u);
  assert.match(styles, /@media \(max-width: 639px\)[\s\S]*\.product-card-actions\s*\{\s*display: none;/u);
  assert.match(card, /sizes="\(max-width: 1023px\) 46vw, 31vw"/u);
  assert.match(card, /className="line-clamp-2 min-h-\[1\.9em\][^"]*sm:min-h-\[2em\]"/u);
});
