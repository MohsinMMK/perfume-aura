import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Pool, type QueryResultRow } from "pg";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

export type PreflightResult = {
  checkName: string;
  issueCount: number;
};

type PreflightRow = QueryResultRow & {
  check_name: string;
  issue_count: string;
};

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const preflightSqlPath = resolve(
  currentDirectory,
  "../sql/phase02-preflight-0002.sql",
);

export async function runPhase02Preflight(
  connectionString = requireDisposableTestDatabaseUrl(),
): Promise<PreflightResult[]> {
  requireDisposableTestDatabaseUrl(connectionString);

  const query = await readFile(preflightSqlPath, "utf8");
  const pool = new Pool({
    connectionString,
    max: 1,
    application_name: "perfume-aura-phase02-preflight",
  });

  try {
    const result = await pool.query<PreflightRow>(query);
    return result.rows.map((row) => ({
      checkName: row.check_name,
      issueCount: Number(row.issue_count),
    }));
  } finally {
    await pool.end();
  }
}

async function main() {
  const results = await runPhase02Preflight();
  const issues = results.filter((result) => result.issueCount > 0);

  process.stdout.write(
    `${JSON.stringify(
      {
        status: issues.length === 0 ? "ready" : "blocked",
        schema: "exact-0002",
        checks: results,
      },
      null,
      2,
    )}\n`,
  );

  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entryPoint === import.meta.url) {
  await main();
}
