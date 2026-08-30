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
import { loadApprovedCommercePolicy } from "@/lib/commerce-policy";
import { formatMoney } from "@/lib/money";
import { loadApprovedProductReviews } from "@/lib/public-catalog";
import {
  createProductStructuredData,
  serializeJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const product = await findStorefrontProduct(slug);
  if (!product) return { title: "Product unavailable" };
  const publicRelease = process.env.STOREFRONT_PUBLIC_RELEASE === "true";
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.summary,
    alternates: { canonical: `/products/${product.slug}` },
    robots: {
      index: publicRelease && product.publicationState === "published",
      follow: publicRelease && product.publicationState === "published",
    },
    openGraph: {
      type: "website",
      url: `/products/${product.slug}`,
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.summary,
      images: [{ url: product.socialImage, alt: product.socialImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.summary,
      images: [product.socialImage],
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
  const [product, commercePolicy] = await Promise.all([
    findStorefrontProduct(slug),
    loadApprovedCommercePolicy(),
  ]);
  if (!product) notFound();

  const firstPrice = product.variants.find((variant) => variant.price)?.price;
  const [allProducts, approvedReviews] = await Promise.all([
    getStorefrontProducts(),
    product.publicationState === "published" ? loadApprovedProductReviews(product.id) : Promise.resolve([]),
  ]);
  const relatedProducts = allProducts.filter((candidate) => candidate.slug !== product.slug).slice(0, 3);
  const productStructuredData = product.publicationState === "published"
    ? createProductStructuredData({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.seoDescription ?? product.summary,
        image: product.socialImage,
        publicSku: product.publicSku,
      })
    : null;
  const detailValue = (value: string) => product.publicationState === "published" ? value : "Details coming soon";
  const inspiredByPrefix = "Inspired by ";
  const inspiredReferenceName =
    product.collectionSlug === "inspired" && product.name.startsWith(inspiredByPrefix)
      ? product.name.slice(inspiredByPrefix.length)
      : null;

  return (
    <>
      {productStructuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productStructuredData) }} /> : null}

      <section data-product-hero className="aura-product-hero grid bg-[var(--aura-ink)] text-[var(--aura-ivory)] sm:min-h-[100svh] sm:grid-rows-none lg:grid-cols-2 lg:grid-rows-1">
        <div
          data-product-gallery
          className="relative h-full overflow-hidden bg-[var(--aura-ink)] sm:h-auto sm:min-h-[52svh] lg:min-h-[100svh]"
        >
          <div
            data-product-image-frame
            className="absolute inset-x-2 bottom-2 top-[72px] overflow-hidden rounded-[var(--aura-radius)] bg-cover bg-center sm:inset-0 sm:rounded-none"
            style={{
              backgroundColor: galleryColors[product.accent],
              backgroundImage: `url("${product.image}")`,
            }}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xl sm:hidden" aria-hidden="true" />
            <Image src={product.image} alt={product.imageAlt} fill loading="eager" fetchPriority="high" sizes="(max-width: 639px) calc(100vw - 0.5rem), (max-width: 1024px) 100vw, 50vw" className="object-contain object-center sm:object-cover" />
          </div>
          <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[0.56rem] font-semibold uppercase tracking-[0.12em] text-white drop-shadow-[0_1px_8px_rgba(16,11,6,.9)] sm:inset-x-4 sm:bottom-4 sm:text-[0.58rem] sm:tracking-[0.15em]">
            <span>Perfume Aura</span>
            <span>{product.publicationState === "design_preview" ? "Preview" : "Perfume Aura edition"}</span>
          </div>
        </div>

        <div className="aura-product-info-panel flex min-h-0 items-stretch px-5 sm:items-end sm:px-10 sm:py-12 lg:min-h-[100svh] lg:px-3 lg:pb-3 lg:pt-24 xl:px-5">
          <div className="flex min-h-0 w-full flex-col">
            <div className="lg:text-center">
              <Link href="/shop" className="aura-product-breadcrumb inline-flex min-h-11 items-center font-display text-sm text-[color:rgb(245_228_199_/_62%)] underline-offset-8 hover:underline sm:min-h-8 sm:text-lg">Shop / {product.collectionSlug === "signature" ? "Signature" : product.collectionSlug === "inspired" ? "Inspired" : product.collectionSlug === "unknown" ? "Unknown" : "Collection"}</Link>
              <h1 className="aura-product-title font-display mt-2 text-[clamp(2.25rem,10vw,2.75rem)] leading-[0.86] text-balance sm:mt-1 sm:text-[clamp(3.6rem,7vw,7.8rem)] sm:leading-[0.77] lg:mx-auto lg:max-w-[8.5ch]">
                {inspiredReferenceName ? (
                  <>
                    <span className="text-outline whitespace-nowrap">Inspired by</span>{" "}
                    <span>{inspiredReferenceName}</span>
                  </>
                ) : product.name}
              </h1>
              <p className="aura-product-summary mt-2 hidden max-w-xl text-xs leading-4 text-[color:rgb(245_228_199_/_62%)] min-[360px]:line-clamp-2 sm:mt-3 sm:block sm:text-sm sm:leading-6 lg:mx-auto lg:max-w-[30rem]">{product.summary}</p>
            </div>
            <p className="font-display mt-3 text-2xl sm:mt-4 sm:text-4xl lg:mt-5 lg:px-2">{firstPrice ? `From ${formatMoney(firstPrice)}` : "Price not available yet"}</p>

            <div className="aura-product-purchase-grid mt-3 grid min-h-0 flex-1 grid-cols-2 gap-[var(--aura-gap)] sm:mt-5 sm:flex-none lg:mt-6">
              <div className="hidden min-h-28 flex-col justify-between rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] p-4 sm:flex lg:min-h-40 lg:p-5">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[var(--aura-text-muted-on-ink)]">Scent profile</p>
                <p className="font-display mt-3 text-[1.35rem] leading-none sm:mt-4 sm:text-2xl lg:text-[2rem]">{detailValue(product.family)}</p>
              </div>
              <div className="hidden min-h-28 flex-col justify-between rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] p-4 sm:flex lg:min-h-40 lg:p-5">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[var(--aura-text-muted-on-ink)]">Made for</p>
                <p className="font-display mt-3 text-[1.35rem] leading-none sm:mt-4 sm:text-2xl lg:text-[2rem]">{detailValue(product.occasion)}</p>
              </div>

              <div className="col-span-2 hidden min-h-40 grid-cols-3 overflow-hidden rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] text-center sm:grid sm:col-span-1">
                {productAssurances.map(([icon, label]) => (
                  <div key={label} className="grid place-items-center border-r border-[color:var(--aura-rule)] px-2 py-5 last:border-r-0">
                    <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-7" />
                    <span className="text-[0.58rem] uppercase tracking-[0.1em] text-[color:rgb(245_228_199_/_55%)]">{label}</span>
                  </div>
                ))}
              </div>

              <AddToCart product={product} />
            </div>
          </div>
        </div>
      </section>

      <section data-mobile-product-chapter className="relative bg-[var(--aura-ink)] pt-5 text-[var(--aura-ivory)] sm:hidden">
        <div className="px-5 pb-3">
          <div className="grid grid-cols-2 gap-[var(--aura-gap)]">
            <div className="flex min-h-24 flex-col justify-between rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] p-3">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[var(--aura-text-muted-on-ink)]">Scent profile</p>
              <p className="font-display mt-3 text-[1.35rem] leading-none">{detailValue(product.family)}</p>
            </div>
            <div className="flex min-h-24 flex-col justify-between rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] p-3">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[var(--aura-text-muted-on-ink)]">Made for</p>
              <p className="font-display mt-3 text-[1.35rem] leading-none">{detailValue(product.occasion)}</p>
            </div>
          </div>
        </div>
        <div className="mx-5 mb-10 grid min-h-24 grid-cols-3 overflow-hidden rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] text-center">
          {productAssurances.map(([icon, label]) => (
            <div key={label} className="grid place-items-center border-r border-[color:var(--aura-rule)] px-2 py-3 last:border-r-0">
              <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-6" />
              <span className="text-[0.56rem] uppercase tracking-[0.08em] text-[color:rgb(245_228_199_/_55%)]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative min-h-[92svh] overflow-hidden bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-24 text-[var(--aura-ivory)] sm:border-y sm:border-dashed sm:border-[color:var(--aura-rule)] lg:px-[var(--aura-gutter-lg)] lg:py-36">
        <div className="pointer-events-none absolute -right-12 top-[22%] h-[28rem] w-[22rem] rotate-6 overflow-hidden rounded-[1.25rem] opacity-55 lg:right-[8%]" aria-hidden="true">
          <Image data-motion-parallax src="/images/bottle-detail.webp" alt="" fill sizes="22rem" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-[94rem]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">Behind the bottle</p>
          <h2 data-motion-copy className="font-display mt-8 max-w-[8ch] text-[clamp(5.2rem,13vw,13rem)] leading-[0.72]">The scent you did not know the room remembered</h2>
          <p className="ml-auto mt-16 max-w-xl text-lg leading-8 text-[color:rgb(245_228_199_/_65%)]">{product.story}</p>
        </div>
      </section>

      <section className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-32">
        <div className="mx-auto max-w-[82rem]">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ivory)]">The composition record</p>
          <h2 className="font-display mx-auto mt-4 max-w-[11ch] text-center text-[clamp(5rem,11vw,11rem)] leading-[0.75]">Built from the detail up</h2>
          <Accordion className="mx-auto mt-14 max-w-4xl rounded-none border-black/25">
            <AccordionItem value="profile" className="border-black/20 data-open:bg-black/5">
              <AccordionTrigger className="min-h-16 px-5 font-display text-2xl hover:no-underline">Scent profile</AccordionTrigger>
              <AccordionContent className="px-5 text-black/62">{product.publicationState === "published" ? `${product.family} · ${product.concentration} · ${product.intensity}. For ${product.audience}; ${product.occasion}; ${product.season}. Top: ${product.notes.top.join(", ")}. Heart: ${product.notes.heart.join(", ")}. Base: ${product.notes.base.join(", ")}. ${product.longevity} Sillage: ${product.sillage}.` : "Scent profile details are coming soon."}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="ingredients" className="border-black/20 data-open:bg-black/5">
              <AccordionTrigger className="min-h-16 px-5 font-display text-2xl hover:no-underline">Ingredients and usage</AccordionTrigger>
              <AccordionContent className="px-5 text-black/62">{product.publicationState === "published" ? `${product.ingredients} ${product.usage}` : "Ingredients, warnings, and usage details are coming soon."}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery" className="data-open:bg-black/5">
              <AccordionTrigger className="min-h-16 px-5 font-display text-2xl hover:no-underline">Delivery and returns</AccordionTrigger>
              <AccordionContent className="px-5 text-black/62">{commercePolicy ? `Delivery to approved Indian PIN codes takes ${commercePolicy.deliveryEstimate}. ${commercePolicy.cancellationSummary} ${commercePolicy.returnsSummary}` : "Shipping, cancellation, and return details are not available yet."}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-28">
          <div className="mx-auto max-w-[94rem]">
            <h2 className="font-display text-[clamp(5rem,11vw,11rem)] leading-[0.74]">Choose another aura</h2>
            <div className="aura-product-grid mt-12 grid gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">{relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}</div>
          </div>
        </section>
      ) : null}

      {approvedReviews.length > 0 ? (
        <section className="bg-[var(--aura-ink)] px-5 py-20 text-[var(--aura-ivory)] sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[94rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">Verified purchases</p>
            <h2 className="font-display mt-3 text-7xl sm:text-9xl">Reviews</h2>
            <div className="mt-9 grid gap-[var(--aura-gap)] md:grid-cols-3 lg:gap-[var(--aura-gap-lg)]">{approvedReviews.map((review) => <article key={review.id} className="rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] p-6"><p className="font-display text-2xl">{review.rating}/5</p><h3 className="mt-5 font-display text-2xl">{review.title ?? "Verified review"}</h3><p className="mt-3 text-sm leading-6 text-[color:rgb(245_228_199_/_60%)]">{review.body}</p></article>)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
