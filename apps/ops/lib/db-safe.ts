/**
 * Run a DB-backed loader; on failure return a friendly error string
 * so pages never crash when DATABASE_URL is missing or Neon is down.
 */
export async function safeDbQuery<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    console.error("[safeDbQuery]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("connect") ||
      msg.includes("password authentication") ||
      msg.includes("DATABASE_URL") ||
      msg.includes("does not exist") ||
      msg.includes("invalid")
    ) {
      return {
        data: null,
        error:
          "Database is not ready. Set DATABASE_URL, run migrations, and seed MAIN location.",
      };
    }
    return {
      data: null,
      error: "Could not load data. Check the database connection and try again.",
    };
  }
}
