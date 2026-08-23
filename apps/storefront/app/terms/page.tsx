import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" }, robots: { index: false, follow: false } };

export default function TermsPage() {
  return <EditorialPage eyebrow="Policy" title="Terms" intro="The complete terms will cover order acceptance, pricing errors, cancellations, prepaid payment states, refunds, delivery, intellectual property, liability, disputes, and governing law."><p className="border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">Online checkout remains unavailable until the complete terms are published.</p></EditorialPage>;
}
