"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import type { StorefrontProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";

export function ProductCard({
  product,
}: Readonly<{ product: StorefrontProduct }>) {
  const router = useRouter();
  const { addItem, loading, setDrawerOpen } = useCart();
  const [actionError, setActionError] = useState<string | null>(null);

  const firstPrice = product.variants.find((variant) => variant.price)?.price;
  const purchasableVariant = product.variants.find(
    (variant) => variant.purchasable && variant.price,
  );
  const canPurchase = Boolean(purchasableVariant);
  const priceLabel = firstPrice
    ? `From ${formatMoney(firstPrice)}`
    : "Price not available yet";

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
      data-motion-product-card
      className="group min-w-0 border-t border-dashed border-[color:rgb(245_228_199_/_28%)] pt-2 text-[var(--aura-ivory)]"
    >
      <div className="product-card-stage relative aspect-[5/8] overflow-hidden rounded-[0.65rem] bg-[var(--aura-brass)]">
        <Image
          src={product.cardImage ?? product.image}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 1023px) 92vw, 31vw"
          className="product-card-flat object-cover"
        />
        <Image
          src={product.image}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 1023px) 92vw, 31vw"
          className="product-card-campaign object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,11,6,.22)_0%,transparent_24%,transparent_52%,rgba(16,11,6,.94)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 text-center drop-shadow-[0_2px_16px_rgba(16,11,6,.35)]">
          <p className="font-display text-[clamp(2.1rem,4vw,4.5rem)] leading-[0.86] tracking-[-0.02em] text-[var(--aura-ivory)]">
            {product.name}
          </p>
        </div>
        {product.publicationState === "design_preview" ? (
          <span className="absolute left-3 top-3 z-10 border border-[color:rgb(245_228_199_/_35%)] bg-[var(--aura-ink)]/78 px-2.5 py-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--aura-ivory)] group-hover:opacity-0 group-focus-within:opacity-0">
            Preview
          </span>
        ) : null}
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--aura-ivory)]"
          aria-label={`View ${product.name}`}
        />

        <div className="product-card-actions pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4">
          <div className="mb-3 flex items-end justify-between gap-3 text-[var(--aura-ivory)]">
            <span className="font-display text-lg tracking-[0.03em]">
              {priceLabel}
            </span>
            <span
              className="grid min-h-11 min-w-11 place-items-center rounded-[0.45rem] border border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)]/40"
              aria-hidden="true"
            >
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.7} />
            </span>
          </div>
          {canPurchase ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={loading}
                className="pointer-events-auto min-h-12 rounded-[0.55rem] border border-[var(--aura-ivory)] bg-[var(--aura-ivory)] px-3 font-display text-base tracking-[0.03em] text-[var(--aura-ink)] transition enabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Buy now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={loading}
                className="pointer-events-auto min-h-12 rounded-[0.55rem] border border-[color:rgb(245_228_199_/_60%)] bg-[var(--aura-ink)]/45 px-3 font-display text-base tracking-[0.03em] text-white transition enabled:hover:bg-white enabled:hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Add to cart
              </button>
            </div>
          ) : (
            <div
              className="flex min-h-12 w-full items-center justify-between rounded-[0.55rem] border border-[var(--aura-ivory)] bg-[var(--aura-ivory)] px-4 font-display text-base tracking-[0.03em] text-[var(--aura-ink)]"
              aria-hidden="true"
            >
              View scent
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.7} />
            </div>
          )}
        </div>
      </div>

      <div className="product-card-title flex items-start justify-between gap-4 px-1 py-4">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--aura-text-muted-on-ink)]">
            {product.eyebrow}
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-[0.01em] sm:text-3xl">
            {product.name}
          </h2>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {actionError}
      </p>
    </article>
  );
}
