"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  ShoppingBag01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@perfume-aura/ui/components/sheet";
import { useCart } from "./cart-provider";

const navigation = [
  { href: "/shop", label: "Shop" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  const { cart, setDrawerOpen } = useCart();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const update = () => setCompact(window.scrollY > 96);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      data-site-header
      data-compact={compact ? "true" : "false"}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 text-[var(--aura-ivory)]"
    >
      <div className="flex h-[5.5rem] items-start justify-between px-3 pt-3 sm:px-5 lg:px-6">
        <Link
          href="/"
          aria-label="Perfume Aura home"
          className="pointer-events-auto grid min-h-14 min-w-24 place-items-center border border-[color:rgb(245_228_199_/_24%)] bg-[var(--aura-ink)]/88 px-4 text-center backdrop-blur-sm"
        >
          <span className="font-[var(--font-playfair)] text-lg leading-[0.9] tracking-[0.08em]">PERFUME</span>
          <span className="font-display text-xl leading-[0.8]">AURA</span>
        </Link>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <nav
            aria-label="Primary navigation"
            className={`hidden items-center gap-7 border-b border-dashed border-[color:rgb(245_228_199_/_24%)] bg-[var(--aura-ink)]/82 px-4 py-3 backdrop-blur-sm lg:flex ${compact ? "lg:hidden" : ""}`}
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.href === "/shop" ? null : false}
                className="font-display text-[1.08rem] tracking-[0.02em] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className="min-h-11 font-display text-[1.08rem] tracking-[0.02em]"
              aria-label={`Open cart with ${cart?.quantity ?? 0} items`}
              onClick={() => setDrawerOpen(true)}
            >
              Cart({cart?.quantity ?? 0})
            </button>
          </nav>

          <Button
            render={<Link href="/shop" />}
            nativeButton={false}
            className={`min-h-12 rounded-[0.6rem] bg-[var(--aura-ivory)] px-5 font-display text-base text-[var(--aura-ink)] hover:bg-white sm:px-7 ${compact ? "inline-flex" : "inline-flex lg:hidden"}`}
          >
            Get scent
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className={`relative min-h-12 min-w-12 rounded-[0.6rem] border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)]/90 text-[var(--aura-ivory)] hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] ${compact ? "inline-flex" : "flex lg:hidden"}`}
            aria-label={`Open cart with ${cart?.quantity ?? 0} items`}
            onClick={() => setDrawerOpen(true)}
          >
            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={1.7} />
            {(cart?.quantity ?? 0) > 0 ? (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--aura-orange)] text-[0.62rem] font-bold text-white">
                {cart?.quantity}
              </span>
            ) : null}
          </Button>

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  className={`min-h-12 min-w-12 rounded-[0.6rem] border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)]/90 text-[var(--aura-ivory)] hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] ${compact ? "inline-flex" : "flex lg:hidden"}`}
                  aria-label="Open navigation menu"
                />
              }
            >
              <HugeiconsIcon icon={Menu01Icon} strokeWidth={1.7} />
            </SheetTrigger>
            <SheetContent side="right" className="w-full border-l-[color:rgb(245_228_199_/_25%)] bg-[var(--aura-ink)] text-[var(--aura-ivory)] sm:max-w-[34rem]">
              <SheetHeader className="border-b border-dashed border-[color:rgb(245_228_199_/_25%)] p-6">
                <SheetTitle className="font-display text-5xl text-[var(--aura-ivory)]">Perfume Aura</SheetTitle>
                <SheetDescription className="text-[color:rgb(245_228_199_/_60%)]">Composed for presence.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu navigation" className="grid px-6 py-4">
                {navigation.map((item, index) => (
                  <Link key={item.href} href={item.href} prefetch={false} className="flex min-h-16 items-center justify-between border-b border-dashed border-[color:rgb(245_228_199_/_22%)] font-display text-3xl">
                    {item.label}
                    <span className="font-sans text-xs text-[color:rgb(245_228_199_/_45%)]">0{index + 1}</span>
                  </Link>
                ))}
                <div className="mt-8 grid grid-cols-2 gap-2">
                  <Button render={<Link href="/search" prefetch={false} />} nativeButton={false} variant="outline" className="min-h-12 rounded-none border-[color:rgb(245_228_199_/_35%)] bg-transparent text-[var(--aura-ivory)]">
                    <HugeiconsIcon icon={Search01Icon} strokeWidth={1.7} /> Search
                  </Button>
                  <Button render={<Link href="/account" prefetch={false} />} nativeButton={false} variant="outline" className="min-h-12 rounded-none border-[color:rgb(245_228_199_/_35%)] bg-transparent text-[var(--aura-ivory)]">
                    <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.7} /> Account
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
