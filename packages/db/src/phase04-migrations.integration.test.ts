/**
 * Phase 04 migration proof against fresh PostgreSQL and an exact-0006 upgrade.
 * The guard permits loopback disposable databases only.
 */
import assert from "node:assert/strict";
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
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool, type QueryResultRow } from "pg";
import { migrateThroughAuthExpansion } from "./migrate-through-auth-expansion";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDirectory, "../drizzle");
const configuredAdminUrl = requireDisposableTestDatabaseUrl();

const freshDatabaseName = "perfume_aura_phase04_fresh";
const upgradeDatabaseName = "perfume_aura_phase04_upgrade";
const contractedDatabaseName = "perfume_aura_phase04_contracted";
const authExpansionHash =
  "49bede137e6fd29d1c87a84170502e4f4e1329ab36521a9e37d2fc5f3d5dfa7f";

type IdRow = QueryResultRow & { id: string };

function databaseUrl(databaseName: string): string {
  assert.ok(configuredAdminUrl);
  const url = new URL(configuredAdminUrl);
  url.pathname = `/${databaseName}`;
  return requireDisposableTestDatabaseUrl(url.toString());
}

function quotedDatabase(value: string): string {
  assert.match(value, /^perfume_aura_phase04_[a-z0-9_]+$/);
  return `"${value}"`;
}

async function recreateDatabase(pool: Pool, name: string): Promise<void> {
  await pool.query(`DROP DATABASE IF EXISTS ${quotedDatabase(name)} WITH (FORCE)`);
  await pool.query(`CREATE DATABASE ${quotedDatabase(name)}`);
}

async function dropDatabase(pool: Pool, name: string): Promise<void> {
  await pool.query(`DROP DATABASE IF EXISTS ${quotedDatabase(name)} WITH (FORCE)`);
}

