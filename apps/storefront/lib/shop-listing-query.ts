import { listingCollections } from "./listing-catalog";

export const shopListingSizes = [30, 50, 100, 105] as const;
export const shopListingSegments = [
  "all",
  "signature",
  "inspired",
  "unknown",
] as const;
export const shopListingSorts = ["catalog", "name-asc", "name-desc"] as const;

export type ShopListingSize = (typeof shopListingSizes)[number];
export type ShopListingSegment = (typeof shopListingSegments)[number];
export type ShopListingSort = (typeof shopListingSorts)[number];
export type ShopListingNameSort = Exclude<ShopListingSort, "catalog">;
export type ShopListingBrandOption = Readonly<{
  value: string;
  label: string;
  count: number;
}>;

export type ShopListingQuery = Readonly<{
  q: string;
  collection: ShopListingSegment;
  brand: string;
  sizes: readonly ShopListingSize[];
  sort: ShopListingSort;
}>;

export type ShopListingRecord = Readonly<{
  slug: string;
  name: string;
  brand: string | null;
  eyebrow: string;
  collectionSlug: string;
  variants: readonly Readonly<{ sizeMl: number }>[];
}>;

export const emptyShopListingQuery: ShopListingQuery = {
  q: "",
  collection: "all",
  brand: "",
  sizes: [],
  sort: "catalog",
};

const shopListingSizeSet = new Set<number>(shopListingSizes);
const shopListingSegmentSet = new Set<string>(shopListingSegments);
const shopListingSortSet = new Set<string>(shopListingSorts);
const shopListingSizesBySegment: Readonly<
  Record<ShopListingSegment, readonly ShopListingSize[]>
> = {
  all: shopListingSizes,
  signature: [50, 105],
  inspired: [30, 50, 100],
  unknown: [30, 50, 100],
};

export function foldShopListingText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
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

export function shopListingSizesForSegment(
  segment: ShopListingSegment,
): readonly ShopListingSize[] {
  return shopListingSizesBySegment[segment];
}

export function isShopListingQueryActive(query: ShopListingQuery): boolean {
  return (
    query.q.length > 0 ||
    query.collection !== "all" ||
    query.brand.length > 0 ||
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

export function shopListingBrandSlug(brand: string): string {
  return foldShopListingText(brand).replace(/\s+/gu, "-");
}

function parseBrandToken(value: string): string {
  const trimmed = value.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(trimmed) ? trimmed : "";
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
  const brand = parseBrandToken(params.get("brand") ?? "");
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

  return { q, collection, brand, sizes, sort };
}

export function serializeShopListingQuery(
  query: ShopListingQuery,
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.collection !== "all") params.set("collection", query.collection);
  if (query.brand) params.set("brand", query.brand);
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
  return [
    product.name,
    product.brand,
    product.eyebrow,
    collectionTitleForSlug(product.collectionSlug),
  ]
    .filter((value): value is string => Boolean(value))
    .map(foldShopListingText)
    .join(" ");
}

export function applyShopListingQuery<T extends ShopListingRecord>(
  products: readonly T[],
  query: ShopListingQuery,
): T[] {
  const searchTokens = query.q
    ? foldShopListingText(query.q).split(/\s+/u).filter(Boolean)
    : [];
  const wantedSizes = new Set(query.sizes);
  const filtered = products.filter((product) => {
    const searchableProductText = searchableText(product);
    if (
      searchTokens.length > 0 &&
      !searchTokens.every((token) => searchableProductText.includes(token))
    ) {
      return false;
    }
    if (
      query.collection !== "all" &&
      product.collectionSlug !== query.collection
    ) {
      return false;
    }
    if (
      query.brand &&
      (product.brand == null || shopListingBrandSlug(product.brand) !== query.brand)
    ) {
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
): Record<ShopListingSize, number> {
  const base = applyShopListingQuery(
    products,
    { ...query, sizes: [], sort: "catalog" },
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

export function listShopListingBrands(
  products: readonly ShopListingRecord[],
  query: ShopListingQuery,
): readonly ShopListingBrandOption[] {
  const labelsByValue = new Map<string, string>();
  for (const product of products) {
    if (!product.brand) continue;
    const value = shopListingBrandSlug(product.brand);
    if (value && !labelsByValue.has(value)) labelsByValue.set(value, product.brand);
  }

  return [...labelsByValue]
    .map(([value, label]) => ({
      value,
      label,
      count: applyShopListingQuery(products, {
        ...query,
        collection: "all",
        brand: value,
        sort: "catalog",
      }).length,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "en"));
}

export function withShopListingSize(
  query: ShopListingQuery,
  size?: ShopListingSize,
): ShopListingQuery {
  return {
    ...query,
    sizes: size == null ? [] : [size],
  };
}

export function withShopListingSegment(
  query: ShopListingQuery,
  collection: ShopListingSegment,
): ShopListingQuery {
  const allowedSizes = new Set(shopListingSizesForSegment(collection));
  return {
    ...query,
    collection,
    brand:
      collection === "all" || collection === "inspired" ? query.brand : "",
    sizes: query.sizes.filter((size) => allowedSizes.has(size)),
  };
}

export function withShopListingBrand(
  query: ShopListingQuery,
  brand = "",
): ShopListingQuery {
  return {
    ...query,
    collection: brand ? "all" : query.collection,
    brand,
  };
}

export function withShopListingSort(
  query: ShopListingQuery,
  sort: ShopListingSort,
): ShopListingQuery {
  return {
    ...query,
    sort,
  };
}
