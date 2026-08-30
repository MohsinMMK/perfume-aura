import { Suspense, type ReactNode } from "react";
import {
  isPreviewCatalogEnabled,
  isPublicCatalogEnabled,
} from "@/lib/catalog-policy";
import { readReleaseLockedCart } from "@/lib/cart-store";
import {
  isCustomerAuthEnabled,
  resolveCustomerGoogleClientId,
} from "@/lib/customer-auth-policy";
import { CartProvider } from "./cart-provider";
import { CartDrawer } from "./cart-drawer";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { StorefrontMotion } from "./storefront-motion";
import { GoogleOneTapPrompt } from "./google-one-tap-prompt";
import { StorefrontRouteChrome } from "./storefront-route-chrome";
import { WhatsAppContactAction } from "./whatsapp-contact-action";

export function StorefrontShell({ children }: Readonly<{ children: ReactNode }>) {
  const loadRemoteCart =
    isPreviewCatalogEnabled() || isPublicCatalogEnabled();
  const customerAuthEnabled = isCustomerAuthEnabled();
  const googleClientId = customerAuthEnabled
    ? resolveCustomerGoogleClientId()
    : null;

  return (
    <CartProvider
      initialCart={loadRemoteCart ? null : readReleaseLockedCart()}
      loadRemoteCart={loadRemoteCart}
    >
      <Suspense fallback={null}>
        <StorefrontMotion />
      </Suspense>
      {googleClientId ? <GoogleOneTapPrompt clientId={googleClientId} /> : null}
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 bg-[var(--aura-ivory)] px-4 py-3 text-sm font-semibold text-[var(--aura-ink)] transition focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader customerAuthEnabled={customerAuthEnabled} />
      <main id="main-content">{children}</main>
      <StorefrontRouteChrome>
        <SiteFooter />
        <WhatsAppContactAction />
      </StorefrontRouteChrome>
      <CartDrawer />
    </CartProvider>
  );
}
