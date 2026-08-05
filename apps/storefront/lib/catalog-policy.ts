export function isPreviewCatalogEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return (
    environment.STOREFRONT_PREVIEW_CATALOG === "true" ||
    environment.NODE_ENV === "development"
  );
}

export function isPublicCatalogEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return environment.STOREFRONT_PUBLIC_RELEASE === "true";
}
