import type { ReactNode } from "react";
import Link from "next/link";
import {
  countShopListingSizes,
  shopListingHref,
  shopListingSizes,
  toggleShopListingSize,
  type ShopListingQuery,
  type ShopListingRecord,
  type ShopListingSegment,
  type ShopListingSize,
  type ShopListingSort,
} from "@/lib/shop-listing-query";

const segmentOptions = [
  { value: "all", label: "All", short: "All" },
  { value: "signature", label: "Signature Series", short: "Signature" },
  { value: "inspired", label: "Inspired collection", short: "Inspired" },
  { value: "featured", label: "Featured", short: "Featured" },
] as const satisfies readonly Readonly<{
  value: ShopListingSegment;
  label: string;
  short: string;
}>[];

const sortOptions = [
  { value: "catalog", label: "Catalog order", short: "Catalog" },
  { value: "name-asc", label: "Name A–Z", short: "A–Z" },
  { value: "name-desc", label: "Name Z–A", short: "Z–A" },
] as const satisfies readonly Readonly<{
  value: ShopListingSort;
  label: string;
  short: string;
}>[];

const chipClassName =
  "shop-chip inline-flex min-h-12 shrink-0 items-center rounded-[var(--aura-radius)] border px-3 font-display text-base leading-none transition focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ivory)]";

function sizeLabel(size: ShopListingSize): string {
  return `${size} ml`;
}

function selectedChipClassName(selected: boolean): string {
  return selected
    ? "border-[var(--aura-ivory)] bg-[var(--aura-ivory)] text-[var(--aura-ink)]"
    : "border-[color:var(--aura-rule)] text-[var(--aura-ivory)] hover:border-[var(--aura-ivory)]";
}

function ChipIcon({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="shop-chip-icon" aria-hidden="true">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        {children}
      </svg>
    </span>
  );
}

function SegmentGlyph({ value }: Readonly<{ value: ShopListingSegment }>) {
  if (value === "signature") {
    return (
      <ChipIcon>
        <path d="M8 1.75 9.2 6.1 13.5 7.25 9.2 8.4 8 12.75 6.8 8.4 2.5 7.25 6.8 6.1Z" />
      </ChipIcon>
    );
  }
  if (value === "inspired") {
    return (
      <ChipIcon>
        <circle cx="6" cy="8" r="3.1" />
        <circle cx="10" cy="8" r="3.1" />
      </ChipIcon>
    );
  }
  if (value === "featured") {
    return (
      <ChipIcon>
        <path d="m8 2 1.5 3.7L13.5 6l-3 2.6.9 4L8 10.7 4.6 12.6l.9-4L2.5 6l4-0.3Z" />
      </ChipIcon>
    );
  }
  return (
    <ChipIcon>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" />
      <rect x="9" y="2.5" width="4.5" height="4.5" />
      <rect x="2.5" y="9" width="4.5" height="4.5" />
      <rect x="9" y="9" width="4.5" height="4.5" />
    </ChipIcon>
  );
}

function SizeGlyph() {
  return (
    <ChipIcon>
      <path d="M6 2.5h4M7 2.5v2.2L4.8 8.2A3.4 3.4 0 0 0 8 13.4a3.4 3.4 0 0 0 3.2-5.2L8.9 4.7V2.5" />
    </ChipIcon>
  );
}

function SortGlyph({ value }: Readonly<{ value: ShopListingSort }>) {
  if (value === "name-asc") {
    return (
      <ChipIcon>
        <path d="M4 11.5 8 3.5l4 8M5.4 8.7h5.2" />
      </ChipIcon>
    );
  }
  if (value === "name-desc") {
    return (
      <ChipIcon>
        <path d="M4 4.5 8 12.5l4-8M5.4 7.3h5.2" />
      </ChipIcon>
    );
  }
  return (
    <ChipIcon>
      <path d="M3 4.5h10M3 8h7M3 11.5h4" />
    </ChipIcon>
  );
}

function GroupRule() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 hidden h-7 w-px shrink-0 bg-[color:var(--aura-rule)] sm:block"
    />
  );
}

