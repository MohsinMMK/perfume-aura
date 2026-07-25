const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/**
 * Repository integration databases must declare both the numbered project
 * phase and a concrete disposable purpose, for example:
 * `perfume_aura_phase03_root_admin`.
 */
export const disposableTestDatabaseNamePattern =
  /^perfume_aura_phase\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*$/;

/**
 * Repository database tests are intentionally local-only.
 *
 * This guard rejects provider, production-like, and ambiguous URLs before any
 * Pool is constructed. It never falls back to DATABASE_URL or loads dotenv.
 */
export function requireDisposableTestDatabaseUrl(
  value = process.env.TEST_DATABASE_URL,
): string {
  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required and must name a disposable local Perfume Aura phase database",
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
      "Refusing TEST_DATABASE_URL: repository tests may connect only to loopback PostgreSQL",
    );
  }

  if ([...url.searchParams].length > 0) {
    throw new Error(
      "Refusing TEST_DATABASE_URL: connection query parameters are not allowed",
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!disposableTestDatabaseNamePattern.test(databaseName)) {
    throw new Error(
      "Refusing TEST_DATABASE_URL: database name must match perfume_aura_phaseNN_<purpose>",
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

/**
 * @deprecated Compatibility alias for Phase 02 migration tooling. New tests
 * should use `disposableTestDatabaseNamePattern`.
 */
export const phase02TestDatabasePrefix = "perfume_aura_phase02_";
