#!/usr/bin/env node
/**
 * Production database release runner. Runs only inside the immutable release
 * image, invoked by the root-owned VPS command with the owner connection in its
 * environment. Never prints connection strings, passwords or row data.
 *
 *   plan     report pending migrations without writing
 *   backup   stream a custom-format pg_dump to stdout
 *   release  apply pending migrations in one transaction, then runtime grants
 *   self-test
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

// The image copies drizzle/ and sql/ beside runner/; a checkout reads packages/db.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_ROOT = existsSync(path.join(ROOT, "drizzle")) ? ROOT : path.resolve(ROOT, "../../packages/db");
const MIGRATIONS = path.join(DB_ROOT, "drizzle");
const GRANTS = path.join(DB_ROOT, "sql");
const RELEASE_LOCK = "perfume-aura-database-release";
const ROLE_NAME = /^[a-z_][a-z0-9_]{0,62}$/;
// A reviewed migration opts in to data loss explicitly; nothing else may.
const DESTRUCTIVE_APPROVAL = "-- perfume-aura: destructive-change-reviewed";
const DESTRUCTIVE_PATTERNS = [
  /\bdrop\s+(table|column|schema|type|view|materialized\s+view|sequence|function|trigger|constraint|extension|policy|owned|domain)\b/i,
  /\brename\s+(to|column)\b/i,
  /\balter\s+column\s+"?[\w]+"?\s+(set\s+data\s+)?type\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+(only\s+)?("?[\w]+"?\s*\.\s*)?"?[\w]+"?\s+(as\s+\w+\s+)?set\b/i,
];

export function readJournal(folder = MIGRATIONS) {
  const journal = JSON.parse(readFileSync(path.join(folder, "meta", "_journal.json"), "utf8"));
  return journal.entries
    .map((entry) => {
      // Identical to drizzle-orm readMigrationFiles: hash the exact file text.
      const text = readFileSync(path.join(folder, `${entry.tag}.sql`), "utf8");
      return {
        tag: entry.tag,
        when: Number(entry.when),
        hash: createHash("sha256").update(text).digest("hex"),
        text,
        statements: text.split("--> statement-breakpoint"),
      };
    })
    .sort((a, b) => a.when - b.when);
}

/** Decide pending work from recorded history; refuse any ambiguous state. */
export function planMigrations(journal, applied) {
  for (let i = 1; i < journal.length; i += 1) {
    assert.ok(journal[i].when > journal[i - 1].when, "journal timestamps must increase");
  }
  const hashDrift = [];
  for (let i = 0; i < applied.length; i += 1) {
    const expected = journal[i];
    if (!expected) {
      // Newer history from a later release: an older image adds nothing.
      return { pending: [], hashDrift, ahead: applied.length - journal.length };
    }
    if (Number(applied[i].created_at) !== expected.when) {
      throw new Error(
        `recorded migration history diverges at position ${i + 1} (${expected.tag}); owner review required`,
      );
    }
    if (applied[i].hash !== expected.hash) hashDrift.push(expected.tag);
  }
  return { pending: journal.slice(applied.length), hashDrift, ahead: 0 };
}

export function destructiveFindings(migration) {
  if (migration.text.includes(DESTRUCTIVE_APPROVAL)) return [];
  // Routine bodies run later under their own grants, not when the migration
  // applies; DO blocks and top-level statements are still scanned.
  const executable = migration.text
    .replace(/--[^\n]*/g, "")
    .replace(/\bcreate\s+(or\s+replace\s+)?(function|procedure)\b[\s\S]*?\bas\s+(\$\w*\$)[\s\S]*?\3/gi, "");
  return DESTRUCTIVE_PATTERNS.filter((pattern) => pattern.test(executable)).map((p) => p.source);
}

/** Data-loss SQL needs review once a database holds recorded history. */
export function assertReviewed(pending, appliedCount) {
  // An empty history means an empty schema: 0000 cannot apply over existing
  // tables, so a first bootstrap has no data to lose.
  if (appliedCount === 0) return;
  for (const migration of pending) {
    if (destructiveFindings(migration).length > 0) {
      throw new Error(`${migration.tag} contains unreviewed destructive SQL; owner gate required`);
    }
  }
}

