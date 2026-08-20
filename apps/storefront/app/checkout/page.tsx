import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { createCustomerAuth } from "@/lib/customer-auth";
import { isCustomerAuthEnabled } from "@/lib/customer-auth-policy";
import { getDeliveryProfile } from "@/lib/customer-profile";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  if (!isCustomerAuthEnabled()) notFound();
  const session = await createCustomerAuth().api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/account/sign-in?callbackURL=/checkout");
  if (!session.user.emailVerified) redirect("/account/sign-in?callbackURL=/checkout&verification=required");
  const profile = await getDeliveryProfile(session.user.id);
  return (
    <section className="min-h-[75svh] bg-[var(--aura-ivory)] px-[var(--aura-gutter)] pb-20 pt-28 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:pt-32">
      <CheckoutForm email={session.user.email} initialProfile={profile} />
    </section>
  );
}
