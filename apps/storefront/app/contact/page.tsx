import type { Metadata } from "next";
import { GatedInquiryForm } from "@/components/gated-inquiry-form";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <section className="min-h-[92svh] bg-[var(--aura-ink)] px-5 pb-24 pt-28 text-[var(--aura-ivory)] sm:px-8 lg:px-10 lg:pt-32">
      <div className="mx-auto max-w-[82rem] text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgb(245_228_199_/_48%)]">We are listening</p>
        <h1 data-motion-copy className="font-display mt-5 text-[clamp(7rem,19vw,18rem)] leading-[0.68]">Contact</h1>
        <p className="mx-auto mt-8 max-w-xl text-sm leading-7 text-[color:rgb(245_228_199_/_58%)]">The production support address, response time, and consent language are awaiting owner approval. The form stays closed until those facts are configured.</p>
        <div className="mx-auto mt-16 max-w-3xl text-left">
          <GatedInquiryForm kind="contact" enabled={process.env.STOREFRONT_INQUIRIES_ENABLED === "true"} />
        </div>
      </div>
    </section>
  );
}
