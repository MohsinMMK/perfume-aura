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
  "perfume_aura_phase08_upgrade",
  "perfume_aura_phase08_ops_collision",
  "perfume_aura_phase08_storefront_collision",
] as const;

function urlFor(name: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return requireDisposableTestDatabaseUrl(url.toString());
}

function quoted(name: string): string {
  assert.match(name, /^perfume_aura_phase08_[a-z_]+$/);
  return `"${name}"`;
}

async function migrateAt(url: string, folder = migrationsFolder): Promise<void> {
  const pool = new Pool({
    connectionString: url,
    max: 1,
    application_name: "perfume-aura-phase08-test",
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
}

async function folderThrough(index: number): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "perfume-aura-phase08-through-"));
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

async function seed(url: string, statements: string[]): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    for (const statement of statements) {
      await pool.query(statement);
    }
  } finally {
    await pool.end();
  }
}

const opsOwner = `INSERT INTO "user" (id, name, email) VALUES ('owner-1', 'Owner', 'owner@example.com')`;
const storefrontCustomer = `INSERT INTO storefront_user (id, name, email) VALUES ('customer-1', 'Customer', 'customer@example.com')`;

describe("Better Auth 1.7.12 provider identity migration", () => {
  const adminPool = new Pool({
    connectionString: adminUrl,
    max: 1,
    application_name: "perfume-aura-phase08-admin",
  });
  let through0017 = "";

  before(async () => {
    through0017 = await folderThrough(17);
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
    await rm(through0017, { recursive: true, force: true });
  });

  it("keeps existing issuers for 1.7.2 images and keys new rows by provider", async () => {
    const url = urlFor(databaseNames[0]);
    await migrateAt(url, through0017);
    await seed(url, [
      opsOwner,
      `INSERT INTO "account" (id, account_id, provider_id, user_id, issuer)
       VALUES ('credential-1', 'owner-1', 'credential', 'owner-1', 'local:credential')`,
      storefrontCustomer,
      `INSERT INTO storefront_account (id, account_id, provider_id, user_id, issuer)
       VALUES ('customer-credential', 'customer-1', 'credential', 'customer-1', 'local:credential')`,
    ]);

    await migrateAt(url);
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const preserved = await pool.query<{ source: string; issuer: string }>(`
        SELECT 'ops' AS source, issuer FROM "account" WHERE id = 'credential-1'
        UNION ALL
        SELECT 'storefront', issuer FROM storefront_account WHERE id = 'customer-credential'
        ORDER BY source
      `);
      assert.deepEqual(preserved.rows, [
        { source: "ops", issuer: "local:credential" },
        { source: "storefront", issuer: "local:credential" },
      ]);

      // Runtime grant scripts treat any PUBLIC-executable routine as drift.
      const publicRoutines = await pool.query<{ routine: string }>(`
        SELECT p.oid::regprocedure::text AS routine
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.proacl IS NULL OR EXISTS (
            SELECT 1 FROM aclexplode(p.proacl) acl
            WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
          ))
        ORDER BY 1
      `);
      assert.deepEqual(publicRoutines.rows, []);

      await pool.query(`
        INSERT INTO "account" (id, account_id, provider_id, user_id)
        VALUES ('credential-2', 'owner-2', 'credential', 'owner-1')
      `);
      await assert.rejects(
        () =>
          pool.query(`
            INSERT INTO "account" (id, account_id, provider_id, user_id)
            VALUES ('credential-3', 'owner-1', 'credential', 'owner-1')
          `),
        /account_provider_account_unique/,
      );
      await assert.rejects(
        () =>
          pool.query(`
            INSERT INTO storefront_account (id, account_id, provider_id, user_id)
            VALUES ('customer-duplicate', 'customer-1', 'credential', 'customer-1')
          `),
        /storefront_account_provider_account_unique/,
      );
    } finally {
      await pool.end();
    }
  });

  it("stops before changing ops identities that collide by provider", async () => {
    const url = urlFor(databaseNames[1]);
    await migrateAt(url, through0017);
    await seed(url, [
      opsOwner,
      `INSERT INTO "account" (id, account_id, provider_id, user_id, issuer)
       VALUES ('credential-1', 'owner-1', 'credential', 'owner-1', 'local:credential')`,
      `INSERT INTO "account" (id, account_id, provider_id, user_id, issuer)
       VALUES ('credential-legacy', 'owner-1', 'credential', 'owner-1', 'legacy:credential')`,
    ]);

    await assert.rejects(() => migrateAt(url), /ops account provider identity collision/);
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const result = await pool.query<{ issuer_index: boolean; provider_index: boolean; issuer_required: string }>(`
        SELECT
          to_regclass('public.account_issuer_account_id_unique') IS NOT NULL AS issuer_index,
          to_regclass('public.account_provider_account_unique') IS NOT NULL AS provider_index,
          (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'issuer') AS issuer_required
      `);
      assert.deepEqual(result.rows[0], {
        issuer_index: true,
        provider_index: false,
        issuer_required: "NO",
      });
    } finally {
      await pool.end();
    }
  });

  it("stops before changing storefront identities that collide by provider", async () => {
    const url = urlFor(databaseNames[2]);
    await migrateAt(url, through0017);
    await seed(url, [
      storefrontCustomer,
      `INSERT INTO storefront_account (id, account_id, provider_id, user_id, issuer)
       VALUES ('google-1', 'subject-1', 'google', 'customer-1', 'https://accounts.google.com')`,
      `INSERT INTO storefront_account (id, account_id, provider_id, user_id, issuer)
       VALUES ('google-2', 'subject-1', 'google', 'customer-1', 'accounts.google.com')`,
    ]);

    await assert.rejects(() => migrateAt(url), /storefront account provider identity collision/);
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const result = await pool.query<{ issuer_index: boolean; rows: string }>(`
        SELECT
          to_regclass('public.storefront_account_issuer_account_unique') IS NOT NULL AS issuer_index,
          (SELECT count(*)::text FROM storefront_account) AS rows
      `);
      assert.deepEqual(result.rows[0], { issuer_index: true, rows: "2" });
    } finally {
      await pool.end();
    }
  });
});
