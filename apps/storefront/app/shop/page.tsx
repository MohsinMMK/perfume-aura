import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { getStorefrontCollectionSlugs, getStorefrontProducts } from "@/lib/catalog";
import { listingCollections } from "@/lib/listing-catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Explore Perfume Aura scents, sizes, and prices in INR.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const products = await getStorefrontProducts();
  const collectionSlugs = await getStorefrontCollectionSlugs();

  return (
    <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-24 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-32 lg:pt-32">
      <div className="mx-auto max-w-[94rem]">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:rgb(245_228_199_/_55%)]">The Perfume Aura collection</p>
        <h1 data-motion-copy className="font-display mt-5 max-w-[10ch] text-[clamp(5rem,13vw,13rem)] leading-[0.72]">
          Scent made <span className="text-outline">for presence</span>
        </h1>
        <p className="mt-8 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_60%)]">
          {products.length} scents across Signature and Inspired listings. Prices, notes, and checkout open only when each edition is complete.
        </p>

        {collectionSlugs.length ? (
          <nav aria-label="Shop collections" className="mt-10 mb-6 flex flex-wrap gap-[var(--aura-gap)]">
            {collectionSlugs.map((slug) => {
              const collection = slug in listingCollections
                ? listingCollections[slug as keyof typeof listingCollections]
                : null;
              return (
                <Link
                  key={slug}
                  href={`/collections/${slug}`}
                  className="inline-flex min-h-12 items-center border border-[color:var(--aura-rule)] px-4 font-display text-lg text-[var(--aura-ivory)] transition hover:border-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--aura-ivory)]"
                >
                  {collection?.title ?? slug}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {products.length ? (
          <div className="aura-product-grid grid gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="mt-10 border border-dashed border-[color:var(--aura-rule)] p-12 text-center">
            <h2 className="font-display text-4xl">The collection is being prepared.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_58%)]">Product details will appear here when each scent is complete and ready to share.</p>
          </div>
        )}
      </div>
    </section>
  );
}
