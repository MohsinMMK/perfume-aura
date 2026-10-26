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
    siteName: "Perfume Aura",
    locale: "en_IN",
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
    axis: "Feeling",
    accent: "var(--aura-brass)",
    title: "Choose the feeling",
    copy: "Begin with an atmosphere rather than a list of ingredients: clean and quiet, bright and vivid, warm and intimate, or deep and after dark.",
  },
  {
    number: "02",
    axis: "Family",
    accent: "var(--aura-orange)",
    title: "Find the family",
    copy: "Use fragrance families as directions. Citrus and fresh compositions can feel lifted; floral compositions centre flowers; woody, amber, and gourmand directions often feel warmer or deeper.",
  },
  {
    number: "03",
    axis: "Intensity",
    accent: "var(--aura-red)",
    title: "Set the intensity",
    copy: "Decide whether you prefer a scent that stays closer or has a more noticeable presence. Intensity is a preference, not a guarantee of how long a perfume will last.",
  },
  {
    number: "04",
    axis: "Occasion",
    accent: "var(--aura-ivory)",
    title: "Match the occasion",
    copy: "Think about where you will wear it most: work, everyday daylight, evenings, celebrations, or a signature scent across settings.",
  },
] as const;

const familySwatches = ["#e9dfa6", "#e7a7a0", "#8a6a45", "#7a3b1d"] as const;

const testingSteps = [
  ["Paper", "Begin on paper.", "Use a blotter to compare the opening and remove directions you clearly do not enjoy."],
  ["Skin", "Move to clean skin.", "Test your shortlist separately and avoid layering it over another scented product."],
  ["Time", "Give it time.", "Notice the opening, the central character, and the later base instead of deciding from the first spray alone."],
  ["Setting", "Revisit in your real setting.", "Heat, humidity, clothing, and your own perception can affect the experience, especially across Indian seasons and cities."],
] as const;

