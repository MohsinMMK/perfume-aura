import type { Metadata } from "next";
import Image from "next/image";
import { AboutBottleStage } from "@/components/about-bottle-stage";

export const metadata: Metadata = { title: "Our story", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <>
      <section className="relative min-h-[96svh] overflow-hidden bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-20 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pt-32">
        <AboutBottleStage />
        <div className="relative z-10 mx-auto flex min-h-[72svh] max-w-[94rem] flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">It is not about noise. It is about</p>
          <h1 data-motion-copy className="font-display mt-5 max-w-[8ch] text-[clamp(6rem,16vw,16rem)] leading-[0.68]">Building the <span className="text-outline">Aura</span></h1>
        </div>
      </section>

      <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-3 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)]">
        <div className="mx-auto grid max-w-[94rem] gap-[var(--aura-gap)] lg:grid-cols-3 lg:gap-[var(--aura-gap-lg)]">
          {[
            ["/images/regent-noir-50ml.webp", "Distinct identity"],
            ["/images/azure-tides-50ml.webp", "Real product media"],
            ["/images/petalia-noir-50ml.webp", "Careful commerce"],
          ].map(([src, label]) => (
            <article key={src} className="overflow-hidden rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)]">
              <div className="relative aspect-[4/5]"><Image src={src} alt={`${label} visual`} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" /></div>
              <p className="border-t border-[color:var(--aura-rule)] px-5 py-4 text-center font-display text-2xl">{label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid min-h-[48rem] bg-[var(--aura-ivory)] text-[var(--aura-ink)] lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex items-center p-7 sm:p-12 lg:p-16">
          <div>
            <p className="max-w-xs text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aura-text-muted-on-ivory)]">Product by product, the public collection takes shape.</p>
            <h2 className="font-display mt-10 text-[clamp(5rem,10vw,10rem)] leading-[0.74]">The best scent story is one we can stand behind</h2>
          </div>
        </div>
        <div className="relative min-h-[32rem] overflow-hidden">
          <Image data-motion-parallax src="/images/hero-bottle-still-life.webp" alt="Perfume Aura bottles arranged in the studio" fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
        </div>
      </section>

      <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-24 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-36">
        <div className="mx-auto grid max-w-[94rem] gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
          <h2 data-motion-copy className="font-display text-[clamp(5.5rem,12vw,12rem)] leading-[0.72]">A focused house for India</h2>
          <div className="space-y-7 pt-4 text-base leading-8 text-[color:rgb(245_228_199_/_62%)]">
            <p>Perfume Aura is building a fragrance house expressed through black glass, rich product color, and a direct path from mood to scent.</p>
            <p>The storefront is a preview of the house taking shape. Product names, performance claims, ingredients, prices, reviews, and policies appear only when they are complete and ready to share.</p>
            <p>The result is intentionally expressive in presentation and conservative in what it claims.</p>
          </div>
        </div>
      </section>
    </>
  );
}