function FilterClearLink({
  href,
  label,
}: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-12 w-11 shrink-0 items-center justify-center rounded-r-[var(--aura-radius)] bg-[var(--aura-red)] text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ivory)]"
    >
      <svg
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        className="size-3"
        aria-hidden="true"
      >
        <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" />
      </svg>
    </Link>
  );
}

function FilterChip({
  href,
  selected,
  clearHref,
  clearLabel,
  label,
  current,
  pressed,
  disabled,
  children,
}: Readonly<{
  href: string;
  selected: boolean;
  clearHref?: string;
  clearLabel?: string;
  label: string;
  current?: "page" | "true";
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}>) {
  const showClear = Boolean(selected && clearHref && clearLabel);
  const chip = (
    <Link
      href={href}
      aria-label={label}
      aria-current={current}
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={`${chipClassName} ${
        disabled
          ? "pointer-events-none border-[color:var(--aura-rule)] text-[color:rgb(245_228_199_/_35%)]"
          : selectedChipClassName(selected)
      } ${showClear ? "rounded-r-none border-r-0" : ""}`}
    >
      {children}
    </Link>
  );

  if (!showClear || !clearHref || !clearLabel) return chip;

  return (
    <span className="inline-flex shrink-0 items-stretch">
      {chip}
      <FilterClearLink href={clearHref} label={clearLabel} />
    </span>
  );
}

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
    <div className="mt-10 mb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-[var(--aura-gap)]">
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

        <div className="shop-listing-rail flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
          <nav aria-label="Shop segments" className="flex items-center gap-2">
            {segmentOptions.map((option) => {
              const selected = query.collection === option.value;
              return (
                <FilterChip
                  key={option.value}
                  href={shopListingHref({
                    ...query,
                    collection: option.value,
                  })}
                  selected={selected}
                  label={option.label}
                  current={selected ? "page" : undefined}
                  clearHref={
                    selected && option.value !== "all"
                      ? shopListingHref({ ...query, collection: "all" })
                      : undefined
                  }
                  clearLabel={
                    selected && option.value !== "all"
                      ? `Clear ${option.label}`
                      : undefined
                  }
                >
                  <SegmentGlyph value={option.value} />
                  {option.short}
                </FilterChip>
              );
            })}
          </nav>

          <GroupRule />

          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Size</legend>
            {shopListingSizes.map((size) => {
              const selected = query.sizes.includes(size);
              const count = sizeCounts[size];
              const disabled = count === 0 && !selected;
              return (
                <FilterChip
                  key={size}
                  href={shopListingHref(toggleShopListingSize(query, size))}
                  selected={selected}
                  label={`${sizeLabel(size)}, ${count} ${count === 1 ? "scent" : "scents"}`}
                  pressed={selected}
                  disabled={disabled}
                  clearHref={
                    selected
                      ? shopListingHref(toggleShopListingSize(query, size))
                      : undefined
                  }
                  clearLabel={selected ? `Clear ${sizeLabel(size)}` : undefined}
                >
                  <SizeGlyph />
                  {selected ? sizeLabel(size) : size}
                </FilterChip>
              );
            })}
          </fieldset>

          <GroupRule />

          <nav aria-label="Sort listing" className="flex items-center gap-2">
            {sortOptions.map((option) => {
              const selected = query.sort === option.value;
              return (
                <FilterChip
                  key={option.value}
                  href={shopListingHref({ ...query, sort: option.value })}
                  selected={selected}
                  label={option.label}
                  current={selected ? "true" : undefined}
                  clearHref={
                    selected && option.value !== "catalog"
                      ? shopListingHref({ ...query, sort: "catalog" })
                      : undefined
                  }
                  clearLabel={
                    selected && option.value !== "catalog"
                      ? `Clear ${option.label}`
                      : undefined
                  }
                >
                  <SortGlyph value={option.value} />
                  {option.short}
                </FilterChip>
              );
            })}
          </nav>
        </div>

        <p
          className="hidden shrink-0 text-sm text-[color:rgb(245_228_199_/_55%)] lg:block"
          role="status"
          aria-live="polite"
        >
          {countLabel}
        </p>
      </div>

      <p
        className="mt-4 text-sm text-[color:rgb(245_228_199_/_55%)] lg:hidden"
        role="status"
        aria-live="polite"
      >
        {countLabel}
      </p>
    </div>
  );
}
