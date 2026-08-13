"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import type { StorefrontProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";

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
    <div className="border-t border-dashed border-[color:rgb(245_228_199_/_28%)] pt-4 text-[var(--aura-ivory)]">
      <div className="grid grid-cols-[1fr_8.5rem] gap-3">
        <div>
          <label htmlFor="product-size" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">
            Size
          </label>
          <NativeSelect
            id="product-size"
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="w-full border-[color:rgb(245_228_199_/_35%)] text-[var(--aura-ivory)]"
          >
            {product.variants.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.sizeMl} ml{option.price ? ` — ${formatMoney(option.price)}` : " — price unavailable"}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Quantity</span>
          <div className="flex rounded-[0.55rem] border border-[color:rgb(245_228_199_/_35%)]">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="min-h-11 min-w-11 rounded-[0.5rem] text-[var(--aura-ivory)] hover:bg-white/10 hover:text-white"
              aria-label="Decrease quantity"
              disabled={quantity === 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.8} />
            </Button>
            <output className="grid min-h-11 min-w-10 flex-1 place-items-center" aria-live="polite">
              {quantity}
            </output>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="min-h-11 min-w-11 rounded-[0.5rem] text-[var(--aura-ivory)] hover:bg-white/10 hover:text-white"
              aria-label="Increase quantity"
              disabled={quantity === 10}
              onClick={() => setQuantity((value) => Math.min(10, value + 1))}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="mt-4 min-h-16 w-full rounded-[0.65rem] bg-[var(--aura-brass)] font-display text-xl text-[var(--aura-ink)] hover:bg-[var(--aura-ivory)]"
        disabled={!purchasable || loading}
        onClick={submit}
      >
        {purchasable
          ? loading
            ? "Updating cart…"
            : `Add to cart · ${variant?.price ? formatMoney(variant.price) : ""}`
          : "Not available yet"}
      </Button>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <p className="mt-3 text-xs leading-5 text-[var(--aura-text-muted-on-ink)]">
        {purchasable
          ? "Price and availability are checked again whenever your cart changes."
          : "This scent is not available to purchase yet."}
      </p>
    </div>
  );
}
