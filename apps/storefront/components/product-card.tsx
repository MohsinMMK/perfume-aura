"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import type { StorefrontProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";

type ReversibleTimeline = Readonly<{
  play: () => unknown;
  reverse: () => unknown;
  kill: () => unknown;
}>;

export function ProductCard({
  product,
  priority = false,
}: Readonly<{ product: StorefrontProduct; priority?: boolean }>) {
  const router = useRouter();
  const { addItem, loading, setDrawerOpen } = useCart();
  const rootRef = useRef<HTMLElement>(null);
  const flatImageRef = useRef<HTMLImageElement>(null);
  const campaignImageRef = useRef<HTMLImageElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<ReversibleTimeline | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const firstPrice = product.variants.find((variant) => variant.price)?.price;
  const purchasableVariant = product.variants.find(
    (variant) => variant.purchasable && variant.price,
  );
  const canPurchase = Boolean(purchasableVariant);
  const priceLabel = firstPrice
    ? `From ${formatMoney(firstPrice)}`
    : "Price approval pending";

  useEffect(() => {
    const root = rootRef.current;
    const flatImage = flatImageRef.current;
    const campaignImage = campaignImageRef.current;
    const actions = actionsRef.current;
    const title = titleRef.current;
    if (!root || !flatImage || !campaignImage || !actions || !title) return;

    const precisePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!precisePointer.matches) return;

    let active = true;
    void import("gsap").then(({ default: gsap }) => {
      if (!active) return;
      const context = gsap.context(() => {
        gsap.set(campaignImage, {
          clipPath: "inset(100% 0 0 0)",
          scale: 1.08,
        });
        gsap.set(actions, { autoAlpha: 0, y: 24 });

        timelineRef.current = gsap
          .timeline({ paused: true, defaults: { ease: "power4.out" } })
          .to(campaignImage, {
            clipPath: "inset(0% 0 0 0)",
            scale: 1,
            duration: 0.58,
          })
          .to(flatImage, { scale: 1.045, duration: 0.58 }, 0)
          .to(title, { y: -8, duration: 0.42 }, 0.08)
          .to(actions, { autoAlpha: 1, y: 0, duration: 0.38 }, 0.14);
      }, root);

      const timeline = timelineRef.current;
      if (root.matches(":hover") || root.matches(":focus-within")) {
        timeline?.play();
      }

      timelineRef.current = {
        play: () => timeline?.play(),
        reverse: () => timeline?.reverse(),
        kill: () => {
          timeline?.kill();
          context.revert();
        },
      };
    });

    return () => {
      active = false;
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, []);

  function revealCard() {
    timelineRef.current?.play();
  }

  function concealCard() {
    timelineRef.current?.reverse();
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) concealCard();
  }

  async function handleAddToCart() {
    if (!purchasableVariant) return;
    setActionError(null);
    try {
      await addItem(purchasableVariant.id);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update the cart.",
      );
    }
  }

  async function handleBuyNow() {
    if (!purchasableVariant) return;
    setActionError(null);
    try {
      await addItem(purchasableVariant.id);
      setDrawerOpen(false);
      router.push("/checkout");
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
    }
  }

  return (
    <article
      ref={rootRef}
      data-motion-product-card
      className="group min-w-0 border-t border-dashed border-[color:rgb(245_228_199_/_28%)] pt-2 text-[var(--aura-ivory)]"
      onPointerEnter={revealCard}
      onPointerLeave={concealCard}
      onFocusCapture={revealCard}
      onBlurCapture={handleBlur}
    >
      <div className="product-card-stage relative aspect-[5/8] overflow-hidden rounded-[0.65rem] bg-[var(--aura-brass)]">
        <Image
          ref={flatImageRef}
          src={product.cardImage ?? product.image}
          alt={product.imageAlt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 92vw, (max-width: 1200px) 46vw, 31vw"
          className="product-card-flat object-cover"
        />
        <Image
          ref={campaignImageRef}
          src={product.image}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 768px) 92vw, (max-width: 1200px) 46vw, 31vw"
          className="product-card-campaign object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,11,6,.22)_0%,transparent_24%,transparent_52%,rgba(16,11,6,.94)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 text-center drop-shadow-[0_2px_16px_rgba(16,11,6,.35)]">
          <p className="font-display text-[clamp(2.1rem,4vw,4.5rem)] leading-[0.86] tracking-[-0.02em] text-[var(--aura-ivory)]">
            {product.name}
          </p>
        </div>
        {product.publicationState === "design_preview" ? (
          <span className="absolute bottom-3 left-3 z-10 border border-[color:rgb(245_228_199_/_35%)] bg-[var(--aura-ink)]/78 px-2.5 py-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--aura-ivory)] group-hover:opacity-0 group-focus-within:opacity-0">
            Design preview
          </span>
        ) : null}
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--aura-ivory)]"
          aria-label={`View ${product.name}`}
        />

        <div
          ref={actionsRef}
          className="product-card-actions absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4"
        >
          <div className="mb-3 flex items-end justify-between gap-3 text-[var(--aura-ivory)]">
            <span className="font-display text-lg tracking-[0.03em]">
              {priceLabel}
            </span>
            <Link
              href={`/products/${product.slug}`}
              className="grid min-h-11 min-w-11 place-items-center rounded-[0.45rem] border border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)]/40 transition hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={`View ${product.name} details`}
            >
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.7} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canPurchase || loading}
              className="min-h-12 rounded-[0.55rem] border border-[var(--aura-ivory)] bg-[var(--aura-ivory)] px-3 font-display text-base tracking-[0.03em] text-[var(--aura-ink)] transition enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canPurchase || loading}
              className="min-h-12 rounded-[0.55rem] border border-[color:rgb(245_228_199_/_60%)] bg-[var(--aura-ink)]/45 px-3 font-display text-base tracking-[0.03em] text-white transition enabled:hover:bg-white enabled:hover:text-[var(--aura-ink)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <div ref={titleRef} className="flex items-start justify-between gap-4 px-1 py-4">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:rgb(245_228_199_/_55%)]">
            {product.eyebrow}
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-[0.01em] sm:text-3xl">
            <Link href={`/products/${product.slug}`} className="hover:underline hover:underline-offset-8">
              View {product.name}
            </Link>
          </h2>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {actionError}
      </p>
    </article>
  );
}
