import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { ShopListingControls } from "@/components/shop-listing-controls";
import { getStorefrontProducts } from "@/lib/catalog";
import {
  applyShopListingQuery,
  isShopListingQueryActive,
  parseShopListingQuery,
} from "@/lib/shop-listing-query";

export async function generateMetadata({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>): Promise<Metadata> {
  const query = parseShopListingQuery(await searchParams);
  const publicProducts = await getStorefrontProducts();
  const indexable =
    process.env.STOREFRONT_PUBLIC_RELEASE === "true" &&
    publicProducts.some((product) => product.publicationState === "published") &&
    !isShopListingQueryActive(query);
  const description = "Explore published Perfume Aura scents, sizes, and fragrance details in India.";
  return {
    title: "Shop perfume",
    description,
    alternates: { canonical: "/shop" },
    robots: { index: indexable, follow: indexable },
    openGraph: { type: "website", url: "/shop", title: "Shop perfume | Perfume Aura", description },
    twitter: { card: "summary_large_image", title: "Shop perfume | Perfume Aura", description },
  };
}

export default async function ShopPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const products = await getStorefrontProducts();
  const query = parseShopListingQuery(await searchParams);
  const visible = applyShopListingQuery(products, query);
  const facetProducts = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    eyebrow: product.eyebrow,
    collectionSlug: product.collectionSlug,
    variants: product.variants.map((variant) => ({ sizeMl: variant.sizeMl })),
  }));

  return (
    <section className="bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-24 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-32 lg:pt-32">
      <div className="mx-auto max-w-[94rem]">
        <h1
          data-motion-copy
          className="font-display w-fit max-w-full text-[clamp(2.75rem,13vw,12.25rem)] leading-[0.78]"
        >
          <span className="text-outline block whitespace-nowrap">Scent made for</span>
          <span className="block whitespace-nowrap">presence</span>
        </h1>

        <ShopListingControls
          query={query}
          resultCount={visible.length}
          products={facetProducts}
        />

        {products.length === 0 ? (
          <div className="mt-10 border border-dashed border-[color:var(--aura-rule)] p-12 text-center">
            <h2 className="font-display text-4xl">The collection is being prepared.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_58%)]">Product details will appear here when each scent is complete and ready to share.</p>
          </div>
        ) : visible.length ? (
          <div className="aura-product-grid grid gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">
            {visible.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                eagerImageLoading={index < 3}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 border border-dashed border-[color:var(--aura-rule)] p-12 text-center">
            <h2 className="font-display text-4xl">No matches{query.q ? ` for “${query.q}”` : ""}.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[color:rgb(245_228_199_/_58%)]">
              {isShopListingQueryActive(query)
                ? "Check the spelling or clear filters to see the full listing."
                : "Product details will appear here when each scent is complete and ready to share."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
