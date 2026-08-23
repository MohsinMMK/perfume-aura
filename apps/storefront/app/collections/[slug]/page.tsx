import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { getStorefrontCollection } from "@/lib/catalog";
import { isPublicCatalogEnabled } from "@/lib/catalog-policy";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getStorefrontCollection(slug);
  return collection && isPublicCatalogEnabled()
    ? { title: collection.title, description: collection.description, alternates: { canonical: `/collections/${slug}` } }
    : { title: collection?.title ?? "Collection unavailable", robots: { index: false, follow: false } };
}

export default async function CollectionPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const collection = await getStorefrontCollection(slug);
  if (!collection) notFound();
  return <section className="min-h-[80svh] bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-24 pt-28 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:pb-32 lg:pt-32"><div className="mx-auto max-w-[94rem]"><div className="max-w-5xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">Collection</p><h1 className="font-display mt-4 text-[clamp(5rem,12vw,12rem)] leading-[0.74]">{collection.title}</h1><p className="mt-7 max-w-2xl text-sm leading-6 text-[color:rgb(245_228_199_/_58%)]">{collection.description}</p></div><div className="aura-product-grid mt-14 grid gap-[var(--aura-gap)] lg:gap-[var(--aura-gap-lg)]">{collection.products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section>;
}
