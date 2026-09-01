import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@perfume-aura/ui/components/accordion";
import { DiscoveryGuideLinks } from "@/components/discovery-guide-links";
import { EditorialPage } from "@/components/editorial-page";
import { faqItems } from "@/lib/faq";
import { createFaqStructuredData, serializeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Perfume questions and answers",
  description:
    "Clear answers about Perfume Aura, choosing a fragrance, planned sizes, payments, and delivery in India.",
  alternates: { canonical: "/faq" },
  openGraph: {
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
        <Accordion className="rounded-none border-[color:var(--aura-rule)]">
          {faqItems.map((item, index) => (
            <AccordionItem key={item.question} value={`question-${index}`} className="border-[color:var(--aura-rule)] data-open:bg-white/5">
              <AccordionTrigger className="min-h-20 px-5 font-display text-2xl text-[var(--aura-ivory)] hover:no-underline">{item.question}</AccordionTrigger>
              <AccordionContent className="px-5 text-[color:rgb(245_228_199_/_58%)]">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </EditorialPage>
      <section className="bg-[var(--aura-ivory)] px-[var(--aura-gutter)] py-16 text-[var(--aura-ink)] lg:px-[var(--aura-gutter-lg)] lg:py-24">
        <div className="mx-auto max-w-[82rem]">
          <DiscoveryGuideLinks heading="Then choose with more context" />
        </div>
      </section>
    </>
  );
}
