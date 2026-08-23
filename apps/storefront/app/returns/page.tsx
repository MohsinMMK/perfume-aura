import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";
import { loadApprovedCommercePolicy } from "@/lib/commerce-policy";

export const metadata: Metadata = { title: "Returns policy", alternates: { canonical: "/returns" }, robots: { index: false, follow: false } };

export default async function ReturnsPage() {
  const policy = await loadApprovedCommercePolicy();
  if (!policy) {
    return <EditorialPage eyebrow="Policy" title="Returns" intro="The complete return policy will cover eligibility, damaged items, cancellations, return-to-origin handling, and refund timing."><p className="border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">Online checkout remains unavailable until the return policy is published.</p></EditorialPage>;
  }
  return <EditorialPage eyebrow="Policy" title="Returns" intro={policy.returnsSummary}><div className="grid gap-4 border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_72%)]"><p>{policy.cancellationSummary}</p><p>Sign in and open the delivered order to submit a return request. A request does not itself approve a return or refund; support reviews it and provider-confirmed refunds appear in the order timeline.</p><p>Contact {policy.supportChannel} for damaged or incorrect items.</p></div></EditorialPage>;
}
