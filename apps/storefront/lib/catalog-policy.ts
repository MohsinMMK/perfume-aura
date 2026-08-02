export function isPublicCatalogEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return environment.STOREFRONT_PUBLIC_RELEASE === "true";
}
