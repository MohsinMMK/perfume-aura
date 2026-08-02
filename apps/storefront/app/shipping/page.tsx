import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Shipping policy", alternates: { canonical: "/shipping" } };

export default function ShippingPage() {
  return <EditorialPage eyebrow="Policy" title="Shipping" intro="India-wide delivery is planned, but the flat fee, free-shipping threshold, courier service level, dispatch timing, and delivery estimates are awaiting owner approval."><p className="border-l-2 border-[var(--aura-brass)] pl-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">Checkout remains disabled until this policy is complete and approved for publication.</p></EditorialPage>;
}
