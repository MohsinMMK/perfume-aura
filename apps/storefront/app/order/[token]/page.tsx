import { createHash } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commerceOrderItems, commerceOrders, db, eq, shipments } from "@perfume-aura/db";
import { Button } from "@perfume-aura/ui/components/button";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order status", robots: { index: false, follow: false } };

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export default async function OrderStatusPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !process.env.DATABASE_URL) notFound();

  const [order] = await db
    .select({
      id: commerceOrders.id,
      orderNumber: commerceOrders.orderNumber,
      status: commerceOrders.status,
      paymentState: commerceOrders.paymentState,
      totalAmountMinor: commerceOrders.totalAmountMinor,
      placedAt: commerceOrders.placedAt,
      shipmentStatus: shipments.status,
      courier: shipments.courier,
      trackingNumber: shipments.trackingNumber,
    })
    .from(commerceOrders)
    .leftJoin(shipments, eq(shipments.orderId, commerceOrders.id))
    .where(eq(commerceOrders.accessTokenDigest, digest(token)))
    .limit(1);
  if (!order) notFound();

  const lines = await db
    .select({
      id: commerceOrderItems.id,
      productName: commerceOrderItems.productNameSnapshot,
      sizeMl: commerceOrderItems.sizeMlSnapshot,
      quantity: commerceOrderItems.quantity,
      lineTotalAmountMinor: commerceOrderItems.lineTotalAmountMinor,
    })
    .from(commerceOrderItems)
    .where(eq(commerceOrderItems.orderId, order.id));

  return (
    <section className="min-h-[75svh] bg-[var(--aura-ivory)] px-5 pb-20 pt-28 text-[var(--aura-ink)] sm:px-8 lg:px-10 lg:pt-32">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Private order status</p>
        <h1 className="mt-3 font-display text-5xl sm:text-7xl">Thank you.</h1>
        <p className="mt-5 text-sm leading-6 text-[#5f584f]">Order {order.orderNumber} · placed {order.placedAt.toLocaleString("en-IN")}</p>
        <div className="mt-8 grid gap-4 border-y border-black/20 py-6 sm:grid-cols-3">
          <div><span className="text-xs uppercase tracking-[0.15em] text-[#6b6259]">Order</span><strong className="mt-1 block capitalize">{order.status}</strong></div>
          <div><span className="text-xs uppercase tracking-[0.15em] text-[#6b6259]">Payment</span><strong className="mt-1 block capitalize">{order.paymentState.replaceAll("_", " ")}</strong></div>
          <div><span className="text-xs uppercase tracking-[0.15em] text-[#6b6259]">Delivery</span><strong className="mt-1 block capitalize">{order.shipmentStatus ?? "Not booked"}</strong></div>
        </div>
        <ul className="mt-7 divide-y divide-black/15 border-b border-black/15">
          {lines.map((line) => <li key={line.id} className="flex justify-between gap-4 py-4 text-sm"><span>{line.productName} · {line.sizeMl} ml × {line.quantity}</span><strong>{formatMoney({ currency: "INR", amountMinor: line.lineTotalAmountMinor })}</strong></li>)}
        </ul>
        <div className="mt-6 flex items-center justify-between text-lg"><span>Total</span><strong>{formatMoney({ currency: "INR", amountMinor: order.totalAmountMinor })}</strong></div>
        {order.courier || order.trackingNumber ? <p className="mt-6 rounded-none border border-black/20 p-4 text-sm">{[order.courier, order.trackingNumber].filter(Boolean).join(" · ")}</p> : null}
        <Button render={<Link href="/shop" />} nativeButton={false} className="mt-8 min-h-12 rounded-none px-8">Continue shopping</Button>
      </div>
    </section>
  );
}
