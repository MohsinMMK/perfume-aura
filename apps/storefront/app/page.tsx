import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  DeliveryTruck01Icon,
  PackageIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import { HomeHero } from "@/components/home-hero";
import { IngredientAtmosphere } from "@/components/ingredient-atmosphere";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts } from "@/lib/catalog";
import { isPublicCatalogEnabled } from "@/lib/catalog-policy";
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
  icon: IconSvgElement;
  number: string;
  title: string;
  description: string;
}>[] = [
  {
    icon: PackageIcon,
    number: "01",
    title: "Begin with feeling",
    description: "Start with the atmosphere you want to carry: quiet, vivid, intimate, or after dark.",
  },
  {
    icon: Shield01Icon,
    number: "02",
    title: "Follow the composition",
    description: "Move through fragrance family, note structure, and intensity without needing to speak in perfume jargon.",
  },
  {
    icon: DeliveryTruck01Icon,
    number: "03",
    title: "Find your presence",
    description: "Choose the direction that feels like you. Only complete editions will enter the public collection.",
  },
];

const proofRows = [
  ["Mood", "Start with the way you want the room to feel."],
  ["Intensity", "Move from close-wearing restraint to a bolder trail."],
  ["Occasion", "Find a direction for daylight, evening, work, or celebration."],
  ["Release", "Every public edition must be complete, reviewed, and ready."],
] as const;

const editorialPreviews = [
  {
    title: "Velvet",
    image: "/images/regent-noir-50ml.webp",
    imageAlt: "Perfume Aura bottle staged with deep burgundy silk",
    color: "bg-[var(--aura-wine)]",
  },
  {
    title: "Tidal",
    image: "/images/azure-tides-50ml.webp",
    imageAlt: "Perfume Aura bottle staged with sculpted blue glass",
    color: "bg-[#10263c]",
  },
  {
    title: "Petal",
    image: "/images/petalia-noir-50ml.webp",
    imageAlt: "Perfume Aura bottle staged with a rose glass form",
    color: "bg-[#6a3943]",
  },
] as const;

