import type { Metadata } from "next";
import { GatedInquiryForm } from "@/components/gated-inquiry-form";
import { resolvePublicSupportConfig } from "@/lib/support-config";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" }, robots: { index: false, follow: false } };

export default function ContactPage() {
  const enabled = process.env.STOREFRONT_INQUIRIES_ENABLED === "true";
  const support = enabled ? resolvePublicSupportConfig() : null;
  return (
    <section className="min-h-[92svh] bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-24 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pt-32">
      <div className="mx-auto max-w-[82rem] text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">We are listening</p>
        <h1 data-motion-copy className="font-display mt-5 text-[clamp(7rem,19vw,18rem)] leading-[0.68]">Contact</h1>
        <p className="mx-auto mt-8 max-w-xl text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">{enabled ? "Share your question and our support team will reply through the approved contact channel." : "Customer inquiries are not open yet. Contact details and response times will appear here when support is ready."}</p>
        {support ? <div className="mx-auto mt-8 grid max-w-3xl gap-3 border-y border-dashed border-[color:var(--aura-rule)] py-5 text-sm sm:grid-cols-3"><a className="underline-offset-4 hover:underline" href={`mailto:${support.email}`}>{support.email}</a><a className="underline-offset-4 hover:underline" href={`tel:${support.phone}`}>{support.phone}</a><a className="underline-offset-4 hover:underline" href={`https://wa.me/${support.whatsapp.slice(1)}`}>WhatsApp · {support.hours}</a></div> : null}
        <div className="mx-auto mt-16 max-w-3xl text-left">
          <GatedInquiryForm kind="contact" enabled={enabled} />
        </div>
      </div>
    </section>
  );
}
