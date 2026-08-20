import type { Metadata } from "next";
import Image from "next/image";
import { GatedInquiryForm } from "@/components/gated-inquiry-form";

export const metadata: Metadata = { title: "Wholesale", alternates: { canonical: "/wholesale" } };

export default function WholesalePage() {
  const enabled = process.env.STOREFRONT_INQUIRIES_ENABLED === "true";
  return (
    <>
      <section className="relative min-h-[94svh] overflow-hidden bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-16 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pt-32">
        <div className="mx-auto max-w-[94rem]">
          <h1 data-motion-copy className="font-display max-w-[10ch] text-[clamp(5rem,12vw,12rem)] leading-[0.72]">Put Perfume Aura on your shelf</h1>
          <div className="relative mt-12 grid min-h-[30rem] grid-cols-2 gap-[var(--aura-gap)] lg:ml-[10%] lg:grid-cols-3 lg:gap-[var(--aura-gap-lg)]">
            {[
              "/images/hero-bottle-still-life.webp",
              "/images/regent-noir-50ml.webp",
              "/images/azure-tides-50ml.webp",
            ].map((src, index) => (
              <div key={src} data-motion-stage className={`relative overflow-hidden rounded-[var(--aura-radius)] ${index === 0 ? "col-span-2 lg:col-span-1" : ""}`}>
                <Image src={src} alt="Perfume Aura wholesale collection preview" fill sizes="(max-width: 1024px) 50vw, 30vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-28">
        <div className="mx-auto max-w-[94rem]">
          <h2 className="font-display text-center text-[clamp(6rem,15vw,15rem)] leading-[0.72]">Why?</h2>
          <div className="mt-12 grid gap-[var(--aura-gap)] lg:grid-cols-3 lg:gap-[var(--aura-gap-lg)]">
            {[
              ["#be8d3f", "text-[var(--aura-ink)]", "Complete catalog", "Every live product includes its confirmed identity, price, imagery, size, and availability."],
              ["#f15726", "text-[var(--aura-ink)]", "Distinct presentation", "Each fragrance receives its own color, bottle stage, gallery, and campaign composition."],
              ["#da1f27", "text-white", "Clear operations", "Wholesale terms, territories, minimums, fulfillment, and support ownership stay explicit rather than assumed."],
            ].map(([color, textColor, title, copy]) => (
              <article key={title} data-motion-stage className={`min-h-[28rem] rounded-[var(--aura-radius)] p-7 ${textColor}`} style={{ backgroundColor: color }}>
                <h3 className="font-display text-5xl leading-none">{title}</h3>
                <p className="mt-8 max-w-sm text-sm leading-7">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-dashed border-[color:var(--aura-rule)] bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-24 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-32">
        <div className="mx-auto grid max-w-[94rem] gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">Wholesale inquiry</p>
            <h2 className="font-display mt-5 text-[clamp(5rem,9vw,9rem)] leading-[0.75]">Bring the aura to your space</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">{enabled ? "Tell us about your store and territory. We will respond with only the terms that have been approved for release." : "Wholesale terms, minimums, territories, and support details will be published before inquiries open."}</p>
          </div>
          <GatedInquiryForm kind="wholesale" enabled={enabled} />
        </div>
      </section>
    </>
  );
}
