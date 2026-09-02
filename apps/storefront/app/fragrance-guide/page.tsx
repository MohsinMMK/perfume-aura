import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import { DiscoveryGuideLinks } from "@/components/discovery-guide-links";
import {
  createFragranceGuideStructuredData,
  serializeJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "How to choose a perfume",
  description:
    "A practical fragrance guide to choosing perfume by mood, fragrance family, intensity, occasion, and a careful skin test.",
  alternates: { canonical: "/fragrance-guide" },
  openGraph: {
    type: "article",
    url: "/fragrance-guide",
    title: "How to choose a perfume | Perfume Aura",
    description:
      "Choose a perfume by mood, fragrance family, intensity, occasion, and a careful skin test.",
    images: [{ url: "/images/hero-bottle-still-life.webp", alt: "Perfume Aura bottles arranged on a dark stone plinth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to choose a perfume | Perfume Aura",
    description: "Choose a perfume by mood, fragrance family, intensity, occasion, and a careful skin test.",
    images: ["/images/hero-bottle-still-life.webp"],
  },
};

const selectionSteps = [
  {
    number: "01",
    title: "Choose the feeling",
    copy: "Begin with an atmosphere rather than a list of ingredients: clean and quiet, bright and vivid, warm and intimate, or deep and after dark.",
  },
  {
    number: "02",
    title: "Find the family",
    copy: "Use fragrance families as directions. Citrus and fresh compositions can feel lifted; floral compositions centre flowers; woody, amber, and gourmand directions often feel warmer or deeper.",
  },
  {
    number: "03",
    title: "Set the intensity",
    copy: "Decide whether you prefer a scent that stays closer or has a more noticeable presence. Intensity is a preference, not a guarantee of how long a perfume will last.",
  },
  {
    number: "04",
    title: "Match the occasion",
    copy: "Think about where you will wear it most: work, everyday daylight, evenings, celebrations, or a signature scent across settings.",
  },
] as const;

const familyRows = [
  ["Fresh and citrus", "Bright, airy, green, aromatic, or sparkling directions", "Daylight, warm weather, and an easy first comparison"],
  ["Floral", "From transparent petals to richer bouquets", "When you want softness, radiance, or a clearly floral centre"],
  ["Woody", "Dry woods, creamy woods, earth, smoke, or resinous depth", "A grounded, structured, or quietly confident presence"],
  ["Amber and gourmand", "Warm spice, vanilla-like sweetness, balsamic richness, or edible facets", "Evening, comfort, warmth, or a fuller statement"],
] as const;

export default function FragranceGuidePage() {
  const structuredData = createFragranceGuideStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />

      <article className="bg-[var(--aura-ink)] text-[var(--aura-ivory)]">
        <header className="px-[var(--aura-gutter)] pb-20 pt-32 lg:px-[var(--aura-gutter-lg)] lg:pb-28 lg:pt-40">
          <div className="mx-auto grid max-w-[94rem] gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">Perfume Aura fragrance guide</p>
              <h1 className="font-display mt-5 max-w-[11ch] text-[clamp(4rem,11vw,11rem)] leading-[0.76]">
                How to choose a perfume
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-8 text-[color:rgb(245_228_199_/_72%)]">
                Start with the feeling you want, narrow it by fragrance family, decide how noticeable you want it to be, and match it to the moments when you will wear it. Then test it on skin before making the final choice.
              </p>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--aura-radius)]">
              <Image
                src="/images/hero-bottle-still-life.webp"
                alt="Perfume Aura bottles arranged on a dark stone plinth"
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </header>

        <section id="four-steps" className="scroll-mt-24 px-[var(--aura-gutter)] py-24 lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto max-w-[94rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">A simple decision path</p>
            <h2 className="font-display mt-4 max-w-[12ch] text-[clamp(4rem,8vw,8rem)] leading-[0.78]">Four steps to a clearer choice</h2>
            <div className="mt-14 grid gap-[var(--aura-gap)] lg:grid-cols-2 lg:gap-[var(--aura-gap-lg)]">
              {selectionSteps.map((step) => (
                <section key={step.number} className="min-h-72 rounded-[var(--aura-radius)] border border-dashed border-[color:var(--aura-rule)] p-7">
                  <p className="font-display text-4xl text-[var(--aura-brass)]">{step.number}</p>
                  <h3 className="font-display mt-16 text-4xl">{step.title}</h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">{step.copy}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section id="families" className="scroll-mt-24 bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-24 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto max-w-[94rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Fragrance families</p>
            <h2 className="font-display mt-4 max-w-[12ch] text-[clamp(4rem,8vw,8rem)] leading-[0.78]">Use families as directions, not rules</h2>
            <p className="mt-7 max-w-3xl text-base leading-8 text-black/70">A fragrance can belong to more than one family. Use these descriptions to reduce the field, then judge the complete composition rather than a single note.</p>
            <div
              role="region"
              aria-label="Fragrance family comparison"
              tabIndex={0}
              className="mt-12 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ink)]"
            >
              <table className="w-full min-w-[44rem] border-collapse text-left">
                <thead>
                  <tr className="border-y border-black/25 text-xs uppercase tracking-[0.16em]">
                    <th className="px-3 py-5">Direction</th>
                    <th className="px-3 py-5">What it can feel like</th>
                    <th className="px-3 py-5">A useful starting point</th>
                  </tr>
                </thead>
                <tbody>
                  {familyRows.map(([family, character, start]) => (
                    <tr key={family} className="border-b border-black/20 align-top">
                      <th scope="row" className="px-3 py-6 font-display text-2xl font-normal">{family}</th>
                      <td className="px-3 py-6 text-sm leading-6 text-black/70">{character}</td>
                      <td className="px-3 py-6 text-sm leading-6 text-black/70">{start}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="testing" className="scroll-mt-24 px-[var(--aura-gutter)] py-24 lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto grid max-w-[94rem] gap-14 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">Before you decide</p>
              <h2 className="font-display mt-4 text-[clamp(4rem,8vw,8rem)] leading-[0.78]">Test slowly</h2>
            </div>
            <ol className="space-y-8 text-base leading-8 text-[color:rgb(245_228_199_/_72%)]">
              <li><strong className="text-[var(--aura-ivory)]">1. Begin on paper.</strong> Use a blotter to compare the opening and remove directions you clearly do not enjoy.</li>
              <li><strong className="text-[var(--aura-ivory)]">2. Move to clean skin.</strong> Test your shortlist separately and avoid layering it over another scented product.</li>
              <li><strong className="text-[var(--aura-ivory)]">3. Give it time.</strong> Notice the opening, the central character, and the later base instead of deciding from the first spray alone.</li>
              <li><strong className="text-[var(--aura-ivory)]">4. Revisit in your real setting.</strong> Heat, humidity, clothing, and your own perception can affect the experience, especially across Indian seasons and cities.</li>
            </ol>
          </div>
        </section>

        <section id="questions" className="scroll-mt-24 border-t border-dashed border-[color:var(--aura-rule)] px-[var(--aura-gutter)] py-24 lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto max-w-[70rem]">
            <h2 className="font-display text-[clamp(4rem,8vw,8rem)] leading-[0.78]">Quick answers</h2>
            <dl className="mt-12 divide-y divide-dashed divide-[color:var(--aura-rule)] border-y border-dashed border-[color:var(--aura-rule)]">
              <div className="grid gap-3 py-7 sm:grid-cols-[.8fr_1.2fr]"><dt className="font-display text-2xl">Which perfume is best for beginners?</dt><dd className="text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">There is no universal beginner perfume. Start with a familiar mood and compare a small number of clearly different families.</dd></div>
              <div className="grid gap-3 py-7 sm:grid-cols-[.8fr_1.2fr]"><dt className="font-display text-2xl">Does a stronger scent always last longer?</dt><dd className="text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">No. Perceived strength and wear time are different, and both depend on the composition, amount applied, environment, and individual perception.</dd></div>
              <div className="grid gap-3 py-7 sm:grid-cols-[.8fr_1.2fr]"><dt className="font-display text-2xl">Can climate change how perfume feels?</dt><dd className="text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">Yes. Heat and humidity can change how quickly a fragrance seems to project or develop, so test it in conditions similar to where you will wear it.</dd></div>
            </dl>
            <div className="mt-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <p className="max-w-xl text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">Perfume Aura will connect this framework to complete product data when the public collection is ready.</p>
              <Button render={<Link href="/faq" />} nativeButton={false} className="aura-cream-action min-h-14 rounded-[var(--aura-radius)] px-7 font-display text-lg">
                Read all answers <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-28">
          <div className="mx-auto max-w-[82rem]">
            <DiscoveryGuideLinks
              heading="Guides for Hyderabad and India"
              showFullGuideLink={false}
            />
          </div>
        </section>
      </article>
    </>
  );
}
