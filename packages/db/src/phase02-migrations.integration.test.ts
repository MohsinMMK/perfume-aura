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
import { runPhase02Preflight } from "./phase02-preflight";
import { runPhase02Reconciliation } from "./phase02-reconcile";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDirectory, "../drizzle");
const configuredAdminUrl = process.env.TEST_DATABASE_URL
  ? requireDisposableTestDatabaseUrl()
  : undefined;

const freshDatabaseName = "perfume_aura_phase02_fresh";
const upgradeDatabaseName = "perfume_aura_phase02_upgrade";
const reconciliationDatabaseName =
  "perfume_aura_phase02_reconciliation_matrix";

const expectedPhase02Indexes = [
  {
    index_name: "account_user_id_idx",
    is_unique: false,
    column_names: ["user_id"],
  },
  {
    index_name: "customers_status_created_at_idx",
    is_unique: false,
    column_names: ["status", "created_at"],
  },
  {
    index_name: "invoice_lines_invoice_id_position_unique",
    is_unique: true,
    column_names: ["invoice_id", "position"],
  },
  {
    index_name: "invoice_lines_variant_id_idx",
    is_unique: false,
    column_names: ["variant_id"],
  },
  {
    index_name: "invoices_created_at_idx",
    is_unique: false,
    column_names: ["created_at"],
  },
  {
    index_name: "invoices_customer_id_created_at_idx",
    is_unique: false,
    column_names: ["customer_id", "created_at"],
  },
  {
    index_name: "invoices_status_created_at_idx",
    is_unique: false,
    column_names: ["status", "created_at"],
  },
  {
    index_name: "invoices_status_issued_at_idx",
    is_unique: false,
    column_names: ["status", "issued_at"],
  },
  {
    index_name: "payments_customer_id_idx",
    is_unique: false,
    column_names: ["customer_id"],
  },
  {
    index_name: "payments_invoice_id_paid_at_idx",
    is_unique: false,
    column_names: ["invoice_id", "paid_at"],
  },
  {
    index_name: "payments_paid_at_idx",
    is_unique: false,
    column_names: ["paid_at"],
  },
  {
    index_name: "product_variants_product_id_size_ml_unique",
    is_unique: true,
    column_names: ["product_id", "size_ml"],
  },
  {
    index_name: "product_variants_status_idx",
    is_unique: false,
    column_names: ["status"],
  },
  {
    index_name: "products_status_created_at_idx",
    is_unique: false,
    column_names: ["status", "created_at"],
  },
  {
    index_name: "session_user_id_idx",
    is_unique: false,
    column_names: ["user_id"],
  },
  {
    index_name: "stock_movements_created_at_idx",
    is_unique: false,
    column_names: ["created_at"],
  },
  {
    index_name: "stock_movements_location_id_created_at_idx",
    is_unique: false,
    column_names: ["location_id", "created_at"],
  },
  {
    index_name: "stock_movements_ref_type_ref_id_idx",
    is_unique: false,
    column_names: ["ref_type", "ref_id"],
  },
  {
    index_name: "stock_movements_type_created_at_idx",
    is_unique: false,
    column_names: ["type", "created_at"],
  },
  {
    index_name: "stock_movements_variant_id_created_at_idx",
    is_unique: false,
    column_names: ["variant_id", "created_at"],
  },
] as const;

const expectedReconciliationCheckNames = [
  "counter_behind_legacy_maximum",
  "document_number_semantic_collision",
  "draft_invoice_fulfillment_nonzero",
  "duplicate_invoice_line_position",
  "duplicate_product_variant_size",
  "free_text_line_fulfillment_nonzero",
  "invalid_invoice_line",
  "invalid_invoice_number_format",
  "invalid_invoice_totals_or_lifecycle",
  "invalid_payment",
  "invalid_payment_number_format",
  "invalid_product_variant",
  "invalid_stock_movement",
  "inventory_latest_balance_mismatch",
  "invoice_fulfillment_quantity_mismatch",
  "invoice_number_suffix_out_of_range",
  "invoice_payment_cache_mismatch",
  "invoice_subtotal_cache_mismatch",
  "non_draft_invoice_without_lines",
  "non_sale_with_cost_snapshot",
  "payment_customer_mismatch",
  "payment_duplicate_idempotency",
  "payment_missing_or_blank_idempotency",
  "payment_number_suffix_out_of_range",
  "sale_missing_or_invalid_cost_snapshot",
  "void_invoice_authoritative_payment_nonzero",
  "void_invoice_fulfillment_nonzero",
] as const;

type IdRow = QueryResultRow & { id: string };

function databaseUrl(databaseName: string): string {
  assert.ok(configuredAdminUrl);
  const url = new URL(configuredAdminUrl);
  url.pathname = `/${databaseName}`;
  return requireDisposableTestDatabaseUrl(url.toString());
}

function quotedIdentifier(value: string): string {
  assert.match(value, /^perfume_aura_phase02_[a-z0-9_]+$/);
  return `"${value}"`;
}

async function recreateDatabase(adminPool: Pool, databaseName: string) {
  await adminPool.query(
    `DROP DATABASE IF EXISTS ${quotedIdentifier(databaseName)} WITH (FORCE)`,
  );
  await adminPool.query(`CREATE DATABASE ${quotedIdentifier(databaseName)}`);
}

async function dropDatabase(adminPool: Pool, databaseName: string) {
  await adminPool.query(
    `DROP DATABASE IF EXISTS ${quotedIdentifier(databaseName)} WITH (FORCE)`,
  );
}

