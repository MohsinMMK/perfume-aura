import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@perfume-aura/ui/components/button";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const accountDestinations = [
  {
    href: "/account/orders",
    title: "Orders",
    description: "Track current purchases and review your order history.",
  },
  {
    href: "/account/delivery",
    title: "Delivery details",
    description: "Save one address for a faster verified checkout.",
  },
  {
    href: "/account/settings",
    title: "Sign-in and security",
    description: "Manage connected sign-in methods, sessions, and account access.",
  },
] as const;

export default async function AccountPage() {
  const enabled = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true";
  const session = enabled
    ? await import("@/lib/customer-auth").then(async ({ createCustomerAuth }) =>
        createCustomerAuth().api.getSession({ headers: await headers() }),
      )
    : null;

  if (session?.user) {
    const firstName = session.user.name.trim().split(/\s+/u)[0] || "there";
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-[var(--aura-text-muted-on-ivory)]">Customer account</p>
        <h1 className="mt-4 text-balance font-display text-5xl leading-[0.92] sm:text-6xl">Welcome, {firstName}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aura-text-muted-on-ivory)]">
          Signed in as {session.user.email}. Your orders, delivery details, and account security are kept together here.
        </p>
        <nav aria-label="Customer account" className="mt-10 border-y border-black/20">
          {accountDestinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="group flex min-h-24 items-center justify-between gap-6 border-b border-black/15 py-5 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ink)]"
            >
              <span>
                <strong className="block text-lg">{destination.title}</strong>
                <span className="mt-1 block text-sm leading-6 text-[var(--aura-text-muted-on-ivory)]">{destination.description}</span>
              </span>
              <span aria-hidden="true" className="text-xl transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold text-[var(--aura-text-muted-on-ivory)]">Customer account</p>
      <h1 className="mt-4 max-w-[13ch] text-balance font-display text-5xl leading-[0.92] tracking-[-0.02em] sm:text-6xl">Your Perfume Aura account</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--aura-text-muted-on-ivory)]">
        Browse and build your cart without an account. Sign in only when you want to continue checkout, save delivery details, or view orders.
      </p>
      {!enabled ? (
        <p className="mt-7 max-w-2xl rounded-[var(--aura-radius)] bg-black/[0.055] px-4 py-3 text-sm leading-6 text-[var(--aura-text-muted-on-ivory)]" role="status">
          Customer accounts are not open yet. The storefront and cart remain available to browse.
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          render={<Link href="/account/sign-in" />}
          nativeButton={false}
          className="min-h-12 rounded-[var(--aura-radius)] bg-[var(--aura-ink)] px-8 text-[var(--aura-ivory)] hover:bg-black"
        >
          Sign in
        </Button>
        <Button
          render={<Link href="/account/register" />}
          nativeButton={false}
          variant="outline"
          className="min-h-12 rounded-[var(--aura-radius)] border-black/25 bg-transparent px-8 text-[var(--aura-ink)] hover:bg-black/5"
        >
          Create account
        </Button>
      </div>
      <div className="mt-12 grid gap-0 border-y border-black/20 sm:grid-cols-3">
        {accountDestinations.map((destination) => (
          <div key={destination.href} className="border-b border-black/15 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
            <h2 className="font-semibold">{destination.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--aura-text-muted-on-ivory)]">{destination.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
