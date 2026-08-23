import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";
import { loadApprovedCommercePolicy } from "@/lib/commerce-policy";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Shipping policy", alternates: { canonical: "/shipping" }, robots: { index: false, follow: false } };

export default async function ShippingPage() {
  const policy = await loadApprovedCommercePolicy();
  if (!policy) {
    return <EditorialPage eyebrow="Policy" title="Shipping" intro="India-wide delivery is planned. Delivery fees, thresholds, courier service levels, dispatch timing, and estimates will be published when confirmed."><p className="border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">Online checkout is not available until shipping details are published.</p></EditorialPage>;
  }
  return <EditorialPage eyebrow="Policy" title="Shipping" intro={`Delivery to approved Indian PIN codes is estimated at ${policy.deliveryEstimate}.`}><div className="grid gap-4 border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_72%)]"><p>Delivery costs {formatMoney({ currency: "INR", amountMinor: policy.flatShippingAmountMinor })} for orders below {formatMoney({ currency: "INR", amountMinor: policy.freeShippingThresholdMinor })}. Eligible orders at or above that amount receive free delivery.</p><p>Serviceability and the available courier are verified from the delivery PIN code during checkout. {policy.cancellationSummary}</p><p>Questions can be sent to {policy.supportChannel}.</p></div></EditorialPage>;
}
