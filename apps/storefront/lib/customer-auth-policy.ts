import { randomBytes } from "node:crypto";

type CustomerAuthEnvironment = Record<string, string | undefined> & {
  CUSTOMER_AUTH_SECRET?: string;
  CUSTOMER_AUTH_URL?: string;
  STOREFRONT_URL?: string;
  NEXT_PHASE?: string;
  NODE_ENV?: string;
};

const productionBuildPhase = "phase-production-build";

export function resolveCustomerAuthBaseUrl(
  environment: CustomerAuthEnvironment = process.env,
): string {
  const candidate =
    environment.CUSTOMER_AUTH_URL ??
    environment.STOREFRONT_URL ??
    (environment.NEXT_PHASE === productionBuildPhase
      ? "https://shop.perfumeaura.com"
      : undefined);
  if (!candidate) {
    throw new Error("CUSTOMER_AUTH_URL is required for customer authentication");
  }
  const url = new URL(candidate);
  const localDevelopment =
    environment.NODE_ENV !== "production" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new Error("CUSTOMER_AUTH_URL must use HTTPS outside local development");
  }
  return url.origin;
}

export function resolveCustomerAuthTrustedOrigins(
  environment: CustomerAuthEnvironment = process.env,
): readonly string[] {
  return [...new Set([
    resolveCustomerAuthBaseUrl(environment),
    environment.STOREFRONT_URL ? new URL(environment.STOREFRONT_URL).origin : undefined,
  ].filter((origin): origin is string => Boolean(origin)))];
}

export function createCustomerAuthSecretResolver(
  generateSecret: () => string = () => randomBytes(32).toString("base64"),
) {
  let buildSecret: string | undefined;
  return (environment: CustomerAuthEnvironment = process.env): string => {
    if (environment.NEXT_PHASE === productionBuildPhase) {
      buildSecret ??= generateSecret();
      return buildSecret;
    }
    const secret = environment.CUSTOMER_AUTH_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("CUSTOMER_AUTH_SECRET must be at least 32 characters");
    }
    return secret;
  };
}

export const resolveCustomerAuthSecret = createCustomerAuthSecretResolver();

export function customerAuthProviderReadiness(
  environment: CustomerAuthEnvironment = process.env,
): Readonly<{ google: boolean; apple: boolean }> {
  return {
    google: Boolean(
      environment.CUSTOMER_GOOGLE_CLIENT_ID &&
      environment.CUSTOMER_GOOGLE_CLIENT_SECRET,
    ),
    apple: Boolean(
      environment.CUSTOMER_APPLE_SERVICES_ID &&
      environment.CUSTOMER_APPLE_CLIENT_SECRET,
    ),
  };
}
