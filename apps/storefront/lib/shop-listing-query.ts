import {
  featuredListingSlugs,
  listingCollections,
} from "./listing-catalog";

export const shopListingSizes = [30, 50, 100, 105] as const;
export const shopListingSegments = [
  "all",
  "signature",
  "inspired",
  "featured",
] as const;
export const shopListingSorts = ["catalog", "name-asc", "name-desc"] as const;

export type ShopListingSize = (typeof shopListingSizes)[number];
export type ShopListingSegment = (typeof shopListingSegments)[number];
export type ShopListingSort = (typeof shopListingSorts)[number];

export type ShopListingQuery = Readonly<{
  q: string;
  collection: ShopListingSegment;
  sizes: readonly ShopListingSize[];
  sort: ShopListingSort;
}>;

export type ShopListingRecord = Readonly<{
  slug: string;
  name: string;
  eyebrow: string;
  collectionSlug: string;
  variants: readonly Readonly<{ sizeMl: number }>[];
}>;

export const emptyShopListingQuery: ShopListingQuery = {
  q: "",
  collection: "all",
  sizes: [],
  sort: "catalog",
};

const shopListingSizeSet = new Set<number>(shopListingSizes);
const shopListingSegmentSet = new Set<string>(shopListingSegments);
const shopListingSortSet = new Set<string>(shopListingSorts);

export function foldShopListingText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function isShopListingSize(value: number): value is ShopListingSize {
  return shopListingSizeSet.has(value);
}

export function isShopListingSegment(
  value: string,
): value is ShopListingSegment {
  return shopListingSegmentSet.has(value);
}

export function isShopListingSort(value: string): value is ShopListingSort {
  return shopListingSortSet.has(value);
}

export function isShopListingQueryActive(query: ShopListingQuery): boolean {
  return (
    query.q.length > 0 ||
    query.collection !== "all" ||
    query.sizes.length > 0 ||
    query.sort !== "catalog"
  );
}

function searchParamsFromRecord(
  record: Readonly<Record<string, string | string[] | undefined>>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.append(key, value);
    }
  }
  return params;
}

function uniqueSortedSizes(
  sizes: readonly ShopListingSize[],
): ShopListingSize[] {
  return shopListingSizes.filter((size) => sizes.includes(size));
}

function parseSizeToken(value: string): ShopListingSize | undefined {
  const parsed = Number(value.trim());
  return isShopListingSize(parsed) ? parsed : undefined;
}

export function parseShopListingQuery(
  input:
    | URLSearchParams
    | Readonly<Record<string, string | string[] | undefined>>,
): ShopListingQuery {
  const params =
    input instanceof URLSearchParams ? input : searchParamsFromRecord(input);
  const q = params.get("q")?.trim() ?? "";
  const collectionValue = params.get("collection")?.trim() ?? "all";
  const collection = isShopListingSegment(collectionValue)
    ? collectionValue
    : "all";
  const sortValue = params.get("sort")?.trim() ?? "catalog";
  const sort = isShopListingSort(sortValue) ? sortValue : "catalog";
  const sizes = uniqueSortedSizes(
    params
      .getAll("size")
      .flatMap((value) => value.split(","))
      .flatMap((token) => {
        const size = parseSizeToken(token);
        return size == null ? [] : [size];
      }),
  );

  return { q, collection, sizes, sort };
}

export function serializeShopListingQuery(
  query: ShopListingQuery,
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.collection !== "all") params.set("collection", query.collection);
  for (const size of uniqueSortedSizes(query.sizes)) {
    params.append("size", String(size));
  }
  if (query.sort !== "catalog") params.set("sort", query.sort);
  return params;
}

export function shopListingHref(
  query: ShopListingQuery,
  pathname = "/shop",
): string {
  const serialized = serializeShopListingQuery(query).toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function collectionTitleForSlug(slug: string): string | undefined {
  return slug in listingCollections
    ? listingCollections[slug as keyof typeof listingCollections].title
    : undefined;
}

function searchableText(product: ShopListingRecord): string {
  return [product.name, product.eyebrow, collectionTitleForSlug(product.collectionSlug)]
    .filter((value): value is string => Boolean(value))
    .map(foldShopListingText)
    .join(" ");
}

export function applyShopListingQuery<T extends ShopListingRecord>(
  products: readonly T[],
  query: ShopListingQuery,
  featuredSlugs: readonly string[] = featuredListingSlugs,
): T[] {
  const featured = new Set(featuredSlugs);
  const needle = query.q ? foldShopListingText(query.q) : "";
  const wantedSizes = new Set(query.sizes);
  const filtered = products.filter((product) => {
    if (needle && !searchableText(product).includes(needle)) return false;
    if (
      (query.collection === "signature" || query.collection === "inspired") &&
      product.collectionSlug !== query.collection
    ) {
      return false;
    }
    if (query.collection === "featured" && !featured.has(product.slug)) {
      return false;
    }
    if (
      wantedSizes.size > 0 &&
      !product.variants.some((variant) => wantedSizes.has(variant.sizeMl as ShopListingSize))
    ) {
      return false;
    }
    return true;
  });

  if (query.sort === "name-asc") {
    return [...filtered].sort((left, right) =>
      left.name.localeCompare(right.name, "en"),
    );
  }
  if (query.sort === "name-desc") {
    return [...filtered].sort((left, right) =>
      right.name.localeCompare(left.name, "en"),
    );
  }
  return filtered;
}

export function countShopListingSizes(
  products: readonly ShopListingRecord[],
  query: ShopListingQuery,
  featuredSlugs: readonly string[] = featuredListingSlugs,
): Record<ShopListingSize, number> {
  const base = applyShopListingQuery(
    products,
    { ...query, sizes: [], sort: "catalog" },
    featuredSlugs,
  );
  const counts: Record<ShopListingSize, number> = {
    30: 0,
    50: 0,
    100: 0,
    105: 0,
  };
  for (const product of base) {
    const seen = new Set<ShopListingSize>();
    for (const variant of product.variants) {
      if (!isShopListingSize(variant.sizeMl) || seen.has(variant.sizeMl)) {
        continue;
      }
      seen.add(variant.sizeMl);
      counts[variant.sizeMl] += 1;
    }
  }
  return counts;
}

export function toggleShopListingSize(
  query: ShopListingQuery,
  size: ShopListingSize,
): ShopListingQuery {
  return {
    ...query,
    sizes: query.sizes.includes(size)
      ? query.sizes.filter((candidate) => candidate !== size)
      : uniqueSortedSizes([...query.sizes, size]),
  };
}
