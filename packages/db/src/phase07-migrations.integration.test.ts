import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDirectory, "../drizzle");
const adminUrl = requireDisposableTestDatabaseUrl();
const databaseNames = [
  "perfume_aura_phase07_fresh",
  "perfume_aura_phase07_upgrade",
  "perfume_aura_phase07_provider_guard",
] as const;

function urlFor(name: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return requireDisposableTestDatabaseUrl(url.toString());
}

function quoted(name: string): string {
  assert.match(name, /^perfume_aura_phase07_[a-z_]+$/);
  return `"${name}"`;
}

async function migrateAt(url: string, folder = migrationsFolder): Promise<void> {
  const pool = new Pool({
    connectionString: url,
    max: 1,
    application_name: "perfume-aura-phase07-test",
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
}

async function folderThrough(index: number): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "perfume-aura-phase07-through-"));
  await mkdir(join(directory, "meta"));
  const journal = JSON.parse(
    await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8"),
  ) as {
    version: string;
    dialect: string;
    entries: Array<{
      idx: number;
      version: string;
      when: number;
      tag: string;
      breakpoints: boolean;
    }>;
  };
  const entries = journal.entries.filter((entry) => entry.idx <= index);
  await writeFile(
    join(directory, "meta/_journal.json"),
    `${JSON.stringify({ ...journal, entries }, null, 2)}\n`,
  );
  for (const entry of entries) {
    await copyFile(
      join(migrationsFolder, `${entry.tag}.sql`),
      join(directory, `${entry.tag}.sql`),
    );
  }
  return directory;
}

describe("Better Auth 1.7 operations identity migration", () => {
  const adminPool = new Pool({
    connectionString: adminUrl,
    max: 1,
    application_name: "perfume-aura-phase07-admin",
  });
  let through0012 = "";

  before(async () => {
    through0012 = await folderThrough(12);
    for (const name of databaseNames) {
      await adminPool.query(`DROP DATABASE IF EXISTS ${quoted(name)} WITH (FORCE)`);
      await adminPool.query(`CREATE DATABASE ${quoted(name)}`);
    }
  });

  after(async () => {
    for (const name of databaseNames) {
      await adminPool.query(`DROP DATABASE IF EXISTS ${quoted(name)} WITH (FORCE)`);
    }
    await adminPool.end();
    await rm(through0012, { recursive: true, force: true });
  });

  it("creates the required operations account issuer identity", async () => {
    const url = urlFor(databaseNames[0]);
    await migrateAt(url);
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const result = await pool.query<{
        issuer_required: string;
        issuer_identity_index: boolean;
      }>(`
        SELECT
          (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'issuer') AS issuer_required,
          to_regclass('public.account_issuer_account_id_unique') IS NOT NULL AS issuer_identity_index
      `);
      assert.deepEqual(result.rows[0], {
        issuer_required: "NO",
        issuer_identity_index: true,
      });
    } finally {
      await pool.end();
    }
  });

  it("backfills credential identities with their stable user id", async () => {
    const url = urlFor(databaseNames[1]);
    await migrateAt(url, through0012);
    const beforePool = new Pool({ connectionString: url, max: 1 });
    await beforePool.query(`
      INSERT INTO "user" (id, name, email)
      VALUES ('owner-1', 'Owner', 'owner@example.com')
    `);
    await beforePool.query(`
      INSERT INTO "account" (id, account_id, provider_id, user_id)
      VALUES ('credential-1', 'legacy-account-id', 'credential', 'owner-1')
    `);
    await beforePool.end();

    await migrateAt(url);
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const result = await pool.query<{
        account_id: string;
        issuer: string;
      }>(`SELECT account_id, issuer FROM "account" WHERE id = 'credential-1'`);
      assert.deepEqual(result.rows[0], {
        account_id: "owner-1",
        issuer: "local:credential",
      });
    } finally {
      await pool.end();
    }
  });

  it("rejects provider identities without a reviewed issuer mapping", async () => {
    const url = urlFor(databaseNames[2]);
    await migrateAt(url, through0012);
    const pool = new Pool({ connectionString: url, max: 1 });
    await pool.query(`
      INSERT INTO "user" (id, name, email)
      VALUES ('oauth-user', 'OAuth User', 'oauth@example.com')
    `);
    await pool.query(`
      INSERT INTO "account" (id, account_id, provider_id, user_id)
      VALUES ('oauth-1', 'provider-subject', 'example-oauth', 'oauth-user')
    `);
    await pool.end();

    await assert.rejects(
      () => migrateAt(url),
      /provider requires an explicit trusted issuer mapping/,
    );
  });
});
