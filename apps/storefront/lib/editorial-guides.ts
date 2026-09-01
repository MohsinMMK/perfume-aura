export const editorialGuideSlugs = [
  "perfume-for-hyderabad-weather",
  "fragrance-families",
  "perfume-for-occasions",
] as const;

export type EditorialGuideSlug = (typeof editorialGuideSlugs)[number];

export type EditorialGuideSection = Readonly<{
  id: string;
  title: string;
  paragraphs: readonly string[];
  points?: readonly Readonly<{ title: string; detail: string }>[];
}>;

export type EditorialGuide = Readonly<{
  slug: EditorialGuideSlug;
  path: `/guides/${EditorialGuideSlug}`;
  title: string;
  shortTitle: string;
  description: string;
  introduction: string;
  image: string;
  imageAlt: string;
  author: "Perfume Aura";
  reviewer: "Perfume Aura editorial team";
  publishedDate: "2026-08-28";
  reviewedDate: "2026-08-28" | "2026-09-01";
  sections: readonly EditorialGuideSection[];
}>;

export const editorialGuides: Readonly<Record<EditorialGuideSlug, EditorialGuide>> = {
  "perfume-for-hyderabad-weather": {
    slug: "perfume-for-hyderabad-weather",
    path: "/guides/perfume-for-hyderabad-weather",
    title: "How to choose perfume for Hyderabad weather",
    shortTitle: "Hyderabad weather",
    description:
      "A practical guide to testing and wearing perfume through Hyderabad heat, humidity, air conditioning, and seasonal change.",
    introduction:
      "Hyderabad does not have one fragrance season. Hot afternoons, humid monsoon days, cooler evenings, and air-conditioned rooms can all change how a perfume seems to open and travel. Use climate as testing context, not as a rule that limits what you can wear.",
    image: "/images/azure-tides-50ml.webp",
    imageAlt: "Perfume Aura bottle staged with cool blue glass and reflected light",
    author: "Perfume Aura",
    reviewer: "Perfume Aura editorial team",
    publishedDate: "2026-08-28",
    reviewedDate: "2026-09-01",
    sections: [
      {
        id: "heat",
        title: "What heat can change",
        paragraphs: [
          "Warm skin can make the opening of a perfume feel more immediate and noticeable. A composition that seems restrained in a cool shop may feel broader outdoors at midday, so compare it in the conditions where you expect to wear it.",
          "Fresh, citrus, green, and aromatic directions are often easy starting points in heat, but they are not the only answer. Woods, florals, amber, and oud can also work when the amount applied and setting suit the composition.",
        ],
        points: [
          { title: "Start lightly", detail: "Use fewer sprays for the first wear; add only after you understand the scent in heat." },
          { title: "Test beyond the opening", detail: "Give the fragrance time on skin before judging how it settles." },
          { title: "Compare one at a time", detail: "Several perfumes on the same arm make the result harder to read." },
        ],
      },
      {
        id: "humidity",
        title: "Humidity, monsoon, and indoor air",
        paragraphs: [
          "Humid conditions can make a fragrance feel fuller or closer depending on its structure and your perception. During monsoon weather, test the same perfume on more than one day before deciding.",
          "Air conditioning creates a different setting from the street. If most of your day is in an office, assess the scent indoors as well as outside and choose a presence that remains comfortable at close range.",
        ],
      },
      {
        id: "indoor-outdoor",
        title: "Indoor cold air and outdoor heat",
        paragraphs: [
          "A typical Hyderabad workday can move from air-conditioned offices in Kondapur or HITEC City into much warmer outdoor air. A perfume that feels quiet indoors may seem broader on the street, so wear it through both settings before you decide.",
          "Use that swing as evidence, not as a reason to overspray. If the scent becomes uncomfortable once you leave the cooled room, choose a lighter application or a different direction rather than assuming the formula failed.",
        ],
        points: [
          { title: "Office to street", detail: "Notice the scent when you step outside, not only at your desk." },
          { title: "Evening plans", detail: "If you will go from work into an outdoor dinner, test that full sequence." },
          { title: "Do not chase hour counts", detail: "Wear time varies; write down what you actually noticed in this climate." },
        ],
      },
      {
        id: "routine",
        title: "A useful Hyderabad testing routine",
        paragraphs: [
          "Begin on a blotter, shortlist no more than two directions, and move each one to clean skin. Notice it after the opening, after you have moved between outdoors and indoors, and again later in the day.",
          "Write down what you actually noticed rather than relying on a claimed hour count. Wear time varies with formula, skin, clothing, amount, and environment; no single result applies to everyone.",
        ],
      },
    ],
  },
  "fragrance-families": {
    slug: "fragrance-families",
    path: "/guides/fragrance-families",
    title: "Fragrance families, notes, and how to read them",
    shortTitle: "Fragrance families",
    description:
      "Understand fresh, floral, woody, amber, oud, and gourmand fragrance directions without treating perfume families as rigid rules.",
    introduction:
      "Fragrance families are a map, not a verdict. They help you compare broad directions, while notes describe parts of the composition. The complete perfume—and how it develops on you—matters more than any one ingredient name.",
    image: "/images/regent-noir-50ml.webp",
    imageAlt: "Perfume Aura bottle arranged with deep burgundy fabric and warm light",
    author: "Perfume Aura",
    reviewer: "Perfume Aura editorial team",
    publishedDate: "2026-08-28",
    reviewedDate: "2026-08-28",
    sections: [
      {
        id: "families",
        title: "Six useful directions",
        paragraphs: [
          "Fresh fragrances may use citrus, green, aquatic, or aromatic effects. Floral compositions place one flower or a bouquet near the centre. Woody scents can feel dry, creamy, earthy, smoky, or resinous.",
          "Amber directions often combine warmth, spice, sweetness, or balsamic depth. Oud can range from polished woods to darker, more animalic impressions. Gourmand compositions suggest edible facets such as vanilla, caramel, coffee, or cocoa without being literal food.",
        ],
        points: [
          { title: "Fresh", detail: "Lifted, green, citrus, aromatic, or airy directions." },
          { title: "Floral", detail: "Single-flower studies or layered bouquets, from transparent to rich." },
          { title: "Woody and oud", detail: "Dry, creamy, smoky, earthy, resinous, or polished wood effects." },
          { title: "Amber and gourmand", detail: "Warm spice, balsamic depth, vanilla-like sweetness, or edible facets." },
        ],
      },
      {
        id: "notes",
        title: "Top, heart, and base notes",
        paragraphs: [
          "Top notes describe the opening impression. Heart notes describe the central character as the opening settles. Base notes describe materials associated with the later foundation of the composition.",
          "A note list is not a timed ingredient inventory, and it cannot predict your experience by itself. Use it to form a shortlist, then smell the complete composition on paper and skin.",
        ],
      },
      {
        id: "compare",
        title: "How to compare families",
        paragraphs: [
          "Choose two clearly different directions first—for example, fresh aromatic and warm woody—rather than five slight variations. Once you know which broad character feels right, compare within that family.",
          "Describe what you perceive in ordinary language: bright, dry, soft, smoky, sweet, cool, close, or expansive. Your own vocabulary is more useful than memorising perfume terms.",
        ],
      },
    ],
  },
  "perfume-for-occasions": {
    slug: "perfume-for-occasions",
    path: "/guides/perfume-for-occasions",
    title: "Choosing perfume for work, weddings, evenings, and gifts",
    shortTitle: "Perfume for occasions",
    description:
      "Choose an office perfume, wedding fragrance, evening scent, or fragrance gift by setting, distance, mood, and the recipient's preferences.",
    introduction:
      "The right perfume for an occasion is less about a fixed list and more about context: how close people will be, how long you will be there, the temperature, the dress, and the presence you want to create.",
    image: "/images/petalia-noir-50ml.webp",
    imageAlt: "Perfume Aura bottle staged with rose-coloured glass and soft light",
    author: "Perfume Aura",
    reviewer: "Perfume Aura editorial team",
    publishedDate: "2026-08-28",
    reviewedDate: "2026-08-28",
    sections: [
      {
        id: "work",
        title: "Work and close indoor settings",
        paragraphs: [
          "In offices, classrooms, flights, and other shared rooms, proximity matters. Start with a controlled amount and favour a presence that does not demand attention across the room.",
          "Fresh, soft floral, aromatic, and restrained woody directions can be useful starting points, but suitability depends on the individual perfume and amount applied—not the family name alone.",
        ],
      },
      {
        id: "celebrations",
        title: "Weddings and celebrations",
        paragraphs: [
          "Celebrations can support a more expressive fragrance, especially outdoors or in a large venue. Consider the weather, clothing, flowers, food, and time of day before choosing intensity.",
          "Warm woods, amber, florals, oud, and gourmand facets can suit festive settings, while fresher directions can feel more comfortable for daytime events. Test with the outfit before the event rather than trying a new perfume for the first time on the day.",
        ],
        points: [
          { title: "Day event", detail: "Consider brightness, heat, and a comfortable presence over many hours." },
          { title: "Evening event", detail: "Deeper or warmer directions can work when the room and weather support them." },
          { title: "On clothing", detail: "Check fabric-care guidance first and test on an inconspicuous area." },
        ],
      },
      {
        id: "gifts",
        title: "Choosing fragrance as a gift",
        paragraphs: [
          "A good fragrance gift begins with evidence about the person: scents they already wear, families they avoid, when they use perfume, and whether they prefer a quiet or noticeable presence.",
          "When you do not know those preferences, avoid pretending there is one universally safe choice. A guided store visit or a clear exchange option is more thoughtful than guessing from age or gender stereotypes.",
        ],
      },
    ],
  },
};

export function getEditorialGuide(slug: string): EditorialGuide | null {
  return editorialGuideSlugs.includes(slug as EditorialGuideSlug)
    ? editorialGuides[slug as EditorialGuideSlug]
    : null;
}
