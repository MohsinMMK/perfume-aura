import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ArrowUpRight01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { ProductCard } from "@/components/product-card";
import { getStorefrontCollection } from "@/lib/catalog";
import { isPublicCatalogEnabled } from "@/lib/catalog-policy";
import { listingCollections } from "@/lib/listing-catalog";
import { getStorefrontOrigin, serializeJsonLd, noIndexRobots } from "@/lib/seo";
import { perfumeAuraGoogleMapsUrl } from "@/lib/store-location";

// `panel` carries small ink text, so it stays on tokens with AA contrast.
const collectionAccents: Readonly<Record<string, Readonly<{ accent: string; panel: string }>>> = {
  signature: { accent: "var(--aura-brass)", panel: "var(--aura-brass)" },
  inspired: { accent: "var(--aura-orange)", panel: "var(--aura-orange)" },
  unknown: { accent: "var(--aura-red)", panel: "var(--aura-brass)" },
};
const defaultAccent = { accent: "var(--aura-brass)", panel: "var(--aura-brass)" } as const;

function otherCollections(slug: string) {
  return Object.entries(listingCollections)
    .filter(([otherSlug]) => otherSlug !== slug)
    .map(([otherSlug, collection]) => [otherSlug, collection.title] as const);
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getStorefrontCollection(slug);
  return collection && isPublicCatalogEnabled()
    ? {
        title: collection.seoTitle,
        description: collection.seoDescription,
        alternates: { canonical: `/collections/${slug}` },
        openGraph: { type: "website", url: `/collections/${slug}`, title: collection.seoTitle, description: collection.seoDescription },
        twitter: { card: "summary_large_image", title: collection.seoTitle, description: collection.seoDescription },
      }
    : { title: collection?.title ?? "Collection unavailable", robots: noIndexRobots };
}

export default async function CollectionPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const collection = await getStorefrontCollection(slug);
  if (!collection) notFound();
  const origin = getStorefrontOrigin();
  const pageUrl = `${origin}/collections/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: origin },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${origin}/shop` },
      { "@type": "ListItem", position: 3, name: collection.title, item: pageUrl },
    ],
  } as const;
  const { accent, panel } = collectionAccents[slug] ?? defaultAccent;
  const siblings = isPublicCatalogEnabled() ? [] : otherCollections(slug);
  const titleWords = collection.title.split(" ");
  const leadTitle = titleWords.length > 1 ? titleWords.slice(0, -1).join(" ") : collection.title;
  const outlineTitle = titleWords.length > 1 ? titleWords.at(-1) : null;
  const count = collection.products.length;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-14 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-20 lg:pt-32">
        <div className="mx-auto max-w-[94rem]">
          <nav aria-label="Breadcrumb" className="text-sm text-[var(--aura-text-muted-on-ink)]">
            <Link href="/shop" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Shop</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{collection.title}</span>
          </nav>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <h1 data-motion-copy className="font-display text-[clamp(4rem,12vw,12rem)] leading-[0.74]">
              {leadTitle}
              {outlineTitle ? <span className="text-outline block">{outlineTitle}</span> : null}
            </h1>
            <p className="flex items-baseline gap-3 lg:flex-col lg:items-end lg:gap-1">
              <span className="font-display text-[clamp(4rem,9vw,9rem)] leading-[0.8]" style={{ color: accent }}>{String(count).padStart(2, "0")}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">{count === 1 ? "Fragrance" : "Fragrances"}</span>
            </p>
          </div>
          <div className="mt-10 grid gap-6 border-y border-dashed border-[color:var(--aura-rule)] py-6 md:grid-cols-[1fr_auto] md:items-center">
            <p className="max-w-2xl text-sm leading-6 text-[color:rgb(245_228_199_/_68%)]">{collection.description}</p>
            {siblings.length > 0 ? <div className="flex flex-wrap gap-2">
              {siblings.map(([otherSlug, title]) => (
                <Link key={otherSlug} href={`/collections/${otherSlug}`} className="inline-flex min-h-11 items-center rounded-full border border-[color:rgb(245_228_199_/_45%)] px-5 text-sm transition-colors hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]">
                  {title}
                </Link>
              ))}
            </div> : null}
          </div>
        </div>
      </section>

      <div className="h-2" style={{ background: accent }} aria-hidden="true" />

      <section aria-label={`${collection.title} fragrances`} className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-14 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-20">
        <div className="aura-product-grid mx-auto grid max-w-[94rem] gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">
          {collection.products.map((product, index) => <ProductCard key={product.id} product={product} eagerImageLoading={index < 2} />)}
        </div>
      </section>

      <section aria-label="Choosing from this collection" className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-28">
        <div className="mx-auto grid max-w-[94rem] gap-[var(--aura-gap)] lg:grid-cols-[1.2fr_0.8fr] lg:gap-[var(--aura-gap-lg)]">
          <Link href="/fragrance-guide" className="group flex min-h-80 flex-col justify-between rounded-[var(--aura-radius)] bg-[var(--aura-ivory)] p-7 text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] sm:p-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ivory)]">Not sure where to start?</span>
            <span className="flex items-end justify-between gap-6">
              <span className="font-display max-w-[11ch] text-[clamp(3rem,6vw,6rem)] leading-[0.8]">Narrow it by feeling first</span>
              <span className="grid size-16 shrink-0 place-items-center rounded-full border border-[var(--aura-ink)] transition-colors group-hover:bg-[var(--aura-ink)] group-hover:text-[var(--aura-ivory)]" aria-hidden="true">
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.6} className="size-7" />
              </span>
            </span>
          </Link>
          <a href={perfumeAuraGoogleMapsUrl} target="_blank" rel="noreferrer" className="group flex min-h-80 flex-col justify-between rounded-[var(--aura-radius)] p-7 text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] sm:p-10" style={{ background: panel }}>
            <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em]">
              Kondapur, Hyderabad
              <HugeiconsIcon icon={Location01Icon} strokeWidth={1.6} aria-hidden="true" className="size-6" />
            </span>
            <span className="flex items-end justify-between gap-6">
              <span className="font-display max-w-[10ch] text-[clamp(3rem,5vw,5rem)] leading-[0.8]">Test your shortlist in store</span>
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.6} aria-hidden="true" className="size-9 shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transition-none" />
            </span>
            <span className="sr-only"> (opens Google Maps in a new tab)</span>
          </a>
        </div>
      </section>
    </>
  );
}
