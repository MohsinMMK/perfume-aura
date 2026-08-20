const exactPromptPaths = new Set([
  "/",
  "/shop",
  "/cart",
  "/search",
  "/find-your-scent",
]);

const promptPathPrefixes = ["/collections/", "/products/"] as const;

export function shouldOfferGoogleOneTap(pathname: string): boolean {
  if (exactPromptPaths.has(pathname)) return true;
  return promptPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function googleOneTapCallbackURL(
  pathname: string,
  search: string,
): string {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) {
    return "/account";
  }
  const normalizedSearch = search && !search.startsWith("?") ? `?${search}` : search;
  try {
    const base = new URL("https://perfumeaura.com");
    const resolved = new URL(`${pathname}${normalizedSearch}`, base);
    return resolved.origin === base.origin
      ? `${resolved.pathname}${resolved.search}`
      : "/account";
  } catch {
    return "/account";
  }
}
