import {
  perfumeAuraGoogleMapsUrl,
  perfumeAuraStoreAddress,
} from "./store-location";

export const faqItems = [
  {
    question: "What is Perfume Aura?",
    answer:
      "Perfume Aura is a fragrance store in Kondapur, Hyderabad. The public website currently introduces the brand and helps visitors understand how to choose a scent while the first complete collection is being prepared.",
  },
  {
    question: "Where is the Perfume Aura Hyderabad store?",
    answer: `The store is at ${perfumeAuraStoreAddress}. The official Google Maps listing identifies perfumeaura.com as the store website.`,
    href: perfumeAuraGoogleMapsUrl,
    linkLabel: "Open Perfume Aura Hyderabad in Google Maps",
  },
  {
    question: "How do I choose a perfume?",
    answer:
      "Start with the mood you want, then compare fragrance family, intensity, and the occasions when you expect to wear it. Test one perfume at a time on clean skin and notice how it changes before deciding.",
  },
  {
    question: "What do top, heart, and base notes mean?",
    answer:
      "Top notes shape the opening, heart notes form the central character, and base notes are the later foundation. The complete composition matters more than choosing from one note in isolation.",
  },
  {
    question: "Should I test perfume on paper or skin?",
    answer:
      "Paper is useful for a first comparison. A careful skin test gives better personal context because warmth, environment, and perception can change how a composition feels to you.",
  },
  {
    question: "Is the online store open?",
    answer:
      "Not yet. Online checkout is not available while product, payment, delivery, and policy details are being completed.",
  },
  {
    question: "Which sizes are planned?",
    answer:
      "Standard scents are planned in 30 ml, 50 ml, and 100 ml. Signature scents are planned in 50 ml and 105 ml. No 10 ml product or discovery set is available for sale.",
  },
  {
    question: "How will payments work?",
    answer:
      "Checkout will be prepaid through Cashfree UPI. Google Pay and other supported UPI apps may appear when available for your device. Cash on delivery will not be offered. Payment is not available yet.",
  },
  {
    question: "Will delivery be available across India?",
    answer:
      "India-wide delivery is planned. Fees, thresholds, courier details, and delivery estimates are not available yet.",
  },
] as const;
