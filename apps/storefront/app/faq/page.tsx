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
  ["Is the online store open?", "Not yet. Online checkout is not available while product, payment, delivery, and policy details are being completed."],
  ["Which sizes are planned?", "Standard scents are planned in 30 ml, 50 ml, and 100 ml. Signature scents are planned in 50 ml and 105 ml. No 10 ml product or discovery set is available for sale."],
  ["How will payments work?", "Cashfree prepaid payments and cash on delivery are planned. Payment is not available yet."],
  ["Will delivery be available across India?", "India-wide delivery is planned. Fees, thresholds, courier details, and delivery estimates are not available yet."],
] as const;

export default function FaqPage() {
  return (
    <EditorialPage eyebrow="Clear answers" title="Frequently asked questions" intro="Only confirmed shopping details appear here. Policies will be added when they are complete and ready to publish.">
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
