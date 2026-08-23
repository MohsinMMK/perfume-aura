import { resolveCustomerAuthBaseUrl } from "./customer-auth-policy";

type RequestHeaders = Pick<Headers, "get">;

export function isTrustedStorefrontMutation(
  headers: RequestHeaders,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  const expectedOrigin = new URL(resolveCustomerAuthBaseUrl(environment)).origin;
  if (normalizedOrigin !== expectedOrigin) return false;
  const fetchSite = headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}
