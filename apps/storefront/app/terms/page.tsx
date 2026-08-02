import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <EditorialPage eyebrow="Policy" title="Terms" intro="Order acceptance, pricing errors, cancellations, payment states, COD obligations, delivery, intellectual property, liability, dispute handling, and governing terms await India-counsel approval."><p className="border-l-2 border-[var(--aura-brass)] pl-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">The storefront cannot launch until approved terms replace this staging notice.</p></EditorialPage>;
}
