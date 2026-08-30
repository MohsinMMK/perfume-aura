"use client";

import {
  ArrowDown01Icon,
  GridViewIcon,
  RulerIcon,
  Sorting01Icon,
  Tag01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { cn } from "@perfume-aura/ui/lib/utils";
import {
  shopListingHref,
  shopListingSizesForSegment,
  withShopListingBrand,
  withShopListingSegment,
  withShopListingSize,
  withShopListingSort,
  type ShopListingQuery,
  type ShopListingBrandOption,
  type ShopListingSegment,
  type ShopListingSize,
  type ShopListingSort,
} from "@/lib/shop-listing-query";

type FilterMenu = "collection" | "brand" | "size" | "sort";

const collectionOptions = [
  { value: "all", label: "All" },
  { value: "signature", label: "Signature" },
  { value: "inspired", label: "Inspired" },
  { value: "unknown", label: "Unknown" },
] as const satisfies readonly Readonly<{
  value: ShopListingSegment;
  label: string;
}>[];

const sortOptions = [
  { value: "catalog", label: "Default" },
  { value: "name-asc", label: "A–Z" },
  { value: "name-desc", label: "Z–A" },
] as const satisfies readonly Readonly<{
  value: ShopListingSort;
  label: string;
}>[];

const triggerClassName =
  "shop-chip min-h-12 rounded-[var(--aura-radius)] px-3 font-display text-base leading-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ivory)]";
const menuScrollDismissDistancePx = 20;

const idleTriggerClassName =
  "border-[color:var(--aura-rule)] bg-transparent text-[var(--aura-ivory)] hover:border-[var(--aura-ivory)] hover:bg-transparent hover:text-[var(--aura-ivory)]";

function optionClassName(selected: boolean): string {
  return cn(
    "flex min-h-11 items-center justify-between gap-4 rounded-[var(--aura-radius)] px-3 font-display text-lg uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)]",
    selected
      ? "bg-[var(--aura-ink)] text-[var(--aura-ivory)]"
      : "text-[var(--aura-ink)] hover:bg-[color:rgb(16_11_6_/_9%)]",
  );
}

function ActiveTick({ visible }: Readonly<{ visible: boolean }>) {
  return visible ? (
    <HugeiconsIcon
      icon={Tick02Icon}
      strokeWidth={2}
      className="size-4"
      aria-hidden="true"
    />
  ) : null;
}

function FilterPanel({
  id,
  label,
  open,
  className,
  children,
}: Readonly<{
  id: string;
  label: string;
  open: boolean;
  className: string;
  children: ReactNode;
}>) {
  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      aria-hidden={!open}
      className={cn(
        "absolute left-0 top-[calc(100%+0.5rem)] z-30 flex origin-top-left flex-col gap-1 rounded-[var(--aura-radius)] bg-[var(--aura-ivory)] p-2 text-[var(--aura-ink)] shadow-[0_4px_8px_rgb(0_0_0_/_28%)] ring-1 ring-[color:rgb(16_11_6_/_18%)] transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        open
          ? "visible scale-100 opacity-100"
          : "pointer-events-none invisible scale-95 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ShopFilterPopovers({
  query,
  sizeCounts,
  brandOptions,
  compact = false,
}: Readonly<{
  query: ShopListingQuery;
  sizeCounts: Readonly<Record<ShopListingSize, number>>;
  brandOptions: readonly ShopListingBrandOption[];
  compact?: boolean;
}>) {
  const [openMenu, setOpenMenu] = useState<FilterMenu | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuBaseId = useId();
  const collectionMenuId = `${menuBaseId}-collection`;
  const brandMenuId = `${menuBaseId}-brand`;
  const sizeMenuId = `${menuBaseId}-size`;
  const sortMenuId = `${menuBaseId}-sort`;
  const selectedCollection =
    collectionOptions.find((option) => option.value === query.collection) ??
    collectionOptions[0];
  const selectedBrand = brandOptions.find(
    (option) => option.value === query.brand,
  );
  const brandLabel = compact ? "Brand" : selectedBrand?.label ?? "Brands";
  const hasSelectedSize = query.sizes.length > 0;
  const selectedSize = query.sizes.length === 1 ? query.sizes[0] : undefined;
  const sizeLabel =
    selectedSize != null
      ? `${selectedSize} ml`
      : query.sizes.length > 1
        ? `${query.sizes.length} sizes`
        : "Sizes";
  const selectedSort =
    sortOptions.find((option) => option.value === query.sort) ?? sortOptions[0];
  const sortLabel = query.sort === "catalog" ? "Sort" : selectedSort.label;
  const visibleSizes = shopListingSizesForSegment(query.collection);

  useEffect(() => {
    if (openMenu == null) return;
    const openingScrollY = window.scrollY;

    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) {
        return;
      }
      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenMenu(null);
      activeTriggerRef.current?.focus();
    }

    function handleScroll(): void {
      if (
        Math.abs(window.scrollY - openingScrollY) <
        menuScrollDismissDistancePx
      ) {
        return;
      }
      setOpenMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [openMenu]);

  function toggleMenu(
    menu: FilterMenu,
    event: MouseEvent<HTMLButtonElement>,
  ): void {
    activeTriggerRef.current = event.currentTarget;
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  function closeMenus(): void {
    setOpenMenu(null);
  }

  return (
    <div
      ref={rootRef}
      role="group"
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact && "contents",
      )}
      aria-label="Shop filters"
    >
      <div className={cn("relative", compact && "min-w-0")}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-expanded={openMenu === "collection"}
          aria-controls={collectionMenuId}
          onClick={(event) => toggleMenu("collection", event)}
          className={cn(
            triggerClassName,
            "aura-cream-action",
            compact && "min-h-11 w-full px-1.5 text-xs max-[359px]:px-1 [&_[data-icon=inline-start]]:hidden [&_[data-icon=inline-end]]:hidden",
          )}
        >
          <HugeiconsIcon icon={GridViewIcon} strokeWidth={1.8} data-icon="inline-start" />
          <span className={cn(compact && "truncate")}>
            {selectedCollection.label}
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={1.8} data-icon="inline-end" />
        </Button>
        <FilterPanel
          id={collectionMenuId}
          label="Choose a collection"
          open={openMenu === "collection"}
          className="w-44"
        >
          {collectionOptions.map((option) => {
            const selected = query.collection === option.value;
            return (
              <Link
                key={option.value}
                href={shopListingHref(withShopListingSegment(query, option.value))}
                aria-current={selected ? "page" : undefined}
                tabIndex={openMenu === "collection" ? undefined : -1}
                onClick={closeMenus}
                className={optionClassName(selected)}
              >
                {option.label}
                <ActiveTick visible={selected} />
              </Link>
            );
          })}
        </FilterPanel>
      </div>

      <div className={cn("relative", compact && "min-w-0")}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-label={
            selectedBrand ? `Brand, ${selectedBrand.label}` : "Choose a brand"
          }
          aria-expanded={openMenu === "brand"}
          aria-controls={brandMenuId}
          onClick={(event) => toggleMenu("brand", event)}
          className={cn(
            triggerClassName,
            query.brand ? "aura-cream-action" : idleTriggerClassName,
            compact && "min-h-11 w-full px-1.5 text-xs max-[359px]:px-1 [&_[data-icon=inline-start]]:hidden [&_[data-icon=inline-end]]:hidden",
          )}
        >
          <HugeiconsIcon icon={Tag01Icon} strokeWidth={1.8} data-icon="inline-start" />
          <span className="truncate">{brandLabel}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={1.8} data-icon="inline-end" />
        </Button>
        <FilterPanel
          id={brandMenuId}
          label={`Choose a brand from ${brandOptions.length} available brands`}
          open={openMenu === "brand"}
          className={cn(
            "max-h-[min(28rem,62vh)] w-[min(18rem,calc(100vw-2*var(--aura-gutter)))] overflow-y-auto overscroll-contain",
            compact && "-left-16",
          )}
        >
          <Link
            href={shopListingHref(withShopListingBrand(query))}
            aria-current={!query.brand ? "true" : undefined}
            tabIndex={openMenu === "brand" ? undefined : -1}
            onClick={closeMenus}
            className={optionClassName(!query.brand)}
          >
            All brands
            <ActiveTick visible={!query.brand} />
          </Link>
          {brandOptions.map((option) => {
            const selected = query.brand === option.value;
            return (
              <Link
                key={option.value}
                href={shopListingHref(withShopListingBrand(query, option.value))}
                aria-current={selected ? "true" : undefined}
                tabIndex={openMenu === "brand" ? undefined : -1}
                onClick={closeMenus}
                className={optionClassName(selected)}
              >
                <span className="truncate">{option.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-sans text-xs font-medium normal-case opacity-65">
                    {option.count}
                  </span>
                  <ActiveTick visible={selected} />
                </span>
              </Link>
            );
          })}
        </FilterPanel>
      </div>

      <div className={cn("relative", compact && "min-w-0")}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-expanded={openMenu === "size"}
          aria-controls={sizeMenuId}
          onClick={(event) => toggleMenu("size", event)}
          className={cn(
            triggerClassName,
            hasSelectedSize ? "aura-cream-action" : idleTriggerClassName,
            compact && "min-h-11 w-full px-1.5 text-xs max-[359px]:px-1 [&_[data-icon=inline-start]]:hidden [&_[data-icon=inline-end]]:hidden",
          )}
        >
          <HugeiconsIcon icon={RulerIcon} strokeWidth={1.8} data-icon="inline-start" />
          <span className={cn(compact && "truncate")}>{sizeLabel}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={1.8} data-icon="inline-end" />
        </Button>
        <FilterPanel
          id={sizeMenuId}
          label="Choose a size"
          open={openMenu === "size"}
          className="w-48"
        >
          <Link
            href={shopListingHref(withShopListingSize(query))}
            aria-current={!hasSelectedSize ? "true" : undefined}
            tabIndex={openMenu === "size" ? undefined : -1}
            onClick={closeMenus}
            className={optionClassName(!hasSelectedSize)}
          >
            All sizes
            <ActiveTick visible={!hasSelectedSize} />
          </Link>
          {visibleSizes.map((size) => {
            const selected = selectedSize === size;
            return (
              <Link
                key={size}
                href={shopListingHref(withShopListingSize(query, size))}
                aria-current={selected ? "true" : undefined}
                tabIndex={openMenu === "size" ? undefined : -1}
                onClick={closeMenus}
                className={optionClassName(selected)}
              >
                <span>{size} ml</span>
                <span className="flex items-center gap-2">
                  <span className="font-sans text-xs font-medium normal-case opacity-65">
                    {sizeCounts[size]}
                  </span>
                  <ActiveTick visible={selected} />
                </span>
              </Link>
            );
          })}
        </FilterPanel>
      </div>

      <div className={cn("relative", compact && "min-w-0")}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-expanded={openMenu === "sort"}
          aria-controls={sortMenuId}
          onClick={(event) => toggleMenu("sort", event)}
          className={cn(
            triggerClassName,
            query.sort === "catalog" ? idleTriggerClassName : "aura-cream-action",
            compact && "min-h-11 w-full px-1.5 text-xs max-[359px]:px-1 [&_[data-icon=inline-start]]:hidden [&_[data-icon=inline-end]]:hidden",
          )}
        >
          <HugeiconsIcon icon={Sorting01Icon} strokeWidth={1.8} data-icon="inline-start" />
          <span className={cn(compact && "truncate")}>{sortLabel}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={1.8} data-icon="inline-end" />
        </Button>
        <FilterPanel
          id={sortMenuId}
          label="Choose a sort order"
          open={openMenu === "sort"}
          className={cn("w-40", compact && "right-0 left-auto")}
        >
          {sortOptions.map((option) => {
            const selected = query.sort === option.value;
            return (
              <Link
                key={option.value}
                href={shopListingHref(withShopListingSort(query, option.value))}
                aria-current={selected ? "true" : undefined}
                tabIndex={openMenu === "sort" ? undefined : -1}
                onClick={closeMenus}
                className={optionClassName(selected)}
              >
                {option.label}
                <ActiveTick visible={selected} />
              </Link>
            );
          })}
        </FilterPanel>
      </div>
    </div>
  );
}
