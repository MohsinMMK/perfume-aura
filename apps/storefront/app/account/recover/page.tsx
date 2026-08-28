import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountAuthShell } from "@/components/account-auth-shell";
import { AccountForm } from "@/components/account-form";
import { customerAuthProviderReadiness } from "@/lib/customer-auth-policy";

export const metadata: Metadata = { title: "Account recovery", robots: { index: false, follow: false } };

export default function RecoverPage() {
  const enabled = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true";
  if (!enabled) notFound();

  return (
    <AccountAuthShell
      title="Reset your password"
      description="Enter the email connected to your customer account. We will send a secure reset link if the account is eligible."
      supportingText="For your privacy, the confirmation is the same whether or not an account exists for that email."
      footer={<p>Remembered your password? <Link href="/account/sign-in" className="font-semibold text-[var(--aura-ink)] underline underline-offset-4">Return to sign in</Link>.</p>}
    >
      <AccountForm
        mode="recover"
        enabled={enabled}
        providers={customerAuthProviderReadiness()}
        googleClientId={null}
      />
    </AccountAuthShell>
  );
}
