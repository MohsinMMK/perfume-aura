import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@perfume-aura/ui/components/accordion";
import { EditorialPage } from "@/components/editorial-page";

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

const questions = [
  ["What is Perfume Aura?", "Perfume Aura is a fragrance store in Kondapur, Hyderabad. The public website currently introduces the brand and helps visitors understand how to choose a scent while the first complete collection is being prepared."],
  ["How do I choose a perfume?", "Start with the mood you want, then compare fragrance family, intensity, and the occasions when you expect to wear it. Test one perfume at a time on clean skin and notice how it changes before deciding."],
  ["What do top, heart, and base notes mean?", "Top notes shape the opening, heart notes form the central character, and base notes are the later foundation. The complete composition matters more than choosing from one note in isolation."],
  ["Should I test perfume on paper or skin?", "Paper is useful for a first comparison. A careful skin test gives better personal context because warmth, environment, and perception can change how a composition feels to you."],
  ["Is the online store open?", "Not yet. Online checkout is not available while product, payment, delivery, and policy details are being completed."],
  ["Which sizes are planned?", "Standard scents are planned in 30 ml, 50 ml, and 100 ml. Signature scents are planned in 50 ml and 105 ml. No 10 ml product or discovery set is available for sale."],
  ["How will payments work?", "Checkout will be prepaid through Cashfree UPI. Google Pay and other supported UPI apps may appear when available for your device. Cash on delivery will not be offered. Payment is not available yet."],
  ["Will delivery be available across India?", "India-wide delivery is planned. Fees, thresholds, courier details, and delivery estimates are not available yet."],
] as const;

export default function FaqPage() {
  return (
    <EditorialPage eyebrow="Clear answers" title="Frequently asked questions" intro="Only confirmed shopping details appear here. Policies will be added when they are complete and ready to publish.">
      <Accordion className="rounded-none border-[color:var(--aura-rule)]">
        {questions.map(([question, answer], index) => (
          <AccordionItem key={question} value={`question-${index}`} className="border-[color:var(--aura-rule)] data-open:bg-white/5">
            <AccordionTrigger className="min-h-20 px-5 font-display text-2xl text-[var(--aura-ivory)] hover:no-underline">{question}</AccordionTrigger>
            <AccordionContent className="px-5 text-[color:rgb(245_228_199_/_58%)]">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </EditorialPage>
  );
}
