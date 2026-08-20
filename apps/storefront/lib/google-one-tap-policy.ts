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
