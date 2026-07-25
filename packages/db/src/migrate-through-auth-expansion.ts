/**
 * Apply the official Drizzle journal only through the additive Phase 04 auth
 * expansion. The full journal also contains the later contract migration, so
 * Phase 07 uses this bounded step before compatible code and reconciliation.
 */
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const targetIndex = 7;
const targetTag = "0007_phase04_auth_expansion";
const contractIndex = 8;
const contractTag = "0008_phase03_contract";
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDirectory, "../drizzle");

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type Journal = {
  version: string;
  dialect: string;
  entries: JournalEntry[];
};

type ExpectedMigration = JournalEntry & {
  hash: string;
};

type DeployedMigration = {
  created_at: string | null;
  hash: string;
};

type DatabaseMigrationState = {
  contractSchemaPresent: boolean;
  rows: DeployedMigration[];
};

export type AuthExpansionMigrationEvidence = {
  afterCount: number;
  beforeCount: number;
  contractPending: true;
  targetHash: string;
  targetTag: typeof targetTag;
};

async function readExpectedMigrations(
  journal: Journal,
): Promise<ExpectedMigration[]> {
  if (
    journal.entries.length <= contractIndex ||
    journal.entries.some((entry, index) => entry.idx !== index) ||
    journal.entries[targetIndex]?.tag !== targetTag ||
    journal.entries[contractIndex]?.tag !== contractTag
  ) {
    throw new Error(
      "Migration journal does not match the reviewed auth-expansion/contract boundary",
    );
  }

  return Promise.all(
    journal.entries.map(async (entry) => {
      const sql = await readFile(
        join(migrationsFolder, `${entry.tag}.sql`),
        "utf8",
      );
      return {
        ...entry,
        hash: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

async function readDatabaseMigrationState(
  pool: Pool,
): Promise<DatabaseMigrationState> {
  const catalog = await pool.query<{
    contract_schema_present: boolean;
    journal_exists: boolean;
  }>(`
    SELECT
      to_regclass('drizzle.__drizzle_migrations') IS NOT NULL
        AS journal_exists,
      (
        EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'payments_values_check'
        )
        OR EXISTS (
          SELECT 1
          FROM pg_trigger AS trigger
          JOIN pg_class AS table_class
            ON table_class.oid = trigger.tgrelid
          JOIN pg_namespace AS namespace
            ON namespace.oid = table_class.relnamespace
          WHERE namespace.nspname = 'public'
            AND table_class.relname = 'stock_movements'
            AND trigger.tgname = 'stock_movements_append_only'
            AND NOT trigger.tgisinternal
        )
      ) AS contract_schema_present
  `);
  const result = catalog.rows[0];
  if (!result) {
    throw new Error("Could not inspect the database migration catalog");
  }

  if (!result.journal_exists) {
    return {
      contractSchemaPresent: result.contract_schema_present,
      rows: [],
    };
  }

  const deployed = await pool.query<DeployedMigration>(`
    SELECT hash, created_at::text AS created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at, id
  `);
  return {
    contractSchemaPresent: result.contract_schema_present,
    rows: deployed.rows,
  };
}

function verifyJournalPrefix(
  state: DatabaseMigrationState,
  expected: ExpectedMigration[],
): void {
  if (state.rows.length > expected.length) {
    throw new Error(
      "Database migration journal contains unreviewed entries",
    );
  }

  state.rows.forEach((row, index) => {
    const reviewed = expected[index];
    if (
      !reviewed ||
      row.created_at !== String(reviewed.when) ||
      row.hash !== reviewed.hash
    ) {
      throw new Error(
        `Database migration journal diverges at reviewed index ${index}`,
      );
    }
  });
}

export async function migrateThroughAuthExpansion(
  directConnectionString = process.env.DATABASE_URL_DIRECT,
  writeVerifiedState: (message: string) => void = (message) =>
    process.stdout.write(message),
): Promise<AuthExpansionMigrationEvidence> {
  if (!directConnectionString) {
    throw new Error(
      "DATABASE_URL_DIRECT is required for the bounded auth expansion migration",
    );
  }

  const temporaryFolder = await mkdtemp(
    join(tmpdir(), "perfume-aura-auth-expansion-"),
  );
  const pool = new Pool({
    connectionString: directConnectionString,
    max: 1,
    application_name: "perfume-aura-auth-expansion-migration",
  });
  let advisoryLockHeld = false;

  try {
    const journal = JSON.parse(
      await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8"),
    ) as Journal;
    const expected = await readExpectedMigrations(journal);
    const entries = expected.slice(0, targetIndex + 1);
    const target = entries[targetIndex];
    if (!target) {
      throw new Error(
        "Migration journal does not match the reviewed auth expansion boundary",
      );
    }

    await pool.query(
      "SELECT pg_advisory_lock(hashtext('perfume-aura-auth-expansion'))",
    );
    advisoryLockHeld = true;

    const before = await readDatabaseMigrationState(pool);
    verifyJournalPrefix(before, expected);
    if (
      before.contractSchemaPresent ||
      before.rows.length > targetIndex + 1
    ) {
      throw new Error(
        "Refusing bounded auth expansion: the contract migration is already present",
      );
    }

    const metaDirectory = join(temporaryFolder, "meta");
    await mkdir(metaDirectory);
    await writeFile(
      join(metaDirectory, "_journal.json"),
      `${JSON.stringify({ ...journal, entries }, null, 2)}\n`,
    );
    for (const entry of entries) {
      await copyFile(
        join(migrationsFolder, `${entry.tag}.sql`),
        join(temporaryFolder, `${entry.tag}.sql`),
      );
    }

    await migrate(drizzle(pool), { migrationsFolder: temporaryFolder });
    const after = await readDatabaseMigrationState(pool);
    verifyJournalPrefix(after, expected);
    if (
      after.contractSchemaPresent ||
      after.rows.length !== targetIndex + 1
    ) {
      throw new Error(
        "Bounded migration did not stop at the reviewed auth expansion boundary",
      );
    }

    const evidence: AuthExpansionMigrationEvidence = {
      beforeCount: before.rows.length,
      afterCount: after.rows.length,
      targetTag,
      targetHash: target.hash,
      contractPending: true,
    };
    writeVerifiedState(
      `Verified Drizzle boundary: before=${evidence.beforeCount}; after=${evidence.afterCount}; target=${evidence.targetTag}; target_hash=${evidence.targetHash}; contract_0008=pending.\n`,
    );
    return evidence;
  } finally {
    if (advisoryLockHeld) {
      await pool
        .query(
          "SELECT pg_advisory_unlock(hashtext('perfume-aura-auth-expansion'))",
        )
        .catch(() => undefined);
    }
    await pool.end();
    await rm(temporaryFolder, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (invokedPath === import.meta.url) {
  await migrateThroughAuthExpansion();
}
