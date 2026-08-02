import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart-page-content";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <section className="min-h-[70svh] bg-[var(--aura-ivory)] px-5 pb-20 pt-28 text-[var(--aura-ink)] sm:px-8 lg:px-10 lg:pt-32">
      <div className="mx-auto max-w-[94rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Your selection</p>
        <h1 className="font-display mt-3 mb-10 text-8xl sm:text-[11rem]">Cart</h1>
        <CartPageContent />
      </div>
    </section>
  );
}
