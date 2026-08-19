import type { Metadata } from "next";
import { Input } from "@perfume-aura/ui/components/input";
import { Button } from "@perfume-aura/ui/components/button";
import { ProductCard } from "@/components/product-card";
import { getStorefrontProducts } from "@/lib/catalog";
import {
  applyShopListingQuery,
  emptyShopListingQuery,
  parseShopListingQuery,
} from "@/lib/shop-listing-query";

export const metadata: Metadata = { title: "Search", alternates: { canonical: "/search" } };

export default async function SearchPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const parsed = parseShopListingQuery(await searchParams);
  const query = parsed.q;
  const products = query
    ? applyShopListingQuery(await getStorefrontProducts(), {
        ...emptyShopListingQuery,
        q: query,
      })
    : [];

  return (
    <section className="min-h-[80svh] bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-24 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pt-32">
      <div className="mx-auto max-w-[94rem]">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">Search</p>
          <h1 className="font-display mt-3 text-[clamp(5rem,11vw,11rem)] leading-[0.74]">What are you drawn to?</h1>
          <form action="/search" role="search" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="catalog-search" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Search the catalog</label>
              <Input id="catalog-search" name="q" defaultValue={query} className="min-h-14 rounded-[var(--aura-radius)] border-[color:var(--aura-rule)] bg-transparent px-4 text-[var(--aura-ivory)]" />
            </div>
            <Button type="submit" className="min-h-14 rounded-[var(--aura-radius)] bg-[var(--aura-ivory)] px-8 font-display text-xl text-[var(--aura-ink)] sm:self-end">Search</Button>
          </form>
        </div>

        {query && (
          <div className="mt-12">
            <p className="mb-7 text-sm text-[color:rgb(245_228_199_/_55%)]" role="status" aria-live="polite">{products.length} result{products.length === 1 ? "" : "s"} for “{query}”</p>
            <div className="aura-product-grid grid gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
