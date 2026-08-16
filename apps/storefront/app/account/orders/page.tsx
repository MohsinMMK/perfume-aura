import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { commerceOrders, db, desc, eq } from "@perfume-aura/db";
import { Button } from "@perfume-aura/ui/components/button";
import { ClaimOrderForm } from "@/components/claim-order-form";
import { createCustomerAuth } from "@/lib/customer-auth";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const enabled = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true";
  const session = enabled ? await createCustomerAuth().api.getSession({ headers: await headers() }) : null;
  const orders = session?.user ? await db.select({ id: commerceOrders.id, orderNumber: commerceOrders.orderNumber, status: commerceOrders.status, paymentState: commerceOrders.paymentState, totalAmountMinor: commerceOrders.totalAmountMinor, placedAt: commerceOrders.placedAt }).from(commerceOrders).where(eq(commerceOrders.customerUserId, session.user.id)).orderBy(desc(commerceOrders.placedAt)).limit(100) : [];
  return <><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Customer account</p><h1 className="mt-3 font-display text-6xl sm:text-8xl">Orders</h1>{!session?.user ? <div className="mt-7"><p className="text-sm leading-6 text-[#5f584f]">Sign in with a verified customer account to view and claim orders.</p><Button render={<Link href="/account/sign-in" />} nativeButton={false} className="mt-5 min-h-12 rounded-none">Sign in</Button></div> : <><ul className="mt-8 divide-y divide-black/15 border-y border-black/15">{orders.map((order) => <li key={order.id} className="grid gap-2 py-4 text-sm sm:grid-cols-4"><strong>{order.orderNumber}</strong><span className="capitalize">{order.status}</span><span className="capitalize">{order.paymentState.replaceAll("_", " ")}</span><span className="sm:text-right">{formatMoney({ currency: "INR", amountMinor: order.totalAmountMinor })}</span></li>)}</ul>{orders.length === 0 ? <p className="mt-6 text-sm text-[#5f584f]">No account orders yet.</p> : null}<ClaimOrderForm /></>}</>;
}
