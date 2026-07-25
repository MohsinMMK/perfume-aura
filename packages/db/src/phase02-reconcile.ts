import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Pool, type QueryResultRow } from "pg";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

export type ReconciliationResult = {
  checkName: string;
  issueCount: number;
};

type ReconciliationRow = QueryResultRow & {
  check_name: string;
  issue_count: string;
};

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const reconciliationSqlPath = resolve(
  currentDirectory,
  "../sql/phase02-reconciliation.sql",
);

export async function runPhase02Reconciliation(
  connectionString = requireDisposableTestDatabaseUrl(),
): Promise<ReconciliationResult[]> {
  requireDisposableTestDatabaseUrl(connectionString);

  const query = await readFile(reconciliationSqlPath, "utf8");
  const pool = new Pool({
    connectionString,
    max: 1,
    application_name: "perfume-aura-phase02-reconciliation",
  });

  try {
    const result = await pool.query<ReconciliationRow>(query);

    return result.rows.map((row) => ({
      checkName: row.check_name,
      issueCount: Number(row.issue_count),
    }));
  } finally {
    await pool.end();
  }
}

async function main() {
  const results = await runPhase02Reconciliation();
  const issues = results.filter((result) => result.issueCount > 0);

  process.stdout.write(
    `${JSON.stringify(
      {
        status: issues.length === 0 ? "ready" : "blocked",
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
