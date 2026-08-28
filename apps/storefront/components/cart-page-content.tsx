"use client";

import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";

export function CartPageContent() {
  const { cart, loading, setQuantity } = useCart();

  if (!cart?.lines.length) {
    return (
      <div className="border border-dashed border-black/30 px-6 py-20 text-center">
        <h2 className="font-display text-4xl">Your cart is quiet.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--aura-text-muted-on-ivory)]">Explore the collection and choose a scent to add here.</p>
        <Button render={<Link href="/shop" />} nativeButton={false} className="mt-7 min-h-12 rounded-none bg-[var(--aura-ink)] px-8 text-[var(--aura-ivory)] hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0">Explore the collection</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_26rem]">
      <ul className="space-y-5">
        {cart.lines.map((line) => (
          <li key={line.variantId} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-black/20 pb-5 sm:grid-cols-[9rem_1fr]">
            <div className="relative aspect-square bg-[#211f1d]">
              <Image src={line.image} alt="" fill sizes="144px" className="object-cover" />
            </div>
            <div className="flex min-w-0 flex-col justify-between py-1 sm:flex-row sm:items-center">
              <div>
                <Link href={`/products/${line.productSlug}`} className="font-display text-2xl hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)]">{line.productName}</Link>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#655f57]">{line.sizeMl} ml</p>
                <p className="mt-2 text-sm">{formatMoney(line.unitPrice)}</p>
              </div>
              <div className="mt-4 flex items-center sm:mt-0">
                <Button type="button" variant="outline" size="icon-lg" className="min-h-11 min-w-11 rounded-none border-black/25 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0" aria-label={`Decrease ${line.productName} quantity`} disabled={loading} onClick={() => setQuantity(line.variantId, line.quantity - 1)}>
                  <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.8} />
                </Button>
                <output className="grid min-h-11 min-w-11 place-items-center" aria-live="polite">{line.quantity}</output>
                <Button type="button" variant="outline" size="icon-lg" className="min-h-11 min-w-11 rounded-none border-black/25 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0" aria-label={`Increase ${line.productName} quantity`} disabled={loading || line.quantity >= 10} onClick={() => setQuantity(line.variantId, line.quantity + 1)}>
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="border border-black/20 bg-[#fbf8f2] p-6 lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-display text-3xl">Summary</h2>
        <div className="mt-6 flex justify-between border-t border-black/20 pt-4 text-sm">
          <span>Subtotal</span>
          <strong>{formatMoney(cart.subtotal)}</strong>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--aura-text-muted-on-ivory)]">Shipping and tax details are not included in this preview.</p>
        <div className="mt-5 border-y border-black/20 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">How checkout will work</p>
          <ol className="mt-3 grid gap-2 text-sm text-[var(--aura-text-muted-on-ivory)]">
            <li><strong className="text-[var(--aura-ink)]">1.</strong> Sign in with a verified account.</li>
            <li><strong className="text-[var(--aura-ink)]">2.</strong> Confirm your delivery address.</li>
            <li><strong className="text-[var(--aura-ink)]">3.</strong> Complete prepaid UPI in Cashfree.</li>
          </ol>
        </div>
        <Button
          render={cart.checkoutEnabled ? <Link href="/checkout" /> : undefined}
          className="mt-6 min-h-12 w-full rounded-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0"
          disabled={!cart.checkoutEnabled}
        >
          {cart.checkoutEnabled ? "Continue to checkout" : "Checkout not yet available"}
        </Button>
        <p className="mt-3 text-xs leading-5 text-[var(--aura-text-muted-on-ivory)]">{cart.checkoutBlockReason} No payment will be requested while checkout is closed.</p>
      </aside>
    </div>
  );
}
