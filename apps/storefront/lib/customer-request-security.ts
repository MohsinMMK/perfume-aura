type RequestHeaders = Pick<Headers, "get">;

type StorefrontMutationEnvironment = Record<string, string | undefined> & {
  NODE_ENV?: string;
  STOREFRONT_URL?: string;
};

export function isTrustedStorefrontMutation(
  headers: RequestHeaders,
  environment: StorefrontMutationEnvironment = process.env,
): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;

  let requestOrigin: URL;
  try {
    requestOrigin = new URL(origin);
  } catch {
    return false;
  }
  const normalizedOrigin = requestOrigin.origin;

  let expectedOrigin: string;
  const configuredStorefrontUrl = environment.STOREFRONT_URL?.trim();
  if (configuredStorefrontUrl) {
    try {
      expectedOrigin = new URL(configuredStorefrontUrl).origin;
    } catch {
      return false;
    }
  } else {
    const localDevelopmentOrigin =
      environment.NODE_ENV !== "production" &&
      (requestOrigin.hostname === "localhost" ||
        requestOrigin.hostname === "127.0.0.1");
    if (!localDevelopmentOrigin) return false;
    expectedOrigin = normalizedOrigin;
  }

  if (normalizedOrigin !== expectedOrigin) return false;
  const fetchSite = headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}
