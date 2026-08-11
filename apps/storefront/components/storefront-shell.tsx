import type { ReactNode } from "react";
import {
  isPreviewCatalogEnabled,
  isPublicCatalogEnabled,
} from "@/lib/catalog-policy";
import { readReleaseLockedCart } from "@/lib/cart-store";
import { CartProvider } from "./cart-provider";
import { CartDrawer } from "./cart-drawer";
import { OpeningIntro } from "./opening-intro";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { StorefrontMotion } from "./storefront-motion";

export function StorefrontShell({ children }: Readonly<{ children: ReactNode }>) {
  const loadRemoteCart =
    isPreviewCatalogEnabled() || isPublicCatalogEnabled();

  return (
    <CartProvider
      initialCart={loadRemoteCart ? null : readReleaseLockedCart()}
      loadRemoteCart={loadRemoteCart}
    >
      <StorefrontMotion />
      <OpeningIntro />
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 bg-[var(--aura-ivory)] px-4 py-3 text-sm font-semibold text-[var(--aura-ink)] transition focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
      <CartDrawer />
    </CartProvider>
  );
}
