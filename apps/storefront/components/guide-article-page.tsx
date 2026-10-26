import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { DiscoveryGuideLinks } from "@/components/discovery-guide-links";
import {
  editorialGuides,
  editorialGuideSlugs,
  type EditorialGuide,
} from "@/lib/editorial-guides";
import {
  createEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo";

const noteAccents = ["var(--aura-brass)", "var(--aura-orange)", "var(--aura-ivory)"] as const;

/** Decorative rotating seal beside the guide image. */
function FieldGuideSeal({ number }: Readonly<{ number: string }>) {
  return (
    <span className="absolute -top-6 left-3 z-10 grid size-28 place-items-center rounded-full bg-[var(--aura-ivory)] text-[var(--aura-ink)] shadow-[0_1rem_2.5rem_rgb(0_0_0_/_45%)] sm:size-36 lg:-left-8 lg:size-40" aria-hidden="true">
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full motion-safe:animate-[spin_28s_linear_infinite]" focusable="false">
        <defs>
          <path id="field-guide-seal-path" d="M 80 80 m -62 0 a 62 62 0 1 1 124 0 a 62 62 0 1 1 -124 0" />
        </defs>
        <text className="font-display" fill="currentColor" fontSize="15" letterSpacing="3">
          <textPath href="#field-guide-seal-path">PERFUME AURA · FIELD GUIDE · KONDAPUR ·</textPath>
        </text>
      </svg>
      <span className="font-display text-4xl leading-none sm:text-5xl">{number}</span>
    </span>
  );
}

export function GuideArticlePage({ guide }: Readonly<{ guide: EditorialGuide }>) {
  const structuredData = createEditorialStructuredData({
    path: guide.path,
    title: guide.title,
    description: guide.description,
    image: guide.image,
    publishedDate: guide.publishedDate,
    reviewedDate: guide.reviewedDate,
    breadcrumbLabel: guide.shortTitle,
  });
  const guideIndex = editorialGuideSlugs.indexOf(guide.slug);
  const guideNumber = `0${guideIndex + 1}`;
  const nextGuide = editorialGuides[editorialGuideSlugs[(guideIndex + 1) % editorialGuideSlugs.length]];
  const reviewedOn = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(`${guide.reviewedDate}T00:00:00+05:30`));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <article className="bg-[var(--aura-ink)] text-[var(--aura-ivory)]">
        <header className="px-[var(--aura-gutter)] pb-16 pt-32 lg:px-[var(--aura-gutter-lg)] lg:pb-24 lg:pt-40">
          <div className="mx-auto grid max-w-[94rem] gap-14 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div>
              <nav aria-label="Breadcrumb" className="text-sm text-[var(--aura-text-muted-on-ink)]">
                <Link href="/fragrance-guide" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Fragrance guide</Link>
                <span aria-hidden="true"> / </span>
                <span aria-current="page">{guide.shortTitle}</span>
              </nav>
              <p className="mt-4 font-display text-lg tracking-[0.14em] text-[var(--aura-brass)]">
                Field guide {guideNumber} <span className="text-[var(--aura-text-muted-on-ink)]">/ 0{editorialGuideSlugs.length}</span>
              </p>
              <h1 data-motion-copy className="font-display mt-4 max-w-[13ch] text-[clamp(3.6rem,8.5vw,8.5rem)] leading-[0.8] text-balance">
                {guide.title}
              </h1>
              <p className="mt-8 max-w-3xl text-base leading-8 text-[color:rgb(245_228_199_/_76%)] sm:text-lg sm:leading-9">
                {guide.introduction}
              </p>
              <dl className="mt-10 grid border-y border-dashed border-[color:var(--aura-rule)] text-sm sm:grid-cols-3">
                {[
                  ["Written by", guide.author],
                  ["Reviewed by", guide.reviewer],
                  ["Reviewed on", reviewedOn],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-dashed border-[color:var(--aura-rule)] py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
                    <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">{label}</dt>
                    <dd className="mt-1 font-display text-xl">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <figure className="relative">
              <FieldGuideSeal number={guideNumber} />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)]">
                <Image data-motion-parallax src={guide.image} alt={guide.imageAlt} fill preload sizes="(max-width: 1024px) 100vw, 38vw" className="object-cover" />
              </div>
              <figcaption className="border-b border-dashed border-[color:var(--aura-rule)] py-4 text-xs leading-5 text-[var(--aura-text-muted-on-ink)]">
                Use fragrance descriptions as a shortlist, then test the complete composition in your real setting.
              </figcaption>
            </figure>
          </div>
        </header>

        <div className="border-t border-dashed border-[color:var(--aura-rule)] px-[var(--aura-gutter)] py-16 lg:px-[var(--aura-gutter-lg)] lg:py-24">
          <div className="mx-auto grid max-w-[94rem] gap-12 lg:grid-cols-[17rem_1fr] lg:gap-16">
            <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">On this page</p>
              <ol className="mt-4 border-t border-dashed border-[color:var(--aura-rule)]">
                {guide.sections.map((section, sectionIndex) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group grid min-h-14 grid-cols-[2.5rem_1fr] items-center border-b border-dashed border-[color:var(--aura-rule)] font-display text-lg transition-colors hover:text-[var(--aura-brass)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]"
                    >
                      <span className="text-sm tracking-[0.14em] text-[var(--aura-text-muted-on-ink)] group-hover:text-[var(--aura-brass)]">0{sectionIndex + 1}</span>
                      <span className="leading-tight">{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="grid gap-20 lg:gap-28">
              {guide.sections.map((section, sectionIndex) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="relative scroll-mt-28">
                  <div className="flex items-end justify-between gap-6 border-b border-dashed border-[color:var(--aura-rule)] pb-6">
                    <h2 id={`${section.id}-heading`} data-motion-copy className="font-display max-w-[14ch] text-[clamp(3rem,5.5vw,6rem)] leading-[0.82] text-balance">{section.title}</h2>
                    <span className="text-outline font-display shrink-0 text-[clamp(4.5rem,9vw,9rem)] leading-[0.75]" aria-hidden="true">0{sectionIndex + 1}</span>
                  </div>
                  <div className="mt-8 max-w-3xl space-y-6 text-base leading-8 text-[color:rgb(245_228_199_/_72%)]">
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={paragraph} className={paragraphIndex === 0 ? "text-lg leading-9 text-[color:rgb(245_228_199_/_90%)] sm:text-xl sm:leading-10" : undefined}>{paragraph}</p>
                    ))}
                  </div>
                  {section.points ? (
                    <dl className="mt-10 grid gap-[var(--aura-gap)] sm:grid-cols-2 xl:grid-cols-3 lg:gap-[var(--aura-gap-lg)]">
                      {section.points.map((point, pointIndex) => (
                        <div key={point.title} className="flex min-h-48 flex-col overflow-hidden rounded-[var(--aura-radius)] bg-[var(--aura-elevated)]">
                          <span className="flex min-h-9 items-center justify-between px-5 font-display text-xs tracking-[0.18em] text-[var(--aura-ink)]" style={{ background: noteAccents[pointIndex % noteAccents.length] }} aria-hidden="true">
                            Note 0{pointIndex + 1}
                            <span className="aura-stack__dot" />
                          </span>
                          <dt className="px-5 pt-5 font-display text-2xl leading-tight text-[var(--aura-ivory)]">{point.title}</dt>
                          <dd className="px-5 pb-6 pt-2 text-sm leading-6 text-[color:rgb(245_228_199_/_70%)]">{point.detail}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>

        <Link
          href={nextGuide.path}
          className="group block bg-[var(--aura-orange)] px-[var(--aura-gutter)] py-14 text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-20"
        >
          <span className="mx-auto flex max-w-[94rem] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.2em]">Next field guide</span>
              <span className="font-display mt-4 block max-w-[16ch] text-[clamp(3rem,7vw,7rem)] leading-[0.8]">{nextGuide.title}</span>
            </span>
            <span className="grid size-20 shrink-0 place-items-center rounded-full border border-[var(--aura-ink)] transition-colors group-hover:bg-[var(--aura-ink)] group-hover:text-[var(--aura-orange)] sm:size-24" aria-hidden="true">
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.6} className="size-9 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </span>
          </span>
        </Link>

        <aside className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-16 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-24">
          <div className="mx-auto max-w-[82rem]">
            <DiscoveryGuideLinks currentSlug={guide.slug} heading="Continue choosing with context" />
          </div>
        </aside>
      </article>
    </>
  );
}