export function readRoles(env) {
  const roles = {
    ops: env.OPS_RUNTIME_ROLE,
    storefront: env.STOREFRONT_RUNTIME_ROLE,
    finalizer: env.STOREFRONT_PAYMENT_FINALIZER_ROLE || undefined,
  };
  for (const [name, role] of Object.entries(roles)) {
    if (role === undefined && name === "finalizer") continue;
    assert.ok(ROLE_NAME.test(String(role ?? "")), `${name} runtime role name is missing or invalid`);
  }
  const distinct = new Set(Object.values(roles).filter(Boolean));
  // Each grant script revokes what the other surface needs; a shared role
  // would silently break one runtime.
  assert.equal(distinct.size, Object.values(roles).filter(Boolean).length, "runtime roles must be distinct");
  return roles;
}

/** libpq variables for psql/pg_dump so the password never reaches argv. */
export function libpqEnvironment(connectionString) {
  const url = new URL(connectionString);
  assert.ok(url.protocol === "postgresql:" || url.protocol === "postgres:", "owner URL must be PostgreSQL");
  const env = {
    PGHOST: url.hostname.replace(/^\[|\]$/g, ""),
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGAPPNAME: RELEASE_LOCK,
  };
  const mapping = { sslmode: "PGSSLMODE", channel_binding: "PGCHANNELBINDING", options: "PGOPTIONS" };
  for (const [param, variable] of Object.entries(mapping)) {
    const value = url.searchParams.get(param);
    if (value) env[variable] = value;
  }
  assert.ok(env.PGHOST && env.PGUSER && env.PGDATABASE, "owner URL needs host, user and database");
  assert.ok(!env.PGHOST.includes("-pooler."), "migrations require a direct, non-pooled owner connection");
  return env;
}

function ownerUrl() {
  const value = process.env.MIGRATION_DATABASE_URL;
  assert.ok(value, "MIGRATION_DATABASE_URL is required");
  return value;
}

async function connect() {
  // Validate the owner URL (and refuse a pooler) before any connection or write.
  libpqEnvironment(ownerUrl());
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: ownerUrl(), application_name: RELEASE_LOCK });
  await client.connect();
  return client;
}

async function appliedHistory(client) {
  const exists = await client.query("select to_regclass('drizzle.__drizzle_migrations') is not null as present");
  if (!exists.rows[0].present) {
    throw new Error("no recorded migration history; bootstrap through the owner gate first");
  }
  const result = await client.query(
    "select hash, created_at from drizzle.__drizzle_migrations order by created_at asc, id asc",
  );
  return result.rows;
}

async function verifyRuntimeRoles(client, roles) {
  for (const role of Object.values(roles).filter(Boolean)) {
    const { rows } = await client.query(
      `select r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls, r.rolreplication,
              exists (select 1 from pg_auth_members m where m.member = r.oid) as has_membership,
              has_schema_privilege(r.rolname, 'public', 'CREATE') as can_create,
              has_database_privilege(r.rolname, current_database(), 'CREATE') as can_create_schema,
              has_database_privilege(r.rolname, current_database(), 'TEMP') as can_temp
         from pg_roles r where r.rolname = $1`,
      [role],
    );
    assert.equal(rows.length, 1, `runtime role ${role} does not exist`);
    const unexpected = Object.entries(rows[0]).filter(([, value]) => value === true).map(([key]) => key);
    // Database privileges include PUBLIC grants; Neon grants PUBLIC TEMP by default.
    assert.deepEqual(
      unexpected,
      [],
      `runtime role ${role} has unexpected privileges (including via PUBLIC): ${unexpected.join(", ")}`,
    );
  }
}

