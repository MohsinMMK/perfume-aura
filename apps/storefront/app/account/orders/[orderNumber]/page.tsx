import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@perfume-aura/ui/components/button";
import { createCustomerAuth } from "@/lib/customer-auth";
import { getCustomerOrder } from "@/lib/customer-orders";
import { reconcileCustomerOrderPayment } from "@/lib/customer-payment-reconciliation";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function addressLines(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const address = value as Record<string, unknown>;
  return [
    address.recipientName,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter((item) => typeof item === "string" && item).join(", "),
    address.phone,
  ].filter((item): item is string => typeof item === "string" && item.length > 0);
}

export default async function CustomerOrderPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ payment?: string }>;
}>) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const session = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true"
    ? await createCustomerAuth().api.getSession({ headers: await headers() })
    : null;
  if (!session?.user) {
    redirect(`/account/sign-in?callbackURL=${encodeURIComponent(`/account/orders/${orderNumber}`)}`);
  }
  if (query.payment === "return") {
    try {
      await reconcileCustomerOrderPayment(session.user.id, orderNumber);
    } catch (error) {
      console.error("[customer payment reconciliation] provider check failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
  const order = await getCustomerOrder(session.user.id, orderNumber);
  if (!order) notFound();
  const money = (amountMinor: number) => formatMoney({ currency: "INR", amountMinor });

  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Order {order.orderNumber}</p>
    <h1 className="mt-3 font-display text-6xl sm:text-8xl">Order details</h1>
    {query.payment === "return" ? <p role="status" className="mt-6 border border-[var(--aura-brass)] p-4 text-sm">Payment confirmation is checked securely on our server. This page updates after Cashfree confirms the payment.</p> : null}
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <dl className="grid gap-4 border-y border-black/15 py-5 text-sm sm:grid-cols-3">
          <div><dt className="text-[#6a6258]">Placed</dt><dd className="mt-1 font-semibold">{order.placedAt.toLocaleString("en-IN")}</dd></div>
          <div><dt className="text-[#6a6258]">Order status</dt><dd className="mt-1 font-semibold capitalize">{order.status}</dd></div>
          <div><dt className="text-[#6a6258]">Payment</dt><dd className="mt-1 font-semibold">{order.paymentMethod} · <span className="capitalize">{order.paymentState.replaceAll("_", " ")}</span></dd></div>
        </dl>
        <h2 className="mt-8 font-display text-3xl">Items</h2>
        <ul className="mt-3 divide-y divide-black/15 border-y border-black/15">
          {order.items.map((item) => <li key={item.sku} className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto]">
            <span><strong>{item.productName}</strong><span className="mt-1 block text-[#6a6258]">{item.sizeMl} ml · Qty {item.quantity}</span></span>
            <strong>{money(item.lineTotalAmountMinor)}</strong>
          </li>)}
        </ul>
        <h2 className="mt-8 font-display text-3xl">Progress</h2>
        <ol className="mt-3 border-l border-dashed border-black/35 pl-5">
          {order.timeline.map((event) => <li key={`${event.type}-${event.createdAt.toISOString()}`} className="relative pb-5 text-sm before:absolute before:-left-[1.43rem] before:top-1 before:size-2 before:rounded-full before:bg-[var(--aura-ink)]">
            <strong>{event.label}</strong><span className="mt-1 block text-[#6a6258]">{event.createdAt.toLocaleString("en-IN")}</span>
          </li>)}
        </ol>
      </div>
      <aside className="space-y-6">
        <section className="border border-black/15 p-5"><h2 className="font-display text-2xl">Total</h2><dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotalAmountMinor)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{money(order.shippingAmountMinor)}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{money(order.taxAmountMinor)}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>−{money(order.discountAmountMinor)}</dd></div>
          <div className="mt-2 flex justify-between border-t border-black/15 pt-3 font-semibold"><dt>Total</dt><dd>{money(order.totalAmountMinor)}</dd></div>
        </dl></section>
        <section className="border border-black/15 p-5"><h2 className="font-display text-2xl">Delivery</h2><address className="mt-3 text-sm not-italic leading-6">{addressLines(order.shippingAddressSnapshot).map((line) => <span key={line} className="block">{line}</span>)}</address></section>
        {order.shipment ? <section className="border border-black/15 p-5"><h2 className="font-display text-2xl">Shipment</h2><p className="mt-3 text-sm capitalize">{order.shipment.status}</p>{order.shipment.courier ? <p className="mt-1 text-sm">{order.shipment.courier}</p> : null}{order.shipment.trackingNumber ? <p className="mt-1 break-all text-sm">Tracking: {order.shipment.trackingNumber}</p> : null}</section> : null}
        {order.refunds.length > 0 ? <section className="border border-black/15 p-5"><h2 className="font-display text-2xl">Refunds</h2>{order.refunds.map((refund) => <p key={`${refund.createdAt.toISOString()}-${refund.amountMinor}`} className="mt-3 text-sm capitalize">{money(refund.amountMinor)} · {refund.status}</p>)}</section> : null}
        <Button render={<Link href="/contact" />} nativeButton={false} variant="outline" className="min-h-12 w-full rounded-none border-black/25 bg-transparent">Contact support</Button>
      </aside>
    </div>
  </>;
}
