"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Cancel01Icon,
  Search01Icon,
  ShoppingBag01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@perfume-aura/ui/components/sheet";
import { compactHeaderScrollY } from "@/lib/header-motion";
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
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const compact = !isHome || scrolledPastHero;

  useEffect(() => {
    if (!isHome) return;
    const update = () =>
      setScrolledPastHero(
        window.scrollY > compactHeaderScrollY(window.innerWidth),
      );
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isHome]);

  return (
    <header
      data-site-header
      data-compact={compact ? "true" : "false"}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 text-[var(--aura-ivory)]"
    >
      <div className="flex h-[5.5rem] items-start justify-between px-[var(--aura-gutter)] pt-[var(--aura-gutter)] lg:px-[var(--aura-gutter-lg)]">
        {isHome ? (
          <Link
            href="/"
            aria-label="Perfume Aura home"
            aria-current="page"
            data-header-logo
            className="aura-header-logo aura-header-logo-enter pointer-events-auto relative block h-12 w-[7.75rem] sm:w-40 lg:w-[12.25rem]"
          >
            <Image
              src="/brand/perfume-aura-icon.svg"
              alt=""
              aria-hidden="true"
              width={271}
              height={386}
              preload
              data-header-logo-icon
              className="aura-header-logo__icon absolute left-[0.95rem] top-0 h-auto w-[3.4rem] select-none sm:left-5 sm:w-[4.5rem] lg:left-[1.65rem] lg:w-24"
            />
            <Image
              src="/brand/perfume-aura-wordmark.svg"
              alt=""
              aria-hidden="true"
              width={422}
              height={34}
              preload
              data-header-logo-wordmark
              className="aura-header-logo__wordmark absolute left-0 top-0 h-auto w-[7.75rem] select-none sm:w-40 lg:w-[12.25rem]"
            />
          </Link>
        ) : (
          <Link
            href="/"
            aria-label="Perfume Aura home"
            className="pointer-events-auto inline-flex h-12 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"
          >
            <Image
              src="/brand/perfume-aura-wordmark.svg"
              alt="Perfume Aura"
              width={422}
              height={34}
              className="h-auto w-[7.75rem] select-none sm:w-40 lg:w-[12.25rem]"
              priority
            />
          </Link>
        )}

        <div className="pointer-events-none relative flex items-start justify-end">
          <nav
            aria-label="Primary navigation"
            aria-hidden={compact ? true : undefined}
            inert={compact}
            className={`hidden items-center gap-9 bg-[var(--aura-ink)]/82 px-5 py-3 backdrop-blur-sm transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:flex ${compact ? "pointer-events-none -translate-y-5 opacity-0" : "pointer-events-auto translate-y-0 opacity-100"}`}
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.href === "/shop" ? null : false}
                aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                className="font-display min-h-14 content-center border-b border-transparent text-[1.4rem] tracking-[0.02em] transition hover:border-[var(--aura-ivory)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] aria-[current=page]:border-[var(--aura-ivory)]"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className="min-h-14 font-display text-[1.4rem] tracking-[0.02em]"
              aria-label={`Open cart with ${cart?.quantity ?? 0} items`}
              onClick={() => setDrawerOpen(true)}
            >
              Cart({cart?.quantity ?? 0})
            </button>
          </nav>

          <div
            data-compact-controls
            className={`pointer-events-auto flex items-center gap-1.5 lg:absolute lg:right-0 lg:top-0 ${compact ? "aura-compact-controls-enter lg:flex" : "lg:hidden"}`}
          >
            <Button
              render={<Link href="/shop" />}
              nativeButton={false}
              className="min-h-12 rounded-[var(--aura-radius)] bg-[var(--aura-ivory)] px-5 font-display text-base text-[var(--aura-ink)] hover:bg-white max-[359px]:hidden sm:px-7"
            >
              Get scent
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="relative min-h-12 min-w-12 rounded-[var(--aura-radius)] border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)]/90 text-[var(--aura-ivory)] hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)]"
              aria-label={`Open cart with ${cart?.quantity ?? 0} items`}
              onClick={() => setDrawerOpen(true)}
            >
              <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={1.7} />
              {(cart?.quantity ?? 0) > 0 ? (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--aura-orange)] text-[0.62rem] font-bold text-[var(--aura-ink)]">
                  {cart?.quantity}
                </span>
              ) : null}
            </Button>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  className={`min-h-12 min-w-12 rounded-[var(--aura-radius)] border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)]/90 text-[var(--aura-ivory)] hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] ${compact ? "inline-flex" : "flex lg:hidden"}`}
                  aria-label="Open navigation menu"
                />
              }
            >
              <HugeiconsIcon icon={Menu01Icon} strokeWidth={1.7} />
            </SheetTrigger>
            <SheetContent side="right" showCloseButton={false} className="data-[side=right]:inset-y-[5px] data-[side=right]:h-auto data-[side=right]:w-[calc(100%_-_10px)] rounded-[var(--aura-radius)] border-0 bg-[var(--aura-ivory)] text-[var(--aura-ink)] data-[side=right]:sm:max-w-[38.75rem]">
              <SheetClose
                render={
                  <Button
                    variant="outline"
                    size="icon-lg"
                    className="absolute right-4 top-4 z-10 min-h-12 min-w-12 rounded-full border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)] hover:bg-[var(--aura-ink)] hover:text-[var(--aura-ivory)]"
                    aria-label="Close navigation menu"
                  />
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.7} />
              </SheetClose>
              <SheetHeader className="border-b border-dashed border-[color:rgb(16_11_6_/_25%)] p-6 pr-20">
                <SheetTitle className="font-display text-5xl text-[var(--aura-ink)]">Perfume Aura</SheetTitle>
                <SheetDescription className="text-[color:rgb(16_11_6_/_62%)]">Composed for presence.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu navigation" className="grid px-6 py-4">
                {navigation.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-16 items-center justify-between border-b border-dashed border-[color:rgb(16_11_6_/_22%)] font-display text-3xl transition-[padding] hover:pl-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ink)] aria-[current=page]:pl-2"
                  >
                    {item.label}
                    <span className="text-xs text-[var(--aura-text-muted-on-ivory)]">0{index + 1}</span>
                  </Link>
                ))}
                <div className="mt-8 grid grid-cols-2 gap-2">
                  <Button render={<Link href="/search" prefetch={false} onClick={() => setMenuOpen(false)} />} nativeButton={false} variant="outline" className="min-h-12 rounded-[var(--aura-radius)] border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)] hover:bg-[var(--aura-ink)] hover:text-[var(--aura-ivory)]">
                    <HugeiconsIcon icon={Search01Icon} strokeWidth={1.7} /> Search
                  </Button>
                  <Button render={<Link href="/account" prefetch={false} onClick={() => setMenuOpen(false)} />} nativeButton={false} variant="outline" className="min-h-12 rounded-[var(--aura-radius)] border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)] hover:bg-[var(--aura-ink)] hover:text-[var(--aura-ivory)]">
                    <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.7} /> Account
                  </Button>
                </div>
              </nav>
            </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
