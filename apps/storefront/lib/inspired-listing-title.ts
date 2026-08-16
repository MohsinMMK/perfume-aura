export function inspiredListingTitle(brand: string, reference: string): string {
  const cleanedReference = reference.replace(/\s+family$/i, "").trim();
  const cleanedBrand = brand.trim();
  if (!cleanedBrand || !cleanedReference) {
    throw new Error("Inspired listing titles require a brand and reference");
  }
  if (cleanedReference.toLowerCase().startsWith(cleanedBrand.toLowerCase())) {
    return `Inspired by ${cleanedReference}`;
  }
  return `Inspired by ${cleanedBrand} ${cleanedReference}`;
}

export function listingSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
