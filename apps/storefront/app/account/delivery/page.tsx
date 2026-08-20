import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DeliveryProfileForm } from "@/components/delivery-profile-form";
import { createCustomerAuth } from "@/lib/customer-auth";
import { getDeliveryProfile } from "@/lib/customer-profile";

export const metadata: Metadata = { title: "Delivery details", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const session = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true"
    ? await createCustomerAuth().api.getSession({ headers: await headers() })
    : null;
  if (!session?.user) redirect("/account/sign-in?callbackURL=/account/delivery");
  const profile = await getDeliveryProfile(session.user.id);
  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Customer account</p>
    <h1 className="mt-3 font-display text-6xl sm:text-8xl">Delivery details</h1>
    <p className="mt-5 max-w-2xl text-sm leading-6 text-[#5f584f]">Save one Indian delivery address for faster checkout. Historical orders keep their original delivery snapshot.</p>
    <DeliveryProfileForm profile={profile} />
  </>;
}
