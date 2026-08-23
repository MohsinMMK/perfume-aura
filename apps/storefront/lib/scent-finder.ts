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

export function recommendScentProfiles(
  products: readonly ScentFinderProduct[],
  answers: ScentFinderAnswers,
  limit = 3,
): readonly ScentFinderRecommendation[] {
  return products.flatMap((product) => {
    const noteText = [...product.notes.top, ...product.notes.heart, ...product.notes.base].join(" ");
    const axes = [
      {
        key: "mood",
        answer: answers.mood,
        sources: [
          { label: "family", value: product.family },
          { label: "notes", value: noteText },
        ],
        tokens: answerTokens.mood[answers.mood],
      },
      {
        key: "intensity",
        answer: answers.intensity,
        sources: [{ label: "intensity", value: product.intensity }],
        tokens: answerTokens.intensity[answers.intensity],
      },
      {
        key: "occasion",
        answer: answers.occasion,
        sources: [{ label: "occasion", value: product.occasion }],
        tokens: answerTokens.occasion[answers.occasion],
      },
    ] as const;
    const reasons = axes.flatMap((axis) => {
      const matchedSource = axis.sources.find((source) => {
        const searchable = source.value.toLocaleLowerCase("en-IN");
        return axis.tokens.some((token) => searchable.includes(token));
      });
      return matchedSource
        ? [`${axis.key}: ${axis.answer} matches product ${matchedSource.label}`]
        : [];
    });
    return reasons.length >= 2 ? [{ slug: product.slug, name: product.name, reasons }] : [];
  }).toSorted((left, right) => right.reasons.length - left.reasons.length || left.name.localeCompare(right.name)).slice(0, limit);
}
