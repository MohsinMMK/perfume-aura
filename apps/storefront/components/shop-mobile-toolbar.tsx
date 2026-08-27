"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { cn } from "@perfume-aura/ui/lib/utils";
import { ShopFilterPopovers } from "@/components/shop-filter-popovers";
import {
  shopListingHref,
  type ShopListingQuery,
  type ShopListingSize,
} from "@/lib/shop-listing-query";

const instantSearchDelayMs = 220;

export function ShopMobileToolbar({
  query,
  sizeCounts,
}: Readonly<{
  query: ShopListingQuery;
  sizeCounts: Readonly<Record<ShopListingSize, number>>;
}>) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(query.q);
  const [pinned, setPinned] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let updateFrame: number | null = null;

    function updatePinnedState(): void {
      updateFrame = null;
      const stickyControls = toolbarRef.current?.closest<HTMLElement>(
        "[data-shop-sticky-controls]",
      );
      const nextPinned =
        stickyControls != null && stickyControls.getBoundingClientRect().top <= 88.5;
      setPinned((currentPinned) =>
        currentPinned === nextPinned ? currentPinned : nextPinned,
      );
    }

    function schedulePinnedStateUpdate(): void {
      if (updateFrame != null) return;
      updateFrame = window.requestAnimationFrame(updatePinnedState);
    }

    schedulePinnedStateUpdate();
    window.addEventListener("scroll", schedulePinnedStateUpdate, { passive: true });
    window.addEventListener("resize", schedulePinnedStateUpdate);
    return () => {
      if (updateFrame != null) window.cancelAnimationFrame(updateFrame);
      window.removeEventListener("scroll", schedulePinnedStateUpdate);
      window.removeEventListener("resize", schedulePinnedStateUpdate);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen || searchValue.trim() === query.q) return;
    const timeout = window.setTimeout(() => {
      startTransition(() => {
        router.replace(
          shopListingHref({ ...query, q: searchValue.trim() }),
          { scroll: false },
        );
      });
    }, instantSearchDelayMs);
    return () => window.clearTimeout(timeout);
  }, [query, router, searchOpen, searchValue]);

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    startTransition(() => {
      router.replace(shopListingHref({ ...query, q: searchValue.trim() }), {
        scroll: false,
      });
    });
  }

  function closeSearch(): void {
    setSearchOpen(false);
    window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLFormElement>): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeSearch();
  }

  return (
    <div
      ref={toolbarRef}
      className="relative isolate h-11"
      data-mobile-shop-toolbar
      data-pinned={pinned ? "true" : "false"}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-0 h-[8.75rem] border-b border-[color:var(--aura-rule)] bg-[var(--aura-ink)] transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          pinned ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden={searchOpen}
        inert={searchOpen}
        className={cn(
          "relative z-10 grid h-11 grid-cols-[repeat(3,minmax(0,1fr))_2.75rem] items-center gap-1.5 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          searchOpen
            ? "pointer-events-none -translate-y-1 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <ShopFilterPopovers query={query} sizeCounts={sizeCounts} compact />
        <Button
          ref={searchTriggerRef}
          type="button"
          variant="outline"
          size="icon"
          aria-label={query.q ? `Search catalog, current search ${query.q}` : "Search catalog"}
          aria-expanded={searchOpen}
          onClick={() => {
            setSearchValue(query.q);
            setSearchOpen(true);
          }}
          className={cn(
            "min-h-11 min-w-11 shrink-0 rounded-[var(--aura-radius)] border-[color:var(--aura-rule)] text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]",
            query.q
              ? "aura-cream-action"
              : "bg-transparent hover:border-[var(--aura-ivory)] hover:bg-transparent hover:text-[var(--aura-ivory)]",
          )}
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={1.8} />
        </Button>
      </div>

      <form
        role="search"
        aria-label="Search the catalog"
        aria-hidden={!searchOpen}
        inert={!searchOpen}
        onSubmit={submitSearch}
        onKeyDown={handleSearchKeyDown}
        className={cn(
          "absolute inset-0 z-10 flex h-11 origin-right items-stretch transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          searchOpen
            ? "visible scale-x-100 opacity-100"
            : "pointer-events-none invisible scale-x-95 opacity-0",
        )}
      >
        <label htmlFor="shop-mobile-search" className="sr-only">
          Search the catalog
        </label>
        <input
          ref={inputRef}
          id="shop-mobile-search"
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search perfumes"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 min-w-0 flex-1 rounded-l-[var(--aura-radius)] border border-r-0 border-[color:var(--aura-rule)] bg-[var(--aura-ink)] px-3 text-base text-[var(--aura-ivory)] outline-none placeholder:text-[var(--aura-text-muted-on-ink)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Apply search"
          className="aura-cream-action min-h-11 min-w-11 rounded-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]"
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={1.8} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Close search"
          onClick={closeSearch}
          className="min-h-11 min-w-11 rounded-l-none rounded-r-[var(--aura-radius)] border-[color:var(--aura-rule)] bg-[var(--aura-ink)] text-[var(--aura-ivory)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.8} />
        </Button>
      </form>
    </div>
  );
}
