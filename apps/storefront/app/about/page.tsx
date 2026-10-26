import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  PerfumeIcon,
  SparklesIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import { DiscoveryGuideLinks } from "@/components/discovery-guide-links";
import { StoreVisitSection } from "@/components/store-visit-section";
import {
  aboutPageDescription,
  createAboutStructuredData,
  serializeJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Our story",
  description: aboutPageDescription,
  alternates: { canonical: "/about" },
  openGraph: {
    siteName: "Perfume Aura",
    locale: "en_IN",
    type: "website",
    url: "/about",
    title: "Our story | Perfume Aura",
    description: "Meet Perfume Aura, a fragrance store in Kondapur, Hyderabad.",
    images: [{ url: "/images/hero-bottle-still-life.webp", alt: "Perfume Aura bottles arranged in the studio" }],
  },
  twitter: { card: "summary_large_image", title: "Our story | Perfume Aura", description: "Meet Perfume Aura, a fragrance store in Kondapur, Hyderabad.", images: ["/images/hero-bottle-still-life.webp"] },
};

const storyChapters = [
  ["01", "The house", "#the-house"],
  ["02", "The series", "#the-series"],
  ["03", "House rules", "#house-rules"],
  ["04", "Visit", "#visit"],
] as const;

const houseLedger = [
  { figure: "2", unit: "Series", detail: "Inspired and Signature, named so you always know which one you are holding.", accent: "var(--aura-brass)" },
  { figure: "1", unit: "Store", detail: "Kondapur, Hyderabad. Every shortlist ends with paper and skin.", accent: "var(--aura-orange)" },
  { figure: "0", unit: "Borrowed logos", detail: "Our bottles carry the Perfume Aura mark, never a designer's.", accent: "var(--aura-red)" },
  { figure: "1:1", unit: "Advice", detail: "Questions go to a person on WhatsApp, not an automated checkout.", accent: "var(--aura-ivory)" },
] as const;

const seriesPanels = [
  {
    name: "Inspired",
    href: "/collections/inspired",
    image: "/images/inspired-unknown-shop-card.webp",
    imageAlt: "Black Perfume Aura Inspired Series bottle with a brass mark",
    background: "var(--aura-card-inspired)",
    copy: "Well-known scent profiles, honestly labelled. The reference name tells you what a scent is inspired by, never that it is affiliated.",
  },
  {
    name: "Signature",
    href: "/collections/signature",
    image: "/images/signature-series-shop-card.webp",
    imageAlt: "Clear Perfume Aura Signature Series bottle with a gold collar",
    background: "var(--aura-card-signature)",
    copy: "Our own compositions under our own names. Composition details appear as each edition is completed.",
  },
] as const;

const principles: readonly Readonly<{
  icon: IconSvgElement;
  title: string;
  description: string;
  accent: string;
}>[] = [
  {
    icon: SparklesIcon,
    title: "Feeling first",
    description: "We start with the mood you want to carry, then narrow by fragrance family, notes and intensity.",
    accent: "var(--aura-brass)",
  },
  {
    icon: PerfumeIcon,
    title: "Two clear series",
    description: "The Inspired Series follows well-known scent profiles. The Signature Series is our own. Every name tells you which is which.",
    accent: "var(--aura-orange)",
  },
  {
    icon: CheckmarkBadge01Icon,
    title: "Honest naming",
    description: "A reference name says what a scent is inspired by. It never implies designer affiliation.",
    accent: "var(--aura-red)",
  },
  {
    icon: Store01Icon,
    title: "Test before you decide",
    description: "Descriptions build a shortlist. Paper and skin, in the store in Kondapur, make the final choice.",
    accent: "var(--aura-ivory)",
  },
];

