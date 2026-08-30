import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readStorefront = (relativePath: string) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

describe("mobile product detail design contract", () => {
  it("keeps the mobile header separate from the centered product image", async () => {
    const [page, globals] = await Promise.all([
      readStorefront("../app/products/[slug]/page.tsx"),
      readStorefront("../app/globals.css"),
    ]);

    assert.match(page, /data-product-hero[^>]*aura-product-hero/u);
    assert.match(page, /data-product-gallery/u);
    assert.match(page, /data-product-image-frame/u);
    assert.match(globals, /\.aura-product-hero\s*\{[\s\S]*height: 100svh;[\s\S]*grid-template-rows: clamp\(11rem, 42svh, 35rem\) minmax\(0, 1fr\);/u);
    assert.match(page, /backgroundImage: `url\("\$\{product\.image\}"\)`/u);
    assert.match(page, /inset-x-2 bottom-2 top-\[72px\][^"]*rounded-\[var\(--aura-radius\)\][^"]*bg-cover bg-center/u);
    assert.match(page, /object-contain object-center sm:object-cover/u);
    assert.match(page, /data-product-gallery[\s\S]{0,180}bg-\[var\(--aura-ink\)\]/u);
    assert.doesNotMatch(page, /data-product-gallery[\s\S]{0,180}bg-white/u);
    assert.doesNotMatch(page, /data-product-gallery[\s\S]{0,500}bg-\[var\(--aura-ivory\)\]/u);
  });

  it("keeps mobile information compact and purchase controls last", async () => {
    const [page, addToCart] = await Promise.all([
      readStorefront("../app/products/[slug]/page.tsx"),
      readStorefront("../components/add-to-cart.tsx"),
    ]);

    assert.match(page, /href="\/shop" className="aura-product-breadcrumb inline-flex min-h-11/u);
    assert.match(page, /text-\[clamp\(2\.25rem,10vw,2\.75rem\)\]/u);
    assert.match(page, /const inspiredByPrefix = "Inspired by ";/u);
    assert.match(
      page,
      /product\.collectionSlug === "inspired" && product\.name\.startsWith\(inspiredByPrefix\)/u,
    );
    assert.match(
      page,
      /<span className="text-outline whitespace-nowrap">Inspired by<\/span>\{" "\}[\s\S]*?<span>\{inspiredReferenceName\}<\/span>/u,
    );
    assert.match(page, /aura-product-purchase-grid mt-3 grid min-h-0 flex-1[^"]*sm:mt-5/u);
    assert.match(page, /col-span-2 hidden min-h-40[^"]*sm:grid sm:col-span-1/u);
    assert.doesNotMatch(
      page,
      /<section className="[^"]*sm:hidden[^"]*">[\s\S]*?<p[^>]*>Product details<\/p>/u,
    );
    assert.match(addToCart, /col-span-2 flex h-full min-h-0[^"]*sm:col-span-1/u);
    assert.match(addToCart, /<ProductWhatsAppAction[\s\S]*productName=\{product\.name\}[\s\S]*sizeMl=\{variant\?\.sizeMl \?\? null\}[\s\S]*quantity=\{quantity\}[\s\S]*totalPrice=\{addToCartTotal\}[\s\S]*<fieldset>/u);
    assert.match(addToCart, /min-h-11 min-w-0[^"]*sm:min-h-12 sm:min-w-\[5\.5rem\]/u);
    assert.match(addToCart, /min-h-12 w-full[^"]*sm:min-h-\[4\.75rem\]/u);
    assert.match(addToCart, /amountMinor: variant\.price\.amountMinor \* quantity/u);
    assert.match(addToCart, /addToCartTotal \? formatMoney\(addToCartTotal\)/u);
    assert.match(addToCart, /\{error && <p[^>]*role="alert"[\s\S]*<Button/u);
    assert.match(addToCart, /data-product-sticky-top/u);
    assert.match(addToCart, /href="\/shop"[\s\S]*Back to the Perfume Aura shop/u);
    assert.match(addToCart, /Selected fragrance/u);
    assert.match(addToCart, /data-product-sticky-bottom/u);
    assert.match(
      addToCart,
      /data-product-sticky-bottom[\s\S]*?className="[^"]*bg-transparent[^"]*"/u,
    );
    assert.doesNotMatch(
      addToCart,
      /data-product-sticky-bottom[\s\S]*?className="[^"]*(?:backdrop-blur|shadow-\[)/u,
    );
    assert.match(page, /data-mobile-product-chapter/u);
    assert.doesNotMatch(page, /sticky top-\[4\.5rem\]/u);
    assert.doesNotMatch(page, /mx-auto mb-3 h-1 w-10 rounded-full/u);
    assert.doesNotMatch(page, /data-mobile-product-chapter className="[^"]*border-(?:t|dashed)/u);
    assert.doesNotMatch(page, /sm:hidden[^"]*pt-20/u);
  });
});
