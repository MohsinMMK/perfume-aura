import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Returns policy", alternates: { canonical: "/returns" } };

export default function ReturnsPage() {
  return <EditorialPage eyebrow="Policy" title="Returns" intro="The return window, eligibility conditions, damaged-item process, cancellation rules, return-to-origin handling, and refund timing require owner and legal approval."><p className="border-l-2 border-[var(--aura-brass)] pl-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">No provisional return promise is presented as a public policy.</p></EditorialPage>;
}
