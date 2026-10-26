/**
 * Five-star reviews quoted as published on the Perfume Aura Hyderabad Google
 * Maps listing. Quote them faithfully and never add, merge or invent one; the
 * listing owns the live rating, so the summary below records when it was read.
 */
export type StoreReview = Readonly<{
  author: string;
  quote: string;
}>;

export const storeReviews: readonly StoreReview[] = [
  {
    author: "Gaurav J.",
    quote:
      "Wahaj helped me to understand my fragrance note and then suggested accordingly. After trying different notes finally bought these. He also shared some knowledge on perfumes. Liked it",
  },
  {
    author: "Tripti L.",
    quote:
      "Amazing fragrances, great quality, and very helpful staff! Loved my experience. Definitely recommend",
  },
  {
    author: "Google reviewer",
    quote: "Considering the quality and price, I feel it’s definitely worth the money.",
  },
  {
    author: "Google reviewer",
    quote: "The collection is impressive, and the staff is friendly and helpful.",
  },
  {
    author: "Google reviewer",
    quote: "Great prices, beautiful packaging, and outstanding customer service.",
  },
];

export const storeReviewSummary = {
  rating: "4.9",
  count: 48,
  checkedOn: "October 2026",
} as const;