export default async function HomePage() {
  const featuredProducts = isPublicCatalogEnabled()
    ? await getFeaturedProducts()
    : [];
  const structuredData = createHomeStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <HomeHero products={featuredProducts} />

      <section className="border-y border-dashed border-[color:var(--aura-rule)] bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-10 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)]">
        <p className="mx-auto max-w-[78rem] text-center text-base leading-7 text-[color:rgb(245_228_199_/_76%)] sm:text-lg">
          Perfume Aura is a fragrance store in Kondapur, Hyderabad, with practical guidance for choosing a scent in the city and across India.
        </p>
      </section>

      <section className="relative min-h-[86svh] overflow-hidden border-b border-dashed border-[color:rgb(245_228_199_/_22%)] bg-[var(--aura-ink)] px-5 py-24 text-[var(--aura-ivory)] sm:px-8 lg:py-36">
        <IngredientAtmosphere />
        <div className="relative z-10 mx-auto flex min-h-[62svh] max-w-[66rem] flex-col items-center justify-center text-center">
          <h2 data-motion-copy className="max-w-[17ch] text-[clamp(2.7rem,6vw,6.5rem)] leading-[0.98] tracking-[-0.04em] text-balance">
            Perfume lives between <span className="italic text-[var(--aura-brass)]">arrival</span> and memory. Find the composition that feels unmistakably yours.
          </h2>
          <p data-motion-copy className="mt-8 max-w-[34rem] text-sm leading-6 text-[color:rgb(245_228_199_/_68%)] sm:text-base">
            Bergamot lifts. Jasmine blooms. Oud and vanilla linger.
          </p>
        </div>
      </section>

      <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-16 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-24">
        <div className="mx-auto max-w-[78rem]">
          <p className="mb-8 text-center text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:rgb(245_228_199_/_65%)]">Four ways into the collection</p>
          <div className="border-y border-dashed border-[color:var(--aura-rule)]">
            {proofRows.map(([title, description], index) => (
              <article data-motion-stack key={title} className="grid min-h-28 items-center border-b border-dashed border-[color:var(--aura-rule)] px-[var(--aura-gutter)] py-6 last:border-b-0 sm:grid-cols-[4rem_15rem_1fr] lg:px-6">
                <span className="font-display text-2xl text-[var(--aura-brass)]">0{index + 1}</span>
                <h3 className="font-display text-4xl">{title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_72%)] sm:mt-0">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-24 pt-10 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-36">
        <div className="mx-auto max-w-[94rem]">
          <h2 className="mb-10 text-center font-display lg:mb-16">
            <span className="block text-[clamp(4.8rem,13vw,12rem)] leading-[0.68]">Choose your</span>
            <span className="text-outline block text-[clamp(5.2rem,15vw,14rem)] leading-[0.78]">Aura</span>
          </h2>
          {featuredProducts.length ? (
            <div className="aura-product-grid grid gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div>
              <div className="aura-snap-row -mx-[var(--aura-gutter)] flex snap-x snap-mandatory gap-[var(--aura-gap)] overflow-x-auto px-[var(--aura-gutter)] pb-3 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-[var(--aura-gap-lg)] lg:overflow-visible lg:px-0 lg:pb-0">
                {editorialPreviews.map((preview, index) => (
                  <figure key={preview.title} data-motion-product-card className={`relative min-h-[32rem] w-[88vw] shrink-0 snap-center overflow-hidden rounded-[var(--aura-radius)] sm:w-[70vw] lg:w-auto lg:min-w-0 ${preview.color}`}>
                    <Image
                      src={preview.image}
                      alt={preview.imageAlt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition duration-500 ease-out hover:scale-[1.025]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(16,11,6,.84)_100%)]" />
                    <figcaption className="absolute inset-x-5 bottom-5 flex items-end justify-between border-t border-dashed border-white/35 pt-4">
                      <span className="font-display text-4xl">{preview.title}</span>
                      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/70">Study 0{index + 1}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="mt-5 flex flex-col items-center justify-between gap-3 border-y border-dashed border-[color:var(--aura-rule)] px-2 py-5 text-center sm:flex-row sm:text-left">
                <p className="font-display text-2xl">A preview of the visual world</p>
                <p className="max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_68%)]">The public collection opens when every product detail is complete and ready to share.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section data-motion-journey className="relative overflow-x-clip bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-0">
        <div data-motion-journey-pin className="mx-auto max-w-[94rem] lg:flex lg:h-[100svh] lg:max-w-none lg:flex-col lg:justify-start lg:overflow-hidden lg:pt-20">
          <div className="relative z-10 mb-10 sm:mb-12 lg:mb-10 lg:px-8">
            <h2 className="sr-only">Why Perfume Aura</h2>
            <div data-motion-journey-heading className="mx-auto w-full max-w-[56rem] sm:max-w-[64rem]" aria-hidden="true">
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
          </div>

          <div data-motion-journey-track className="aura-snap-row relative -mx-[var(--aura-gutter)] flex snap-x snap-mandatory gap-[var(--aura-gap)] overflow-x-auto px-[var(--aura-gutter)] pb-3 lg:mx-0 lg:w-max lg:gap-[var(--aura-gap-lg)] lg:overflow-visible lg:px-8 lg:pb-0">
            {processSteps.map((step, index) => (
              <article data-motion-stage key={step.number} className={`relative min-h-[24rem] w-[88vw] shrink-0 snap-center overflow-hidden rounded-[var(--aura-radius)] p-6 sm:min-h-[28rem] sm:w-[70vw] lg:min-h-[26rem] lg:w-[48vw] ${index === 0 ? "bg-[var(--aura-brass)] text-[var(--aura-ink)]" : index === 1 ? "bg-[var(--aura-orange)] text-[var(--aura-ink)]" : "bg-[var(--aura-red)] text-white"}`}>
                <div className="flex items-start justify-between">
                  <span className="font-display text-5xl">{step.number}</span>
                  <HugeiconsIcon icon={step.icon} strokeWidth={1.4} className="size-10" />
                </div>
                <div className="absolute inset-x-6 bottom-7">
                  <h3 className="font-display text-5xl leading-none">{step.title}</h3>
                  <p className="mt-4 max-w-sm text-sm leading-6">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-h-[44rem] bg-[var(--aura-ivory)] text-[var(--aura-ink)] lg:grid-cols-2">
        <div className="relative min-h-[28rem] overflow-hidden lg:min-h-full">
          <Image data-motion-parallax src="/images/bottle-detail.webp" alt="Close detail of a Perfume Aura bottle" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
        </div>
        <div className="flex items-center px-6 py-16 sm:px-12 lg:px-16">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/65">Find the right direction</p>
            <h2 data-motion-copy className="font-display mt-4 text-[clamp(4.5rem,8vw,8rem)] leading-[0.8]">Start with the feeling</h2>
            <p className="mt-7 text-base leading-7 text-black/70">Choose mood, intensity, and occasion. The finder stays quiet until there is enough complete scent data to make a recommendation worth trusting.</p>
            <Button render={<Link href="/fragrance-guide" />} nativeButton={false} className="mt-8 min-h-16 rounded-[var(--aura-radius)] bg-[var(--aura-ink)] px-8 font-display text-xl text-[var(--aura-ivory)] hover:bg-black">
              Read the fragrance guide <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--aura-ink)] py-20 text-[var(--aura-ivory)] lg:py-28">
        <h2 className="font-display text-outline whitespace-nowrap px-[var(--aura-gutter)] text-[clamp(2.2rem,14vw,16rem)] leading-[0.72] lg:px-[var(--aura-gutter-lg)]">The opening edit</h2>
        <div className="relative mx-[var(--aura-gutter)] mt-10 min-h-[36rem] overflow-hidden border-y border-dashed border-[color:var(--aura-rule)] lg:mx-[var(--aura-gutter-lg)] lg:min-h-[44rem]">
          <Image src="/images/hero-bottle-still-life.webp" alt="Three Perfume Aura bottles arranged on a dark stone plinth" fill sizes="100vw" className="object-cover opacity-75" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,11,6,.92)_0%,rgba(16,11,6,.5)_52%,rgba(16,11,6,.12)_100%)]" />
          <div className="relative flex min-h-[36rem] max-w-2xl flex-col justify-end p-6 sm:p-10 lg:min-h-[44rem] lg:p-16">
            <p className="font-display text-[clamp(3.5rem,8vw,7rem)] leading-[0.86] text-balance">Made for the moment after you arrive.</p>
            <p className="mt-5 max-w-lg text-base leading-7 text-[color:rgb(245_228_199_/_76%)]">Explore the house, the scent finder, and the world taking shape before the first collection goes live.</p>
          </div>
        </div>
        <div className="mt-14 text-center">
          <Button
            render={<Link href="/fragrance-guide" />}
            nativeButton={false}
            size="lg"
            className="aura-cream-action min-h-16 w-[calc(100%-2rem)] max-w-sm justify-between rounded-[var(--aura-radius)] px-8 font-display text-xl tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"
          >
            Learn how to choose a scent
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} aria-hidden="true" />
          </Button>
        </div>
      </section>
    </>
  );
}
