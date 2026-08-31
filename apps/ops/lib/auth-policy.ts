export const OWNER_ROLE = "owner";
export const STAFF_ROLE = "staff";
export const DEFAULT_USER_ROLE = "user";

export const AUTH_PASSWORD_MIN_LENGTH = 12;
export const AUTH_PASSWORD_MAX_LENGTH = 256;
export const RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS = 30 * 60;

export const LOCAL_AUTH_ORIGIN = "http://localhost:3000";
export const LOCAL_AUTH_IP_ORIGIN = "http://127.0.0.1:3000";
export const PRODUCTION_AUTH_ORIGIN = "https://app.perfumeaura.com";

const DEVELOPMENT_AUTH_ORIGINS = [
  LOCAL_AUTH_ORIGIN,
  LOCAL_AUTH_IP_ORIGIN,
] as const;

export const DEFAULT_RETURN_PATH = "/dashboard";

const ALLOWED_RETURN_PATH_PREFIXES = [
  "/dashboard",
  "/products",
  "/stock",
  "/customers",
  "/invoices",
  "/payments",
  "/finance",
  "/reports",
  "/commerce",
  "/settings/security",
] as const;

export type AuthEnvironment = {
  BETTER_AUTH_URL?: string;
  NEXT_PHASE?: string;
  NODE_ENV?: string;
};

export function resolveAuthTrustedOrigins(
  environment: AuthEnvironment = process.env,
): readonly string[] {
  return environment.NODE_ENV === "production"
    ? [PRODUCTION_AUTH_ORIGIN]
    : DEVELOPMENT_AUTH_ORIGINS;
}

function parseOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL");
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("BETTER_AUTH_URL must contain only an origin");
  }

  return url.origin;
}

/**
 * Resolve the Better Auth origin without allowing an accidental insecure
 * production endpoint. Production builds and runtimes both require the exact
 * public origin; the packer supplies that non-secret value explicitly.
 */
export function resolveAuthBaseUrl(
  environment: AuthEnvironment = process.env,
): string {
  const isProductionBuild =
    environment.NEXT_PHASE === "phase-production-build";

  if (isProductionBuild) {
    return PRODUCTION_AUTH_ORIGIN;
  }

  const configured = environment.BETTER_AUTH_URL?.trim();
  const isProductionRuntime = environment.NODE_ENV === "production";

  if (!configured) {
    if (isProductionRuntime) {
      throw new Error(
        "BETTER_AUTH_URL is required at production runtime and must be https://app.perfumeaura.com",
      );
    }
    return LOCAL_AUTH_ORIGIN;
  }

  const origin = parseOrigin(configured);

  if (environment.NODE_ENV === "production") {
    if (origin !== PRODUCTION_AUTH_ORIGIN) {
      throw new Error(
        "Production BETTER_AUTH_URL must be https://app.perfumeaura.com",
      );
    }
    return origin;
  }

  if (!resolveAuthTrustedOrigins(environment).includes(origin)) {
    throw new Error(
      "BETTER_AUTH_URL must use an origin approved for the current environment",
    );
  }

  return origin;
}

function hasUnsafeReturnPathRepresentation(value: string): boolean {
  let probe = value;

  for (let pass = 0; pass < 3; pass += 1) {
    if (
      probe.startsWith("//") ||
      probe.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(probe) ||
      /^[\\/]*[a-z][a-z0-9+.-]*:/i.test(probe)
    ) {
      return true;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(probe);
    } catch {
      return true;
    }

    if (decoded === probe) {
      return false;
    }
    probe = decoded;
  }

  return probe.startsWith("//") || probe.includes("\\");
}

function isAllowlistedReturnPath(pathname: string): boolean {
  return ALLOWED_RETURN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Accept only known same-origin application routes. The representation check
 * also rejects encoded protocol-relative and backslash variants before URL
 * normalization can reinterpret them as external hosts.
 */
export function safeReturnPath(
  value: string | null | undefined,
): string {
  if (
    !value ||
    value.length > 2048 ||
    value !== value.trim() ||
    !value.startsWith("/") ||
    hasUnsafeReturnPathRepresentation(value)
  ) {
    return DEFAULT_RETURN_PATH;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, PRODUCTION_AUTH_ORIGIN);
  } catch {
    return DEFAULT_RETURN_PATH;
  }

  if (
    parsed.origin !== PRODUCTION_AUTH_ORIGIN ||
    !isAllowlistedReturnPath(parsed.pathname)
  ) {
    return DEFAULT_RETURN_PATH;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function isOwnerRole(role: unknown): role is typeof OWNER_ROLE {
  return role === OWNER_ROLE;
}
