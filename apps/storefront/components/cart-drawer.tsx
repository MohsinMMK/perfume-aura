"use client";

import Image from "next/image";
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
import { useCart } from "./cart-provider";

export function CartDrawer() {
  const { cart, drawerOpen, loading, setDrawerOpen, setQuantity } = useCart();

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent showCloseButton={false} className="right-[5px]! top-[5px]! bottom-auto! h-auto! max-h-[calc(100svh-10px)]! w-[calc(100%-10px)]! overflow-hidden rounded-[0.65rem] border-0 bg-[var(--aura-ivory)] text-[var(--aura-ink)] sm:max-w-[44rem]!">
        <SheetClose
          render={
            <Button
              variant="outline"
              size="icon-lg"
              className="absolute right-4 top-4 z-10 min-h-12 min-w-12 rounded-full border-black/30 bg-transparent text-[var(--aura-ink)] hover:bg-[var(--aura-ink)] hover:text-[var(--aura-ivory)]"
              aria-label="Close cart"
            />
          }
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.7} />
        </SheetClose>
        <SheetHeader className="border-b border-black/15 px-5 py-5 pr-20 sm:px-7 sm:pr-24">
          <SheetTitle className="font-display text-4xl text-[var(--aura-ink)]">
            Your selection
          </SheetTitle>
          <SheetDescription className="text-[#5f584f]">
            Prices are revalidated by the server on every change.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {!cart?.lines.length ? (
            <div className="grid min-h-72 place-items-center border border-dashed border-black/25 p-8 text-center">
              <div>
                <p className="font-display text-3xl">Your cart is quiet.</p>
                <p className="mt-2 text-sm text-[#5f584f]">
                  Explore the development catalog to test the purchase journey.
                </p>
                <Button
                  render={<Link href="/shop" />}
                  nativeButton={false}
                  className="mt-6 min-h-11 rounded-[0.6rem] px-6"
                  onClick={() => setDrawerOpen(false)}
                >
                  Shop the collection
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-5">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-black/15 pb-5">
                  <div className="relative aspect-square overflow-hidden bg-[#211f1d]">
                    <Image src={line.image} alt="" fill sizes="88px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/products/${line.productSlug}`}
                      className="font-display text-2xl hover:underline"
                      onClick={() => setDrawerOpen(false)}
                    >
                      {line.productName}
                    </Link>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#655f57]">
                      {line.sizeMl} ml · {formatMoney(line.unitPrice)}
                    </p>
                    <div className="mt-4 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        className="min-h-11 min-w-11 rounded-[0.45rem] border-black/25 bg-transparent"
                        aria-label={`Decrease ${line.productName} quantity`}
                        disabled={loading}
                        onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                      >
                        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.8} />
                      </Button>
                      <output className="grid min-h-11 min-w-11 place-items-center" aria-live="polite">
                        {line.quantity}
                      </output>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        className="min-h-11 min-w-11 rounded-[0.45rem] border-black/25 bg-transparent"
                        aria-label={`Increase ${line.productName} quantity`}
                        disabled={loading || line.quantity >= 10}
                        onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                      >
                        <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} />
                      </Button>
                      <p className="ml-auto font-medium">
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

        <SheetFooter className="border-t border-black/15 px-5 py-5 sm:px-7">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-[0.18em]">Subtotal</span>
            <strong className="font-display text-3xl">
              {cart ? formatMoney(cart.subtotal) : "₹0"}
            </strong>
          </div>
          <Button
            render={<Link href="/cart" />}
            nativeButton={false}
            className="min-h-16 rounded-[0.6rem] bg-[var(--aura-ink)] font-display text-xl text-[var(--aura-ivory)] hover:bg-black"
            onClick={() => setDrawerOpen(false)}
          >
            Review cart
          </Button>
          <p className="mt-2 text-xs leading-5 text-[#655f57]">
            Checkout remains locked until owner-approved policies and provider configuration are complete.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
