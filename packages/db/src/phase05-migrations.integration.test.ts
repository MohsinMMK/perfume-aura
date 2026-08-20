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
  "perfume_aura_phase05_fresh",
  "perfume_aura_phase05_upgrade",
  "perfume_aura_phase05_collision",
] as const;

function urlFor(name: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return requireDisposableTestDatabaseUrl(url.toString());
}

function quoted(name: string): string {
  assert.match(name, /^perfume_aura_phase05_[a-z]+$/);
  return `"${name}"`;
}

async function migrateAt(url: string, folder = migrationsFolder): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1, application_name: "perfume-aura-phase05-test" });
  try {
    await migrate(drizzle(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
}

async function folderThrough(index: number): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "perfume-aura-phase05-through-"));
  await mkdir(join(directory, "meta"));
  const journal = JSON.parse(await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8")) as {
    version: string;
    dialect: string;
    entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
  };
  const entries = journal.entries.filter((entry) => entry.idx <= index);
  await writeFile(join(directory, "meta/_journal.json"), `${JSON.stringify({ ...journal, entries }, null, 2)}\n`);
  for (const entry of entries) await copyFile(join(migrationsFolder, `${entry.tag}.sql`), join(directory, `${entry.tag}.sql`));
  return directory;
}

describe("customer accounts and UPI commerce migration", () => {
  const adminPool = new Pool({ connectionString: adminUrl, max: 1, application_name: "perfume-aura-phase05-admin" });
  let through0010 = "";

  before(async () => {
    through0010 = await folderThrough(10);
    for (const name of databaseNames) {
      await adminPool.query(`DROP DATABASE IF EXISTS ${quoted(name)} WITH (FORCE)`);
      await adminPool.query(`CREATE DATABASE ${quoted(name)}`);
    }
  });

  after(async () => {
    for (const name of databaseNames) await adminPool.query(`DROP DATABASE IF EXISTS ${quoted(name)} WITH (FORCE)`);
    await adminPool.end();
    await rm(through0010, { recursive: true, force: true });
  });

  it("migrates a fresh database with issuer, profile, idempotency, lease, refund, and outbox structures", async () => {
    await migrateAt(urlFor(databaseNames[0]));
    const pool = new Pool({ connectionString: urlFor(databaseNames[0]), max: 1 });
    try {
      const result = await pool.query<{ issuer_required: string; profile_exists: boolean; outbox_exists: boolean; request_required: string }>(`
        SELECT
          (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'storefront_account' AND column_name = 'issuer') AS issuer_required,
          to_regclass('public.storefront_customer_profile') IS NOT NULL AS profile_exists,
          to_regclass('public.notification_outbox') IS NOT NULL AS outbox_exists,
          (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'request_id') AS request_required
      `);
      assert.deepEqual(result.rows[0], {
        issuer_required: "NO",
        profile_exists: true,
        outbox_exists: true,
        request_required: "NO",
      });
    } finally {
      await pool.end();
    }
  });

  it("backfills credential and Google issuers and preserves immutable order snapshots after account deletion", async () => {
    const url = urlFor(databaseNames[1]);
    await migrateAt(url, through0010);
    const beforePool = new Pool({ connectionString: url, max: 1 });
    await beforePool.query(`INSERT INTO storefront_user (id, name, email, email_verified) VALUES ('customer-1', 'Customer', 'customer@example.com', true)`);
    await beforePool.query(`INSERT INTO storefront_account (id, account_id, provider_id, user_id) VALUES ('credential-1', 'old-value', 'credential', 'customer-1'), ('google-1', 'google-subject', 'google', 'customer-1')`);
    await beforePool.end();
    await migrateAt(url);
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const accounts = await pool.query<{ account_id: string; issuer: string; provider_id: string }>(`SELECT account_id, issuer, provider_id FROM storefront_account ORDER BY provider_id`);
      assert.deepEqual(accounts.rows, [
        { account_id: "customer-1", issuer: "local:credential", provider_id: "credential" },
        { account_id: "google-subject", issuer: "https://accounts.google.com", provider_id: "google" },
      ]);
      await pool.query(`INSERT INTO storefront_customer_profile (user_id, recipient_name, phone, address_line_1, city, state, postal_code) VALUES ('customer-1', 'Customer', '+919876543210', '10 Test Road', 'Mumbai', 'Maharashtra', '400001')`);
      await pool.query(`INSERT INTO commerce_carts (id, token_digest, customer_user_id, expires_at) VALUES ('11111111-1111-4111-8111-111111111111', 'cart-digest', 'customer-1', now() + interval '1 day')`);
      await pool.query(`INSERT INTO checkout_sessions (id, cart_id, token_digest, request_id, payload_digest, email, shipping_address, expires_at) VALUES ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'checkout-digest', '33333333-3333-4333-8333-333333333333', 'payload-digest', 'customer@example.com', '{"recipientName":"Customer","postalCode":"400001"}', now() + interval '1 day')`);
      await pool.query(`INSERT INTO commerce_orders (id, order_number, access_token_digest, checkout_session_id, customer_user_id, guest_email, subtotal_amount_minor, total_amount_minor, shipping_address_snapshot) VALUES ('44444444-4444-4444-8444-444444444444', 'PA-TEST-1', 'access-digest', '22222222-2222-4222-8222-222222222222', 'customer-1', 'customer@example.com', 10000, 10000, '{"recipientName":"Customer","postalCode":"400001"}')`);
      await pool.query(`DELETE FROM storefront_user WHERE id = 'customer-1'`);
      const state = await pool.query<{ customer_user_id: string | null; guest_email: string; profile_count: string; snapshot: { postalCode: string } }>(`SELECT o.customer_user_id, o.guest_email, o.shipping_address_snapshot AS snapshot, (SELECT count(*)::text FROM storefront_customer_profile) AS profile_count FROM commerce_orders o WHERE o.order_number = 'PA-TEST-1'`);
      assert.equal(state.rows[0]?.customer_user_id, null);
      assert.equal(state.rows[0]?.guest_email, "customer@example.com");
      assert.equal(state.rows[0]?.profile_count, "0");
      assert.equal(state.rows[0]?.snapshot.postalCode, "400001");
    } finally {
      await pool.end();
    }
  });

  it("stops when credential identities collide after issuer backfill", async () => {
    const url = urlFor(databaseNames[2]);
    await migrateAt(url, through0010);
    const pool = new Pool({ connectionString: url, max: 1 });
    await pool.query(`INSERT INTO storefront_user (id, name, email) VALUES ('collision-user', 'Collision', 'collision@example.com')`);
    await pool.query(`INSERT INTO storefront_account (id, account_id, provider_id, user_id) VALUES ('credential-a', 'legacy-a', 'credential', 'collision-user'), ('credential-b', 'legacy-b', 'credential', 'collision-user')`);
    await pool.end();
    await assert.rejects(() => migrateAt(url), /issuer collision/);
  });
});
