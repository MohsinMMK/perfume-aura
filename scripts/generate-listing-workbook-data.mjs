import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseCsv(input) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value || row.length > 0) {
    row.push(value.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((cell) => cell !== ""));
}

function recordsFromCsv(input) {
  const [header, ...rows] = parseCsv(input);
  return rows.map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""])));
}

const accentBySourceNumber = ["brass", "blue", "wine", "blush"];
const campaignMedia = new Map([
  ["regent-noir", ["/images/regent-noir-50ml.webp", "/images/regent-noir-flat.webp", "wine"]],
  ["azure-tides", ["/images/azure-tides-50ml.webp", "/images/azure-tides-flat.webp", "blue"]],
  ["petalia-noir", ["/images/petalia-noir-50ml.webp", "/images/petalia-noir-flat.webp", "blush"]],
]);

const [productsText, variantsText] = await Promise.all([
  readFile(path.join(repositoryRoot, "data/catalog/launch-products.csv"), "utf8"),
  readFile(path.join(repositoryRoot, "data/catalog/launch-variants.csv"), "utf8"),
]);
const products = recordsFromCsv(productsText).filter((product) => product.public_name && ["inspired_collection", "unknown_collection", "signature_series"].includes(product.collection));
const variants = recordsFromCsv(variantsText);
const variantsBySourceKey = new Map();
for (const variant of variants) {
  const current = variantsBySourceKey.get(variant.source_key) ?? [];
  current.push({
    id: `${variant.source_key}:${variant.size_ml}`,
    sizeMl: Number(variant.size_ml),
    priceMinor: variant.retail_price_minor ? Number(variant.retail_price_minor) : null,
  });
  variantsBySourceKey.set(variant.source_key, current);
}

const outputProducts = products.map((product) => {
  const collectionSlug = product.collection === "signature_series"
    ? "signature"
    : product.collection === "unknown_collection"
      ? "unknown"
      : "inspired";
  const campaign = campaignMedia.get(product.public_name_slug);
  const accent = campaign?.[2] ?? accentBySourceNumber[(Number(product.source_number) - 1) % accentBySourceNumber.length];
  return {
    id: product.source_key,
    sourceKey: product.source_key,
    slug: product.public_name_slug,
    name: product.public_name,
    brand: product.reference_brand || null,
    collectionSlug,
    image: campaign?.[0] ?? "/images/bottle-50ml.webp",
    cardImage: campaign?.[1] ?? "/images/bottle-50ml.webp",
    imageAlt: campaign ? `Perfume Aura ${product.public_name} 50 ml campaign bottle` : `Perfume Aura house bottle for ${product.public_name}`,
    accent,
    hasCampaignMedia: Boolean(campaign),
    variants: variantsBySourceKey.get(product.source_key) ?? [],
  };
});

const output = `export type ListingWorkbookVariant = Readonly<{\n  id: string;\n  sizeMl: 30 | 50 | 100 | 105;\n  priceMinor: number | null;\n}>;\n\nexport type ListingWorkbookProduct = Readonly<{\n  id: string;\n  sourceKey: string;\n  slug: string;\n  name: string;\n  brand: string | null;\n  collectionSlug: \"signature\" | \"inspired\" | \"unknown\";\n  image: string;\n  cardImage: string;\n  imageAlt: string;\n  accent: \"wine\" | \"blue\" | \"blush\" | \"brass\";\n  hasCampaignMedia: boolean;\n  variants: readonly ListingWorkbookVariant[];\n}>;\n\nexport const listingWorkbookProducts = ${JSON.stringify(outputProducts, null, 2)} as const satisfies readonly ListingWorkbookProduct[];\n`;

await writeFile(path.join(repositoryRoot, "apps/storefront/lib/listing-workbook-data.ts"), output);
console.log(`Generated ${outputProducts.length} listing products.`);
