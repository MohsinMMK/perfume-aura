import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <section className="min-h-[75svh] bg-[var(--aura-ivory)] px-5 pb-20 pt-28 text-[var(--aura-ink)] sm:px-8 lg:px-10 lg:pt-32">
      <CheckoutForm />
    </section>
  );
}
