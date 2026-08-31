"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@perfume-aura/ui/components/sheet";
import { formatMoney } from "@/lib/money";
import { CartLineImage } from "./cart-line-image";
import { useCart } from "./cart-provider";

export function CartDrawer() {
  const { cart, drawerOpen, loading, setDrawerOpen, setQuantity } = useCart();
  const lines = cart?.lines ?? [];
  const hasLines = lines.length > 0;

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent showCloseButton={false} className="aura-cart-popover overflow-hidden border-0 bg-[var(--aura-ivory)] text-[var(--aura-ink)]">
        <SheetClose
          render={
            <Button
              variant="outline"
              size="icon-lg"
              className="absolute right-4 top-4 z-10 min-h-12 min-w-12 rounded-full border-black/30 bg-transparent text-[var(--aura-ink)] hover:bg-[var(--aura-ink)] hover:text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0"
              aria-label="Close cart"
            />
          }
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.7} />
        </SheetClose>
        <SheetHeader className="border-b border-dotted border-black/15 px-5 py-5 pr-20 sm:px-7 sm:pr-24">
          <SheetTitle className="font-display text-4xl text-[var(--aura-ink)]">
            Your cart
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review products, quantities, and subtotal.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {!hasLines ? (
            <div className="grid min-h-72 place-items-center border border-dashed border-black/25 p-8 text-center">
              <div>
                <p className="font-display text-3xl">Your cart is quiet.</p>
                <p className="mt-2 text-sm text-[var(--aura-text-muted-on-ivory)]">
                  Explore the collection and choose a scent to add here.
                </p>
                <Button
                  render={<Link href="/shop" />}
                  nativeButton={false}
                  className="mt-6 min-h-12 rounded-[var(--aura-radius)] bg-[var(--aura-ink)] px-6 text-[var(--aura-ivory)] hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0"
                  onClick={() => setDrawerOpen(false)}
                >
                  Shop the collection
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-5">
              {lines.map((line) => (
                <li key={line.variantId} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-b border-dotted border-black/15 pb-5 last:border-b-0 min-[380px]:grid-cols-[8rem_minmax(0,1fr)] min-[380px]:gap-4">
                  <CartLineImage line={line} sizes="128px" />
                  <div className="min-w-0">
                    <Link
                      href={`/products/${line.productSlug}`}
                      className="inline-flex min-h-11 max-w-full items-center break-words font-display text-2xl leading-tight hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)]"
                      onClick={() => setDrawerOpen(false)}
                    >
                      {line.productName}
                    </Link>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#655f57]">
                      {line.sizeMl} ml · {formatMoney(line.unitPrice)}
                    </p>
                    <div className="mt-4 flex flex-col items-start gap-2 min-[380px]:flex-row min-[380px]:items-center">
                      <div className="grid grid-cols-[2.75rem_2rem_2.75rem] items-center rounded-[var(--aura-radius)] border border-black/25">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          className="min-h-11 min-w-11 rounded-l-[calc(var(--aura-radius)-1px)] rounded-r-none border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0"
                          aria-label={`Decrease ${line.productName} quantity`}
                          disabled={loading}
                          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                        >
                          <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.8} />
                        </Button>
                        <output className="grid min-h-11 place-items-center border-x border-black/15" aria-live="polite">
                          {line.quantity}
                        </output>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          className="min-h-11 min-w-11 rounded-l-none rounded-r-[calc(var(--aura-radius)-1px)] border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0"
                          aria-label={`Increase ${line.productName} quantity`}
                          disabled={loading || line.quantity >= 10}
                          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                        >
                          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} />
                        </Button>
                      </div>
                      <p className="font-medium min-[380px]:ml-auto">
                        {formatMoney({
                          currency: "INR",
                          amountMinor: line.unitPrice.amountMinor * line.quantity,
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasLines ? (
          <SheetFooter className="border-t border-dotted border-black/15 px-5 py-5 sm:px-7">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.18em]">Subtotal</span>
              <strong className="font-display text-3xl">
                {cart ? formatMoney(cart.subtotal) : "₹0"}
              </strong>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2 border-y border-dotted border-black/15 py-3 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--aura-text-muted-on-ivory)]" aria-label="Checkout steps">
              <span>1 · Sign in</span>
              <span>2 · Delivery</span>
              <span>3 · UPI</span>
            </div>
            <Button
              render={<Link href={cart?.checkoutEnabled ? "/checkout" : "/cart"} />}
              nativeButton={false}
              className="min-h-16 rounded-[var(--aura-radius)] bg-[var(--aura-ink)] font-display text-xl text-[var(--aura-ivory)] hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] focus-visible:ring-0"
              onClick={() => setDrawerOpen(false)}
            >
              {cart?.checkoutEnabled ? "Continue to checkout" : "Review cart"}
            </Button>
            <p className="mt-2 text-xs leading-5 text-[var(--aura-text-muted-on-ivory)]">
              {cart?.checkoutEnabled
                ? "Sign in, confirm delivery, then choose an available UPI option in Cashfree."
                : "Online checkout and payment remain closed."}
            </p>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
