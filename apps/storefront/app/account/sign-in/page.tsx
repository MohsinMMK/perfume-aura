import type { Metadata } from "next";
import Link from "next/link";
import { AccountAuthShell } from "@/components/account-auth-shell";
import { AccountForm } from "@/components/account-form";
import {
  customerAuthProviderReadiness,
  normalizeCustomerCallbackURL,
  resolveCustomerGoogleClientId,
} from "@/lib/customer-auth-policy";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function SignInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ callbackURL?: string; verification?: string }>;
}>) {
  const enabled = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true";
  const params = await searchParams;
  const callbackURL = normalizeCustomerCallbackURL(params.callbackURL);
  const registerHref = callbackURL === "/account"
    ? "/account/register"
    : `/account/register?callbackURL=${encodeURIComponent(callbackURL)}`;
  const checkoutIntent = callbackURL === "/checkout";
  const notice = params.verification === "required"
    ? "Verify your email before continuing. We will return you to the page you requested after sign-in."
    : checkoutIntent
      ? "Sign in to continue checkout. Your cart is saved."
      : undefined;

  return (
    <AccountAuthShell
      title="Sign in to Perfume Aura"
      description="Use Google for the quickest return, or continue with the email and password connected to your customer account."
      supportingText="One customer account keeps checkout, delivery details, and order history connected."
      footer={<p>New to Perfume Aura? <Link href={registerHref} className="font-semibold text-[var(--aura-ink)] underline underline-offset-4">Create an account</Link>.</p>}
    >
      <AccountForm
        mode="sign-in"
        enabled={enabled}
        providers={customerAuthProviderReadiness()}
        googleClientId={resolveCustomerGoogleClientId()}
        callbackURL={callbackURL}
        notice={notice}
      />
    </AccountAuthShell>
  );
}
