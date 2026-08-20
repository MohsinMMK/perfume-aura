import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <EditorialPage eyebrow="Policy" title="Privacy" intro="The full privacy notice will explain customer accounts, saved delivery details, payments, fulfillment, support, analytics, retention, deletion, and data-subject requests."><p className="border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">Customer accounts and online checkout remain unavailable until the complete privacy notice is published.</p></EditorialPage>;
}
