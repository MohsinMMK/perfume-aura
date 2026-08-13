import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Shipping policy", alternates: { canonical: "/shipping" } };

export default function ShippingPage() {
  return <EditorialPage eyebrow="Policy" title="Shipping" intro="India-wide delivery is planned. Delivery fees, thresholds, courier service levels, dispatch timing, and estimates will be published when confirmed."><p className="border border-[color:rgb(245_228_199_/_30%)] p-5 text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">Online checkout is not available until shipping details are published.</p></EditorialPage>;
}
