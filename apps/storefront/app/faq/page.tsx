import type { Metadata } from "next";
import { DiscoveryGuideLinks } from "@/components/discovery-guide-links";
import { EditorialPage } from "@/components/editorial-page";
import { faqItems } from "@/lib/faq";
import { createFaqStructuredData, serializeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Perfume questions and answers",
  description:
    "Find Perfume Aura in Kondapur, Hyderabad, learn how to compare perfumes and notes, and check the current online checkout and delivery status.",
  alternates: { canonical: "/faq" },
  openGraph: {
    siteName: "Perfume Aura",
    locale: "en_IN",
    type: "website",
    url: "/faq",
    title: "Perfume questions and answers | Perfume Aura",
    description: "Clear answers about Perfume Aura and choosing fragrance in Hyderabad and India.",
    images: [{ url: "/images/hero-bottle-still-life.webp", alt: "Perfume Aura fragrance bottles arranged on a dark stone plinth" }],
  },
  twitter: { card: "summary_large_image", title: "Perfume questions and answers | Perfume Aura", description: "Clear answers about Perfume Aura and choosing fragrance in Hyderabad and India.", images: ["/images/hero-bottle-still-life.webp"] },
};

export default function FaqPage() {
  const structuredData = createFaqStructuredData(faqItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <EditorialPage eyebrow="Clear answers" title="Frequently asked questions" intro="Only confirmed shopping details appear here. Policies will be added when they are complete and ready to publish.">
        <div className="divide-y divide-[color:var(--aura-rule)] border-y border-[color:var(--aura-rule)]">
          {faqItems.map((item) => (
            <details key={item.question} className="group open:bg-white/5">
              <summary className="flex min-h-20 cursor-pointer items-center justify-between gap-6 px-5 py-5 font-display text-2xl text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-gold)]">
                {item.question}
                <span aria-hidden="true" className="shrink-0 group-open:hidden">+</span>
                <span aria-hidden="true" className="hidden shrink-0 group-open:inline">−</span>
              </summary>
              <div className="px-5 pb-6 text-sm leading-7 text-[color:rgb(245_228_199_/_74%)]">
                <p>{item.answer}</p>
                {"href" in item ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex min-h-11 items-center border-b border-[color:var(--aura-gold)] font-semibold text-[var(--aura-ivory)] transition-colors hover:text-[var(--aura-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-gold)]"
                  >
                    {item.linkLabel}
                  </a>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </EditorialPage>
      <section className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-16 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-24">
        <div className="mx-auto max-w-[82rem]">
          <DiscoveryGuideLinks heading="Then choose with more context" />
        </div>
      </section>
    </>
  );
}