function runPsql(file, role, env) {
  const result = spawnSync(
    "psql",
    [
      "--no-psqlrc", "--quiet", "--tuples-only", "--no-align",
      "--set=ON_ERROR_STOP=1", `--set=runtime_role=${role}`, `--file=${file}`,
    ],
    { env: { PATH: process.env.PATH, ...env }, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
  );
  if (result.status !== 0) {
    // psql errors name objects, not credentials; still cap what reaches CI logs.
    process.stderr.write(String(result.stderr).slice(0, 2000));
    throw new Error(`${path.basename(file)} failed for ${role}`);
  }
  // Each grant script ends with queries whose every returned row is drift.
  const drift = String(result.stdout).trim();
  if (drift) {
    process.stderr.write(`${drift.slice(0, 2000)}\n`);
    throw new Error(`${path.basename(file)} reported privilege drift for ${role}`);
  }
}

async function plan() {
  const client = await connect();
  try {
    const applied = await appliedHistory(client);
    const result = planMigrations(readJournal(), applied);
    assertReviewed(result.pending, applied.length);
    return result;
  } finally {
    await client.end();
  }
}

async function release() {
  const roles = readRoles(process.env);
  const client = await connect();
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [RELEASE_LOCK]);
    // Refuse before writing anything if a runtime role already holds power.
    await verifyRuntimeRoles(client, roles);
    const applied = await appliedHistory(client);
    const { pending, hashDrift, ahead } = planMigrations(readJournal(), applied);
    if (hashDrift.length > 0) console.log(`note: edited after apply, not re-run: ${hashDrift.join(", ")}`);
    // Older grant scripts could re-open or remove access a later release changed.
    if (ahead > 0) throw new Error(`database is ${ahead} migration(s) ahead of this release; deploy a newer commit`);
    assertReviewed(pending, applied.length);
    if (pending.length > 0) {
      await client.query("begin");
      try {
        // Fail instead of queueing live traffic behind a long table lock.
        await client.query("set local lock_timeout = '15s'");
        await client.query("set local statement_timeout = '15min'");
        for (const migration of pending) {
          for (const statement of migration.statements) await client.query(statement);
          await client.query(
            'insert into drizzle.__drizzle_migrations ("hash", "created_at") values ($1, $2)',
            [migration.hash, migration.when],
          );
          console.log(`applied ${migration.tag}`);
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    } else {
      console.log("no pending migrations");
    }
    const env = libpqEnvironment(ownerUrl());
    runPsql(path.join(GRANTS, "ops-runtime-grants.sql"), roles.ops, env);
    runPsql(path.join(GRANTS, "storefront-runtime-grants.sql"), roles.storefront, env);
    if (roles.finalizer) {
      runPsql(path.join(GRANTS, "storefront-payment-finalizer-grants.sql"), roles.finalizer, env);
    }
    await verifyRuntimeRoles(client, roles);
    console.log(`database release ok: ${pending.length} applied, grants verified`);
  } finally {
    await client.end();
  }
}

function backup() {
  const result = spawnSync("pg_dump", ["--format=custom", "--compress=6", "--no-password"], {
    env: { PATH: process.env.PATH, ...libpqEnvironment(ownerUrl()) },
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (result.status !== 0) throw new Error("pg_dump failed");
}

function selfTest() {
  const migration = (tag, when, text) => ({ tag, when, hash: createHash("sha256").update(text).digest("hex"), text });
  const journal = [migration("0000_a", 1, "create table a ();"), migration("0001_b", 2, "alter table a add column b int;")];
  assert.deepEqual(planMigrations(journal, []).pending.map((m) => m.tag), ["0000_a", "0001_b"]);
  assert.deepEqual(
    planMigrations(journal, [{ hash: journal[0].hash, created_at: "1" }]).pending.map((m) => m.tag),
    ["0001_b"],
  );
  const drift = planMigrations(journal, [{ hash: "edited", created_at: 1 }]);
  assert.deepEqual(drift.hashDrift, ["0000_a"]);
  assert.throws(() => planMigrations(journal, [{ hash: journal[1].hash, created_at: 2 }]), /diverges/);
  const ahead = planMigrations(journal, [...journal, migration("0002_c", 3, "")].map((m) => ({ hash: m.hash, created_at: m.when })));
  assert.equal(ahead.ahead, 1);
  assert.equal(ahead.pending.length, 0);

  assert.deepEqual(destructiveFindings(migration("x", 1, 'CREATE INDEX "a" ON "t" ("c");\nDROP INDEX "old";')), []);
  assert.deepEqual(destructiveFindings(migration("x", 1, 'ALTER TABLE "t" ALTER COLUMN "c" DROP NOT NULL;')), []);
  assert.deepEqual(destructiveFindings(migration("x", 1, 'ALTER TABLE "t" ADD COLUMN "updated_at" timestamptz;')), []);
  const routine = "CREATE OR REPLACE FUNCTION public.f() RETURNS void LANGUAGE plpgsql AS $fn$\nBEGIN\n  UPDATE public.t AS x\n  SET c = 1;\nEND;\n$fn$;";
  assert.deepEqual(destructiveFindings(migration("x", 1, routine)), []);
  assert.notDeepEqual(destructiveFindings(migration("x", 1, `${routine}\nUPDATE t SET c = 2;`)), []);
  assert.notDeepEqual(destructiveFindings(migration("x", 1, "DO $$ BEGIN UPDATE t SET c = 1; END $$;")), []);
  for (const sql of [
    'DROP TABLE "t";', 'ALTER TABLE "t" DROP COLUMN "c";', 'ALTER TABLE "t" RENAME COLUMN "a" TO "b";',
    'ALTER TABLE "t" ALTER COLUMN "c" SET DATA TYPE text;', "TRUNCATE t;", "DELETE FROM t;",
    'UPDATE "oil_lots" SET "total_cost_cents" = NULL;', "update public.t as x set c = 1;",
    'ALTER TABLE "t" DROP CONSTRAINT "c";', "DROP EXTENSION pgcrypto;", 'DROP POLICY "p" ON "t";',
    "DROP OWNED BY r;", "DROP DOMAIN d;",
  ]) assert.notDeepEqual(destructiveFindings(migration("x", 1, sql)), [], sql);
  assert.deepEqual(destructiveFindings(migration("x", 1, `${DESTRUCTIVE_APPROVAL}\nDROP TABLE "t";`)), []);
  const dropping = [migration("0002_drop", 3, 'DROP TABLE "t";')];
  assert.doesNotThrow(() => assertReviewed(dropping, 0));
  assert.throws(() => assertReviewed(dropping, 2), /unreviewed destructive SQL/);
  assert.deepEqual(destructiveFindings(migration("x", 1, "-- we never drop table here\nselect 1;")), []);

  assert.deepEqual(readRoles({ OPS_RUNTIME_ROLE: "ops_runtime", STOREFRONT_RUNTIME_ROLE: "storefront_runtime" }), {
    ops: "ops_runtime", storefront: "storefront_runtime", finalizer: undefined,
  });
  assert.throws(() => readRoles({ OPS_RUNTIME_ROLE: "shared", STOREFRONT_RUNTIME_ROLE: "shared" }), /distinct/);
  assert.throws(() => readRoles({ OPS_RUNTIME_ROLE: "x; drop", STOREFRONT_RUNTIME_ROLE: "y" }), /invalid/);

  const env = libpqEnvironment("postgresql://owner:p%40ss@db.example.test:6543/app?sslmode=require&channel_binding=require");
  assert.equal(env.PGPASSWORD, "p@ss");
  assert.equal(env.PGPORT, "6543");
  assert.equal(env.PGSSLMODE, "require");
  assert.equal(env.PGCHANNELBINDING, "require");
  assert.throws(() => libpqEnvironment("postgresql://o:p@ep-x-pooler.example.test/app"), /non-pooled/);
  assert.equal(readJournal().length > 0, true);
  console.log("database release self-test ok");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  try {
    if (command === "plan") {
      const { pending } = await plan();
      console.log(`pending=${pending.length}`);
      for (const migration of pending) console.log(`pending_tag=${migration.tag}`);
    } else if (command === "backup") {
      backup();
    } else if (command === "release") {
      await release();
    } else if (command === "self-test") {
      selfTest();
    } else {
      throw new Error("usage: release.mjs plan|backup|release|self-test");
    }
  } catch (error) {
    process.stderr.write(`database release refused: ${error instanceof Error ? error.message : "unknown error"}\n`);
    process.exit(1);
  }
}
