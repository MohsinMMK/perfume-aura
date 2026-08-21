import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readStorefront = (relativePath: string) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

describe("mobile product detail design contract", () => {
  it("keeps the mobile header separate from the centered product image", async () => {
    const page = await readStorefront("../app/products/[slug]/page.tsx");

    assert.match(page, /data-product-gallery/u);
    assert.match(page, /data-product-image-frame/u);
    assert.match(page, /grid-rows-\[47svh_auto\][^"]*min-\[360px\]:grid-rows-\[50svh_auto\]/u);
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

    assert.doesNotMatch(page, /grid-rows-\[47svh_53svh\]/u);
    assert.match(page, /href="\/shop" className="inline-flex min-h-11/u);
    assert.match(page, /text-\[clamp\(2\.25rem,10vw,2\.75rem\)\]/u);
    assert.match(page, /mt-1 grid grid-cols-2[^"]*sm:mt-5/u);
    assert.match(page, /col-span-2 hidden min-h-40[^"]*sm:grid sm:col-span-1/u);
    assert.match(
      page,
      /<section className="[^"]*sm:hidden[^"]*">[\s\S]*?<p[^>]*>Product details<\/p>/u,
    );
    assert.match(addToCart, /col-span-2 grid[^"]*sm:col-span-1/u);
    assert.match(addToCart, /min-h-11 min-w-0[^"]*sm:min-h-12 sm:min-w-\[5\.5rem\]/u);
    assert.match(addToCart, /min-h-12 w-full[^"]*sm:min-h-\[4\.75rem\]/u);
  });
});
