import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@perfume-aura/ui/components/accordion";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "FAQ", alternates: { canonical: "/faq" } };

const questions = [
  ["Is the online store open?", "Not yet. The experience is in staging and checkout is locked until the catalog, policies, provider configuration, and legal gates are complete."],
  ["Which sizes are planned?", "Approved standard scents use 30 ml, 50 ml, and 100 ml. Signature scents use 50 ml and 105 ml. No 10 ml product or discovery set is approved for sale."],
  ["How will payments work?", "Cashfree prepaid payments and cash on delivery are selected. Cashfree merchant onboarding and live credentials remain required before release."],
  ["Will delivery be available across India?", "India-wide delivery is planned. The exact fee, threshold, courier process, and delivery wording still require owner approval."],
] as const;

export default function FaqPage() {
  return (
    <EditorialPage eyebrow="Clear answers" title="Frequently asked questions" intro="Only confirmed commerce facts appear here. Policy details remain withheld until they are approved.">
      <Accordion className="rounded-none border-[color:rgb(245_228_199_/_28%)]">
        {questions.map(([question, answer], index) => (
          <AccordionItem key={question} value={`question-${index}`} className="border-[color:rgb(245_228_199_/_22%)] data-open:bg-white/5">
            <AccordionTrigger className="min-h-20 px-5 font-display text-2xl text-[var(--aura-ivory)] hover:no-underline">{question}</AccordionTrigger>
            <AccordionContent className="px-5 text-[color:rgb(245_228_199_/_58%)]">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </EditorialPage>
  );
}
