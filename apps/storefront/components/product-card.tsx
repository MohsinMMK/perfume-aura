"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  ShoppingBag01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import type { StorefrontProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";

const sizeMenuDismissDistancePx = 96;
const sizeMenuDismissDelayMs = 180;
const sizeMenuScrollDismissDistancePx = 32;
const sizeMenuSelectionCloseDelayMs = 0;
const cardLinkReleaseDelayMs = 260;
const inspiredByPrefix = "Inspired by ";
const sizeMenuWidthPx = 224;
const sizeMenuViewportGutterPx = 12;

type SizeMenuPosition = Readonly<{
  left: number;
  bottom: number;
  width: number;
}>;

function distanceFromRectangle(
  x: number,
  y: number,
  rectangle: DOMRect,
): number {
  const horizontalDistance = Math.max(
    rectangle.left - x,
    0,
    x - rectangle.right,
  );
  const verticalDistance = Math.max(
    rectangle.top - y,
    0,
    y - rectangle.bottom,
  );
  return Math.hypot(horizontalDistance, verticalDistance);
}

export function ProductCard({
  product,
}: Readonly<{ product: StorefrontProduct }>) {
  const { addItem, loading } = useCart();
  const [actionError, setActionError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [sizeMenuPosition, setSizeMenuPosition] =
    useState<SizeMenuPosition | null>(null);
  const [cardLinkSuppressed, setCardLinkSuppressed] = useState(false);
  const addedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeMenuDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sizeMenuFocusReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sizeMenuSelectionCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const cardLinkReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const cardElement = useRef<HTMLElement | null>(null);
  const sizeMenuElement = useRef<HTMLDivElement | null>(null);
  const sizeMenuTriggerElement = useRef<HTMLButtonElement | null>(null);

  const defaultVariant =
    product.variants.find((variant) => variant.purchasable && variant.price) ??
    product.variants.find((variant) => variant.price) ??
    product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(
    defaultVariant?.id ?? "",
  );
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    defaultVariant;
  const canPurchase = Boolean(
    selectedVariant?.purchasable && selectedVariant.price,
  );
  const inspiredReferenceName =
    product.collectionSlug === "inspired" &&
    product.name.startsWith(inspiredByPrefix)
      ? product.name.slice(inspiredByPrefix.length)
      : null;

  const releaseSizeMenuPointerFocus = useCallback((force = false) => {
    if (sizeMenuFocusReleaseTimer.current) {
      clearTimeout(sizeMenuFocusReleaseTimer.current);
    }

    function blurPointerFocus() {
      const triggerElement = sizeMenuTriggerElement.current;
      const focusedElement = document.activeElement;
      const focusIsKeyboardVisible =
        triggerElement?.matches(":focus-visible") ||
        (focusedElement instanceof HTMLElement &&
          focusedElement.matches(":focus-visible"));
      if (!force && focusIsKeyboardVisible) return;

      triggerElement?.blur();
      if (
        focusedElement instanceof HTMLElement &&
        cardElement.current?.contains(focusedElement)
      ) {
        focusedElement.blur();
      }
    }

    requestAnimationFrame(blurPointerFocus);
    sizeMenuFocusReleaseTimer.current = setTimeout(() => {
      blurPointerFocus();
      sizeMenuFocusReleaseTimer.current = null;
    }, 160);
  }, []);

  const handleSizeMenuOpenChange = useCallback((open: boolean) => {
    setSizeMenuOpen(open);
    if (cardLinkReleaseTimer.current) {
      clearTimeout(cardLinkReleaseTimer.current);
      cardLinkReleaseTimer.current = null;
    }
    if (open) {
      setCardLinkSuppressed(true);
      return;
    }

    cardLinkReleaseTimer.current = setTimeout(() => {
      setCardLinkSuppressed(false);
      cardLinkReleaseTimer.current = null;
    }, cardLinkReleaseDelayMs);
    if (sizeMenuSelectionCloseTimer.current) {
      clearTimeout(sizeMenuSelectionCloseTimer.current);
      sizeMenuSelectionCloseTimer.current = null;
    }
    releaseSizeMenuPointerFocus();
  }, [releaseSizeMenuPointerFocus]);

  useEffect(() => {
    return () => {
      if (addedResetTimer.current) clearTimeout(addedResetTimer.current);
      if (sizeMenuDismissTimer.current) {
        clearTimeout(sizeMenuDismissTimer.current);
      }
      if (sizeMenuFocusReleaseTimer.current) {
        clearTimeout(sizeMenuFocusReleaseTimer.current);
      }
      if (sizeMenuSelectionCloseTimer.current) {
        clearTimeout(sizeMenuSelectionCloseTimer.current);
      }
      if (cardLinkReleaseTimer.current) {
        clearTimeout(cardLinkReleaseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sizeMenuOpen) return;
    const openingScrollY = window.scrollY;

    function handleMouseMove(event: MouseEvent) {
      const cardRectangle = cardElement.current?.getBoundingClientRect();
      const menuRectangle = sizeMenuElement.current?.getBoundingClientRect();
      const distances = [cardRectangle, menuRectangle]
        .filter((rectangle): rectangle is DOMRect => Boolean(rectangle))
        .map((rectangle) =>
          distanceFromRectangle(event.clientX, event.clientY, rectangle),
        );
      const distanceFromSafeArea = Math.min(...distances);

      if (distanceFromSafeArea <= sizeMenuDismissDistancePx) {
        if (sizeMenuDismissTimer.current) {
          clearTimeout(sizeMenuDismissTimer.current);
          sizeMenuDismissTimer.current = null;
        }
        return;
      }

      if (!sizeMenuDismissTimer.current) {
        sizeMenuDismissTimer.current = setTimeout(() => {
          handleSizeMenuOpenChange(false);
          releaseSizeMenuPointerFocus(true);
          sizeMenuDismissTimer.current = null;
        }, sizeMenuDismissDelayMs);
      }
    }

    function handleScroll() {
      if (
        Math.abs(window.scrollY - openingScrollY) <
        sizeMenuScrollDismissDistancePx
      ) {
        return;
      }
      handleSizeMenuOpenChange(false);
      releaseSizeMenuPointerFocus(true);
    }

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (
        sizeMenuElement.current?.contains(event.target) ||
        sizeMenuTriggerElement.current?.contains(event.target)
      ) {
        return;
      }
      handleSizeMenuOpenChange(false);
      releaseSizeMenuPointerFocus(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleSizeMenuOpenChange(false);
      sizeMenuTriggerElement.current?.focus();
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      if (sizeMenuDismissTimer.current) {
        clearTimeout(sizeMenuDismissTimer.current);
        sizeMenuDismissTimer.current = null;
      }
    };
  }, [handleSizeMenuOpenChange, releaseSizeMenuPointerFocus, sizeMenuOpen]);

  useEffect(() => {
    if (!sizeMenuOpen) return;
    const focusFrame = requestAnimationFrame(() => {
      sizeMenuElement.current
        ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
        ?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(focusFrame);
  }, [selectedVariantId, sizeMenuOpen]);

  async function handleAddToCart() {
    if (!canPurchase || !selectedVariant) return;
    setActionError(null);
    try {
      await addItem(selectedVariant.id);
      setAdded(true);
      if (addedResetTimer.current) clearTimeout(addedResetTimer.current);
      addedResetTimer.current = setTimeout(() => setAdded(false), 1400);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update the cart.",
      );
    }
  }

  function toggleSizeMenu() {
    if (sizeMenuOpen) {
      handleSizeMenuOpenChange(false);
      return;
    }

    const triggerRectangle = sizeMenuTriggerElement.current?.getBoundingClientRect();
    if (!triggerRectangle) return;
    const width = Math.min(
      sizeMenuWidthPx,
      window.innerWidth - sizeMenuViewportGutterPx * 2,
    );
    const left = Math.min(
      Math.max(triggerRectangle.left, sizeMenuViewportGutterPx),
      window.innerWidth - width - sizeMenuViewportGutterPx,
    );
    setSizeMenuPosition({
      left,
      bottom: window.innerHeight - triggerRectangle.top + 7,
      width,
    });
    handleSizeMenuOpenChange(true);
  }

  function scheduleSizeMenuClose() {
    if (sizeMenuSelectionCloseTimer.current) {
      clearTimeout(sizeMenuSelectionCloseTimer.current);
    }

    // Keep the popover mounted until the pointer click finishes so the click
    // cannot fall through to the full-card product link underneath it.
    sizeMenuSelectionCloseTimer.current = setTimeout(() => {
      sizeMenuSelectionCloseTimer.current = null;
      handleSizeMenuOpenChange(false);
    }, sizeMenuSelectionCloseDelayMs);
  }

  function handleVariantSelection(variantId: string) {
    setSelectedVariantId(variantId);
    setActionError(null);
    setAdded(false);
    scheduleSizeMenuClose();
  }

  return (
    <article
      ref={cardElement}
      data-motion-product-card
      className="group min-w-0 text-[var(--aura-ivory)]"
    >
      <div className="product-card-stage relative aspect-[5/8] overflow-hidden rounded-[var(--aura-radius)] bg-[var(--aura-brass)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[4px] z-30 rounded-[calc(var(--aura-radius)-4px)] border border-dashed border-[color:var(--aura-rule)]"
        />
        <Image
          src={product.cardImage ?? product.image}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 1023px) 46vw, 31vw"
          className="product-card-flat object-cover"
        />
        <Image
          src={product.image}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 1023px) 46vw, 31vw"
          className="product-card-campaign object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,11,6,.22)_0%,transparent_24%,transparent_52%,rgba(16,11,6,.94)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
        <p className="pointer-events-none absolute inset-x-4 top-5 z-10 text-center font-display text-[clamp(2.1rem,4vw,4.5rem)] leading-[0.86] tracking-[-0.02em] text-[var(--aura-ivory)] opacity-0 drop-shadow-[0_2px_16px_rgba(16,11,6,.35)] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
          {inspiredReferenceName ? (
            <>
              <span className="text-outline whitespace-nowrap">Inspired by</span>{" "}
              <span>{inspiredReferenceName}</span>
            </>
          ) : product.name}
        </p>
        {product.publicationState === "design_preview" ? (
          <span className="absolute left-3 top-3 z-10 border border-[color:var(--aura-rule)] bg-[var(--aura-ink)]/78 px-2.5 py-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--aura-ivory)] group-hover:opacity-0 group-focus-within:opacity-0">
            Preview
          </span>
        ) : null}
        <Link
          href={`/products/${product.slug}`}
          className={`absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--aura-ivory)] ${cardLinkSuppressed ? "pointer-events-none" : ""}`}
          aria-label={`View ${product.name}`}
        />

        <div className="product-card-actions pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4">
          <div className="flex flex-col gap-1.5">
            <Button
              onClick={handleAddToCart}
              disabled={!canPurchase || loading}
              data-added={added ? "true" : "false"}
              aria-label={
                canPurchase ? "Add to cart" : "Add to cart is not available yet"
              }
              className="product-card-add-button aura-cream-action pointer-events-auto min-h-11 w-full justify-between rounded-[var(--aura-radius)] px-3 font-display text-sm tracking-[0.03em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] focus-visible:ring-0 disabled:cursor-not-allowed sm:min-h-12 sm:px-4 sm:text-base"
            >
              <span>
                {added
                  ? "Added"
                  : loading
                    ? "Adding…"
                    : canPurchase
                      ? "Add to cart"
                      : selectedVariant
                        ? "Cart opens soon"
                        : "Price pending"}
              </span>
              <HugeiconsIcon
                icon={added ? Tick02Icon : ShoppingBag01Icon}
                strokeWidth={1.9}
                className="product-card-add-icon size-4"
                aria-hidden="true"
              />
            </Button>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] overflow-visible rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] bg-[color:rgb(16_11_6_/_88%)] text-[var(--aura-ivory)] backdrop-blur-sm sm:grid-cols-[minmax(0,1fr)_auto_2.75rem]">
              <div className="min-w-0">
                <Button
                  ref={sizeMenuTriggerElement}
                  type="button"
                  variant="ghost"
                  aria-label={
                    selectedVariant
                      ? `Choose size, currently ${selectedVariant.sizeMl} ml`
                      : "Choose size"
                  }
                  aria-expanded={sizeMenuOpen}
                  aria-controls={`size-menu-${product.id}`}
                  onClick={toggleSizeMenu}
                  className="pointer-events-auto min-h-11 w-full min-w-0 justify-between rounded-[var(--aura-radius)] px-1.5 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--aura-ivory)] hover:bg-[color:rgb(245_228_199_/_12%)] hover:text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--aura-ivory)] focus-visible:ring-0 sm:px-3 sm:text-xs sm:tracking-[0.08em]"
                >
                  <span className="truncate">
                    {selectedVariant ? `${selectedVariant.sizeMl} ml` : "Size"}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    strokeWidth={1.9}
                    data-icon="inline-end"
                    className="size-3 transition-transform duration-200 group-aria-expanded/button:rotate-180 motion-reduce:transition-none max-[359px]:hidden sm:size-3.5"
                    aria-hidden="true"
                  />
                </Button>
                {sizeMenuOpen && sizeMenuPosition
                  ? createPortal(
                    <div
                      ref={sizeMenuElement}
                      id={`size-menu-${product.id}`}
                      role="dialog"
                      aria-label={`Choose a size for ${product.name}`}
                      className="fixed z-[80] flex max-h-[min(24rem,calc(100dvh-1.5rem))] flex-col gap-2 overflow-y-auto overscroll-contain rounded-[var(--aura-radius)] bg-[var(--aura-ivory)] p-2.5 text-[var(--aura-ink)] shadow-[0_10px_32px_rgb(0_0_0_/_38%)] ring-1 ring-[color:rgb(16_11_6_/_18%)]"
                      style={sizeMenuPosition}
                    >
                      <div className="flex flex-col gap-0.5 px-1 pb-1">
                        <h3 className="font-display text-lg uppercase tracking-[0.02em]">
                          Choose size
                        </h3>
                        <p className="text-[0.65rem] leading-4 text-[color:rgb(16_11_6_/_64%)]">
                          Price updates before you add it.
                        </p>
                      </div>
                      <div
                        role="group"
                        aria-label={`Choose a size for ${product.name}`}
                        className="flex w-full flex-col gap-1"
                      >
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={!variant.price}
                        aria-pressed={selectedVariant?.id === variant.id}
                        onClick={() => handleVariantSelection(variant.id)}
                        aria-label={`${variant.sizeMl} ml${variant.price ? `, ${formatMoney(variant.price)}` : ", price pending"}`}
                        className="flex min-h-11 w-full items-center justify-between rounded-[var(--aura-radius)] border border-transparent px-3 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-[var(--aura-ink)] hover:bg-[color:rgb(16_11_6_/_8%)] hover:text-[var(--aura-ink)] aria-pressed:border-[var(--aura-ink)] aria-pressed:bg-[var(--aura-ink)] aria-pressed:text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--aura-ink)] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <span>{variant.sizeMl} ml</span>
                        <span className="font-sans text-[0.7rem] tracking-normal">
                          {variant.price ? formatMoney(variant.price) : "Pending"}
                        </span>
                      </button>
                    ))}
                      </div>
                    </div>,
                    document.body,
                  )
                  : null}
              </div>

              <span className="flex min-h-11 items-center border-l border-[color:var(--aura-rule)] px-1.5 text-[0.72rem] font-semibold tabular-nums sm:px-3 sm:text-xs">
                {selectedVariant?.price
                  ? formatMoney(selectedVariant.price)
                  : "Pending"}
              </span>
              <Button
                render={<Link href={`/products/${product.slug}`} />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                aria-label={`View ${product.name}`}
                className="pointer-events-auto hidden min-h-11 w-11 rounded-[var(--aura-radius)] border-l border-[color:var(--aura-rule)] text-[var(--aura-ivory)] hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--aura-ivory)] focus-visible:ring-0 sm:inline-flex"
              >
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="product-card-title flex items-start justify-between gap-4 px-1 py-3 sm:py-4">
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--aura-text-muted-on-ink)] sm:text-[0.62rem] sm:tracking-[0.14em]">
            {product.eyebrow}
          </p>
          <h2 className="mt-1 font-display text-[1.15rem] leading-[0.95] tracking-[0.01em] sm:text-3xl sm:leading-[1]">
            <Link
              href={`/products/${product.slug}`}
              className="line-clamp-2 min-h-[1.9em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] sm:min-h-[2em]"
            >
              {inspiredReferenceName ? (
                <>
                  <span className="text-outline whitespace-nowrap">Inspired by</span>{" "}
                  <span>{inspiredReferenceName}</span>
                </>
              ) : product.name}
            </Link>
          </h2>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {actionError ?? (added ? `${product.name} added to cart.` : null)}
      </p>
    </article>
  );
}
