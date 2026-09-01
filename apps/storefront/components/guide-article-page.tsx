import Image from "next/image";
import Link from "next/link";
import { DiscoveryGuideLinks } from "@/components/discovery-guide-links";
import type { EditorialGuide } from "@/lib/editorial-guides";
import {
  createEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo";

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <article className="bg-[var(--aura-ink)] text-[var(--aura-ivory)]">
        <header className="px-[var(--aura-gutter)] pb-20 pt-32 lg:px-[var(--aura-gutter-lg)] lg:pb-28 lg:pt-40">
          <div className="mx-auto grid max-w-[94rem] gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
            <div>
              <nav aria-label="Breadcrumb" className="text-sm text-[var(--aura-text-muted-on-ink)]">
                <Link href="/fragrance-guide" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Fragrance guide</Link>
                <span aria-hidden="true"> / </span>
                <span aria-current="page">{guide.shortTitle}</span>
              </nav>
              <h1 className="font-display mt-5 max-w-[12ch] text-[clamp(3.8rem,9vw,9rem)] leading-[0.78] text-balance">
                {guide.title}
              </h1>
              <p className="mt-8 max-w-3xl text-base leading-8 text-[color:rgb(245_228_199_/_76%)]">
                {guide.introduction}
              </p>
              <p className="mt-7 text-sm text-[var(--aura-text-muted-on-ink)]">
                By {guide.author} · Reviewed by {guide.reviewer} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(`${guide.reviewedDate}T00:00:00+05:30`))}
              </p>
            </div>
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--aura-radius)]">
                <Image src={guide.image} alt={guide.imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />
              </div>
              <figcaption className="border-b border-dashed border-[color:var(--aura-rule)] py-4 text-xs leading-5 text-[var(--aura-text-muted-on-ink)]">
                Use fragrance descriptions as a shortlist, then test the complete composition in your real setting.
              </figcaption>
            </figure>
          </div>
        </header>

        <div className="border-y border-dashed border-[color:var(--aura-rule)] px-[var(--aura-gutter)] lg:px-[var(--aura-gutter-lg)]">
          <nav aria-label="On this page" className="mx-auto flex max-w-[94rem] flex-wrap items-center gap-x-6 py-4 text-sm">
            <strong className="text-[var(--aura-brass)]">On this page</strong>
            {guide.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{section.title}</a>
            ))}
          </nav>
        </div>

        <div className="px-[var(--aura-gutter)] py-20 lg:px-[var(--aura-gutter-lg)] lg:py-28">
          <div className="mx-auto max-w-[82rem] divide-y divide-dashed divide-[color:var(--aura-rule)] border-y border-dashed border-[color:var(--aura-rule)]">
            {guide.sections.map((section, sectionIndex) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 py-16 lg:grid lg:grid-cols-[.72fr_1.28fr] lg:gap-16 lg:py-24">
                <div>
                  <span className="font-display text-3xl text-[var(--aura-brass)]">0{sectionIndex + 1}</span>
                  <h2 className="font-display mt-4 max-w-[12ch] text-[clamp(3.2rem,6vw,6.5rem)] leading-[0.82] text-balance">{section.title}</h2>
                </div>
                <div className="mt-8 max-w-3xl space-y-6 text-base leading-8 text-[color:rgb(245_228_199_/_74%)] lg:mt-0">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.points ? (
                    <dl className="mt-10 border-y border-dashed border-[color:var(--aura-rule)]">
                      {section.points.map((point) => (
                        <div key={point.title} className="grid gap-2 border-b border-dashed border-[color:var(--aura-rule)] py-5 last:border-b-0 sm:grid-cols-[10rem_1fr]">
                          <dt className="font-display text-2xl text-[var(--aura-ivory)]">{point.title}</dt>
                          <dd className="text-sm leading-7">{point.detail}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-16 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-24">
          <div className="mx-auto max-w-[82rem]">
            <DiscoveryGuideLinks currentSlug={guide.slug} heading="Continue choosing with context" />
          </div>
        </aside>
      </article>
    </>
  );
}
