import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@perfume-aura/ui/components/button";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Customer account</p><h1 className="mt-3 font-display text-6xl sm:text-8xl">Your aura, in one place.</h1><p className="mt-6 max-w-2xl text-sm leading-6 text-[#5f584f]">Browse and build your cart without an account. A verified customer account is required at checkout so payment, delivery, and order tracking stay connected.</p><div className="mt-8 flex flex-wrap gap-3"><Button render={<Link href="/account/sign-in" />} nativeButton={false} className="min-h-12 rounded-none px-8">Sign in</Button><Button render={<Link href="/account/register" />} nativeButton={false} variant="outline" className="min-h-12 rounded-none border-black/25 bg-transparent px-8">Create account</Button><Button render={<Link href="/account/orders" />} nativeButton={false} variant="outline" className="min-h-12 rounded-none border-black/25 bg-transparent px-8">Orders</Button><Button render={<Link href="/account/delivery" />} nativeButton={false} variant="outline" className="min-h-12 rounded-none border-black/25 bg-transparent px-8">Delivery details</Button></div></>;
}
