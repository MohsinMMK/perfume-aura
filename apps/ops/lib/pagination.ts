export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function parsePage(value: string | number | undefined): number {
  const parsed =
    typeof value === "number" ? value : Number(value ?? "");
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizePageSize(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || !value || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(value, MAX_PAGE_SIZE);
}

export function pageOffset(page: number, pageSize: number): number {
  return (parsePage(page) - 1) * normalizePageSize(pageSize);
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const normalizedPage = parsePage(page);
  const normalizedPageSize = normalizePageSize(pageSize);
  return {
    items,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
  };
}

type SearchValue = string | number | undefined;

export function paginationHref(
  pathname: string,
  page: number,
  search: Record<string, SearchValue> = {},
  pageParam = "page",
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (key === pageParam) continue;
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  if (page > 1) params.set(pageParam, String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function canonicalPage(
  page: number,
  totalPages: number,
  total: number,
): number | null {
  return total > 0 && page > totalPages ? totalPages : null;
}
