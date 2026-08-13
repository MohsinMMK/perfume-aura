import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { DeliveryTruck01Icon, PackageIcon, Shield01Icon } from "@hugeicons/core-free-icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@perfume-aura/ui/components/accordion";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { findStorefrontProduct, getStorefrontProducts } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { loadApprovedProductReviews } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const product = await findStorefrontProduct(slug);
  if (!product) return { title: "Product unavailable" };
  const publicRelease = process.env.STOREFRONT_PUBLIC_RELEASE === "true";
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/products/${product.slug}` },
    robots: {
      index: publicRelease && product.publicationState === "published",
      follow: publicRelease && product.publicationState === "published",
    },
  };
}

const galleryColors = {
  wine: "#4f1e25",
  blue: "#1b3d4d",
  blush: "#9c4d61",
  brass: "#be8d3f",
} as const;

const productAssurances = [
  [PackageIcon, "Product details"],
  [Shield01Icon, "Availability checked"],
  [DeliveryTruck01Icon, "India-first"],
] as const satisfies readonly (readonly [IconSvgElement, string])[];

export default async function ProductPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const product = await findStorefrontProduct(slug);
  if (!product) notFound();

  const firstPrice = product.variants.find((variant) => variant.price)?.price;
  const relatedProducts = (await getStorefrontProducts()).filter((candidate) => candidate.slug !== product.slug).slice(0, 3);
  const productStructuredData = product.publicationState === "published"
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        image: [new URL(product.image, process.env.STOREFRONT_URL ?? "https://perfumeaura.com").toString()],
        description: product.summary,
        offers: product.variants.flatMap((variant) => variant.price ? [{
          "@type": "Offer",
          priceCurrency: "INR",
          price: (variant.price.amountMinor / 100).toFixed(2),
          availability: variant.purchasable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: new URL(`/products/${product.slug}`, process.env.STOREFRONT_URL ?? "https://perfumeaura.com").toString(),
        }] : []),
      }
    : null;
  const approvedReviews = product.publicationState === "published" ? await loadApprovedProductReviews(product.id) : [];
  const detailValue = (value: string) => product.publicationState === "published" ? value : "Details coming soon";

  return (
    <>
      {productStructuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData).replaceAll("<", "\\u003c") }} /> : null}

      <section className="grid min-h-[100svh] bg-[var(--aura-ink)] text-[var(--aura-ivory)] lg:grid-cols-2">
        <div className="relative min-h-[22svh] overflow-hidden pt-20 sm:min-h-[52svh] lg:min-h-[100svh] lg:pt-0" style={{ backgroundColor: galleryColors[product.accent] }}>
          <Image src={product.image} alt={product.imageAlt} fill preload sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-white drop-shadow-[0_1px_8px_rgba(16,11,6,.9)]">
            <span>Perfume Aura</span>
            <span>{product.publicationState === "design_preview" ? "Preview" : "Perfume Aura edition"}</span>
          </div>
        </div>

        <div className="flex items-center px-5 pb-8 pt-4 sm:px-10 sm:py-12 lg:px-12 lg:pb-6 lg:pt-20 xl:px-16">
          <div className="w-full max-w-2xl">
            <Link href="/shop" className="inline-flex min-h-8 items-center font-display text-lg text-[color:rgb(245_228_199_/_62%)] underline-offset-8 hover:underline">Shop / {product.collectionSlug === "signature" ? "Signature" : "Collection"}</Link>
            <h1 className="font-display mt-1 text-[clamp(3.6rem,7vw,7.8rem)] leading-[0.77]">{product.name}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_62%)] max-sm:line-clamp-2">{product.summary}</p>
            <p className="font-display mt-4 text-4xl">{firstPrice ? `From ${formatMoney(firstPrice)}` : "Price not available yet"}</p>

            <div className="mt-5 hidden grid-cols-2 gap-2 sm:grid">
              <div className="rounded-[0.65rem] border border-[color:rgb(245_228_199_/_28%)] p-3">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[var(--aura-text-muted-on-ink)]">Scent profile</p>
                <p className="font-display mt-2 text-2xl">{detailValue(product.family)}</p>
              </div>
              <div className="rounded-[0.65rem] border border-[color:rgb(245_228_199_/_28%)] p-3">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[var(--aura-text-muted-on-ink)]">Made for</p>
                <p className="font-display mt-2 text-2xl">{detailValue(product.occasion)}</p>
              </div>
            </div>

            <div className="mt-4 hidden grid-cols-3 border-y border-dashed border-[color:rgb(245_228_199_/_25%)] py-3 text-center sm:grid">
              {productAssurances.map(([icon, label]) => (
                <div key={label} className="grid min-h-14 place-items-center border-r border-dashed border-[color:rgb(245_228_199_/_22%)] px-2 last:border-r-0">
                  <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
                  <span className="text-[0.56rem] uppercase tracking-[0.1em] text-[color:rgb(245_228_199_/_55%)]">{label}</span>
                </div>
              ))}
            </div>

            <AddToCart product={product} />
          </div>
        </div>
      </section>

      <section className="relative min-h-[92svh] overflow-hidden border-y border-dashed border-[color:rgb(245_228_199_/_22%)] bg-[var(--aura-ink)] px-5 py-24 text-[var(--aura-ivory)] sm:px-8 lg:py-36">
        <div className="pointer-events-none absolute -right-12 top-[22%] h-[28rem] w-[22rem] rotate-6 overflow-hidden rounded-[1.25rem] opacity-55 lg:right-[8%]" aria-hidden="true">
          <Image data-motion-parallax src="/images/bottle-detail.webp" alt="" fill sizes="22rem" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-[94rem]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">Behind the bottle</p>
          <h2 data-motion-copy className="font-display mt-8 max-w-[8ch] text-[clamp(5.2rem,13vw,13rem)] leading-[0.72]">The scent you did not know the room remembered</h2>
          <p className="ml-auto mt-16 max-w-xl text-lg leading-8 text-[color:rgb(245_228_199_/_65%)]">{product.story}</p>
        </div>
      </section>

      <section className="bg-[var(--aura-ivory)] px-5 py-20 text-[var(--aura-ink)] sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[82rem]">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ivory)]">The composition record</p>
          <h2 className="font-display mx-auto mt-4 max-w-[11ch] text-center text-[clamp(5rem,11vw,11rem)] leading-[0.75]">Built from the detail up</h2>
          <Accordion className="mx-auto mt-14 max-w-4xl rounded-none border-black/25">
            <AccordionItem value="profile" className="border-black/20 data-open:bg-black/5">
              <AccordionTrigger className="min-h-16 px-5 font-display text-2xl hover:no-underline">Scent profile</AccordionTrigger>
              <AccordionContent className="px-5 text-black/62">{product.publicationState === "published" ? `${product.family} · ${product.intensity} · ${product.occasion}. Top: ${product.notes.top.join(", ")}. Heart: ${product.notes.heart.join(", ")}. Base: ${product.notes.base.join(", ")}. ${product.longevity}` : "Scent profile details are coming soon."}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="ingredients" className="border-black/20 data-open:bg-black/5">
              <AccordionTrigger className="min-h-16 px-5 font-display text-2xl hover:no-underline">Ingredients and usage</AccordionTrigger>
              <AccordionContent className="px-5 text-black/62">{product.publicationState === "published" ? `${product.ingredients} ${product.usage}` : "Ingredients, warnings, and usage details are coming soon."}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery" className="data-open:bg-black/5">
              <AccordionTrigger className="min-h-16 px-5 font-display text-2xl hover:no-underline">Delivery and returns</AccordionTrigger>
              <AccordionContent className="px-5 text-black/62">Shipping, cancellation, and return details are not available yet.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="bg-[var(--aura-ink)] px-3 py-20 text-[var(--aura-ivory)] sm:px-5 lg:py-28">
          <div className="mx-auto max-w-[94rem]">
            <h2 className="font-display text-[clamp(5rem,11vw,11rem)] leading-[0.74]">Choose another aura</h2>
            <div className="aura-product-grid mt-12 grid gap-2">{relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}</div>
          </div>
        </section>
      ) : null}

      {approvedReviews.length > 0 ? (
        <section className="bg-[var(--aura-ink)] px-5 py-20 text-[var(--aura-ivory)] sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[94rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">Verified purchases</p>
            <h2 className="font-display mt-3 text-7xl sm:text-9xl">Reviews</h2>
            <div className="mt-9 grid gap-2 md:grid-cols-3">{approvedReviews.map((review) => <article key={review.id} className="rounded-[0.65rem] border border-[color:rgb(245_228_199_/_28%)] p-6"><p className="font-display text-2xl">{review.rating}/5</p><h3 className="mt-5 font-[var(--font-playfair)] text-2xl">{review.title ?? "Verified review"}</h3><p className="mt-3 text-sm leading-6 text-[color:rgb(245_228_199_/_60%)]">{review.body}</p></article>)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
