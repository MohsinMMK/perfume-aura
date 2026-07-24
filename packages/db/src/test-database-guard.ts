const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const TEST_DATABASE_PREFIX = "perfume_aura_phase02_";

/**
 * Phase 02 database tests are intentionally local-only.
 *
 * This guard rejects provider, production-like, and ambiguous URLs before any
 * Pool is constructed. It never falls back to DATABASE_URL or loads dotenv.
 */
export function requireDisposableTestDatabaseUrl(
  value = process.env.TEST_DATABASE_URL,
): string {
  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required and must name a disposable local Phase 02 database",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("TEST_DATABASE_URL must use postgresql:// or postgres://");
  }

  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      "Refusing TEST_DATABASE_URL: Phase 02 tests may connect only to loopback PostgreSQL",
    );
  }

  if ([...url.searchParams].length > 0) {
    throw new Error(
      "Refusing TEST_DATABASE_URL: connection query parameters are not allowed",
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!databaseName.startsWith(TEST_DATABASE_PREFIX)) {
    throw new Error(
      `Refusing TEST_DATABASE_URL: database name must start with ${TEST_DATABASE_PREFIX}`,
    );
  }

  const normalized = value.toLowerCase();
  if (
    normalized.includes("neon.tech") ||
    normalized.includes("hostinger") ||
    normalized.includes("perfumeaura.com") ||
    /(?:^|[_-])prod(?:uction)?(?:[_-]|$)/.test(databaseName.toLowerCase())
  ) {
    throw new Error(
      "Refusing TEST_DATABASE_URL: provider or production-like target detected",
    );
  }

  return value;
}

export const phase02TestDatabasePrefix = TEST_DATABASE_PREFIX;