async function migrateFolder(connectionString: string, folder: string) {
  const pool = new Pool({
    connectionString,
    max: 1,
    application_name: "perfume-aura-phase02-migration-test",
  });
  const database = drizzle(pool);

  try {
    await migrate(database, { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
}

function postgresErrorCode(error: unknown): string | undefined {
  let current = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    if (
      "code" in current &&
      typeof (current as { code?: unknown }).code === "string"
    ) {
      return (current as { code: string }).code;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return undefined;
}

async function makeMigrationFolderThrough(
  maximumIndex: number,
  label: string,
): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), `perfume-aura-phase02-${label}-`),
  );
  const metaDirectory = join(directory, "meta");
  await mkdir(metaDirectory);

  const sourceJournal = JSON.parse(
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
  const selectedEntries = sourceJournal.entries.filter(
    (entry) => entry.idx <= maximumIndex,
  );

  await writeFile(
    join(metaDirectory, "_journal.json"),
    `${JSON.stringify(
      { ...sourceJournal, entries: selectedEntries },
      null,
      2,
    )}\n`,
  );

  for (const entry of selectedEntries) {
    await copyFile(
      join(migrationsFolder, `${entry.tag}.sql`),
      join(directory, `${entry.tag}.sql`),
    );
  }

  return directory;
}

async function assertExpansionCatalog(pool: Pool) {
  const columns = await pool.query<{
    table_name: string;
    column_name: string;
    is_nullable: "YES" | "NO";
  }>(`
    SELECT table_name, column_name, is_nullable
    FROM information_schema.columns
    WHERE
      (table_name = 'payments' AND column_name = 'idempotency_key')
      OR (
        table_name = 'stock_movements'
        AND column_name IN ('unit_cost_cents', 'cost_basis')
      )
    ORDER BY table_name, column_name
  `);

  assert.deepEqual(columns.rows, [
    {
      table_name: "payments",
      column_name: "idempotency_key",
      is_nullable: "YES",
    },
    {
      table_name: "stock_movements",
      column_name: "cost_basis",
      is_nullable: "YES",
    },
    {
      table_name: "stock_movements",
      column_name: "unit_cost_cents",
      is_nullable: "YES",
    },
  ]);

  const enumValues = await pool.query<{ enumlabel: string }>(`
    SELECT enumlabel
    FROM pg_enum
    INNER JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'stock_cost_basis'
    ORDER BY enumsortorder
  `);
  assert.deepEqual(
    enumValues.rows.map((row) => row.enumlabel),
    ["snapshot", "legacy_current"],
  );

  const indexes = await pool.query<{
    index_name: string;
    is_unique: boolean;
    column_names: string[];
  }>(
    `
      SELECT
        index_class.relname AS index_name,
        index_catalog.indisunique AS is_unique,
        array_agg(
          table_attribute.attname
          ORDER BY key_column.ordinality
        )::text[] AS column_names
      FROM pg_index AS index_catalog
      INNER JOIN pg_class AS table_class
        ON table_class.oid = index_catalog.indrelid
      INNER JOIN pg_namespace AS table_namespace
        ON table_namespace.oid = table_class.relnamespace
      INNER JOIN pg_class AS index_class
        ON index_class.oid = index_catalog.indexrelid
      CROSS JOIN LATERAL unnest(index_catalog.indkey)
        WITH ORDINALITY AS key_column(attribute_number, ordinality)
      INNER JOIN pg_attribute AS table_attribute
        ON table_attribute.attrelid = table_class.oid
        AND table_attribute.attnum = key_column.attribute_number
      WHERE
        table_namespace.nspname = 'public'
        AND index_class.relname = ANY($1::text[])
      GROUP BY
        index_class.relname,
        index_catalog.indisunique
      ORDER BY index_class.relname
    `,
    [expectedPhase02Indexes.map((index) => index.index_name)],
  );
  assert.deepEqual(indexes.rows, expectedPhase02Indexes);

  const counterConstraints = await pool.query<{ conname: string }>(`
    SELECT conname
    FROM pg_constraint
    WHERE
      conrelid = 'public.document_number_counters'::regclass
      AND conname IN (
        'document_number_counters_kind_year_pk',
        'document_number_counters_kind_check',
        'document_number_counters_last_value_check'
      )
    ORDER BY conname
  `);
  assert.deepEqual(
    counterConstraints.rows.map((row) => row.conname),
    [
      "document_number_counters_kind_check",
      "document_number_counters_kind_year_pk",
      "document_number_counters_last_value_check",
    ],
  );

  const ledgerTriggers = await pool.query<{
    table_name: string;
    trigger_count: string;
  }>(`
    SELECT
      pg_class.relname AS table_name,
      count(pg_trigger.oid) FILTER (
        WHERE NOT pg_trigger.tgisinternal
      )::text AS trigger_count
    FROM pg_class
    LEFT JOIN pg_trigger ON pg_trigger.tgrelid = pg_class.oid
    WHERE
      pg_class.oid IN (
        'public.payments'::regclass,
        'public.stock_movements'::regclass
      )
    GROUP BY pg_class.relname
    ORDER BY pg_class.relname
  `);
  assert.deepEqual(ledgerTriggers.rows, [
    { table_name: "payments", trigger_count: "0" },
    { table_name: "stock_movements", trigger_count: "0" },
  ]);
}

async function seedExact0002LegacyRows(pool: Pool) {
  const product = await pool.query<IdRow>(`
    INSERT INTO products (name, slug, status)
    VALUES ('Legacy Product', 'legacy-product', 'active')
    RETURNING id
  `);
  const productId = product.rows[0]?.id;
  assert.ok(productId);

  const variant = await pool.query<IdRow>(
    `
      INSERT INTO product_variants (
        product_id,
        sku,
        size_ml,
        cost_cents,
        retail_cents,
        quantity_on_hand,
        qty_reserved,
        reorder_level,
        version,
        status
      )
      VALUES ($1, 'LEGACY-50', 50, 12345, 20000, 3, 0, 0, 1, 'active')
      RETURNING id
    `,
    [productId],
  );
  const variantId = variant.rows[0]?.id;
  assert.ok(variantId);

  const duplicateVariant = await pool.query<IdRow>(
    `
      INSERT INTO product_variants (
        product_id,
        sku,
        size_ml,
        cost_cents,
        retail_cents,
        quantity_on_hand,
        qty_reserved,
        reorder_level,
        version,
        status
      )
      VALUES ($1, 'LEGACY-50-DUP', 50, 12345, 20000, 0, 0, 0, 0, 'active')
      RETURNING id
    `,
    [productId],
  );
  const duplicateVariantId = duplicateVariant.rows[0]?.id;
  assert.ok(duplicateVariantId);

  const location = await pool.query<IdRow>(`
    INSERT INTO locations (code, name)
    VALUES ('MAIN', 'Main warehouse')
    RETURNING id
  `);
  const locationId = location.rows[0]?.id;
  assert.ok(locationId);

  const movement = await pool.query<IdRow>(
    `
      INSERT INTO stock_movements (
        variant_id,
        location_id,
        type,
        quantity_delta,
        quantity_after,
        ref_type,
        ref_id,
        note
      )
      VALUES ($1, $2, 'sale', -1, 3, 'legacy', 'legacy-invoice', 'Legacy sale')
      RETURNING id
    `,
    [variantId, locationId],
  );
  const movementId = movement.rows[0]?.id;
  assert.ok(movementId);

  const customer = await pool.query<IdRow>(`
    INSERT INTO customers (name, status)
    VALUES ('Legacy Customer', 'active')
    RETURNING id
  `);
  const customerId = customer.rows[0]?.id;
  assert.ok(customerId);

  const paidInvoice = await pool.query<IdRow>(
    `
      INSERT INTO invoices (
        number,
        customer_id,
        status,
        issue_date,
        subtotal_cents,
        tax_cents,
        total_cents,
        amount_paid_cents,
        issued_at,
        paid_at
      )
      VALUES (
        'INV-2026-0042',
        $1,
        'paid',
        '2026-07-01',
        1000,
        0,
        1000,
        1000,
        '2026-07-01T08:00:00Z',
        '2026-07-01T09:00:00Z'
      )
      RETURNING id
    `,
    [customerId],
  );
  const paidInvoiceId = paidInvoice.rows[0]?.id;
  assert.ok(paidInvoiceId);

  const ambiguousInvoice = await pool.query<IdRow>(
    `
      INSERT INTO invoices (
        number,
        customer_id,
        status,
        issue_date,
        subtotal_cents,
        tax_cents,
        total_cents,
        amount_paid_cents,
        issued_at
      )
      VALUES (
        'LEGACY-MANUAL-41',
        $1,
        'issued',
        '2026-07-02',
        500,
        0,
        500,
        0,
        '2026-07-02T08:00:00Z'
      )
      RETURNING id
    `,
    [customerId],
  );
  const ambiguousInvoiceId = ambiguousInvoice.rows[0]?.id;
  assert.ok(ambiguousInvoiceId);

  const overflowInvoice = await pool.query<IdRow>(
    `
      INSERT INTO invoices (
        number,
        customer_id,
        status,
        issue_date,
        subtotal_cents,
        tax_cents,
        total_cents,
        amount_paid_cents,
        issued_at
      )
      VALUES (
        'INV-2026-999999999999999999999999999999',
        $1,
        'issued',
        '2026-07-03',
        250,
        0,
        250,
        0,
        '2026-07-03T08:00:00Z'
      )
      RETURNING id
    `,
    [customerId],
  );
  const overflowInvoiceId = overflowInvoice.rows[0]?.id;
  assert.ok(overflowInvoiceId);

  const voidInvoice = await pool.query<IdRow>(
    `
      INSERT INTO invoices (
        number,
        customer_id,
        status,
        issue_date,
        subtotal_cents,
        tax_cents,
        total_cents,
        amount_paid_cents,
        issued_at,
        voided_at
      )
      VALUES (
        'INV-2026-0039',
        $1,
        'void',
        '2026-07-04',
        100,
        0,
        100,
        100,
        '2026-07-04T08:00:00Z',
        '2026-07-04T09:00:00Z'
      )
      RETURNING id
    `,
    [customerId],
  );
  const voidInvoiceId = voidInvoice.rows[0]?.id;
  assert.ok(voidInvoiceId);

  const arithmeticInvoice = await pool.query<IdRow>(
    `
      INSERT INTO invoices (
        customer_id,
        status,
        subtotal_cents,
        tax_cents,
        total_cents,
        amount_paid_cents
      )
      VALUES ($1, 'draft', 2147483647, 2147483647, 0, 0)
      RETURNING id
    `,
    [customerId],
  );
  const arithmeticInvoiceId = arithmeticInvoice.rows[0]?.id;
  assert.ok(arithmeticInvoiceId);

  await pool.query(
    `
      INSERT INTO invoice_lines (
        invoice_id,
        position,
        description,
        quantity,
        unit_price_cents,
        line_total_cents,
        quantity_fulfilled
      )
      VALUES ($1, 0, 'Overflow preflight fixture', 2147483647, 2147483647, 0, 0)
    `,
    [arithmeticInvoiceId],
  );

  await pool.query(
    `
      INSERT INTO invoice_lines (
        invoice_id,
        position,
        description,
        quantity,
        unit_price_cents,
        line_total_cents,
        quantity_fulfilled
      )
      VALUES
        ($1, 0, 'Ambiguous invoice line', 1, 500, 500, 0),
        ($2, 0, 'Overflow invoice line', 1, 250, 250, 0),
        ($3, 0, 'Void invoice line', 1, 100, 100, 0)
    `,
    [ambiguousInvoiceId, overflowInvoiceId, voidInvoiceId],
  );

  const duplicateInvoiceLine = await pool.query<IdRow>(
    `
      INSERT INTO invoice_lines (
        invoice_id,
        position,
        description,
        quantity,
        unit_price_cents,
        line_total_cents,
        quantity_fulfilled
      )
      VALUES
        ($1, 7, 'Duplicate position fixture A', 1, 500, 500, 0),
        ($1, 7, 'Duplicate position fixture B', 1, 500, 500, 0)
      RETURNING id
    `,
    [paidInvoiceId],
  );
  assert.equal(duplicateInvoiceLine.rows.length, 2);
  const duplicateInvoiceLineId = duplicateInvoiceLine.rows[1]?.id;
  assert.ok(duplicateInvoiceLineId);

  const payment = await pool.query<IdRow>(
    `
      INSERT INTO payments (
        number,
        invoice_id,
        customer_id,
        method,
        amount_cents,
        paid_at
      )
      VALUES (
        'PAY-2026-0007',
        $1,
        $2,
        'cash',
        1000,
        '2026-07-01T09:00:00Z'
      )
      RETURNING id
    `,
    [paidInvoiceId, customerId],
  );
  const paymentId = payment.rows[0]?.id;
  assert.ok(paymentId);

  const invalidPayment = await pool.query<IdRow>(
    `
      INSERT INTO payments (
        number,
        invoice_id,
        customer_id,
        method,
        amount_cents,
        paid_at
      )
      VALUES (
        'PAY-2026-0009',
        $1,
        $2,
        'cash',
        0,
        '2026-07-01T09:05:00Z'
      )
      RETURNING id
    `,
    [paidInvoiceId, customerId],
  );
  const invalidPaymentId = invalidPayment.rows[0]?.id;
  assert.ok(invalidPaymentId);

  const voidPayment = await pool.query<IdRow>(
    `
      INSERT INTO payments (
        number,
        invoice_id,
        customer_id,
        method,
        amount_cents,
        paid_at
      )
      VALUES (
        'PAY-2026-0008',
        $1,
        $2,
        'cash',
        100,
        '2026-07-04T08:30:00Z'
      )
      RETURNING id
    `,
    [voidInvoiceId, customerId],
  );
  const voidPaymentId = voidPayment.rows[0]?.id;
  assert.ok(voidPaymentId);

  return {
    ambiguousInvoiceId,
    arithmeticInvoiceId,
    customerId,
    duplicateInvoiceLineId,
    duplicateVariantId,
    invalidPaymentId,
    locationId,
    movementId,
    paidInvoiceId,
    paymentId,
    overflowInvoiceId,
    variantId,
    voidInvoiceId,
    voidPaymentId,
  };
}

async function seedReconciliationDetectionMatrix(pool: Pool) {
  await pool.query(`
    -- This database is dedicated to detector validation. Temporarily remove
    -- expansion uniqueness enforcement so reconciliation can prove it detects
    -- the corresponding legacy/corruption states too.
    ALTER TABLE payments
      DROP CONSTRAINT payments_idempotency_key_unique;
    DROP INDEX invoice_lines_invoice_id_position_unique;
    DROP INDEX product_variants_product_id_size_ml_unique;

    INSERT INTO customers (id, name, status)
    VALUES
      ('10000000-0000-4000-8000-000000000001', 'Detection Customer A', 'active'),
      ('10000000-0000-4000-8000-000000000002', 'Detection Customer B', 'active');

    INSERT INTO products (id, name, slug, status)
    VALUES (
      '20000000-0000-4000-8000-000000000001',
      'Detection Product',
      'detection-product',
      'active'
    );

    INSERT INTO product_variants (
      id,
      product_id,
      sku,
      size_ml,
      cost_cents,
      retail_cents,
      quantity_on_hand,
      qty_reserved,
      reorder_level,
      version,
      status
    )
    VALUES
      (
        '30000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'DETECT-50',
        50,
        10,
        50,
        5,
        0,
        0,
        0,
        'active'
      ),
      (
        '30000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000001',
        'DETECT-100',
        100,
        10,
        50,
        1,
        0,
        0,
        0,
        'active'
      ),
      (
        '30000000-0000-4000-8000-000000000003',
        '20000000-0000-4000-8000-000000000001',
        'DETECT-INVALID',
        0,
        10,
        50,
        0,
        0,
        0,
        0,
        'active'
      ),
      (
        '30000000-0000-4000-8000-000000000004',
        '20000000-0000-4000-8000-000000000001',
        'DETECT-100-DUP',
        100,
        10,
        50,
        0,
        0,
        0,
        0,
        'active'
      );

    INSERT INTO locations (id, code, name)
    VALUES (
      '40000000-0000-4000-8000-000000000001',
      'DETECT',
      'Detection warehouse'
    );

    INSERT INTO invoices (
      id,
      number,
      customer_id,
      status,
      issue_date,
      subtotal_cents,
      tax_cents,
      total_cents,
      amount_paid_cents,
      issued_at,
      voided_at
    )
    VALUES
      (
        '50000000-0000-4000-8000-000000000001',
        'INV-2026-0100',
        '10000000-0000-4000-8000-000000000001',
        'issued',
        '2026-07-10',
        999,
        0,
        999,
        0,
        '2026-07-10T08:00:00Z',
        NULL
      ),
      (
        '50000000-0000-4000-8000-000000000002',
        'INV-2026-00100',
        '10000000-0000-4000-8000-000000000001',
        'issued',
        '2026-07-10',
        1,
        0,
        1,
        0,
        '2026-07-10T08:01:00Z',
        NULL
      ),
      (
        '50000000-0000-4000-8000-000000000003',
        'INV-2026-0101',
        '10000000-0000-4000-8000-000000000001',
        'void',
        '2026-07-10',
        50,
        0,
        50,
        0,
        '2026-07-10T08:02:00Z',
        '2026-07-10T09:02:00Z'
      ),
      (
        '50000000-0000-4000-8000-000000000004',
        'INV-2026-0104',
        '10000000-0000-4000-8000-000000000001',
        'issued',
        '2026-07-10',
        10,
        0,
        10,
        0,
        '2026-07-10T08:06:00Z',
        NULL
      ),
      (
        '50000000-0000-4000-8000-000000000005',
        'INV-2026-0102',
        '10000000-0000-4000-8000-000000000001',
        'issued',
        '2026-07-10',
        1,
        0,
        1,
        0,
        '2026-07-10T08:03:00Z',
        NULL
      ),
      (
        '50000000-0000-4000-8000-000000000006',
        'INV-2026-0103',
        '10000000-0000-4000-8000-000000000001',
        'draft',
        NULL,
        50,
        0,
        50,
        0,
        NULL,
        NULL
      ),
      (
        '50000000-0000-4000-8000-000000000007',
        'LEGACY-DETECTION',
        '10000000-0000-4000-8000-000000000001',
        'issued',
        '2026-07-10',
        1,
        0,
        1,
        0,
        '2026-07-10T08:04:00Z',
        NULL
      ),
      (
        '50000000-0000-4000-8000-000000000008',
        'INV-2026-999999999999999999999999999999',
        '10000000-0000-4000-8000-000000000001',
        'issued',
        '2026-07-10',
        1,
        0,
        1,
        0,
        '2026-07-10T08:05:00Z',
        NULL
      );

    INSERT INTO invoice_lines (
      id,
      invoice_id,
      position,
      variant_id,
      description,
      quantity,
      unit_price_cents,
      line_total_cents,
      quantity_fulfilled
    )
    VALUES
      (
        '80000000-0000-4000-8000-000000000001',
        '50000000-0000-4000-8000-000000000001',
        0,
        '30000000-0000-4000-8000-000000000001',
        'Mismatched subtotal and fulfillment',
        2,
        50,
        100,
        1
      ),
      (
        '80000000-0000-4000-8000-000000000002',
        '50000000-0000-4000-8000-000000000002',
        0,
        NULL,
        'Semantic collision line',
        1,
        1,
        1,
        0
      ),
      (
        '80000000-0000-4000-8000-000000000003',
        '50000000-0000-4000-8000-000000000003',
        0,
        '30000000-0000-4000-8000-000000000002',
        'Void fulfilled line',
        1,
        50,
        50,
        1
      ),
      (
        '80000000-0000-4000-8000-000000000004',
        '50000000-0000-4000-8000-000000000004',
        0,
        NULL,
        'Free-text fulfillment',
        1,
        10,
        10,
        1
      ),
      (
        '80000000-0000-4000-8000-000000000005',
        '50000000-0000-4000-8000-000000000006',
        0,
        '30000000-0000-4000-8000-000000000002',
        'Draft fulfillment with matching sale',
        1,
        50,
        50,
        1
      ),
      (
        '80000000-0000-4000-8000-000000000006',
        '50000000-0000-4000-8000-000000000007',
        0,
        NULL,
        'Invalid zero-quantity line',
        0,
        1,
        0,
        0
      ),
      (
        '80000000-0000-4000-8000-000000000007',
        '50000000-0000-4000-8000-000000000008',
        0,
        NULL,
        'Out-of-range invoice line',
        1,
        1,
        1,
        0
      ),
      (
        '80000000-0000-4000-8000-000000000008',
        '50000000-0000-4000-8000-000000000002',
        0,
        NULL,
        'Duplicate position detector',
        1,
        0,
        0,
        0
      );

    INSERT INTO payments (
      id,
      number,
      invoice_id,
      customer_id,
      method,
      amount_cents,
      idempotency_key,
      paid_at
    )
    VALUES
      (
        '60000000-0000-4000-8000-000000000001',
        'PAY-2026-0100',
        '50000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        'cash',
        100,
        NULL,
        '2026-07-10T10:00:00Z'
      ),
      (
        '60000000-0000-4000-8000-000000000002',
        'BAD-PAYMENT',
        '50000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        'cash',
        0,
        'duplicate-detection-key',
        '2026-07-10T10:01:00Z'
      ),
      (
        '60000000-0000-4000-8000-000000000003',
        'PAY-2026-999999999999999999999999999999',
        '50000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        'cash',
        1,
        'duplicate-detection-key',
        '2026-07-10T10:02:00Z'
      ),
      (
        '60000000-0000-4000-8000-000000000004',
        'PAY-2026-0101',
        '50000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        'cash',
        1,
        'void-payment-detection',
        '2026-07-10T10:03:00Z'
      );

    INSERT INTO stock_movements (
      id,
      variant_id,
      location_id,
      type,
      quantity_delta,
      quantity_after,
      ref_type,
      ref_id,
      note,
      unit_cost_cents,
      cost_basis,
      created_at
    )
    VALUES
      (
        '70000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',
        'sale',
        -2,
        3,
        'invoice',
        '50000000-0000-4000-8000-000000000001',
        'Sale missing cost snapshot',
        NULL,
        NULL,
        '2026-07-10T11:00:00Z'
      ),
      (
        '70000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',
        'receive',
        1,
        4,
        NULL,
        NULL,
        'Non-sale with cost snapshot',
        10,
        'snapshot',
        '2026-07-10T11:01:00Z'
      ),
      (
        '70000000-0000-4000-8000-000000000003',
        '30000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',
        'adjust',
        0,
        4,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '2026-07-10T11:02:00Z'
      ),
      (
        '70000000-0000-4000-8000-000000000004',
        '30000000-0000-4000-8000-000000000002',
        '40000000-0000-4000-8000-000000000001',
        'sale',
        -1,
        1,
        'invoice',
        '50000000-0000-4000-8000-000000000003',
        'Void invoice sale',
        10,
        'snapshot',
        '2026-07-10T11:03:00Z'
      ),
      (
        '70000000-0000-4000-8000-000000000005',
        '30000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',
        'return',
        1,
        4,
        'invoice',
        '50000000-0000-4000-8000-000000000001',
        'Return deliberately excluded from fulfillment reconciliation',
        NULL,
        NULL,
        '2026-07-10T11:04:00Z'
      ),
      (
        '70000000-0000-4000-8000-000000000006',
        '30000000-0000-4000-8000-000000000002',
        '40000000-0000-4000-8000-000000000001',
        'sale',
        -1,
        0,
        'invoice',
        '50000000-0000-4000-8000-000000000006',
        'Draft sale matching line fulfillment',
        10,
        'snapshot',
        '2026-07-10T11:05:00Z'
      );
  `);
}

describe(
  "Phase 02 migration set",
  { skip: !configuredAdminUrl, concurrency: false },
  () => {
    let adminPool: Pool;
    let exact0002Folder: string;
    let through0004Folder: string;
    let through0005Folder: string;

    before(async () => {
      assert.ok(configuredAdminUrl);
      adminPool = new Pool({
        connectionString: configuredAdminUrl,
        max: 1,
        application_name: "perfume-aura-phase02-database-admin",
      });
      exact0002Folder = await makeMigrationFolderThrough(2, "0002");
      through0004Folder = await makeMigrationFolderThrough(4, "0004");
      through0005Folder = await makeMigrationFolderThrough(5, "0005");
      assert.deepEqual(
        JSON.parse(
          await readFile(join(exact0002Folder, "meta/_journal.json"), "utf8"),
        ).entries.map((entry: { tag: string }) => entry.tag),
        [
          "0000_funny_black_widow",
          "0001_magical_starfox",
          "0002_clear_tenebrous",
        ],
      );
      await recreateDatabase(adminPool, freshDatabaseName);
      await recreateDatabase(adminPool, upgradeDatabaseName);
      await recreateDatabase(adminPool, reconciliationDatabaseName);
    });

    after(async () => {
      if (adminPool) {
        await dropDatabase(adminPool, freshDatabaseName);
        await dropDatabase(adminPool, upgradeDatabaseName);
        await dropDatabase(adminPool, reconciliationDatabaseName);
        await adminPool.end();
      }
      if (exact0002Folder) {
        await rm(exact0002Folder, { recursive: true, force: true });
      }
      if (through0004Folder) {
        await rm(through0004Folder, { recursive: true, force: true });
      }
      if (through0005Folder) {
        await rm(through0005Folder, { recursive: true, force: true });
      }
    });

    it("migrates a fresh database through every ordered Phase 02 entry", async () => {
      const connectionString = databaseUrl(freshDatabaseName);
      await migrateFolder(connectionString, migrationsFolder);

      const pool = new Pool({ connectionString, max: 1 });
      try {
        const journal = await pool.query<{ count: string; maximum: string }>(`
          SELECT
            count(*)::text AS count,
            max(created_at)::text AS maximum
          FROM drizzle.__drizzle_migrations
        `);
        assert.equal(journal.rows[0]?.count, "7");

        await assertExpansionCatalog(pool);

        await assert.rejects(
          () =>
            pool.query(`
              INSERT INTO document_number_counters (kind, year, last_value)
              VALUES ('credit_note', 2026, 0)
            `),
          (error: unknown) =>
            error instanceof Error &&
            "code" in error &&
            error.code === "23514",
        );
        await assert.rejects(
          () =>
            pool.query(`
              INSERT INTO document_number_counters (kind, year, last_value)
              VALUES ('invoice', 2026, -1)
            `),
          (error: unknown) =>
            error instanceof Error &&
            "code" in error &&
            error.code === "23514",
        );

        const reconciliation =
          await runPhase02Reconciliation(connectionString);
        assert.deepEqual(
          reconciliation.filter((result) => result.issueCount > 0),
          [],
        );
      } finally {
        await pool.end();
      }
    });

    it("upgrades the exact 0002 baseline with deterministic backfills", async () => {
      const connectionString = databaseUrl(upgradeDatabaseName);
      await migrateFolder(connectionString, exact0002Folder);

      const pool = new Pool({ connectionString, max: 1 });
      try {
        const legacy = await seedExact0002LegacyRows(pool);

        const blockedPreflight = await runPhase02Preflight(connectionString);
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName === "duplicate_invoice_line_position",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName === "duplicate_product_variant_size",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName === "invoice_subtotal_cache_mismatch",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName === "invalid_invoice_number_format",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName === "invoice_number_suffix_out_of_range",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) => result.checkName === "invalid_invoice_line",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName === "invalid_invoice_totals_or_lifecycle",
          )?.issueCount,
          2,
        );
        assert.equal(
          blockedPreflight.find(
            (result) => result.checkName === "invalid_payment_amount",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName ===
              "void_invoice_authoritative_payment_nonzero",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedPreflight.find(
            (result) =>
              result.checkName === "invoice_payment_cache_mismatch",
          )?.issueCount,
          0,
        );
        assert.deepEqual(
          blockedPreflight
            .filter((result) => result.issueCount > 0)
            .map((result) => result.checkName),
          [
            "duplicate_invoice_line_position",
            "duplicate_product_variant_size",
            "invalid_invoice_line",
            "invalid_invoice_number_format",
            "invalid_invoice_totals_or_lifecycle",
            "invalid_payment_amount",
            "invoice_number_suffix_out_of_range",
            "invoice_subtotal_cache_mismatch",
            "void_invoice_authoritative_payment_nonzero",
          ],
        );

        await pool.query(
          "UPDATE invoices SET number = 'INV-2026-0041' WHERE id = $1",
          [legacy.ambiguousInvoiceId],
        );
        await pool.query(
          "UPDATE invoices SET number = 'INV-2026-0040' WHERE id = $1",
          [legacy.overflowInvoiceId],
        );
        await pool.query("DELETE FROM payments WHERE id = $1", [
          legacy.voidPaymentId,
        ]);
        await pool.query("DELETE FROM payments WHERE id = $1", [
          legacy.invalidPaymentId,
        ]);
        await pool.query(
          "UPDATE invoices SET amount_paid_cents = 0 WHERE id = $1",
          [legacy.voidInvoiceId],
        );
        await pool.query("DELETE FROM invoices WHERE id = $1", [
          legacy.arithmeticInvoiceId,
        ]);
        const duplicateOnlyPreflight =
          await runPhase02Preflight(connectionString);
        assert.deepEqual(
          duplicateOnlyPreflight.filter(
            (result) => result.issueCount > 0,
          ),
          [
            {
              checkName: "duplicate_invoice_line_position",
              issueCount: 1,
            },
            {
              checkName: "duplicate_product_variant_size",
              issueCount: 1,
            },
          ],
        );

        await migrateFolder(connectionString, through0004Folder);
        const duplicateOnlyReconciliation =
          await runPhase02Reconciliation(connectionString);
        assert.deepEqual(
          duplicateOnlyReconciliation.filter(
            (result) => result.issueCount > 0,
          ),
          [
            {
              checkName: "duplicate_invoice_line_position",
              issueCount: 1,
            },
            {
              checkName: "duplicate_product_variant_size",
              issueCount: 1,
            },
          ],
        );

        await assert.rejects(
          () => migrateFolder(connectionString, migrationsFolder),
          (error: unknown) => postgresErrorCode(error) === "23505",
        );

        await pool.query("DELETE FROM invoice_lines WHERE id = $1", [
          legacy.duplicateInvoiceLineId,
        ]);
        await pool.query(
          `
            UPDATE invoice_lines
            SET unit_price_cents = 1000, line_total_cents = 1000
            WHERE invoice_id = $1 AND position = 7
          `,
          [legacy.paidInvoiceId],
        );
        const productDuplicateOnlyReconciliation =
          await runPhase02Reconciliation(connectionString);
        assert.deepEqual(
          productDuplicateOnlyReconciliation.filter(
            (result) => result.issueCount > 0,
          ),
          [
            {
              checkName: "duplicate_product_variant_size",
              issueCount: 1,
            },
          ],
        );

        await migrateFolder(connectionString, through0005Folder);
        await assert.rejects(
          () => migrateFolder(connectionString, migrationsFolder),
          (error: unknown) => postgresErrorCode(error) === "23505",
        );

        await pool.query("DELETE FROM product_variants WHERE id = $1", [
          legacy.duplicateVariantId,
        ]);
        const readyReconciliation =
          await runPhase02Reconciliation(connectionString);
        assert.deepEqual(
          readyReconciliation.filter(
            (result) => result.issueCount > 0,
          ),
          [],
        );

        await migrateFolder(connectionString, migrationsFolder);
        await assertExpansionCatalog(pool);

        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO invoice_lines (
                  invoice_id,
                  position,
                  description,
                  quantity,
                  unit_price_cents,
                  line_total_cents,
                  quantity_fulfilled
                )
                VALUES
                  ($1, 8, 'Unique position fixture A', 1, 100, 100, 0),
                  ($1, 8, 'Unique position fixture B', 1, 100, 100, 0)
              `,
              [legacy.paidInvoiceId],
            ),
          (error: unknown) =>
            postgresErrorCode(error) === "23505" &&
            error instanceof Error &&
            "constraint" in error &&
            error.constraint ===
              "invoice_lines_invoice_id_position_unique",
        );

        const payment = await pool.query<{
          idempotency_key: string | null;
        }>(
          "SELECT idempotency_key FROM payments WHERE id = $1",
          [legacy.paymentId],
        );
        assert.equal(
          payment.rows[0]?.idempotency_key,
          `legacy:${legacy.paymentId}`,
        );

        const movement = await pool.query<{
          unit_cost_cents: number | null;
          cost_basis: string | null;
        }>(
          `
            SELECT unit_cost_cents, cost_basis
            FROM stock_movements
            WHERE id = $1
          `,
          [legacy.movementId],
        );
        assert.deepEqual(movement.rows[0], {
          unit_cost_cents: 12345,
          cost_basis: "legacy_current",
        });

        await pool.query(
          "UPDATE product_variants SET cost_cents = 99999 WHERE id = $1",
          [legacy.variantId],
        );
        const stableCost = await pool.query<{
          unit_cost_cents: number;
          cost_basis: string;
        }>(
          `
            SELECT unit_cost_cents, cost_basis
            FROM stock_movements
            WHERE id = $1
          `,
          [legacy.movementId],
        );
        assert.deepEqual(stableCost.rows[0], {
          unit_cost_cents: 12345,
          cost_basis: "legacy_current",
        });

        const counters = await pool.query<{
          kind: string;
          year: number;
          last_value: number;
        }>(`
          SELECT kind, year, last_value
          FROM document_number_counters
          ORDER BY kind, year
        `);
        assert.deepEqual(counters.rows, [
          { kind: "invoice", year: 2026, last_value: 42 },
          { kind: "payment", year: 2026, last_value: 7 },
        ]);

        await assert.rejects(
          () =>
            pool.query(
              `
                INSERT INTO payments (
                  number,
                  invoice_id,
                  customer_id,
                  method,
                  amount_cents,
                  idempotency_key
                )
                VALUES ('PAY-2026-0008', $1, $2, 'cash', 1, $3)
              `,
              [
                legacy.paidInvoiceId,
                legacy.customerId,
                `legacy:${legacy.paymentId}`,
              ],
            ),
          (error: unknown) =>
            error instanceof Error &&
            "code" in error &&
            error.code === "23505",
        );

        await pool.query("BEGIN");
        try {
          const oldPayment = await pool.query<{
            idempotency_key: string | null;
          }>(
            `
              INSERT INTO payments (
                number,
                invoice_id,
                customer_id,
                method,
                amount_cents
              )
              VALUES ('PAY-2026-0008', $1, $2, 'cash', 1)
              RETURNING idempotency_key
            `,
            [legacy.paidInvoiceId, legacy.customerId],
          );
          assert.equal(oldPayment.rows[0]?.idempotency_key, null);

          const oldMovement = await pool.query<{
            unit_cost_cents: number | null;
            cost_basis: string | null;
          }>(
            `
              INSERT INTO stock_movements (
                variant_id,
                location_id,
                type,
                quantity_delta,
                quantity_after
              )
              VALUES ($1, $2, 'sale', -1, 2)
              RETURNING unit_cost_cents, cost_basis
            `,
            [legacy.variantId, legacy.locationId],
          );
          assert.deepEqual(oldMovement.rows[0], {
            unit_cost_cents: null,
            cost_basis: null,
          });
        } finally {
          await pool.query("ROLLBACK");
        }

        const postVoidInvoice = await pool.query<IdRow>(
          `
            INSERT INTO invoices (
              number,
              customer_id,
              status,
              issue_date,
              subtotal_cents,
              tax_cents,
              total_cents,
              amount_paid_cents,
              issued_at,
              voided_at
            )
            VALUES (
              'INV-2026-0038',
              $1,
              'void',
              '2026-07-05',
              100,
              0,
              100,
              100,
              '2026-07-05T08:00:00Z',
              '2026-07-05T09:00:00Z'
            )
            RETURNING id
          `,
          [legacy.customerId],
        );
        const postVoidInvoiceId = postVoidInvoice.rows[0]?.id;
        assert.ok(postVoidInvoiceId);

        const postVoidPayment = await pool.query<IdRow>(
          `
            INSERT INTO payments (
              number,
              invoice_id,
              customer_id,
              method,
              amount_cents,
              idempotency_key,
              paid_at
            )
            VALUES (
              'PAY-2026-0006',
              $1,
              $2,
              'cash',
              100,
              'test:void-payment',
              '2026-07-05T08:30:00Z'
            )
            RETURNING id
          `,
          [postVoidInvoiceId, legacy.customerId],
        );
        const postVoidPaymentId = postVoidPayment.rows[0]?.id;
        assert.ok(postVoidPaymentId);

        const postArithmeticInvoice = await pool.query<IdRow>(
          `
            INSERT INTO invoices (
              customer_id,
              status,
              subtotal_cents,
              tax_cents,
              total_cents,
              amount_paid_cents
            )
            VALUES ($1, 'draft', 2147483647, 2147483647, 0, 0)
            RETURNING id
          `,
          [legacy.customerId],
        );
        const postArithmeticInvoiceId =
          postArithmeticInvoice.rows[0]?.id;
        assert.ok(postArithmeticInvoiceId);

        await pool.query(
          `
            INSERT INTO invoice_lines (
              invoice_id,
              position,
              description,
              quantity,
              unit_price_cents,
              line_total_cents,
              quantity_fulfilled
            )
            VALUES (
              $1,
              0,
              'Overflow reconciliation fixture',
              2147483647,
              2147483647,
              0,
              0
            )
          `,
          [postArithmeticInvoiceId],
        );

        const blockedReconciliation =
          await runPhase02Reconciliation(connectionString);
        assert.equal(
          blockedReconciliation.find(
            (result) => result.checkName === "invalid_invoice_line",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedReconciliation.find(
            (result) =>
              result.checkName === "invalid_invoice_totals_or_lifecycle",
          )?.issueCount,
          2,
        );
        assert.equal(
          blockedReconciliation.find(
            (result) =>
              result.checkName ===
              "void_invoice_authoritative_payment_nonzero",
          )?.issueCount,
          1,
        );
        assert.equal(
          blockedReconciliation.find(
            (result) =>
              result.checkName === "invoice_payment_cache_mismatch",
          )?.issueCount,
          0,
        );

        await pool.query("DELETE FROM payments WHERE id = $1", [
          postVoidPaymentId,
        ]);
        await pool.query("DELETE FROM invoices WHERE id IN ($1, $2)", [
          postVoidInvoiceId,
          postArithmeticInvoiceId,
        ]);

        const afterRemediation =
          await runPhase02Reconciliation(connectionString);
        assert.deepEqual(
          afterRemediation.filter((result) => result.issueCount > 0),
          [],
        );
      } finally {
        await pool.end();
      }
    });

    it("turns every required reconciliation category nonzero", async () => {
      const connectionString = databaseUrl(reconciliationDatabaseName);
      await migrateFolder(connectionString, migrationsFolder);

      const pool = new Pool({ connectionString, max: 1 });
      try {
        await seedReconciliationDetectionMatrix(pool);
        const reconciliation =
          await runPhase02Reconciliation(connectionString);
        const issueCounts = new Map(
          reconciliation.map((result) => [
            result.checkName,
            result.issueCount,
          ]),
        );

        assert.deepEqual(
          reconciliation.map((result) => result.checkName),
          [...expectedReconciliationCheckNames],
        );

        for (const checkName of expectedReconciliationCheckNames) {
          assert.ok(
            (issueCounts.get(checkName) ?? 0) > 0,
            `${checkName} did not become nonzero`,
          );
        }

        const draftFulfillment = await pool.query<{
          line_fulfilled: string;
          sale_fulfilled: string;
        }>(`
          SELECT
            (
              SELECT sum(quantity_fulfilled)::bigint
              FROM invoice_lines
              WHERE invoice_id =
                '50000000-0000-4000-8000-000000000006'
            )::text AS line_fulfilled,
            (
              SELECT -sum(quantity_delta)::bigint
              FROM stock_movements
              WHERE
                type = 'sale'
                AND ref_type = 'invoice'
                AND ref_id =
                  '50000000-0000-4000-8000-000000000006'
            )::text AS sale_fulfilled
        `);
        assert.deepEqual(draftFulfillment.rows[0], {
          line_fulfilled: "1",
          sale_fulfilled: "1",
        });
        assert.equal(
          issueCounts.get("draft_invoice_fulfillment_nonzero"),
          1,
        );
      } finally {
        await pool.end();
      }
    });
  },
);

if (!configuredAdminUrl) {
  process.stdout.write(
    "[phase02-migrations] skipped — set a guarded local TEST_DATABASE_URL\n",
  );
}