export default function AboutPage() {
  const structuredData = createAboutStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section aria-labelledby="about-hero-heading" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[var(--aura-ink)] text-[var(--aura-ivory)]">
        <div className="aura-about-hero__photo absolute inset-0 -z-10" aria-hidden="true">
          <Image
            data-motion-parallax
            src="/images/hero-bottle-still-life.webp"
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover object-[72%_center] lg:object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--aura-ink)_8%,rgb(16_11_6_/_72%)_42%,rgb(16_11_6_/_8%)_78%)] lg:bg-[linear-gradient(90deg,var(--aura-ink)_4%,rgb(16_11_6_/_78%)_34%,transparent_62%),linear-gradient(0deg,var(--aura-ink)_2%,transparent_30%)]" />
        </div>

        <div className="mx-auto flex w-full max-w-[94rem] flex-1 flex-col justify-end px-[var(--aura-gutter)] pb-10 pt-40 lg:justify-center lg:px-[var(--aura-gutter-lg)] lg:pb-12 lg:pt-36">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">
            <span className="aura-stack__dot" aria-hidden="true" />
            Our story · Kondapur, Hyderabad
          </p>
          <h1 id="about-hero-heading" className="font-display mt-6 max-w-[9ch] text-[clamp(4.75rem,11vw,11.5rem)] leading-[0.74]">
            Building the <span className="text-outline">Aura</span>
          </h1>
          <p className="mt-8 max-w-[34rem] text-base leading-8 text-[color:rgb(245_228_199_/_78%)] sm:text-lg sm:leading-9">
            A fragrance store kept deliberately small: two honestly named series, black glass with gold, and a counter where every shortlist is tested on paper and skin.
          </p>
        </div>

        <nav aria-label="Our story chapters" className="mx-auto w-full max-w-[94rem] px-[var(--aura-gutter)] pb-[var(--aura-gutter)] lg:px-[var(--aura-gutter-lg)] lg:pb-10">
          <ol className="grid grid-cols-2 border-t border-dashed border-[color:var(--aura-rule)] lg:grid-cols-4">
            {storyChapters.map(([number, label, href], index) => (
              <li key={href} className={`border-b border-dashed border-[color:var(--aura-rule)] lg:border-b-0 lg:border-r lg:last:border-r-0 ${index % 2 === 0 ? "border-r" : ""}`}>
                <a
                  href={href}
                  className="group flex min-h-16 items-center gap-3 px-3 py-3 font-display text-xl transition-colors hover:text-[var(--aura-brass)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--aura-ivory)] sm:min-h-20 sm:px-5 sm:text-2xl"
                >
                  <span className="text-outline text-3xl leading-none sm:text-4xl" aria-hidden="true">{number}</span>
                  <span className="leading-none">{label}</span>
                  <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={1.8} aria-hidden="true" className="ml-auto hidden size-5 transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transition-none sm:block" />
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      <section id="the-house" aria-labelledby="house-ledger-heading" className="scroll-mt-20 border-t border-dashed border-[color:var(--aura-rule)] bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-28">
        <div className="mx-auto max-w-[94rem]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="house-ledger-heading" data-motion-copy className="font-display max-w-[10ch] text-[clamp(3.6rem,8vw,8rem)] leading-[0.78]">
              The house in <span className="text-outline">four figures</span>
            </h2>
            <p className="max-w-sm text-sm leading-6 text-[color:rgb(245_228_199_/_68%)]">
              A fragrance store in Kondapur, Hyderabad, kept deliberately small so every name and every bottle can be explained.
            </p>
          </div>
          <dl className="mt-12 grid gap-[var(--aura-gap)] sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-[var(--aura-gap-lg)]">
            {houseLedger.map((entry) => (
              <div key={entry.unit} className="relative flex min-h-[14rem] flex-col sm:min-h-[19rem] overflow-hidden rounded-[var(--aura-radius)] border border-dashed border-[color:var(--aura-rule)] p-6">
                <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: entry.accent }} aria-hidden="true" />
                <dt className="order-2 mt-auto font-display text-2xl uppercase tracking-[0.04em]">{entry.unit}</dt>
                <dd className="order-1 text-outline font-display text-[clamp(5.5rem,9vw,8.5rem)] leading-[0.8]" aria-hidden="true">{entry.figure}</dd>
                <dd className="order-3 mt-3 text-sm leading-6 text-[color:rgb(245_228_199_/_68%)]">
                  <span className="sr-only">{entry.figure} {entry.unit}: </span>
                  {entry.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="the-series" aria-labelledby="series-heading" className="scroll-mt-28 bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-28">
        <h2 id="series-heading" className="sr-only">The two Perfume Aura series</h2>
        <div className="mx-auto grid max-w-[94rem] gap-[var(--aura-gap)] lg:grid-cols-2 lg:gap-[var(--aura-gap-lg)]">
          {seriesPanels.map((series, index) => (
            <article key={series.name} className="group relative grid min-h-[38rem] overflow-hidden rounded-[var(--aura-radius)] sm:grid-cols-[1fr_0.9fr] lg:min-h-[44rem]" style={{ background: series.background }}>
              <div className="relative z-10 flex flex-col p-6 sm:p-9">
                <p className="font-display text-sm tracking-[0.18em] text-[var(--aura-brass)]" aria-hidden="true">0{index + 1} / 02</p>
                <h3 className="font-display mt-auto text-[clamp(4.2rem,7vw,7rem)] leading-[0.76]">
                  {series.name}
                  <span className="text-outline block">Series</span>
                </h3>
                <p className="mt-6 max-w-sm text-sm leading-6 text-[color:rgb(245_228_199_/_78%)]">{series.copy}</p>
                <Link
                  href={series.href}
                  className="mt-8 inline-flex min-h-12 w-fit items-center gap-3 rounded-[var(--aura-radius)] border border-[color:rgb(245_228_199_/_55%)] px-5 font-display text-lg transition-colors hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"
                >
                  Browse the {series.name} Series
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
              </div>
              <div className="relative min-h-[22rem] sm:min-h-0">
                <Image
                  data-motion-float-loop
                  data-float-index={index}
                  src={series.image}
                  alt={series.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 22vw"
                  className="object-contain object-center"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="house-rules" aria-labelledby="principles-heading" className="scroll-mt-20 bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-28">
        <div className="mx-auto grid max-w-[94rem] gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[var(--aura-gap-lg)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">House rules</p>
            <h2 id="principles-heading" data-motion-copy className="font-display mt-5 text-[clamp(4rem,8vw,8.5rem)] leading-[0.76]">
              What the house <span className="text-outline">stands for</span>
            </h2>
          </div>
          <ol className="border-t border-dashed border-[color:var(--aura-rule)]">
            {principles.map((row, index) => (
              <li key={row.title} className="group relative grid grid-cols-[auto_1fr] gap-x-5 gap-y-4 border-b border-dashed border-[color:var(--aura-rule)] py-8 pl-5 transition-colors hover:bg-[var(--aura-elevated)] sm:grid-cols-[6.5rem_1fr_auto] sm:py-10 sm:pl-7">
                <span className="absolute inset-y-6 left-0 w-1 rounded-full transition-[inset] duration-300 group-hover:inset-y-0 motion-reduce:transition-none" style={{ background: row.accent }} aria-hidden="true" />
                <span className="text-outline font-display text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.8]" aria-hidden="true">0{index + 1}</span>
                <div>
                  <h3 className="font-display text-[clamp(2rem,3.4vw,3.2rem)] leading-[0.9]">{row.title}</h3>
                  <p className="mt-3 max-w-[32rem] text-base leading-7 text-[color:rgb(245_228_199_/_74%)]">{row.description}</p>
                </div>
                <span className="col-start-2 grid size-14 place-items-center rounded-full border border-[color:var(--aura-rule)] sm:col-start-auto sm:self-center sm:mr-6" aria-hidden="true">
                  <HugeiconsIcon icon={row.icon} strokeWidth={1.3} className="size-7" />
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="focused-house-heading" className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-24 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-36">
        <div className="mx-auto max-w-[46rem]">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">A note from the house</p>
          <h2 id="focused-house-heading" data-motion-copy className="font-display mt-5 text-center text-[clamp(3.6rem,8vw,7.5rem)] leading-[0.78]">
            A focused house <span className="text-outline">for India</span>
          </h2>
          <div className="mt-14 space-y-7 border-y border-dashed border-[color:var(--aura-rule)] py-10 text-base leading-8 text-[color:rgb(245_228_199_/_72%)] sm:text-lg sm:leading-9">
            <p className="first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-[5.5rem] first-letter:leading-[0.8] first-letter:text-[var(--aura-brass)]">Perfume Aura is a fragrance store in Kondapur, Hyderabad, expressed through black glass, rich product color, and a direct path from mood to scent.</p>
            <p>Explore the Inspired Series and Signature Series on the website to make a shortlist. Compare the fragrance family, notes, and intensity with the settings where you expect to wear it, then contact the store on WhatsApp for current product details. Online checkout is not available.</p>
            <p>A useful shortlist starts with what you enjoy: a fresh opening, a floral centre, warmer woods, or a quieter presence. Our fragrance guides explain how to compare these directions and test a perfume on paper and skin without relying on a promised wear time.</p>
          </div>
          <p className="mt-6 text-right font-display text-xl text-[var(--aura-brass)]">Perfume Aura, Kondapur</p>
        </div>
      </section>

      <StoreVisitSection />

      <section className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-16 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-24">
        <div className="mx-auto max-w-[82rem]">
          <DiscoveryGuideLinks heading="How to choose a scent" />
        </div>
      </section>
    </>
  );
}