async function migrateFolder(url: string, folder: string): Promise<void> {
  const pool = new Pool({
    connectionString: url,
    max: 1,
    application_name: "perfume-aura-phase04-migration-test",
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
}

async function migrationFolderThrough(maximumIndex: number): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), "perfume-aura-phase04-through-0006-"),
  );
  const metaDirectory = join(directory, "meta");
  await mkdir(metaDirectory);

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
  const entries = journal.entries.filter((entry) => entry.idx <= maximumIndex);
  await writeFile(
    join(metaDirectory, "_journal.json"),
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

function postgresError(
  expectedCode: string,
  expectedConstraint?: string,
): (error: unknown) => boolean {
  return (error) =>
    error instanceof Error &&
    "code" in error &&
    error.code === expectedCode &&
    (!expectedConstraint ||
      ("constraint" in error && error.constraint === expectedConstraint));
}

async function assertPhase04Catalog(pool: Pool): Promise<void> {
  const journal = await pool.query<{ count: string }>(`
    SELECT count(*)::text AS count
    FROM drizzle.__drizzle_migrations
  `);
  assert.equal(journal.rows[0]?.count, "12");

  const authCatalog = await pool.query<{
    rate_limit_exists: boolean;
    role_default: string;
    verification_index_exists: boolean;
  }>(`
    SELECT
      to_regclass('public.rate_limit') IS NOT NULL AS rate_limit_exists,
      (
        SELECT column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user'
          AND column_name = 'role'
      ) AS role_default,
      to_regclass('public.verification_identifier_idx') IS NOT NULL
        AS verification_index_exists
  `);
  assert.deepEqual(authCatalog.rows[0], {
    rate_limit_exists: true,
    role_default: "'user'::text",
    verification_index_exists: true,
  });

  const rateLimitColumns = await pool.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rate_limit'
    ORDER BY ordinal_position
  `);
  assert.deepEqual(rateLimitColumns.rows, [
    { column_name: "id", data_type: "text", is_nullable: "NO" },
    { column_name: "key", data_type: "text", is_nullable: "NO" },
    { column_name: "count", data_type: "integer", is_nullable: "NO" },
    { column_name: "last_request", data_type: "bigint", is_nullable: "NO" },
  ]);

  const constraints = await pool.query<{
    conname: string;
    convalidated: boolean;
  }>(`
    SELECT conname, convalidated
    FROM pg_constraint
    WHERE conname = ANY($1::text[])
    ORDER BY conname
  `, [[
    "invoice_lines_values_check",
    "invoices_lifecycle_check",
    "invoices_money_check",
    "invoices_number_format_check",
    "payments_values_check",
    "product_variants_values_check",
    "stock_movements_adjust_note_check",
    "stock_movements_cost_snapshot_check",
    "stock_movements_direction_check",
    "stock_movements_quantity_check",
    "stock_movements_reference_pair_check",
  ]]);
  assert.equal(constraints.rows.length, 11);
  assert.ok(constraints.rows.every((constraint) => constraint.convalidated));

  const paymentColumns = await pool.query<{
    column_name: string;
    is_nullable: string;
  }>(`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name IN ('number', 'idempotency_key')
    ORDER BY column_name
  `);
  assert.deepEqual(paymentColumns.rows, [
    { column_name: "idempotency_key", is_nullable: "NO" },
    { column_name: "number", is_nullable: "NO" },
  ]);

  const triggers = await pool.query<{
    table_name: string;
    trigger_name: string | null;
  }>(`
    SELECT
      table_class.relname AS table_name,
      trigger.tgname AS trigger_name
    FROM pg_class AS table_class
    LEFT JOIN pg_trigger AS trigger
      ON trigger.tgrelid = table_class.oid
      AND NOT trigger.tgisinternal
    WHERE table_class.relname IN ('payments', 'stock_movements')
    ORDER BY table_class.relname, trigger.tgname
  `);
  assert.deepEqual(triggers.rows, [
    { table_name: "payments", trigger_name: null },
    {
      table_name: "stock_movements",
      trigger_name: "stock_movements_append_only",
    },
  ]);

  const publicExecute = await pool.query<{ allowed: boolean }>(`
    SELECT has_function_privilege(
      'public',
      'public.prevent_stock_movement_mutation()',
      'EXECUTE'
    ) AS allowed
  `);
  assert.equal(publicExecute.rows[0]?.allowed, false);
}

async function assertOpsSecurityBoundary(pool: Pool): Promise<void> {
  const catalog = await pool.query<{
    audit_exists: boolean;
    invitation_exists: boolean;
    two_factor_exists: boolean;
  }>(`
    SELECT
      to_regclass('public.ops_audit_events') IS NOT NULL AS audit_exists,
      to_regclass('public.staff_invitation_events') IS NOT NULL AS invitation_exists,
      to_regclass('public.two_factor') IS NOT NULL AS two_factor_exists
  `);
  assert.deepEqual(catalog.rows[0], {
    audit_exists: true,
    invitation_exists: true,
    two_factor_exists: true,
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ownerId = `ops-owner-${suffix}`;
  const staffId = `ops-staff-${suffix}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, role) VALUES ($1, 'Ops owner', $2, 'owner')`,
    [ownerId, `ops-owner-${suffix}@example.com`],
  );
  await pool.query(
    `INSERT INTO "user" (id, name, email, role) VALUES ($1, 'Ops staff', $2, 'staff')`,
    [staffId, `ops-staff-${suffix}@example.com`],
  );

  await assert.rejects(
    () =>
      pool.query(
        `INSERT INTO "user" (id, name, email, role) VALUES ($1, 'Second owner', $2, 'owner')`,
        [`ops-owner-second-${suffix}`, `ops-owner-second-${suffix}@example.com`],
      ),
    postgresError("23505", "user_exactly_one_owner_idx"),
  );
  await assert.rejects(
    () =>
      pool.query(
        `INSERT INTO "user" (id, name, email, role) VALUES ($1, 'Unsafe role', $2, 'owner,staff')`,
        [`ops-invalid-${suffix}`, `ops-invalid-${suffix}@example.com`],
      ),
    postgresError("23514", "user_ops_role_check"),
  );
  await assert.rejects(
    () => pool.query(`UPDATE "user" SET role = 'staff' WHERE id = $1`, [ownerId]),
    postgresError("55000"),
  );
  await assert.rejects(
    () => pool.query(`DELETE FROM "user" WHERE id = $1`, [ownerId]),
    postgresError("55000"),
  );

  const invitationId = `ops-invitation-${suffix}`;
  await pool.query(
    `
      INSERT INTO staff_invitation_events (
        id, staff_user_id, actor_user_id, event_type, email, name, metadata
      )
      VALUES ($1, $2, $3, 'created', $4, 'Ops staff', '{}'::jsonb)
    `,
    [invitationId, staffId, ownerId, `ops-staff-${suffix}@example.com`],
  );
  await assert.rejects(
    () =>
      pool.query(
        `UPDATE staff_invitation_events SET name = 'Changed' WHERE id = $1`,
        [invitationId],
      ),
    postgresError("55000"),
  );
  await assert.rejects(
    () => pool.query(`DELETE FROM staff_invitation_events WHERE id = $1`, [invitationId]),
    postgresError("55000"),
  );

  const auditId = `ops-audit-${suffix}`;
  await pool.query(
    `
      INSERT INTO ops_audit_events (
        id, actor_user_id, action, target_type, target_id, metadata
      )
      VALUES ($1, $2, 'ops.test', 'user', $3, '{}'::jsonb)
    `,
    [auditId, ownerId, staffId],
  );
  await assert.rejects(
    () =>
      pool.query(`UPDATE ops_audit_events SET action = 'changed' WHERE id = $1`, [auditId]),
    postgresError("55000"),
  );
  await assert.rejects(
    () => pool.query(`DELETE FROM ops_audit_events WHERE id = $1`, [auditId]),
    postgresError("55000"),
  );
}

async function assertAuthExpansionBoundary(pool: Pool): Promise<void> {
  const boundary = await pool.query<{
    journal_count: string;
    payment_number_nullable: string;
    rate_limit_exists: boolean;
    stock_trigger_exists: boolean;
    target_hash: string;
  }>(`
    SELECT
      (
        SELECT count(*)::text
        FROM drizzle.__drizzle_migrations
      ) AS journal_count,
      (
        SELECT hash
        FROM drizzle.__drizzle_migrations
        WHERE created_at = 1784912984473
      ) AS target_hash,
      to_regclass('public.rate_limit') IS NOT NULL
        AS rate_limit_exists,
      (
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'payments'
          AND column_name = 'number'
      ) AS payment_number_nullable,
      EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'stock_movements_append_only'
          AND NOT tgisinternal
      ) AS stock_trigger_exists
  `);
  assert.deepEqual(boundary.rows[0], {
    journal_count: "8",
    target_hash: authExpansionHash,
    rate_limit_exists: true,
    payment_number_nullable: "YES",
    stock_trigger_exists: false,
  });
}

async function createContractFixtures(
  pool: Pool,
  options: Readonly<{ zeroMoney?: boolean }> = {},
): Promise<{
  customerId: string;
  invoiceId: string;
  locationId: string;
  movementId: string;
  productId: string;
  variantId: string;
}> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const product = await pool.query<IdRow>(
    `INSERT INTO products (name, slug) VALUES ($1, $2) RETURNING id`,
    [`Contract ${suffix}`, `contract-${suffix}`],
  );
  const productId = product.rows[0]?.id;
  assert.ok(productId);

  const variant = await pool.query<IdRow>(
    `
      INSERT INTO product_variants (
        product_id, sku, size_ml, cost_cents, retail_cents,
        quantity_on_hand, qty_reserved, reorder_level, version
      )
      VALUES ($1, $2, 50, $3, $4, 1, 0, 0, 0)
      RETURNING id
    `,
    [
      productId,
      `CONTRACT-${suffix}`,
      options.zeroMoney ? 0 : 500,
      options.zeroMoney ? 0 : 1000,
    ],
  );
  const variantId = variant.rows[0]?.id;
  assert.ok(variantId);

  const location = await pool.query<IdRow>(
    `
      INSERT INTO locations (code, name)
      VALUES ($1, 'Phase 04 contract')
      RETURNING id
    `,
    [`P4-${suffix}`],
  );
  const locationId = location.rows[0]?.id;
  assert.ok(locationId);

  const customer = await pool.query<IdRow>(
    `INSERT INTO customers (name) VALUES ($1) RETURNING id`,
    [`Contract customer ${suffix}`],
  );
  const customerId = customer.rows[0]?.id;
  assert.ok(customerId);

  const invoice = await pool.query<IdRow>(
    `INSERT INTO invoices (customer_id) VALUES ($1) RETURNING id`,
    [customerId],
  );
  const invoiceId = invoice.rows[0]?.id;
  assert.ok(invoiceId);

  const movement = await pool.query<IdRow>(
    `
      INSERT INTO stock_movements (
        variant_id, location_id, type, quantity_delta, quantity_after,
        unit_cost_cents, cost_basis
      )
      VALUES ($1, $2, 'sale', -1, 0, $3, 'snapshot')
      RETURNING id
    `,
    [variantId, locationId, options.zeroMoney ? 0 : 500],
  );
  const movementId = movement.rows[0]?.id;
  assert.ok(movementId);

  return {
    customerId,
    invoiceId,
    locationId,
    movementId,
    productId,
    variantId,
  };
}

describe(
  "Phase 04 auth expansion and Phase 03 contract migrations",
  { concurrency: false },
  () => {
    let adminPool: Pool;
    let through0006Folder: string;

    before(async () => {
      assert.ok(configuredAdminUrl);
      adminPool = new Pool({
        connectionString: configuredAdminUrl,
        max: 1,
        application_name: "perfume-aura-phase04-database-admin",
      });
      through0006Folder = await migrationFolderThrough(6);
      await recreateDatabase(adminPool, freshDatabaseName);
      await recreateDatabase(adminPool, upgradeDatabaseName);
      await recreateDatabase(adminPool, contractedDatabaseName);
    });

    after(async () => {
      if (adminPool) {
        await dropDatabase(adminPool, freshDatabaseName);
        await dropDatabase(adminPool, upgradeDatabaseName);
        await dropDatabase(adminPool, contractedDatabaseName);
        await adminPool.end();
      }
      if (through0006Folder) {
        await rm(through0006Folder, { recursive: true, force: true });
      }
    });

    it("migrates a fresh database and enforces every contract boundary", async () => {
      const connectionString = databaseUrl(freshDatabaseName);
      const output: string[] = [];
      const evidence = await migrateThroughAuthExpansion(
        connectionString,
        (message) => output.push(message),
      );
      assert.deepEqual(evidence, {
        beforeCount: 0,
        afterCount: 8,
        targetTag: "0007_phase04_auth_expansion",
        targetHash: authExpansionHash,
        contractPending: true,
      });
      assert.equal(output.length, 1);
      assert.match(
        output[0] ?? "",
        /before=0; after=8; target=0007_phase04_auth_expansion/,
      );
      const expansionPool = new Pool({ connectionString, max: 1 });
      try {
        await assertAuthExpansionBoundary(expansionPool);
      } finally {
        await expansionPool.end();
      }

      await migrateFolder(connectionString, migrationsFolder);
      const pool = new Pool({ connectionString, max: 1 });

      try {
        await assertPhase04Catalog(pool);
        await assertOpsSecurityBoundary(pool);
        const fixture = await createContractFixtures(pool);

        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO product_variants (
                  product_id, sku, size_ml, cost_cents, retail_cents,
                  quantity_on_hand, qty_reserved, reorder_level, version
                )
                VALUES ($1, 'INVALID-VARIANT', 0, 0, 0, 0, 0, 0, 0)
              `,
              [fixture.productId],
            ),
          postgresError("23514", "product_variants_values_check"),
        );

        const invalidMovements = [
          {
            constraint: "stock_movements_quantity_check",
            sql: `VALUES ($1, $2, 'adjust', 0, 0, 'required note', NULL, NULL, NULL, NULL)`,
          },
          {
            constraint: "stock_movements_direction_check",
            sql: `VALUES ($1, $2, 'sale', 1, 1, 'invalid direction', 500, 'snapshot', NULL, NULL)`,
          },
          {
            constraint: "stock_movements_adjust_note_check",
            sql: `VALUES ($1, $2, 'adjust', 1, 1, NULL, NULL, NULL, NULL, NULL)`,
          },
          {
            constraint: "stock_movements_reference_pair_check",
            sql: `VALUES ($1, $2, 'receive', 1, 1, 'note', NULL, NULL, 'invoice', NULL)`,
          },
          {
            constraint: "stock_movements_cost_snapshot_check",
            sql: `VALUES ($1, $2, 'sale', -1, 0, 'missing cost', NULL, NULL, NULL, NULL)`,
          },
        ];
        for (const invalid of invalidMovements) {
          await assert.rejects(
            () =>
              pool.query(
                `
                  INSERT INTO stock_movements (
                    variant_id, location_id, type, quantity_delta,
                    quantity_after, note, unit_cost_cents, cost_basis,
                    ref_type, ref_id
                  )
                  ${invalid.sql}
                `,
                [fixture.variantId, fixture.locationId],
              ),
            postgresError("23514", invalid.constraint),
          );
        }

        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO invoice_lines (
                  invoice_id, position, description, quantity,
                  unit_price_cents, line_total_cents, quantity_fulfilled
                )
                VALUES ($1, 0, 'invalid', 0, 100, 0, 0)
              `,
              [fixture.invoiceId],
            ),
          postgresError("23514", "invoice_lines_values_check"),
        );

        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO invoices (
                  customer_id, subtotal_cents, tax_cents, total_cents
                )
                VALUES ($1, 100, 0, 99)
              `,
              [fixture.customerId],
            ),
          postgresError("23514", "invoices_money_check"),
        );
        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO invoices (
                  number, customer_id, status, subtotal_cents, total_cents,
                  issued_at
                )
                VALUES ('INV-2026-0000', $1, 'issued', 1, 1, now())
              `,
              [fixture.customerId],
            ),
          postgresError("23514", "invoices_number_format_check"),
        );
        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO invoices (
                  number, customer_id, status, subtotal_cents, total_cents
                )
                VALUES ('INV-2026-0002', $1, 'issued', 1, 1)
              `,
              [fixture.customerId],
            ),
          postgresError("23514", "invoices_lifecycle_check"),
        );

        const numberedInvoices = await pool.query<IdRow>(
          `
            INSERT INTO invoices (
              number, customer_id, status, subtotal_cents, total_cents,
              issued_at
            )
            VALUES
              ('INV-2026-0001', $1, 'issued', 1, 1, now()),
              ('INV-2026-2147483647', $1, 'issued', 1, 1, now())
            RETURNING id
          `,
          [fixture.customerId],
        );
        assert.equal(numberedInvoices.rows.length, 2);
        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO invoices (
                  number, customer_id, status, subtotal_cents, total_cents,
                  issued_at
                )
                VALUES ('INV-2026-2147483648', $1, 'issued', 1, 1, now())
              `,
              [fixture.customerId],
            ),
          postgresError("23514", "invoices_number_format_check"),
        );

        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO payments (
                  number, invoice_id, customer_id, amount_cents,
                  idempotency_key
                )
                VALUES ('PAY-2026-0001', $1, $2, 0, 'invalid-amount')
              `,
              [numberedInvoices.rows[0]?.id, fixture.customerId],
            ),
          postgresError("23514", "payments_values_check"),
        );
        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO payments (
                  number, invoice_id, customer_id, amount_cents,
                  idempotency_key
                )
                VALUES ('PAY-2026-0001', $1, $2, 1, '')
              `,
              [numberedInvoices.rows[0]?.id, fixture.customerId],
            ),
          postgresError("23514", "payments_values_check"),
        );
        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO payments (
                  invoice_id, customer_id, amount_cents, idempotency_key
                )
                VALUES ($1, $2, 1, 'missing-number')
              `,
              [numberedInvoices.rows[0]?.id, fixture.customerId],
            ),
          postgresError("23502"),
        );
        await pool.query(
          `
            INSERT INTO payments (
              number, invoice_id, customer_id, amount_cents, idempotency_key
            )
            VALUES
              ('PAY-2026-0001', $1, $3, 1, 'payment-lower-bound'),
              ('PAY-2026-2147483647', $2, $3, 1, 'payment-upper-bound')
          `,
          [
            numberedInvoices.rows[0]?.id,
            numberedInvoices.rows[1]?.id,
            fixture.customerId,
          ],
        );
        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO payments (
                  number, invoice_id, customer_id, amount_cents,
                  idempotency_key
                )
                VALUES (
                  'PAY-2026-2147483648', $1, $2, 1, 'payment-overflow'
                )
              `,
              [numberedInvoices.rows[0]?.id, fixture.customerId],
            ),
          postgresError("23514", "payments_values_check"),
        );

        await assert.rejects(
          () =>
            pool.query(
              "UPDATE stock_movements SET note = 'rewrite' WHERE id = $1",
              [fixture.movementId],
            ),
          postgresError("55000"),
        );
        await assert.rejects(
          () =>
            pool.query("DELETE FROM stock_movements WHERE id = $1", [
              fixture.movementId,
            ]),
          postgresError("55000"),
        );
        await pool.query(
          `
            INSERT INTO stock_movements (
              variant_id, location_id, type, quantity_delta, quantity_after,
              note
            )
            VALUES ($1, $2, 'return', 1, 1, 'compensating return')
          `,
          [fixture.variantId, fixture.locationId],
        );
      } finally {
        await pool.end();
      }
    });

    it("upgrades a clean exact-0006 database in the required order", async () => {
      const connectionString = databaseUrl(upgradeDatabaseName);
      await migrateFolder(connectionString, through0006Folder);
      const pool = new Pool({ connectionString, max: 1 });

      try {
        const fixture = await createContractFixtures(pool, { zeroMoney: true });
        await pool.query(
          `
            INSERT INTO invoice_lines (
              invoice_id, position, variant_id, description, quantity,
              unit_price_cents, line_total_cents, quantity_fulfilled
            )
            VALUES ($1, 0, $2, 'Upgrade fixture', 1, 0, 0, 0)
          `,
          [fixture.invoiceId, fixture.variantId],
        );
      } finally {
        await pool.end();
      }

      const output: string[] = [];
      const evidence = await migrateThroughAuthExpansion(
        connectionString,
        (message) => output.push(message),
      );
      assert.equal(evidence.beforeCount, 7);
      assert.equal(evidence.afterCount, 8);
      assert.equal(evidence.targetHash, authExpansionHash);
      assert.equal(output.length, 1);
      const expansionPool = new Pool({ connectionString, max: 1 });
      try {
        await assertAuthExpansionBoundary(expansionPool);
      } finally {
        await expansionPool.end();
      }

      await migrateFolder(connectionString, migrationsFolder);
      const migratedPool = new Pool({ connectionString, max: 1 });
      try {
        await assertPhase04Catalog(migratedPool);
      } finally {
        await migratedPool.end();
      }
    });

    it("refuses an already-contracted database without printing success", async () => {
      const connectionString = databaseUrl(contractedDatabaseName);
      await migrateFolder(connectionString, migrationsFolder);
      const output: string[] = [];

      await assert.rejects(
        () =>
          migrateThroughAuthExpansion(
            connectionString,
            (message) => output.push(message),
          ),
        /contract migration is already present/,
      );
      assert.deepEqual(output, []);

      const pool = new Pool({ connectionString, max: 1 });
      try {
        await assertPhase04Catalog(pool);
      } finally {
        await pool.end();
      }
    });
  },
);
