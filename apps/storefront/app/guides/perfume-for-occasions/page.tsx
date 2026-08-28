import type { Metadata } from "next";
import { GuideArticlePage } from "@/components/guide-article-page";
import { editorialGuides } from "@/lib/editorial-guides";

const guide = editorialGuides["perfume-for-occasions"];

export const metadata: Metadata = {
  title: "Perfume for work, weddings, evenings, and gifts",
  description: guide.description,
  alternates: { canonical: guide.path },
  openGraph: { type: "article", url: guide.path, title: guide.title, description: guide.description, images: [{ url: guide.image, alt: guide.imageAlt }] },
  twitter: { card: "summary_large_image", title: guide.title, description: guide.description, images: [guide.image] },
};

export default function PerfumeForOccasionsGuidePage() {
  return <GuideArticlePage guide={guide} />;
}
