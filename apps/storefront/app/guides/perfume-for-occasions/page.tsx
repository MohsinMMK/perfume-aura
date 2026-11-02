import type { Metadata } from "next";
import { GuideArticlePage } from "@/components/guide-article-page";
import { editorialGuides } from "@/lib/editorial-guides";
import { createShareMetadata, shareImageFor } from "@/lib/seo";

const guide = editorialGuides["perfume-for-occasions"];

export const metadata: Metadata = {
  title: "Perfume for work, weddings, evenings, and gifts",
  description: guide.description,
  alternates: { canonical: guide.path },
  ...createShareMetadata({
    path: guide.path,
    title: guide.title,
    description: guide.description,
    type: "article",
    image: shareImageFor(guide.image, guide.imageAlt),
  }),
};

export default function PerfumeForOccasionsGuidePage() {
  return <GuideArticlePage guide={guide} />;
}
