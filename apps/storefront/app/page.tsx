import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkBadge01Icon,
  FireIcon,
  Moon02Icon,
} from "@hugeicons/core-free-icons";
import { HomeHero } from "@/components/home-hero";
import { HomeReviews } from "@/components/home-reviews";
import { IngredientAtmosphere } from "@/components/ingredient-atmosphere";
import { OpeningIntro } from "@/components/opening-intro";
import { StackAtmosphere } from "@/components/stack-atmosphere";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts } from "@/lib/catalog";
import {
  createHomeStructuredData,
  serializeJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Perfume Aura | Perfume store in Kondapur, Hyderabad" },
  description:
    "Discover Perfume Aura, a fragrance store in Kondapur, Hyderabad, and learn how to choose perfume by mood, intensity, occasion, and composition.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Perfume Aura",
    locale: "en_IN",
    type: "website",
    url: "/",
    title: "Perfume Aura | Perfume store in Kondapur, Hyderabad",
    description: "Discover Perfume Aura and choose perfume with practical guidance for Hyderabad and India.",
    images: [{ url: "/images/hero-bottle-still-life.webp", alt: "Perfume Aura fragrance bottles arranged on a dark stone plinth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Perfume Aura | Perfume store in Kondapur, Hyderabad",
    description: "Discover Perfume Aura and choose perfume with practical guidance for Hyderabad and India.",
    images: ["/images/hero-bottle-still-life.webp"],
  },
};

const processSteps: readonly Readonly<{
  number: string;
  title: string;
  description: string;
}>[] = [
  {
    number: "01",
    title: "Begin with feeling",
    description: "Start with the atmosphere you want to carry: quiet, vivid, intimate, or after dark.",
  },
  {
    number: "02",
    title: "Follow the composition",
    description: "Move through fragrance family, note structure, and intensity without needing to speak in perfume jargon.",
  },
  {
    number: "03",
    title: "Find your presence",
    description: "Choose the direction that feels like you. Only complete editions will enter the public collection.",
  },
];

const proofRows: readonly Readonly<{
  icon: IconSvgElement;
  title: string;
  description: string;
}>[] = [
  {
    icon: Moon02Icon,
    title: "Mood",
    description: "Start with the way you want the room to feel: fresh and open, soft and close, or warm after dark.",
  },
  {
    icon: FireIcon,
    title: "Intensity",
    description: "Move from close-wearing restraint to a bolder trail that arrives a moment before you do.",
  },
  {
    icon: Calendar03Icon,
    title: "Occasion",
    description: "Find a direction for daylight, work, an evening out, or a celebration that deserves a signature.",
  },
  {
    icon: CheckmarkBadge01Icon,
    title: "Release",
    description: "Every public edition must be complete, reviewed, and ready before it joins the collection.",
  },
];

const compositionHeadlineWords = [
  "Perfume",
  "lives",
  "between",
  "arrival",
  "and",
  "memory.",
  "Find",
  "the",
  "composition",
  "that",
  "feels",
  "unmistakably",
  "yours.",
] as const;

const compositionHeadline = compositionHeadlineWords.join(" ");

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();
  const structuredData = createHomeStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <OpeningIntro />
      <HomeHero />

      <section className="relative min-h-[86svh] overflow-hidden bg-[var(--aura-ink)] px-5 py-24 text-[var(--aura-ivory)] sm:px-8 lg:py-36">
        <IngredientAtmosphere />
        <div className="relative z-10 mx-auto flex min-h-[62svh] max-w-[66rem] flex-col items-center justify-center text-center">
          <h2
            data-motion-compose
            aria-label={compositionHeadline}
            className="max-w-[17ch] text-[clamp(2.7rem,6vw,6.5rem)] leading-[0.98] tracking-[-0.04em] text-balance"
          >
            <span aria-hidden="true">
              {compositionHeadlineWords.map((word, index) => (
                <span
                  data-motion-compose-piece
                  key={`${word}-${index}`}
                  className={`inline-block${word === "arrival" ? " italic text-[var(--aura-brass)]" : ""}`}
                >
                  {word}
                  {index < compositionHeadlineWords.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          </h2>
          <p data-motion-copy className="mt-8 max-w-[34rem] text-sm leading-6 text-[color:rgb(245_228_199_/_68%)] sm:text-base">
            Bergamot lifts. Jasmine blooms. Oud and vanilla linger.
          </p>
        </div>
      </section>

      <section
        data-motion-stack-section
        aria-labelledby="four-ways-heading"
        className="relative bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-16 pt-10 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-24"
      >
        <StackAtmosphere />
        <h2 id="four-ways-heading" className="relative z-10 mb-10 text-center text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:rgb(245_228_199_/_65%)]">Four ways into the collection</h2>
        <ol className="aura-stack relative z-10 mx-auto max-w-[34rem]">
          {proofRows.map((row, index) => (
            <li
              key={row.title}
              data-motion-stack-item
              className="aura-stack__item"
              style={{ "--aura-stack-index": index } as CSSProperties}
            >
              <article data-motion-stack-card className="aura-stack__card">
                <h3 className="aura-stack__bar font-display">
                  <span className="aura-stack__dot" aria-hidden="true" />
                  {row.title}
                  <span className="aura-stack__dot" aria-hidden="true" />
                  <span data-motion-stack-shade className="aura-stack__shade" aria-hidden="true" />
                </h3>
                <div className="aura-stack__body">
                  <span className="grid size-16 place-items-center rounded-full border border-[color:var(--aura-rule)] text-[var(--aura-ivory)]" aria-hidden="true">
                    <HugeiconsIcon icon={row.icon} strokeWidth={1.3} className="size-8" />
                  </span>
                  <p className="max-w-[26rem] text-base leading-7 text-[color:rgb(245_228_199_/_82%)] sm:text-lg sm:leading-8">{row.description}</p>
                  <span className="font-display text-sm tracking-[0.18em] text-[var(--aura-brass)]" aria-hidden="true">0{index + 1} / 0{proofRows.length}</span>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section className="overflow-hidden bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-24 pt-10 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-36">
        <div className="mx-auto max-w-[94rem]">
          <h2 className="mb-10 text-center font-display lg:mb-16">
            <span className="block text-[clamp(4.8rem,13vw,12rem)] leading-[0.68]">Choose your</span>
            <span className="text-outline block text-[clamp(5.2rem,15vw,14rem)] leading-[0.78]">Aura</span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-base leading-8 text-[color:rgb(245_228_199_/_74%)]">
            Perfume Aura is a fragrance store in Kondapur, Hyderabad. Explore the Inspired Series and Signature Series, then compare the mood, notes, and intensity that suit you.
            {" "}<Link href="/fragrance-guide" className="underline underline-offset-4 hover:text-[var(--aura-ivory)]">Read our perfume selection guide</Link>
            {" "}or <Link href="/about" className="underline underline-offset-4 hover:text-[var(--aura-ivory)]">find the Kondapur store</Link>.
            Contact us on WhatsApp to confirm product details; online checkout is not available.
          </p>
          <div className="aura-product-grid aura-home-product-grid grid gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                eagerImageLoading={index < 2}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        data-motion-arc
        aria-labelledby="why-perfume-aura-heading"
        className="aura-arc relative overflow-x-clip bg-[var(--aura-ink)] text-[var(--aura-ivory)]"
      >
        <div data-motion-arc-pin className="aura-arc__stage">
          <h2 id="why-perfume-aura-heading" className="sr-only">Why Perfume Aura</h2>
          <div data-motion-arc-heading className="mx-auto w-full max-w-[56rem] px-[var(--aura-gutter)] sm:max-w-[64rem]" aria-hidden="true">
            <svg viewBox="0 -12 1000 340" className="h-auto w-full overflow-visible" focusable="false">
              <defs>
                <path id="why-perfume-aura-arc" d="M 196 216 A 430 430 0 0 1 804 216" />
              </defs>
              <text
                className="font-display"
                fill="var(--aura-ivory)"
                fontSize="108"
                letterSpacing="-2"
              >
                <textPath
                  href="#why-perfume-aura-arc"
                  startOffset="0"
                  textLength="675"
                  lengthAdjust="spacingAndGlyphs"
                >
                  WHY PERFUME <tspan fill="transparent" stroke="var(--aura-ivory)" strokeWidth="1.5" paintOrder="stroke">AURA</tspan>
                </textPath>
              </text>
            </svg>
          </div>
          <p className="aura-arc__lede">We help you choose a fragrance by how it feels on you, not by how loudly it is labelled.</p>
          <div className="aura-arc__viewport">
            <span className="aura-arc__guide aura-arc__guide--outer" aria-hidden="true" />
            <span className="aura-arc__guide aura-arc__guide--inner" aria-hidden="true" />
            <ol data-motion-arc-wheel className="aura-arc__wheel">
              {processSteps.map((step, index) => (
                <li
                  key={step.number}
                  data-motion-arc-item
                  className="aura-arc__item"
                  style={{ "--aura-arc-index": index } as CSSProperties}
                >
                  <span className="text-outline block text-[clamp(4.5rem,9vw,7.5rem)] leading-[0.8]" aria-hidden="true">{step.number}</span>
                  <h3 className="aura-arc__pill font-display">
                    <span className="aura-stack__dot" aria-hidden="true" />
                    {step.title}
                    <span className="aura-stack__dot" aria-hidden="true" />
                  </h3>
                  <p className="max-w-[24rem] text-base leading-7 text-[color:rgb(245_228_199_/_82%)] sm:text-lg sm:leading-8">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <HomeReviews />
    </>
  );
}
