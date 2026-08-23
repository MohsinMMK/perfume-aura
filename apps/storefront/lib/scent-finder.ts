export type ScentFinderAnswers = Readonly<{
  mood: "Quiet" | "Magnetic" | "Radiant";
  intensity: "Close" | "Balanced" | "Commanding";
  occasion: "Every day" | "Evening" | "Occasion";
}>;

export type ScentFinderProduct = Readonly<{
  slug: string;
  name: string;
  family: string;
  intensity: string;
  occasion: string;
  notes: Readonly<{
    top: readonly string[];
    heart: readonly string[];
    base: readonly string[];
  }>;
}>;

export type ScentFinderRecommendation = Readonly<{
  slug: string;
  name: string;
  reasons: readonly string[];
}>;

const answerTokens = {
  mood: {
    Quiet: ["soft", "musk", "powder", "floral", "gentle", "calm"],
    Magnetic: ["oud", "amber", "spice", "woody", "leather", "warm"],
    Radiant: ["citrus", "fresh", "aquatic", "fruity", "bright", "green"],
  },
  intensity: {
    Close: ["close", "soft", "light", "intimate", "subtle"],
    Balanced: ["balanced", "moderate", "medium", "versatile"],
    Commanding: ["commanding", "strong", "intense", "bold", "powerful"],
  },
  occasion: {
    "Every day": ["everyday", "daily", "day", "office", "casual"],
    Evening: ["evening", "night", "dinner"],
    Occasion: ["occasion", "formal", "celebration", "special", "event"],
  },
} as const;

function normalizedProductText(product: ScentFinderProduct): string {
  return [
    product.family,
    product.intensity,
    product.occasion,
    ...product.notes.top,
    ...product.notes.heart,
    ...product.notes.base,
  ].join(" ").toLocaleLowerCase("en-IN");
}

export function recommendScentProfiles(
  products: readonly ScentFinderProduct[],
  answers: ScentFinderAnswers,
  limit = 3,
): readonly ScentFinderRecommendation[] {
  return products.flatMap((product) => {
    const searchable = normalizedProductText(product);
    const axes = [
      { key: "mood", answer: answers.mood, source: product.family, tokens: answerTokens.mood[answers.mood] },
      { key: "intensity", answer: answers.intensity, source: product.intensity, tokens: answerTokens.intensity[answers.intensity] },
      { key: "occasion", answer: answers.occasion, source: product.occasion, tokens: answerTokens.occasion[answers.occasion] },
    ] as const;
    const reasons = axes.flatMap((axis) => axis.tokens.some((token) => searchable.includes(token))
      ? [`${axis.key}: ${axis.answer} matches ${axis.source}`]
      : []);
    return reasons.length >= 2 ? [{ slug: product.slug, name: product.name, reasons }] : [];
  }).toSorted((left, right) => right.reasons.length - left.reasons.length || left.name.localeCompare(right.name)).slice(0, limit);
}
