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
const databaseNames = ["perfume_aura_phase06_fresh", "perfume_aura_phase06_upgrade"] as const;

function urlFor(name: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return requireDisposableTestDatabaseUrl(url.toString());
}

function quoted(name: string): string {
  assert.match(name, /^perfume_aura_phase06_[a-z]+$/);
  return `"${name}"`;
}

async function migrateAt(url: string, folder = migrationsFolder): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1, application_name: "perfume-aura-phase06-test" });
  try {
    await migrate(drizzle(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
}

async function folderThrough(index: number): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "perfume-aura-phase06-through-"));
  await mkdir(join(directory, "meta"));
  const journal = JSON.parse(await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8")) as {
    version: string;
    dialect: string;
    entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
  };
  const entries = journal.entries.filter((entry) => entry.idx <= index);
  await writeFile(join(directory, "meta/_journal.json"), `${JSON.stringify({ ...journal, entries }, null, 2)}\n`);
  for (const entry of entries) {
    await copyFile(join(migrationsFolder, `${entry.tag}.sql`), join(directory, `${entry.tag}.sql`));
  }
  return directory;
}

describe("production commerce hardening migration", () => {
  const adminPool = new Pool({ connectionString: adminUrl, max: 1, application_name: "perfume-aura-phase06-admin" });
  let through0011 = "";

  before(async () => {
    through0011 = await folderThrough(11);
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
    await rm(through0011, { recursive: true, force: true });
  });

  it("creates reconciliation, inquiry outbox, approval, and serviceability gates", async () => {
    await migrateAt(urlFor(databaseNames[0]));
    const pool = new Pool({ connectionString: urlFor(databaseNames[0]), max: 1 });
    try {
      const result = await pool.query<{
        customer_reconcile_column: boolean;
        inquiry_outbox_exists: boolean;
        provider_payment_index: boolean;
        serviceability_exists: boolean;
        tax_gate_required: string;
      }>(`
        SELECT
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_attempts' AND column_name = 'customer_reconcile_lease_until') AS customer_reconcile_column,
          to_regclass('public.inquiry_notification_outbox') IS NOT NULL AS inquiry_outbox_exists,
          to_regclass('public.payment_attempts_provider_payment_unique') IS NOT NULL AS provider_payment_index,
          to_regclass('public.shipping_serviceability') IS NOT NULL AS serviceability_exists,
          (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'commerce_settings' AND column_name = 'tax_policy_approved') AS tax_gate_required
      `);
      assert.deepEqual(result.rows[0], {
        customer_reconcile_column: true,
        inquiry_outbox_exists: true,
        provider_payment_index: true,
        serviceability_exists: true,
        tax_gate_required: "NO",
      });

      await assert.rejects(
        () => pool.query(`INSERT INTO shipping_serviceability (postal_code, active) VALUES ('000000', true)`),
        /shipping_serviceability_(postal|courier)_check/,
      );
      await pool.query(`INSERT INTO shipping_serviceability (postal_code, delhivery_enabled) VALUES ('400001', true)`);
      await assert.rejects(
        () => pool.query(`INSERT INTO shipping_serviceability (postal_code, delhivery_enabled, delivery_min_business_days, delivery_max_business_days) VALUES ('400002', true, 2, 8)`),
        /shipping_serviceability_delivery_check/,
      );
    } finally {
      await pool.end();
    }
  });

  it("upgrades populated settings without opening any approval or checkout gate", async () => {
    const url = urlFor(databaseNames[1]);
    await migrateAt(url, through0011);
    const beforePool = new Pool({ connectionString: url, max: 1 });
    await beforePool.query(`
      INSERT INTO commerce_settings (
        id, currency, flat_shipping_amount_minor, free_shipping_threshold_minor,
        tax_treatment, support_channel, shipping_policy_approved,
        returns_policy_approved, cancellation_policy_approved, checkout_enabled
      ) VALUES (
        'primary', 'INR', 9900, 99900, 'prices_include_approved_tax',
        'support@perfumeaura.com', true, true, true, false
      )
    `);
    await beforePool.end();

    await migrateAt(url);
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const result = await pool.query<{
        catalog_legal_approved: boolean;
        checkout_enabled: boolean;
        support_operations_approved: boolean;
        tax_policy_approved: boolean;
      }>(`
        SELECT catalog_legal_approved, checkout_enabled,
               support_operations_approved, tax_policy_approved
        FROM commerce_settings WHERE id = 'primary'
      `);
      assert.deepEqual(result.rows[0], {
        catalog_legal_approved: false,
        checkout_enabled: false,
        support_operations_approved: false,
        tax_policy_approved: false,
      });
    } finally {
      await pool.end();
    }
  });

  it("contains an explicit provider-payment collision guard", async () => {
    const migration = await readFile(join(migrationsFolder, "0012_amused_cloak.sql"), "utf8");
    assert.match(migration, /payment provider identity collision/);
    assert.match(migration, /HAVING count\(\*\) > 1/);
  });
});