const quickAnswers = [
  ["Which perfume is best for beginners?", "There is no universal beginner perfume. Start with a familiar mood and compare a small number of clearly different families."],
  ["Does a stronger scent always last longer?", "No. Perceived strength and wear time are different, and both depend on the composition, amount applied, environment, and individual perception."],
  ["Can climate change how perfume feels?", "Yes. Heat and humidity can change how quickly a fragrance seems to project or develop, so test it in conditions similar to where you will wear it."],
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
        <header className="px-[var(--aura-gutter)] pb-16 pt-32 lg:px-[var(--aura-gutter-lg)] lg:pb-24 lg:pt-40">
          <div className="mx-auto max-w-[94rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">Perfume Aura fragrance guide</p>
            <h1 data-motion-copy className="font-display mt-5 text-[clamp(4rem,12.5vw,13rem)] leading-[0.74]">
              How to choose <span className="text-outline">a perfume</span>
            </h1>
            <div className="mt-12 grid gap-[var(--aura-gap)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-[var(--aura-gap-lg)]">
              <div className="flex flex-col justify-between gap-10 rounded-[var(--aura-radius)] border border-dashed border-[color:var(--aura-rule)] p-6 sm:p-9">
                <p className="max-w-2xl text-base leading-8 text-[color:rgb(245_228_199_/_76%)] sm:text-lg sm:leading-9">
                  Start with the feeling you want, narrow it by fragrance family, decide how noticeable you want it to be, and match it to the moments when you will wear it. Then test it on skin before making the final choice.
                </p>
                <nav aria-label="Guide sections">
                  <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["#four-steps", "Steps"],
                      ["#families", "Families"],
                      ["#testing", "Testing"],
                      ["#questions", "Answers"],
                    ].map(([href, label], index) => (
                      <li key={href}>
                        <a href={href} className="flex min-h-14 items-center justify-between rounded-[var(--aura-radius)] bg-[var(--aura-elevated)] px-4 font-display text-lg transition-colors hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]">
                          {label}
                          <span className="text-xs tracking-[0.14em] opacity-60" aria-hidden="true">0{index + 1}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--aura-radius)]">
                <Image
                  data-motion-parallax
                  src="/images/hero-bottle-still-life.webp"
                  alt="Perfume Aura bottles arranged on a dark stone plinth"
                  fill
                  sizes="(max-width: 1024px) 100vw, 54vw"
                  className="object-cover"
                  preload
                />
              </div>
            </div>
          </div>
        </header>

        <section id="four-steps" aria-labelledby="four-steps-heading" className="scroll-mt-24 border-t border-dashed border-[color:var(--aura-rule)] px-[var(--aura-gutter)] py-24 lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto max-w-[94rem]">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">A simple decision path</p>
              <h2 id="four-steps-heading" data-motion-copy className="font-display mx-auto mt-4 max-w-[14ch] text-[clamp(3.6rem,8vw,8rem)] leading-[0.78]">Four steps to a <span className="text-outline">clearer choice</span></h2>
            </div>
            <div className="relative mt-14 lg:mt-20">
              <span className="pointer-events-none absolute inset-y-0 left-1/2 hidden border-l border-dashed border-[color:var(--aura-rule)] lg:block" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 top-1/2 hidden border-t border-dashed border-[color:var(--aura-rule)] lg:block" aria-hidden="true" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden size-44 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[color:var(--aura-rule)] bg-[var(--aura-ink)] text-center lg:grid" aria-hidden="true">
                <span className="absolute inset-3 rounded-full border border-dashed border-[var(--aura-brass)] motion-safe:animate-[spin_40s_linear_infinite]" />
                <span className="font-display text-2xl leading-none">Your<br /><span className="text-[var(--aura-brass)]">scent</span></span>
              </span>
              <ol className="grid gap-[var(--aura-gap)] lg:grid-cols-2 lg:gap-0">
                {selectionSteps.map((step, index) => (
                  <li key={step.number} className={`relative min-h-80 rounded-[var(--aura-radius)] bg-[var(--aura-elevated)] p-7 lg:rounded-none lg:bg-transparent lg:p-12 xl:p-16 ${index % 2 === 1 ? "lg:text-right" : ""}`}>
                    <div className={`flex items-center gap-3 ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                      <span className="size-3 rounded-full" style={{ background: step.accent }} aria-hidden="true" />
                      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">{step.axis}</span>
                    </div>
                    <span className="text-outline mt-6 block font-display text-[clamp(4.5rem,8vw,7.5rem)] leading-[0.8]" aria-hidden="true">{step.number}</span>
                    <h3 className="font-display mt-4 text-4xl lg:text-5xl">{step.title}</h3>
                    <p className={`mt-4 max-w-md text-sm leading-7 text-[color:rgb(245_228_199_/_70%)] sm:text-base ${index % 2 === 1 ? "lg:ml-auto" : ""}`}>{step.copy}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="families" aria-labelledby="families-heading" className="scroll-mt-24 bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-24 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto max-w-[94rem]">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Fragrance families</p>
                <h2 id="families-heading" className="font-display mt-4 max-w-[12ch] text-[clamp(3.6rem,8vw,8rem)] leading-[0.78]">Use families as directions, not rules</h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-black/70">A fragrance can belong to more than one family. Use these descriptions to reduce the field, then judge the complete composition rather than a single note.</p>
            </div>
            <div className="mt-14" aria-hidden="true">
              <div className="h-16 rounded-[var(--aura-radius)] bg-[linear-gradient(90deg,#e9dfa6_0%,#e7a7a0_33%,#8a6a45_66%,#7a3b1d_100%)] sm:h-20" />
              <div className="mt-3 grid grid-cols-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-black/60">
                <span>Lighter</span>
                <span className="col-start-4 text-right">Warmer</span>
              </div>
            </div>
            <div
              role="region"
              aria-label="Fragrance family comparison"
              tabIndex={0}
              className="mt-10 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ink)]"
            >
              <table className="w-full min-w-[44rem] border-collapse text-left">
                <thead>
                  <tr className="border-y border-dashed border-black/30 text-xs uppercase tracking-[0.16em]">
                    <th className="px-3 py-5">Direction</th>
                    <th className="px-3 py-5">What it can feel like</th>
                    <th className="px-3 py-5">A useful starting point</th>
                  </tr>
                </thead>
                <tbody>
                  {familyRows.map(([family, character, start], index) => (
                    <tr key={family} className="border-b border-dashed border-black/25 align-top transition-colors hover:bg-black/[0.04]">
                      <th scope="row" className="px-3 py-7 font-display text-3xl font-normal">
                        <span className="flex items-center gap-4">
                          <span className="size-8 shrink-0 rounded-full border border-black/20" style={{ background: familySwatches[index] }} aria-hidden="true" />
                          {family}
                        </span>
                      </th>
                      <td className="px-3 py-7 text-sm leading-6 text-black/70">{character}</td>
                      <td className="px-3 py-7 text-sm leading-6 text-black/70">{start}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="testing" aria-labelledby="testing-heading" className="scroll-mt-24 px-[var(--aura-gutter)] py-24 lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto max-w-[94rem]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">Before you decide</p>
                <h2 id="testing-heading" data-motion-copy className="font-display mt-4 text-[clamp(4rem,10vw,10rem)] leading-[0.76]">Test <span className="text-outline">slowly</span></h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[color:rgb(245_228_199_/_68%)]">Four checkpoints, in order. Skip none of them before you commit to a bottle.</p>
            </div>
            <ol className="relative mt-14 grid gap-10 ml-[1.375rem] border-l border-dashed border-[color:var(--aura-rule)] pl-10 lg:mt-20 lg:ml-0 lg:grid-cols-4 lg:gap-[var(--aura-gap-lg)] lg:border-l-0 lg:border-t lg:pl-0 lg:pt-12">
              {testingSteps.map(([label, title, detail], index) => (
                <li key={label} className="relative">
                  <span className="absolute -left-[3.875rem] top-0 grid size-11 place-items-center rounded-full bg-[var(--aura-ivory)] font-display text-lg text-[var(--aura-ink)] lg:-top-[4.45rem] lg:left-0" aria-hidden="true">{index + 1}</span>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">{label}</p>
                  <h3 className="font-display mt-3 text-3xl leading-tight">{title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-[color:rgb(245_228_199_/_70%)]">{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="questions" aria-labelledby="questions-heading" className="scroll-mt-24 border-t border-dashed border-[color:var(--aura-rule)] px-[var(--aura-gutter)] py-24 lg:px-[var(--aura-gutter-lg)] lg:py-32">
          <div className="mx-auto max-w-[94rem]">
            <h2 id="questions-heading" className="font-display text-[clamp(4rem,8vw,8rem)] leading-[0.78]">Quick answers</h2>
            <dl className="mt-12 grid gap-[var(--aura-gap)] lg:grid-cols-3 lg:gap-[var(--aura-gap-lg)]">
              {quickAnswers.map(([question, answer]) => (
                <div key={question} className="relative flex min-h-72 flex-col overflow-hidden rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] p-7">
                  <span className="text-outline pointer-events-none absolute -right-2 -top-6 font-display text-[9rem] leading-none opacity-40" aria-hidden="true">?</span>
                  <dt className="relative max-w-[16ch] font-display text-3xl leading-tight">{question}</dt>
                  <dd className="relative mt-auto pt-8 text-sm leading-7 text-[color:rgb(245_228_199_/_70%)]">{answer}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <p className="max-w-xl text-sm leading-7 text-[color:rgb(245_228_199_/_68%)]">Perfume Aura will connect this framework to complete product data when the public collection is ready.</p>
              <Button render={<Link href="/faq" />} nativeButton={false} className="aura-cream-action min-h-14 rounded-[var(--aura-radius)] px-7 font-display text-lg">
                Read all answers <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        </section>

        <section aria-label="Guides for Hyderabad and India" className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-28">
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
