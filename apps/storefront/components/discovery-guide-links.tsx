import Link from "next/link";
import {
  editorialGuides,
  editorialGuideSlugs,
  type EditorialGuideSlug,
} from "@/lib/editorial-guides";

export function DiscoveryGuideLinks({
  currentSlug,
  heading = "Keep choosing with context",
}: Readonly<{
  currentSlug?: EditorialGuideSlug;
  heading?: string;
}>) {
  const guides = editorialGuideSlugs
    .filter((slug) => slug !== currentSlug)
    .map((slug) => editorialGuides[slug]);

  return (
    <nav aria-label="Fragrance guides">
      <h2 className="font-display max-w-[12ch] text-[clamp(3.2rem,6vw,6.5rem)] leading-[0.8]">
        {heading}
      </h2>
      <div className="mt-8 border-y border-dashed border-current/25">
        {guides.map((guide) => (
          <Link
            key={guide.path}
            href={guide.path}
            className="group grid min-h-14 items-center gap-2 border-b border-dashed border-current/25 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6"
          >
            <span className="font-display text-2xl">{guide.shortTitle}</span>
            <span className="text-sm leading-6 opacity-75">{guide.description}</span>
          </Link>
        ))}
      </div>
      <Link
        href="/fragrance-guide"
        className="mt-6 inline-flex min-h-14 items-center font-display text-lg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
      >
        Read the full fragrance guide
      </Link>
    </nav>
  );
}
