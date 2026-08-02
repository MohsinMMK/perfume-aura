import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <EditorialPage eyebrow="Policy" title="Privacy" intro="The production privacy notice must document customer accounts, guest checkout, Cashfree, email, Google, Apple, fulfillment, support, analytics, retention, deletion, and data-subject requests."><p className="border-l-2 border-[var(--aura-brass)] pl-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">This page is a release gate, not a substitute for counsel-approved policy text.</p></EditorialPage>;
}
