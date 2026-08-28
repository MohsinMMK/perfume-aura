import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountAuthShell } from "@/components/account-auth-shell";
import { AccountForm } from "@/components/account-form";
import {
  customerAuthProviderReadiness,
  normalizeCustomerCallbackURL,
  resolveCustomerGoogleClientId,
} from "@/lib/customer-auth-policy";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default async function RegisterPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ callbackURL?: string }> }>) {
  const enabled = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true";
  if (!enabled) notFound();

  const callbackURL = normalizeCustomerCallbackURL((await searchParams).callbackURL);
  const signInHref = callbackURL === "/account"
    ? "/account/sign-in"
    : `/account/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`;

  return (
    <AccountAuthShell
      title="Create your account"
      description="Create one customer account for verified checkout, saved delivery details, and order updates."
      supportingText="You can browse and build your cart without an account. We only ask you to sign in when it protects your order."
      footer={<p>Already have an account? <Link href={signInHref} className="font-semibold text-[var(--aura-ink)] underline underline-offset-4">Sign in</Link>.</p>}
    >
      <AccountForm
        mode="register"
        enabled={enabled}
        providers={customerAuthProviderReadiness()}
        googleClientId={resolveCustomerGoogleClientId()}
        callbackURL={callbackURL}
      />
    </AccountAuthShell>
  );
}
