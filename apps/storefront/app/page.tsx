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
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts } from "@/lib/catalog";

export const metadata: Metadata = { alternates: { canonical: "/" } };

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
  const featuredProducts = await getFeaturedProducts();

  return (
    <>
      <HomeHero products={featuredProducts} />

      <section className="relative min-h-[86svh] overflow-hidden border-y border-dashed border-[color:rgb(245_228_199_/_22%)] bg-[var(--aura-ink)] px-5 py-24 text-[var(--aura-ivory)] sm:px-8 lg:py-36">
        <div className="pointer-events-none absolute inset-0 opacity-55" aria-hidden="true">
          <div data-motion-float className="absolute -left-10 top-14 h-44 w-36 rotate-[-12deg] overflow-hidden rounded-[1.25rem] border border-white/20 sm:left-[8%] lg:h-64 lg:w-52">
            <Image src="/images/regent-noir-50ml.webp" alt="" fill sizes="13rem" className="object-cover" />
          </div>
          <div data-motion-float className="absolute -right-10 top-[38%] h-44 w-36 rotate-[10deg] overflow-hidden rounded-[1.25rem] border border-white/20 sm:right-[8%] lg:h-64 lg:w-52">
            <Image src="/images/azure-tides-50ml.webp" alt="" fill sizes="13rem" className="object-cover" />
          </div>
          <div data-motion-float className="absolute bottom-6 left-[42%] hidden h-48 w-40 rotate-[6deg] overflow-hidden rounded-[1.25rem] border border-white/20 lg:block">
            <Image src="/images/petalia-noir-50ml.webp" alt="" fill sizes="10rem" className="object-cover" />
          </div>
        </div>
        <div className="relative z-10 mx-auto flex min-h-[62svh] max-w-[66rem] items-center justify-center text-center">
          <h2 data-motion-copy className="max-w-[17ch] text-[clamp(2.7rem,6vw,6.5rem)] leading-[0.98] tracking-[-0.04em] text-balance">
            Perfume lives between <span className="font-[var(--font-playfair)] italic text-[var(--aura-brass)]">arrival</span> and memory. Find the composition that feels unmistakably yours.
          </h2>
        </div>
      </section>

      <section className="bg-[var(--aura-ink)] px-3 py-16 text-[var(--aura-ivory)] sm:px-5 lg:py-24">
        <div className="mx-auto max-w-[78rem]">
          <p className="mb-8 text-center text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:rgb(245_228_199_/_65%)]">Four ways into the collection</p>
          <div className="border-y border-dashed border-[color:rgb(245_228_199_/_28%)]">
            {proofRows.map(([title, description], index) => (
              <article data-motion-stack key={title} className="grid min-h-28 items-center border-b border-dashed border-[color:rgb(245_228_199_/_22%)] px-3 py-6 last:border-b-0 sm:grid-cols-[4rem_15rem_1fr] sm:px-6">
                <span className="font-display text-2xl text-[var(--aura-brass)]">0{index + 1}</span>
                <h3 className="font-display text-4xl">{title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_72%)] sm:mt-0">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--aura-ink)] px-3 pb-24 pt-10 text-[var(--aura-ivory)] sm:px-5 lg:pb-36">
        <div className="mx-auto max-w-[94rem]">
          <h2 className="mb-10 text-center font-display lg:mb-16">
            <span className="block text-[clamp(4.8rem,13vw,12rem)] leading-[0.68]">Choose your</span>
            <span className="text-outline block text-[clamp(5.2rem,15vw,14rem)] leading-[0.78]">Aura</span>
          </h2>
          {featuredProducts.length ? (
            <div className="aura-product-grid grid gap-2">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div>
              <div className="aura-snap-row -mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-3 sm:-mx-5 sm:px-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
                {editorialPreviews.map((preview, index) => (
                  <figure key={preview.title} data-motion-product-card className={`relative min-h-[32rem] w-[88vw] shrink-0 snap-center overflow-hidden rounded-[0.65rem] sm:w-[70vw] lg:w-auto lg:min-w-0 ${preview.color}`}>
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
              <div className="mt-5 flex flex-col items-center justify-between gap-3 border-y border-dashed border-[color:rgb(245_228_199_/_28%)] px-2 py-5 text-center sm:flex-row sm:text-left">
                <p className="font-display text-2xl">A preview of the visual world</p>
                <p className="max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_68%)]">The public collection opens when every product detail is complete and ready to share.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section data-motion-journey className="relative overflow-x-clip bg-[var(--aura-ink)] px-3 py-20 text-[var(--aura-ivory)] sm:px-5 lg:py-0">
        <div data-motion-journey-pin className="mx-auto max-w-[94rem] lg:flex lg:h-[100svh] lg:max-w-none lg:flex-col lg:justify-center lg:overflow-hidden">
          <div className="relative z-10 mb-14 lg:mb-16 lg:px-8">
            <h2 className="sr-only">Why Perfume Aura</h2>
            <div data-motion-horizontal className="-ml-[25vw] w-[150vw] sm:-ml-[10vw] sm:w-[120vw] lg:ml-0 lg:w-full" aria-hidden="true">
              <svg viewBox="0 0 1000 360" className="h-auto w-full overflow-visible" focusable="false">
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
            <p className="ml-auto mt-10 max-w-xl text-xl leading-8 text-[color:rgb(245_228_199_/_76%)]">A guided way to move from atmosphere to composition—without needing to know every note by name.</p>
          </div>

          <div data-motion-journey-track className="aura-snap-row relative -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 sm:-mx-5 sm:px-5 lg:mx-0 lg:w-max lg:overflow-visible lg:px-8 lg:pb-0">
            {processSteps.map((step, index) => (
              <article data-motion-stage key={step.number} className={`relative min-h-[30rem] w-[88vw] shrink-0 snap-center overflow-hidden rounded-[0.75rem] border border-[color:rgb(245_228_199_/_28%)] p-6 sm:w-[70vw] lg:w-[48vw] ${index === 0 ? "bg-[var(--aura-brass)] text-[var(--aura-ink)]" : index === 1 ? "bg-[var(--aura-orange)] text-[var(--aura-ink)]" : "bg-[var(--aura-red)] text-white"}`}>
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
            <Button render={<Link href="/find-your-scent" />} nativeButton={false} className="mt-8 min-h-16 rounded-[0.65rem] bg-[var(--aura-ink)] px-8 font-display text-xl text-[var(--aura-ivory)] hover:bg-black">
              Find your scent <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--aura-ink)] py-20 text-[var(--aura-ivory)] lg:py-28">
        <h2 className="font-display text-outline whitespace-nowrap px-3 text-[clamp(6rem,17vw,16rem)] leading-[0.72] sm:px-5">The opening edit</h2>
        {featuredProducts.length ? (
          <div data-motion-marquee className="mt-12 flex w-max gap-2 px-3 sm:px-5">
            {[...featuredProducts, ...featuredProducts].map((product, index) => {
              const isDuplicate = index >= featuredProducts.length;
              return (
                <article aria-hidden={isDuplicate || undefined} key={`${product.id}-${index}`} className="w-[82vw] max-w-[34rem] shrink-0 rounded-[0.7rem] border border-[color:rgb(245_228_199_/_28%)] p-6 sm:p-8">
                  <div className="flex items-start justify-between border-b border-dashed border-[color:rgb(245_228_199_/_25%)] pb-4">
                    <h3 className="font-display text-3xl">{product.name}</h3>
                    <span className="text-xs text-[color:rgb(245_228_199_/_58%)]">0{(index % featuredProducts.length) + 1}</span>
                  </div>
                  <p className="mt-8 font-[var(--font-playfair)] text-2xl leading-snug">{product.summary}</p>
                  <Link tabIndex={isDuplicate ? -1 : undefined} href={`/products/${product.slug}`} className="mt-8 inline-flex min-h-11 items-center gap-2 font-display text-xl underline underline-offset-8">View product <span aria-hidden="true">→</span></Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="relative mx-3 mt-10 min-h-[36rem] overflow-hidden border-y border-dashed border-[color:rgb(245_228_199_/_28%)] sm:mx-5 lg:min-h-[44rem]">
            <Image src="/images/hero-bottle-still-life.webp" alt="Three Perfume Aura bottles arranged on a dark stone plinth" fill sizes="100vw" className="object-cover opacity-75" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,11,6,.92)_0%,rgba(16,11,6,.5)_52%,rgba(16,11,6,.12)_100%)]" />
            <div className="relative flex min-h-[36rem] max-w-2xl flex-col justify-end p-6 sm:p-10 lg:min-h-[44rem] lg:p-16">
              <p className="font-display text-[clamp(3.5rem,8vw,7rem)] leading-[0.86] text-balance">Made for the moment after you arrive.</p>
              <p className="mt-5 max-w-lg text-base leading-7 text-[color:rgb(245_228_199_/_76%)]">Explore the house, the scent finder, and the world taking shape before the first collection goes live.</p>
            </div>
          </div>
        )}
        <div className="mt-14 text-center">
          <Link href="/shop" className="inline-flex min-h-12 items-center gap-2 font-display text-2xl underline underline-offset-8">Shop the collection <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </>
  );
}
