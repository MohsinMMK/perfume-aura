import { ShopFilterPopovers } from "@/components/shop-filter-popovers";
import { ShopMobileToolbar } from "@/components/shop-mobile-toolbar";
import {
  countShopListingSizes,
  type ShopListingQuery,
  type ShopListingRecord,
} from "@/lib/shop-listing-query";

export function ShopListingControls({
  query,
  resultCount,
  products,
}: Readonly<{
  query: ShopListingQuery;
  resultCount: number;
  products: readonly ShopListingRecord[];
}>) {
  const sizeCounts = countShopListingSizes(products, query);
  const countLabel = `${resultCount} ${resultCount === 1 ? "scent" : "scents"}${
    query.q ? ` for “${query.q}”` : ""
  }`;

  return (
    <div
      data-shop-sticky-controls
      className="sticky top-[5.5rem] z-40 -mx-[var(--aura-gutter)] mt-8 mb-6 bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-1 sm:static sm:mx-0 sm:mt-10 sm:bg-transparent sm:px-0 sm:py-0 lg:mt-12"
    >
      <div className="sm:hidden">
        <ShopMobileToolbar query={query} sizeCounts={sizeCounts} />
      </div>

      <div className="hidden flex-col gap-3 sm:flex lg:flex-row lg:items-center lg:gap-[var(--aura-gap)]">
        <form
          action="/shop"
          role="search"
          className="flex h-12 w-full shrink-0 items-stretch lg:w-[min(17rem,42vw)]"
        >
          <label htmlFor="shop-listing-search" className="sr-only">
            Search the catalog
          </label>
          <input
            id="shop-listing-search"
            name="q"
            defaultValue={query.q}
            placeholder="Search"
            className="h-12 min-w-0 flex-1 rounded-l-[var(--aura-radius)] border border-r-0 border-[color:var(--aura-rule)] bg-transparent px-3 text-sm text-[var(--aura-ivory)] outline-none placeholder:text-[var(--aura-text-muted-on-ink)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ivory)]"
          />
          {query.collection !== "all" ? (
            <input type="hidden" name="collection" value={query.collection} />
          ) : null}
          {query.sizes.map((size) => (
            <input key={size} type="hidden" name="size" value={size} />
          ))}
          {query.sort !== "catalog" ? (
            <input type="hidden" name="sort" value={query.sort} />
          ) : null}
          <button
            type="submit"
            aria-label="Search"
            className="aura-cream-action inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-r-[var(--aura-radius)] transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ivory)]"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="size-4"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.2" />
              <path d="m10.4 10.4 3.1 3.1" />
            </svg>
          </button>
        </form>

        <ShopFilterPopovers query={query} sizeCounts={sizeCounts} />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {countLabel}
      </p>
    </div>
  );
}
