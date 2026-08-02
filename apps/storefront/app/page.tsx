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
    title: "Controlled editions",
    description: "Identity, imagery, scent data, pricing, stock, and legal review must all pass before a fragrance becomes public.",
  },
  {
    icon: Shield01Icon,
    number: "02",
    title: "Verified commerce",
    description: "Prices and availability are rechecked by the server whenever the cart changes and again before checkout.",
  },
  {
    icon: DeliveryTruck01Icon,
    number: "03",
    title: "India first",
    description: "The delivery plan is India-wide, with fees, policies, tax treatment, and courier rules kept behind owner approval.",
  },
];

const proofRows = [
  ["Publication", "Only fully approved products can appear publicly."],
  ["Pricing", "INR values use exact paise amounts, never browser totals."],
  ["Inventory", "Stock is revalidated and reserved transactionally."],
  ["Reviews", "Only eligible fulfilled orders can produce moderated reviews."],
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
          <h2 data-motion-copy className="text-[clamp(2.7rem,6vw,6.5rem)] leading-[0.98] tracking-[-0.045em]">
            Perfume Aura is built around <span className="font-[var(--font-playfair)] italic text-[var(--aura-brass)]">presence</span>, not a wall of promises. Every image can be expressive. Every product fact still has to be approved.
          </h2>
        </div>
      </section>

      <section className="bg-[var(--aura-ink)] px-3 py-16 text-[var(--aura-ivory)] sm:px-5 lg:py-24">
        <div className="mx-auto max-w-[78rem]">
          <p className="mb-8 text-center text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:rgb(245_228_199_/_55%)]">What holds the experience together</p>
          <div className="grid gap-2">
            {proofRows.map(([title, description], index) => (
              <article data-motion-stack key={title} className="grid min-h-24 items-center rounded-[0.7rem] border border-[color:rgb(245_228_199_/_30%)] bg-[var(--aura-ivory)] px-5 py-5 text-[var(--aura-ink)] sm:grid-cols-[4rem_15rem_1fr] sm:px-8">
                <span className="font-display text-2xl">0{index + 1}</span>
                <h3 className="font-display text-3xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/65 sm:mt-0">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--aura-ink)] px-3 pb-24 pt-10 text-[var(--aura-ivory)] sm:px-5 lg:pb-36">
        <div className="mx-auto max-w-[94rem]">
          <div className="mb-10 text-center lg:mb-16">
            <p className="font-display text-[clamp(4.8rem,13vw,12rem)] leading-[0.68]">Choose your</p>
            <p className="font-display text-outline text-[clamp(5.2rem,15vw,14rem)] leading-[0.78]">Aura</p>
          </div>
          {featuredProducts.length ? (
            <div className="aura-product-grid grid gap-2">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 3} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-[color:rgb(245_228_199_/_30%)] px-6 py-16 text-center">
              <p className="font-display text-4xl">The collection is not public yet.</p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_58%)]">Approved products appear only after every publication gate passes.</p>
            </div>
          )}
        </div>
      </section>

      <section data-motion-journey className="relative overflow-x-clip bg-[var(--aura-ink)] px-3 py-20 text-[var(--aura-ivory)] sm:px-5 lg:min-h-[280svh] lg:py-0">
        <div className="mx-auto max-w-[94rem] lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:max-w-none lg:flex-col lg:justify-center lg:overflow-hidden">
          <div className="relative z-10 mb-14 lg:mb-16 lg:px-8">
            <h2 data-motion-horizontal className="font-display -rotate-2 text-[clamp(5rem,14vw,13rem)] leading-[0.72]">Why Perfume</h2>
            <h2 data-motion-horizontal className="font-display text-outline ml-[8vw] rotate-1 text-[clamp(5rem,14vw,13rem)] leading-[0.72]">Aura</h2>
            <p className="ml-auto mt-10 max-w-xl text-xl leading-8 text-[color:rgb(245_228_199_/_72%)]">The drama belongs in the imagery and motion. The commercial facts stay controlled, traceable, and honest.</p>
          </div>

          <div data-motion-journey-track className="relative grid gap-3 lg:flex lg:w-max lg:px-8">
            {processSteps.map((step, index) => (
              <article data-motion-stage key={step.number} className={`relative min-h-[30rem] overflow-hidden rounded-[0.75rem] border border-[color:rgb(245_228_199_/_28%)] p-6 lg:w-[48vw] lg:shrink-0 ${index === 0 ? "bg-[var(--aura-brass)] text-[var(--aura-ink)]" : index === 1 ? "bg-[var(--aura-orange)] text-[var(--aura-ink)]" : "bg-[var(--aura-red)] text-[var(--aura-ivory)]"}`}>
                <div className="flex items-start justify-between">
                  <span className="font-display text-5xl">{step.number}</span>
                  <HugeiconsIcon icon={step.icon} strokeWidth={1.4} className="size-10" />
                </div>
                <div className="absolute inset-x-6 bottom-7">
                  <h3 className="font-display text-5xl leading-none">{step.title}</h3>
                  <p className="mt-4 max-w-sm text-sm leading-6 opacity-75">{step.description}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55">Find the right direction</p>
            <h2 data-motion-copy className="font-display mt-4 text-[clamp(4.5rem,8vw,8rem)] leading-[0.8]">Start with the feeling</h2>
            <p className="mt-7 text-base leading-7 text-black/65">Choose mood, intensity, and occasion. The finder only recommends fragrances with complete, approved scent data.</p>
            <Button render={<Link href="/find-your-scent" />} nativeButton={false} className="mt-8 min-h-16 rounded-[0.65rem] bg-[var(--aura-ink)] px-8 font-display text-xl text-[var(--aura-ivory)] hover:bg-black">
              Find your scent <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--aura-ink)] py-20 text-[var(--aura-ivory)] lg:py-28">
        <h2 className="font-display text-outline whitespace-nowrap px-3 text-[clamp(6rem,17vw,16rem)] leading-[0.72] sm:px-5">The opening edit</h2>
        <div data-motion-marquee className="mt-12 flex w-max gap-2 px-3 sm:px-5">
          {(featuredProducts.length ? [...featuredProducts, ...featuredProducts] : []).map((product, index) => (
            <article key={`${product.id}-${index}`} className="w-[82vw] max-w-[34rem] shrink-0 rounded-[0.7rem] border border-[color:rgb(245_228_199_/_28%)] p-6 sm:p-8">
              <div className="flex items-start justify-between border-b border-dashed border-[color:rgb(245_228_199_/_25%)] pb-4">
                <h3 className="font-display text-3xl">{product.name}</h3>
                <span className="text-xs text-[color:rgb(245_228_199_/_48%)]">0{(index % Math.max(featuredProducts.length, 1)) + 1}</span>
              </div>
              <p className="mt-8 font-[var(--font-playfair)] text-2xl leading-snug">{product.summary}</p>
              <Link href={`/products/${product.slug}`} className="mt-8 inline-flex min-h-11 items-center gap-2 font-display text-xl underline underline-offset-8">View product <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/shop" className="inline-flex min-h-12 items-center gap-2 font-display text-2xl underline underline-offset-8">Shop the collection <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </>
  );
}
