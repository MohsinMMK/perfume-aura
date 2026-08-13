import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Returns policy", alternates: { canonical: "/returns" } };

export default function ReturnsPage() {
  return <EditorialPage eyebrow="Policy" title="Returns" intro="The complete return policy will cover eligibility, damaged items, cancellations, return-to-origin handling, and refund timing."><p className="border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">Online checkout remains unavailable until the return policy is published.</p></EditorialPage>;
}
