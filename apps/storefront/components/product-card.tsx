"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import type { StorefrontProduct } from "@/lib/catalog";
import { useCart } from "./cart-provider";

export function ProductCard({
  product,
}: Readonly<{ product: StorefrontProduct }>) {
  const { addItem, loading } = useCart();
  const [actionError, setActionError] = useState<string | null>(null);

  const purchasableVariant = product.variants.find(
    (variant) => variant.purchasable && variant.price,
  );
  const canPurchase = Boolean(purchasableVariant);

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

  return (
    <article
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
        <p className="pointer-events-none absolute inset-x-4 top-5 z-10 text-center font-display text-[clamp(2.1rem,4vw,4.5rem)] leading-[0.86] tracking-[-0.02em] text-[var(--aura-ivory)] opacity-0 drop-shadow-[0_2px_16px_rgba(16,11,6,.35)] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
          {product.name}
        </p>
        {product.publicationState === "design_preview" ? (
          <span className="absolute left-3 top-3 z-10 border border-[color:var(--aura-rule)] bg-[var(--aura-ink)]/78 px-2.5 py-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--aura-ivory)] group-hover:opacity-0 group-focus-within:opacity-0">
            Preview
          </span>
        ) : null}
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--aura-ivory)]"
          aria-label={`View ${product.name}`}
        />

        <div className="product-card-actions pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-[var(--aura-gap)]">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canPurchase || loading}
              aria-label={
                canPurchase ? "Add to cart" : "Add to cart is not available yet"
              }
              className="pointer-events-auto min-h-12 rounded-[var(--aura-radius)] border border-[var(--aura-ivory)] bg-[var(--aura-ivory)] px-2 font-display text-sm tracking-[0.03em] text-[var(--aura-ink)] transition enabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] disabled:cursor-not-allowed sm:px-3 sm:text-base"
            >
              Add to cart
            </button>
            <Link
              href={`/products/${product.slug}`}
              className="pointer-events-auto inline-flex min-h-12 items-center justify-between gap-1 rounded-[var(--aura-radius)] border border-[var(--aura-ivory)] bg-transparent px-2 font-display text-sm tracking-[0.03em] text-[var(--aura-ivory)] transition hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] sm:gap-2 sm:px-4 sm:text-base"
            >
              View product
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.7} />
            </Link>
          </div>
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
