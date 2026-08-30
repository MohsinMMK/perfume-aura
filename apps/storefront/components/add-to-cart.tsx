"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import type { StorefrontProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";
import { ProductWhatsAppAction } from "./whatsapp-contact-action";

export function AddToCart({ product }: Readonly<{ product: StorefrontProduct }>) {
  const firstVariant = product.variants[0];
  const [variantId, setVariantId] = useState(firstVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { cart, loading, setDrawerOpen, setQuantity: setCartQuantity } = useCart();
  const variant = useMemo(
    () => product.variants.find((candidate) => candidate.id === variantId),
    [product.variants, variantId],
  );
  const purchasable = Boolean(variant?.purchasable && variant.price);
  const addToCartTotal = variant?.price
    ? {
        ...variant.price,
        amountMinor: variant.price.amountMinor * quantity,
      }
    : null;

  async function submit() {
    if (!variant || !purchasable) return;
    const currentQuantity =
      cart?.lines.find((line) => line.variantId === variant.id)?.quantity ?? 0;
    setError(null);
    try {
      await setCartQuantity(variant.id, Math.min(currentQuantity + quantity, 10));
      setDrawerOpen(true);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unable to add this item.";
      setError(message);
    }
  }

  return (
    <div className="col-span-2 flex h-full min-h-0 flex-col gap-2 text-[var(--aura-ivory)] sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:grid sm:h-auto sm:gap-[var(--aura-gap)]">
      <ProductWhatsAppAction
        productName={product.name}
        sizeMl={variant?.sizeMl ?? null}
        quantity={quantity}
        unitPrice={variant?.price ?? null}
        totalPrice={addToCartTotal}
      />
      <fieldset>
        <legend className="sr-only">Size</legend>
        <div className="flex flex-wrap gap-[var(--aura-gap)]">
          {product.variants.map((option) => {
            const selected = option.id === variantId;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setVariantId(option.id)}
                className={`min-h-11 min-w-0 flex-1 rounded-[var(--aura-radius)] border px-2 font-display text-base tracking-[0.03em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] sm:min-h-12 sm:min-w-[5.5rem] sm:px-3 ${
                  selected
                    ? "border-[var(--aura-ivory)] bg-[var(--aura-ivory)] text-[var(--aura-ink)]"
                    : "border-[color:var(--aura-rule)] bg-transparent text-[var(--aura-ivory)] hover:border-[var(--aura-ivory)]"
                }`}
              >
                {option.sizeMl} ml
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid min-h-12 grid-cols-[1fr_8rem] overflow-hidden rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] sm:min-h-[4.75rem] sm:grid-cols-[1fr_8.5rem] lg:grid-cols-[1fr_10rem]">
        <p className="grid content-center px-4 font-display text-lg sm:text-xl">
          {variant?.price ? formatMoney(variant.price) : "Price pending"}
        </p>
        <div className="grid border-l border-[color:var(--aura-rule)]">
          <span className="sr-only">Quantity</span>
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="min-h-12 min-w-11 rounded-none text-[var(--aura-ivory)] hover:bg-white/10 hover:text-white sm:min-h-14"
              aria-label="Decrease quantity"
              disabled={quantity === 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.8} />
            </Button>
            <output className="grid min-h-12 min-w-8 flex-1 place-items-center text-base sm:min-h-14 sm:min-w-10" aria-live="polite">
              {quantity}
            </output>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="min-h-12 min-w-11 rounded-none text-[var(--aura-ivory)] hover:bg-white/10 hover:text-white sm:min-h-14"
              aria-label="Increase quantity"
              disabled={quantity === 10}
              onClick={() => setQuantity((value) => Math.min(10, value + 1))}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <Button
        type="button"
        size="lg"
        className="min-h-12 w-full justify-between rounded-[var(--aura-radius)] bg-[var(--aura-brass)] px-4 font-display text-lg text-[var(--aura-ink)] hover:bg-[var(--aura-ivory)] sm:min-h-[4.75rem] sm:px-6 sm:text-xl lg:text-2xl"
        disabled={!purchasable || loading}
        onClick={submit}
      >
        <span>{purchasable ? loading ? "Updating cart…" : "Add to cart" : "Not available yet"}</span>
        <span aria-live="polite">
          {addToCartTotal ? formatMoney(addToCartTotal) : "Unpriced"}
        </span>
      </Button>

      <div
        data-product-sticky-top
        className="invisible fixed inset-x-0 top-0 z-40 bg-[color:rgb(16_11_6_/_98%)] px-2 pb-2 pt-[4.25rem] opacity-0 shadow-[0_0.75rem_2rem_rgb(0_0_0_/_32%)] backdrop-blur-md sm:hidden"
      >
        <div className="flex min-h-14 items-center gap-2 rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] p-1.5">
          <Link
            href="/shop"
            aria-label="Back to the Perfume Aura shop"
            className="grid min-h-11 min-w-11 place-items-center rounded-[calc(var(--aura-radius)-0.2rem)] border border-[color:var(--aura-rule)] text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.8} className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <span className="block text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-[var(--aura-text-muted-on-ink)]">
              Selected fragrance
            </span>
            <span className="font-display block truncate text-lg leading-none">
              {product.name}
            </span>
          </div>
          <span className="grid min-h-11 min-w-14 place-items-center rounded-[calc(var(--aura-radius)-0.2rem)] bg-[var(--aura-ivory)] px-2 font-display text-sm text-[var(--aura-ink)]">
            {variant ? `${variant.sizeMl} ml` : "—"}
          </span>
        </div>
      </div>

      <div
        data-product-sticky-bottom
        className="invisible fixed inset-x-0 bottom-0 z-40 bg-transparent px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 opacity-0 sm:hidden"
      >
        <Button
          type="button"
          size="lg"
          className="min-h-13 w-full justify-between rounded-[var(--aura-radius)] bg-[var(--aura-brass)] px-4 font-display text-lg text-[var(--aura-ink)] hover:bg-[var(--aura-ivory)]"
          disabled={!purchasable || loading}
          onClick={submit}
        >
          <span>{purchasable ? loading ? "Updating cart…" : "Add to cart" : "Not available yet"}</span>
          <span aria-live="polite">
            {addToCartTotal ? formatMoney(addToCartTotal) : "Unpriced"}
          </span>
        </Button>
      </div>
    </div>
  );
}
