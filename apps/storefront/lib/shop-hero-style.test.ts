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
  const [controls, popovers, mobileToolbar, styles] = await Promise.all([
    readFile(new URL("../components/shop-listing-controls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/shop-filter-popovers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/shop-mobile-toolbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(controls, /<ShopFilterPopovers[\s\S]*brandOptions=\{brandOptions\}/u);
  assert.doesNotMatch(popovers, /Featured/u);
  assert.doesNotMatch(popovers, />Catalog</u);
  assert.match(popovers, /type FilterMenu = "collection" \| "brand" \| "size" \| "sort"/u);
  assert.match(popovers, /label=\{`Choose a brand from \$\{brandOptions\.length\} available brands`\}/u);
  assert.match(popovers, /query\.sizes\.length > 1/u);
  assert.match(popovers, /aria-controls=\{sizeMenuId\}/u);
  assert.match(popovers, /document\.addEventListener\("pointerdown", handlePointerDown\)/u);
  assert.match(popovers, /window\.addEventListener\("scroll", handleScroll/u);
  assert.match(popovers, /compact && "right-0 left-auto"/u);
  assert.match(popovers, /compact && "min-w-0"/u);
  assert.match(popovers, /event\.key !== "Escape"/u);
  assert.match(popovers, /motion-reduce:transition-none/u);
  assert.match(controls, /sticky top-\[5\.5rem\][^"]*sm:static/u);
  assert.match(controls, /data-shop-sticky-controls/u);
  assert.match(controls, /px-\[var\(--aura-gutter\)\] py-1/u);
  assert.match(controls, /<ShopMobileToolbar[\s\S]*brandOptions=\{brandOptions\}/u);
  assert.match(popovers, /compact && "contents"/u);
  assert.match(popovers, /compact && "min-h-11 w-full/u);
  assert.match(mobileToolbar, /const instantSearchDelayMs = 220/u);
  assert.match(mobileToolbar, /router\.replace\([\s\S]*\{ scroll: false \}/u);
  assert.match(mobileToolbar, /aria-label="Close search"/u);
  assert.match(mobileToolbar, /data-pinned=\{pinned \? "true" : "false"\}/u);
  assert.match(mobileToolbar, /fixed inset-x-0 top-0 z-0 h-\[8\.75rem\] border-b/u);
  assert.match(mobileToolbar, /grid-cols-\[1\.2fr_\.9fr_\.9fr_\.8fr_2\.75rem\]/u);
  assert.match(mobileToolbar, /motion-reduce:transition-none/u);
  assert.match(mobileToolbar, /data-search-open=\{searchOpen \? "true" : "false"\}/u);
  assert.match(mobileToolbar, /className="aura-mobile-search-form/u);
  assert.match(mobileToolbar, /data-open=\{searchOpen \? "true" : "false"\}/u);
  assert.match(styles, /\.aura-mobile-search-form\s*\{[\s\S]*clip-path: inset\(/u);
  assert.doesNotMatch(
    styles,
    /\.aura-mobile-search-controls\s*\{[^}]*clip-path:/u,
  );
  assert.match(styles, /\.aura-mobile-search-form\[data-open="true"\]\s*\{[\s\S]*clip-path 380ms/u);
  assert.match(styles, /\.aura-mobile-search-form\[data-open="true"\] \.aura-mobile-search-field\s*\{[\s\S]*transition-delay: 110ms/u);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.aura-mobile-search-form,[\s\S]*transition: none;/u);
});

test("mobile shop cards use a compact two-column catalog", async () => {
  const [card, styles] = await Promise.all([
    readFile(new URL("../components/product-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.aura-product-grid\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/u);
  assert.match(card, /product-card-add-button[^\n]*w-full/u);
  assert.match(card, /grid-cols-\[minmax\(0,1fr\)_auto\][^\n]*sm:grid-cols-\[minmax\(0,1fr\)_auto_2\.75rem\]/u);
  assert.match(card, /hidden[^\n]*sm:inline-flex/u);
  assert.match(card, /import \{ createPortal \} from "react-dom"/u);
  assert.match(card, /aria-expanded=\{sizeMenuOpen\}/u);
  assert.match(card, /role="dialog"[\s\S]*createPortal|createPortal\([\s\S]*role="dialog"/u);
  assert.match(card, /aria-pressed=\{selectedVariant\?\.id === variant\.id\}/u);
  assert.match(card, /hover:text-\[var\(--aura-ink\)\]/u);
  assert.match(card, /const sizeMenuDismissDistancePx = 96/u);
  assert.match(card, /const sizeMenuScrollDismissDistancePx = 32/u);
  assert.match(card, /const sizeMenuSelectionCloseDelayMs = 0/u);
  assert.match(card, /const cardLinkReleaseDelayMs = 260/u);
  assert.match(card, /window\.addEventListener\("mousemove", handleMouseMove/u);
  assert.match(card, /window\.addEventListener\("scroll", handleScroll/u);
  assert.match(card, /document\.addEventListener\("pointerdown", handlePointerDown\)/u);
  assert.match(card, /document\.addEventListener\("keydown", handleKeyDown\)/u);
  assert.match(card, /const sizeMenuWidthPx = 224/u);
  assert.match(card, /releaseSizeMenuPointerFocus\(true\)/u);
  assert.match(card, /if \(!force && focusIsKeyboardVisible\) return;/u);
  assert.match(card, /cardElement\.current\?\.contains\(focusedElement\)/u);
  assert.match(card, /function scheduleSizeMenuClose\(\)[\s\S]*click[\s\S]*fall through/u);
  assert.match(card, /cardLinkSuppressed \? "pointer-events-none" : ""/u);
  assert.match(card, /onClick=\{\(\) => handleVariantSelection\(variant\.id\)\}/u);
  assert.match(card, /await addItem\(selectedVariant\.id\)/u);
  assert.doesNotMatch(styles, /@media \(max-width: 639px\)[\s\S]*\.product-card-actions > div/u);
  assert.match(card, /sizes="\(max-width: 1023px\) 46vw, 31vw"/u);
  assert.match(card, /className="line-clamp-2 min-h-\[1\.9em\][^"]*sm:min-h-\[2em\]"/u);
  assert.match(card, /const inspiredByPrefix = "Inspired by ";/u);
  assert.match(
    card,
    /product\.collectionSlug === "inspired"[\s\S]*product\.name\.startsWith\(inspiredByPrefix\)/u,
  );
  assert.equal(
    card.match(
      /<span className="text-outline whitespace-nowrap">Inspired by<\/span>\{" "\}/gu,
    )?.length,
    2,
  );
});
