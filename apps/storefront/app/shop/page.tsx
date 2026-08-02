import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { getStorefrontProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Explore the Perfume Aura storefront preview in INR.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const products = await getStorefrontProducts();

  return (
    <>
      <section className="relative min-h-[86svh] overflow-hidden bg-[var(--aura-ink)] px-4 pb-20 pt-28 text-center text-[var(--aura-ivory)] sm:px-8 lg:pt-32">
        <div className="aura-corner-grid absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div data-motion-float className="absolute -left-12 bottom-10 h-60 w-44 -rotate-12 overflow-hidden rounded-[1rem] opacity-70 sm:left-[7%]">
            <Image src="/images/regent-noir-50ml.webp" alt="" fill sizes="11rem" className="object-cover" />
          </div>
          <div data-motion-float className="absolute -right-12 top-24 h-60 w-44 rotate-12 overflow-hidden rounded-[1rem] opacity-70 sm:right-[8%]">
            <Image src="/images/azure-tides-50ml.webp" alt="" fill sizes="11rem" className="object-cover" />
          </div>
        </div>
        <div className="relative z-10 mx-auto flex min-h-[62svh] max-w-[78rem] flex-col items-center justify-center">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:rgb(245_228_199_/_55%)]">The Perfume Aura collection</p>
          <h1 data-motion-copy className="font-display mt-5 text-[clamp(5rem,13vw,13rem)] leading-[0.72]">
            Scent made <span className="text-outline">for presence</span>
          </h1>
          <p className="mt-8 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_60%)]">The preview keeps unfinished commerce facts closed while showing the intended product, cart, and checkout experience.</p>
        </div>
      </section>

      <section className="bg-[var(--aura-ink)] px-3 pb-24 text-[var(--aura-ivory)] sm:px-5 lg:pb-32">
        <div className="mx-auto max-w-[94rem]">
          {products.length ? (
            <div className="aura-product-grid grid gap-2">
              {products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 3} />)}
            </div>
          ) : (
            <div className="border border-dashed border-[color:rgb(245_228_199_/_30%)] p-12 text-center">
              <h2 className="font-display text-4xl">No products are published.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_58%)]">The catalog fails closed until identity, legal, media, SKU, cost, stock, and price data are approved.</p>
            </div>
          )}

          <div className="mt-4 grid gap-2 lg:grid-cols-3">
            {[
              ["01", "Choose the mood", "Start with the atmosphere you want the fragrance to leave behind."],
              ["02", "Check the detail", "Approved notes, intensity, occasion, and longevity sit on every public product page."],
              ["03", "Buy with control", "The server revalidates price, publication state, and available stock."],
            ].map(([number, title, copy]) => (
              <article key={number} className="border-t border-dashed border-[color:rgb(245_228_199_/_28%)] px-2 py-8">
                <span className="font-display text-3xl text-[var(--aura-brass)]">{number}</span>
                <h2 className="font-display mt-4 text-3xl">{title}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[color:rgb(245_228_199_/_55%)]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-dashed border-[color:rgb(245_228_199_/_24%)] bg-[var(--aura-ink)] px-3 py-24 text-center text-[var(--aura-ivory)] sm:px-5 lg:py-36">
        <h2 className="font-display text-[clamp(5rem,13vw,13rem)] leading-[0.7]">Meet the aura</h2>
        <h2 className="font-display text-outline text-[clamp(5rem,13vw,13rem)] leading-[0.8]">in motion</h2>
        <Link href="/find-your-scent" className="mx-auto mt-14 grid size-28 place-items-center rounded-full bg-[var(--aura-ivory)] font-display text-xl text-[var(--aura-ink)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]">Find yours</Link>
      </section>

      <section className="grid min-h-[44rem] bg-[var(--aura-ivory)] text-[var(--aura-ink)] lg:grid-cols-2">
        <div className="relative min-h-[28rem] overflow-hidden lg:min-h-full">
          <Image data-motion-parallax src="/images/hero-bottle-still-life.webp" alt="Perfume Aura bottle collection in the studio" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
        </div>
        <div className="flex items-center p-7 sm:p-12 lg:p-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">The house in progress</p>
            <h2 data-motion-copy className="font-display mt-4 text-[clamp(4.5rem,8vw,8rem)] leading-[0.8]">Built one product at a time</h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-black/65">No title, note, image, SKU, stock number, price, review, or policy is treated as public until its approval trail is complete.</p>
            <Link href="/about" className="mt-8 inline-flex min-h-12 items-center font-display text-2xl underline underline-offset-8">How it is built →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
