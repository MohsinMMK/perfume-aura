#!/usr/bin/env node
/**
 * Read-only validation after restoring a Neon source into a self-hosted
 * PostgreSQL target. It never runs pg_dump, pg_restore, migrations, DDL, DML,
 * or provider APIs. Both database URLs are read only from process environment
 * and are never written to output.
 *
 * Required environment variables:
 * - MIGRATION_SOURCE_DATABASE_URL_DIRECT
 * - MIGRATION_TARGET_DATABASE_URL_DIRECT
 *
 * Any non-loopback target requires an exact --allow-target-host acknowledgement.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DATABASE_PACKAGE_PATH = path.join(REPOSITORY_ROOT, "packages/db/package.json");
const SOURCE_URL_ENV = "MIGRATION_SOURCE_DATABASE_URL_DIRECT";
const TARGET_URL_ENV = "MIGRATION_TARGET_DATABASE_URL_DIRECT";
const DEFAULT_STATEMENT_TIMEOUT_MS = 60_000;
const MAX_STATEMENT_TIMEOUT_MS = 10 * 60_000;

const CRITICAL_TABLES = [
  "user",
  "session",
  "account",
  "two_factor",
  "storefront_user",
  "storefront_session",
  "storefront_account",
  "storefront_customer_profile",
  "customers",
  "products",
  "product_variants",
  "locations",
  "stock_movements",
  "oil_lots",
  "oil_movements",
  "invoices",
  "invoice_lines",
  "payments",
  "ops_sales",
  "document_number_counters",
];

const AUTH_AGGREGATES_SQL = `
  SELECT
    (SELECT count(*)::text FROM public."user") AS ops_users,
    (SELECT count(*)::text FROM public."session") AS ops_sessions,
    (SELECT count(*)::text FROM public.account) AS ops_accounts,
    (SELECT count(*)::text FROM public.two_factor) AS ops_two_factors,
    (SELECT count(*)::text FROM public.storefront_user) AS storefront_users,
    (SELECT count(*)::text FROM public.storefront_session) AS storefront_sessions,
    (SELECT count(*)::text FROM public.storefront_account) AS storefront_accounts,
    (SELECT count(*)::text FROM public.storefront_customer_profile) AS storefront_profiles,
    (
      SELECT count(*)::text
      FROM public."session" AS session_row
      LEFT JOIN public."user" AS user_row ON user_row.id = session_row.user_id
      WHERE user_row.id IS NULL
    ) AS ops_session_orphans,
    (
      SELECT count(*)::text
      FROM public.account AS account_row
      LEFT JOIN public."user" AS user_row ON user_row.id = account_row.user_id
      WHERE user_row.id IS NULL
    ) AS ops_account_orphans,
    (
      SELECT count(*)::text
      FROM public.two_factor AS factor_row
      LEFT JOIN public."user" AS user_row ON user_row.id = factor_row.user_id
      WHERE user_row.id IS NULL
    ) AS ops_two_factor_orphans,
    (
      SELECT count(*)::text
      FROM public.storefront_session AS session_row
      LEFT JOIN public.storefront_user AS user_row ON user_row.id = session_row.user_id
      WHERE user_row.id IS NULL
    ) AS storefront_session_orphans,
    (
      SELECT count(*)::text
      FROM public.storefront_account AS account_row
      LEFT JOIN public.storefront_user AS user_row ON user_row.id = account_row.user_id
      WHERE user_row.id IS NULL
    ) AS storefront_account_orphans,
    (
      SELECT count(*)::text
      FROM public.storefront_customer_profile AS profile_row
      LEFT JOIN public.storefront_user AS user_row ON user_row.id = profile_row.user_id
      WHERE user_row.id IS NULL
    ) AS storefront_profile_orphans
`;

const STOCK_AGGREGATES_SQL = `
  SELECT
    (SELECT count(*)::text FROM public.product_variants) AS product_variants,
    (SELECT coalesce(sum(quantity_on_hand), 0)::text FROM public.product_variants) AS stock_on_hand_total,
    (SELECT coalesce(sum(qty_reserved), 0)::text FROM public.product_variants) AS stock_reserved_total,
    (SELECT coalesce(sum(cost_cents), 0)::text FROM public.product_variants) AS stock_cost_total,
    (SELECT coalesce(sum(retail_cents), 0)::text FROM public.product_variants) AS stock_retail_total,
    (SELECT count(*)::text FROM public.stock_movements) AS stock_movements,
    (SELECT coalesce(sum(quantity_delta), 0)::text FROM public.stock_movements) AS stock_delta_total,
    (
      SELECT count(*)::text
      FROM public.product_variants
      WHERE quantity_on_hand < 0
        OR qty_reserved < 0
        OR qty_reserved > quantity_on_hand
        OR reorder_level < 0
        OR version < 0
    ) AS stock_balance_violations,
    (
      SELECT count(*)::text
      FROM public.stock_movements
      WHERE quantity_delta = 0 OR quantity_after < 0
    ) AS stock_movement_value_violations,
    (
      SELECT count(*)::text
      FROM public.stock_movements AS movement_row
      LEFT JOIN public.product_variants AS variant_row ON variant_row.id = movement_row.variant_id
      LEFT JOIN public.locations AS location_row ON location_row.id = movement_row.location_id
      WHERE variant_row.id IS NULL OR location_row.id IS NULL
    ) AS stock_reference_orphans
`;

function oilAggregatesSql(hasReservedQuantityMl) {
  const reservedQuantityAggregate = hasReservedQuantityMl
    ? "(SELECT coalesce(sum(reserved_quantity_ml), 0)::text FROM public.oil_lots)"
    : "'0'::text";
  const reservedQuantityViolation = hasReservedQuantityMl
    ? "OR reserved_quantity_ml < 0 OR reserved_quantity_ml > remaining_quantity_ml"
    : "";
  return `
  SELECT
    (SELECT count(*)::text FROM public.oil_lots) AS oil_lots,
    (SELECT coalesce(sum(received_quantity_ml), 0)::text FROM public.oil_lots) AS oil_received_ml_total,
    (SELECT coalesce(sum(remaining_quantity_ml), 0)::text FROM public.oil_lots) AS oil_remaining_ml_total,
    ${reservedQuantityAggregate} AS oil_reserved_ml_total,
    (SELECT coalesce(sum(kg_bottles), 0)::text FROM public.oil_lots) AS oil_kg_bottles_total,
    (SELECT count(*)::text FROM public.oil_movements) AS oil_movements,
    (SELECT coalesce(sum(quantity_delta_ml), 0)::text FROM public.oil_movements) AS oil_delta_ml_total,
    -- Procurement-provenance columns arrive in 0016. This source-to-target
    -- parity verifier also supports the immediately preceding production
    -- schema, so 0016's non-negative cost constraint is verified by the
    -- migration gate rather than referenced here.
    (
      SELECT count(*)::text
      FROM public.oil_lots
      WHERE received_quantity_ml <= 0
        OR remaining_quantity_ml < 0
        OR remaining_quantity_ml > received_quantity_ml
        ${reservedQuantityViolation}
        OR kg_bottles <= 0
        OR version < 0
    ) AS oil_lot_value_violations,
    (
      SELECT count(*)::text
      FROM public.oil_movements
      WHERE quantity_delta_ml = 0 OR quantity_after_ml < 0
    ) AS oil_movement_value_violations,
    (
      SELECT count(*)::text
      FROM public.oil_movements AS movement_row
      LEFT JOIN public.oil_lots AS lot_row ON lot_row.id = movement_row.lot_id
      LEFT JOIN public.products AS product_row ON product_row.id = movement_row.product_id
      WHERE lot_row.id IS NULL OR product_row.id IS NULL
    ) AS oil_reference_orphans
`;
}

const INVOICE_AGGREGATES_SQL = `
  SELECT
    (SELECT count(*)::text FROM public.customers) AS customers,
    (SELECT count(*)::text FROM public.invoices) AS invoices,
    (SELECT count(*)::text FROM public.invoice_lines) AS invoice_lines,
    (SELECT count(*)::text FROM public.payments) AS payments,
    (SELECT count(*)::text FROM public.ops_sales) AS ops_sales,
    (SELECT count(*)::text FROM public.document_number_counters) AS document_number_counters,
    (SELECT coalesce(sum(subtotal_cents), 0)::text FROM public.invoices) AS invoice_subtotal_total,
    (SELECT coalesce(sum(tax_cents), 0)::text FROM public.invoices) AS invoice_tax_total,
    (SELECT coalesce(sum(total_cents), 0)::text FROM public.invoices) AS invoice_total,
    (SELECT coalesce(sum(amount_paid_cents), 0)::text FROM public.invoices) AS invoice_paid_total,
    (SELECT coalesce(sum(line_total_cents), 0)::text FROM public.invoice_lines) AS invoice_line_total,
    (SELECT coalesce(sum(amount_cents), 0)::text FROM public.payments) AS payment_total,
    (
      SELECT count(*)::text
      FROM public.invoices
      WHERE currency <> 'INR'
        OR subtotal_cents < 0
        OR tax_cents < 0
        OR total_cents < 0
        OR amount_paid_cents < 0
        OR total_cents::bigint <> subtotal_cents::bigint + tax_cents::bigint
        OR amount_paid_cents > total_cents
    ) AS invoice_money_violations,
    (
      SELECT count(*)::text
      FROM public.invoices
      WHERE NOT (
        (status = 'draft'
          AND number IS NULL
          AND issued_at IS NULL
          AND paid_at IS NULL
          AND voided_at IS NULL
          AND amount_paid_cents = 0)
        OR (status = 'issued'
          AND number IS NOT NULL
          AND issued_at IS NOT NULL
          AND paid_at IS NULL
          AND voided_at IS NULL
          AND amount_paid_cents < total_cents)
        OR (status = 'paid'
          AND number IS NOT NULL
          AND issued_at IS NOT NULL
          AND paid_at IS NOT NULL
          AND voided_at IS NULL
          AND amount_paid_cents = total_cents)
        OR (status = 'void'
          AND number IS NOT NULL
          AND issued_at IS NOT NULL
          AND paid_at IS NULL
          AND voided_at IS NOT NULL
          AND amount_paid_cents = 0)
      )
    ) AS invoice_lifecycle_violations,
    (
      SELECT count(*)::text
      FROM public.invoice_lines
      WHERE quantity <= 0
        OR unit_price_cents < 0
        OR line_total_cents < 0
        OR line_total_cents::bigint <> quantity::bigint * unit_price_cents::bigint
        OR quantity_fulfilled < 0
        OR quantity_fulfilled > quantity
    ) AS invoice_line_violations,
    (
      SELECT count(*)::text
      FROM public.invoices AS invoice_row
      LEFT JOIN public.customers AS customer_row ON customer_row.id = invoice_row.customer_id
      WHERE customer_row.id IS NULL
    ) AS invoice_customer_orphans,
    (
      SELECT count(*)::text
      FROM public.invoices AS invoice_row
      LEFT JOIN (
        SELECT invoice_id, coalesce(sum(amount_cents), 0)::bigint AS payment_total
        FROM public.payments
        GROUP BY invoice_id
      ) AS payment_rollup ON payment_rollup.invoice_id = invoice_row.id
      WHERE invoice_row.amount_paid_cents::bigint <> coalesce(payment_rollup.payment_total, 0)
    ) AS invoice_payment_rollup_mismatches,
    (
      SELECT count(*)::text
      FROM public.ops_sales AS sale_row
      LEFT JOIN public.invoices AS invoice_row ON invoice_row.id = sale_row.invoice_id
      LEFT JOIN public.customers AS customer_row ON customer_row.id = sale_row.customer_id
      WHERE invoice_row.id IS NULL OR customer_row.id IS NULL
    ) AS ops_sale_reference_orphans
`;

const INTEGRITY_FIELDS = [
  ["auth", "ops_session_orphans"],
  ["auth", "ops_account_orphans"],
  ["auth", "ops_two_factor_orphans"],
  ["auth", "storefront_session_orphans"],
  ["auth", "storefront_account_orphans"],
  ["auth", "storefront_profile_orphans"],
  ["stock", "stock_balance_violations"],
  ["stock", "stock_movement_value_violations"],
  ["stock", "stock_reference_orphans"],
  ["oil", "oil_lot_value_violations"],
  ["oil", "oil_movement_value_violations"],
  ["oil", "oil_reference_orphans"],
  ["invoices", "invoice_money_violations"],
  ["invoices", "invoice_lifecycle_violations"],
  ["invoices", "invoice_line_violations"],
  ["invoices", "invoice_customer_orphans"],
  ["invoices", "invoice_payment_rollup_mismatches"],
  ["invoices", "ops_sale_reference_orphans"],
];

export function redactSecrets(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'"`<>]+/gi, "postgresql://redacted")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/\b(password|passwd|pwd|token|secret)=([^\s,&]+)/gi, "$1=[redacted]");
}

export function normalizeHostname(hostname) {
  const normalized = String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (!normalized) {
    throw new Error("database host is required");
  }
  return normalized;
}

function databasePort(url) {
  return url.port || "5432";
}

function databaseName(url) {
  const value = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!value) {
    throw new Error("database name is required");
  }
  return value;
}

function isLoopbackHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.startsWith("127.")
  );
}

function assertDirectDatabaseUrl(url, label) {
  const host = normalizeHostname(url.hostname);
  const port = databasePort(url);
  if (host.includes("pooler") || host.includes("pgbouncer") || port === "6432") {
    throw new Error(`${label} must use a direct PostgreSQL URL, not a pooler`);
  }
  return host;
}

export function parseDatabaseUrl(value, label) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new Error(`${label} is required`);
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL`);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${label} must use the postgres or postgresql protocol`);
  }
  if (!url.username) {
    throw new Error(`${label} must include an explicit database role`);
  }
  databaseName(url);
  assertDirectDatabaseUrl(url, label);
  const host = normalizeHostname(url.hostname);
  if (!isLoopbackHost(host)) {
    const sslModes = [...url.searchParams.entries()]
      .filter(([name]) => name.toLowerCase() === "sslmode")
      .map(([, mode]) => mode.toLowerCase());
    if (sslModes.length !== 1 || sslModes[0] !== "verify-full") {
      throw new Error(`${label} must set sslmode=verify-full for a non-loopback host`);
    }
  }
  return url;
}

function parseAllowedTargetHost(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.includes("://") || raw.includes("/") || raw.includes("@")) {
    throw new Error("--allow-target-host must be a hostname only");
  }
  return normalizeHostname(raw);
}

function databaseIdentity(url) {
  const host = normalizeHostname(url.hostname);
  // `localhost`, IPv6 loopback, and every 127/8 alias can resolve to the
  // same local PostgreSQL listener. Treat them as one identity so a rehearsal
  // cannot accidentally compare a database to itself by spelling its host
  // differently. A conservative false positive simply requires a different
  // port or database name for a local source/target rehearsal.
  const identityHost = isLoopbackHost(host) ? "loopback" : host;
  return `${identityHost}:${databasePort(url)}/${databaseName(url)}`;
}

export function assertTargetAllowed(sourceUrl, targetUrl, allowTargetHost) {
  const targetHost = normalizeHostname(targetUrl.hostname);
  if (databaseIdentity(sourceUrl) === databaseIdentity(targetUrl)) {
    throw new Error("source and target must be distinct direct PostgreSQL databases");
  }
  if (targetHost.endsWith(".neon.tech")) {
    throw new Error("target must be self-hosted PostgreSQL, not a Neon endpoint");
  }
  if (isLoopbackHost(targetHost)) {
    return targetHost;
  }
  if (!allowTargetHost) {
    throw new Error(
      "refusing an external target without --allow-target-host <exact-hostname>",
    );
  }
  if (targetHost !== allowTargetHost) {
    throw new Error("--allow-target-host must exactly match the target host");
  }
  return targetHost;
}

export function parseArgs(argv) {
  const options = {
    allowTargetHost: null,
    statementTimeoutMs: DEFAULT_STATEMENT_TIMEOUT_MS,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];
    if (argument === "--allow-target-host") {
      options.allowTargetHost = parseAllowedTargetHost(next);
      index += 1;
    } else if (argument === "--statement-timeout-ms") {
      options.statementTimeoutMs = Number(next);
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  if (
    !Number.isInteger(options.statementTimeoutMs) ||
    options.statementTimeoutMs < 1_000 ||
    options.statementTimeoutMs > MAX_STATEMENT_TIMEOUT_MS
  ) {
    throw new Error(
      `--statement-timeout-ms must be an integer from 1000 to ${MAX_STATEMENT_TIMEOUT_MS}`,
    );
  }
  return options;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

async function queryFirstRow(client, sql) {
  const result = await client.query(sql);
  if (!result.rows[0]) {
    throw new Error("migration verification query returned no result");
  }
  return result.rows[0];
}

async function readMigrationJournal(client) {
  const relation = await queryFirstRow(
    client,
    "SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists",
  );
  if (relation.exists !== true) {
    throw new Error("database is missing the Drizzle migration journal");
  }
  const result = await client.query(`
    SELECT hash::text AS hash, created_at::text AS created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at ASC, hash ASC
  `);
  return result.rows.map((row) => {
    if (!row.hash || row.created_at === undefined || row.created_at === null) {
      throw new Error("Drizzle migration journal contains an invalid entry");
    }
    return {
      hash: String(row.hash),
      createdAt: String(row.created_at),
    };
  });
}

async function readPublicTableCounts(client) {
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
  `);
  const counts = {};
  for (const row of tables.rows) {
    const tableName = String(row.table_name ?? "");
    if (!tableName) {
      throw new Error("public table inventory contains an invalid name");
    }
    const result = await queryFirstRow(
      client,
      `SELECT count(*)::text AS count FROM "public".${quoteIdentifier(tableName)}`,
    );
    counts[tableName] = String(result.count ?? "");
  }
  return counts;
}

async function readPublicSequenceStates(client) {
  const sequences = await client.query(`
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY sequencename ASC
  `);
  const states = {};
  for (const row of sequences.rows) {
    const sequenceName = String(row.sequencename ?? "");
    if (!sequenceName) {
      throw new Error("public sequence inventory contains an invalid name");
    }
    const result = await queryFirstRow(
      client,
      `SELECT last_value::text AS last_value, is_called FROM "public".${quoteIdentifier(sequenceName)}`,
    );
    states[sequenceName] = {
      lastValue: String(result.last_value ?? ""),
      isCalled: result.is_called === true,
    };
  }
  return states;
}

function assertCriticalTables(tableCounts) {
  const missing = CRITICAL_TABLES.filter((tableName) => !(tableName in tableCounts));
  if (missing.length > 0) {
    throw new Error(`database is missing critical tables: ${missing.join(", ")}`);
  }
}

async function readCriticalAggregates(client) {
  const auth = await queryFirstRow(client, AUTH_AGGREGATES_SQL);
  const stock = await queryFirstRow(client, STOCK_AGGREGATES_SQL);
  const oilReservationColumn = await queryFirstRow(client, `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'oil_lots'
        AND column_name = 'reserved_quantity_ml'
    ) AS has_reserved_quantity_ml
  `);
  const oil = await queryFirstRow(
    client,
    oilAggregatesSql(oilReservationColumn.has_reserved_quantity_ml === true),
  );
  const invoices = await queryFirstRow(client, INVOICE_AGGREGATES_SQL);
  return { auth, stock, oil, invoices };
}

async function readSnapshot(client) {
  const migrationJournal = await readMigrationJournal(client);
  const publicTableCounts = await readPublicTableCounts(client);
  assertCriticalTables(publicTableCounts);
  const publicSequenceStates = await readPublicSequenceStates(client);
  const criticalAggregates = await readCriticalAggregates(client);
  return {
    migrationJournal,
    publicTableCounts,
    publicSequenceStates,
    criticalAggregates,
  };
}

async function readSnapshotInReadOnlyTransaction(client) {
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    return await readSnapshot(client);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
  }
}

export function integrityIssues(criticalAggregates) {
  return INTEGRITY_FIELDS.filter(([group, field]) => {
    return String(criticalAggregates?.[group]?.[field] ?? "") !== "0";
  }).map(([group, field]) => `${group}.${field}`);
}

export function compareSnapshots(sourceSnapshot, targetSnapshot) {
  const mismatches = [];
  if (!isDeepStrictEqual(sourceSnapshot.migrationJournal, targetSnapshot.migrationJournal)) {
    mismatches.push("exact migration journal");
  }
  if (!isDeepStrictEqual(sourceSnapshot.publicTableCounts, targetSnapshot.publicTableCounts)) {
    mismatches.push("public table row counts");
  }
  if (!isDeepStrictEqual(sourceSnapshot.publicSequenceStates, targetSnapshot.publicSequenceStates)) {
    mismatches.push("public sequence states");
  }
  if (!isDeepStrictEqual(sourceSnapshot.criticalAggregates, targetSnapshot.criticalAggregates)) {
    mismatches.push("auth, stock, oil, or invoice aggregates");
  }
  return mismatches;
}

function resolvePgModule() {
  const requireDatabasePackage = createRequire(DATABASE_PACKAGE_PATH);
  return requireDatabasePackage("pg");
}

async function connectClient(pgModule, databaseUrl, statementTimeoutMs) {
  const client = new pgModule.Client({
    connectionString: databaseUrl.toString(),
    application_name: "perfume-aura-self-hosted-migration-rehearsal",
    connectionTimeoutMillis: 15_000,
    query_timeout: statementTimeoutMs,
    statement_timeout: statementTimeoutMs,
  });
  await client.connect();
  return client;
}

function requiredEnvironmentUrl(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required; this verifier does not read env files`);
  }
  return value;
}

export async function verifySelfHostedPostgresMigration(options, dependencies = {}) {
  const environment = dependencies.environment ?? process.env;
  const sourceUrl = parseDatabaseUrl(
    requiredEnvironmentUrl(environment, SOURCE_URL_ENV),
    SOURCE_URL_ENV,
  );
  const targetUrl = parseDatabaseUrl(
    requiredEnvironmentUrl(environment, TARGET_URL_ENV),
    TARGET_URL_ENV,
  );
  assertTargetAllowed(sourceUrl, targetUrl, options.allowTargetHost);

  const pgModule = dependencies.pgModule ?? resolvePgModule();
  let sourceClient;
  let targetClient;
  try {
    sourceClient = await connectClient(pgModule, sourceUrl, options.statementTimeoutMs);
    targetClient = await connectClient(pgModule, targetUrl, options.statementTimeoutMs);
    const sourceSnapshot = await readSnapshotInReadOnlyTransaction(sourceClient);
    const targetSnapshot = await readSnapshotInReadOnlyTransaction(targetClient);
    const sourceIntegrityIssues = integrityIssues(sourceSnapshot.criticalAggregates);
    if (sourceIntegrityIssues.length > 0) {
      throw new Error(
        `source database fails integrity checks: ${sourceIntegrityIssues.join(", ")}`,
      );
    }
    const targetIntegrityIssues = integrityIssues(targetSnapshot.criticalAggregates);
    if (targetIntegrityIssues.length > 0) {
      throw new Error(
        `target database fails integrity checks: ${targetIntegrityIssues.join(", ")}`,
      );
    }
    const mismatches = compareSnapshots(sourceSnapshot, targetSnapshot);
    if (mismatches.length > 0) {
      throw new Error(
        `migration rehearsal verification failed: ${mismatches.join(", ")}; no source or target data values were printed`,
      );
    }
  } finally {
    await Promise.all([
      sourceClient?.end().catch(() => undefined),
      targetClient?.end().catch(() => undefined),
    ]);
  }

  process.stdout.write(
    "self-hosted migration verification passed: journal, table counts, sequences, auth, stock, oil, and invoice integrity matched without printing data values\n",
  );
}

function printUsage() {
  process.stdout.write(`Usage:\n  ${SOURCE_URL_ENV}=... ${TARGET_URL_ENV}=... pnpm db:verify-self-hosted-migration -- --allow-target-host <exact-target-hostname>\n\nThe verifier is read-only. It requires direct PostgreSQL URLs and refuses every non-loopback target unless explicitly acknowledged.\n`);
}

async function selfTest() {
  assert.equal(
    redactSecrets(
      "postgresql://owner:secret@db.example.test/perfume?password=secret visual-owner@perfume-aura.test",
    ),
    "postgresql://redacted [redacted-email]",
  );
  const sourceUrl = parseDatabaseUrl(
    "postgresql://source_role:secret@source.example.test/perfume_aura?sslmode=verify-full",
    SOURCE_URL_ENV,
  );
  const loopbackTarget = parseDatabaseUrl(
    "postgresql://target_role:secret@127.0.0.1/perfume_aura_rehearsal",
    TARGET_URL_ENV,
  );
  assert.equal(assertTargetAllowed(sourceUrl, loopbackTarget, null), "127.0.0.1");
  const loopbackAliasSource = parseDatabaseUrl(
    "postgresql://source_role:secret@localhost:55432/perfume_aura_rehearsal",
    SOURCE_URL_ENV,
  );
  const loopbackAliasTarget = parseDatabaseUrl(
    "postgresql://target_role:secret@127.0.0.2:55432/perfume_aura_rehearsal",
    TARGET_URL_ENV,
  );
  assert.throws(
    () => assertTargetAllowed(loopbackAliasSource, loopbackAliasTarget, null),
    /source and target must be distinct/,
  );
  const externalTarget = parseDatabaseUrl(
    "postgresql://target_role:secret@db.example.test/perfume_aura?sslmode=verify-full",
    TARGET_URL_ENV,
  );
  assert.throws(
    () => assertTargetAllowed(sourceUrl, externalTarget, null),
    /allow-target-host/,
  );
  assert.equal(
    assertTargetAllowed(sourceUrl, externalTarget, "db.example.test"),
    "db.example.test",
  );
  assert.throws(
    () => assertTargetAllowed(sourceUrl, externalTarget, "other.example.test"),
    /exactly match/,
  );
  assert.throws(
    () =>
      parseDatabaseUrl(
        "postgresql://target_role:secret@db-pooler.example.test:6432/perfume_aura?sslmode=verify-full",
        TARGET_URL_ENV,
      ),
    /pooler/,
  );
  assert.throws(
    () =>
      parseDatabaseUrl(
        "postgresql://target_role:secret@db.example.test/perfume_aura?sslmode=require",
        TARGET_URL_ENV,
      ),
    /sslmode=verify-full/,
  );
  assert.throws(
    () => parseArgs(["--statement-timeout-ms", "999"]),
    /statement-timeout-ms/,
  );
  assert.deepEqual(parseArgs(["--allow-target-host", "DB.Example.Test."]), {
    allowTargetHost: "db.example.test",
    statementTimeoutMs: DEFAULT_STATEMENT_TIMEOUT_MS,
    help: false,
  });
  const matchingSnapshot = {
    migrationJournal: [{ hash: "migration-hash", createdAt: "1" }],
    publicTableCounts: { invoices: "0" },
    publicSequenceStates: {},
    criticalAggregates: { auth: { ops_session_orphans: "0" } },
  };
  assert.deepEqual(compareSnapshots(matchingSnapshot, matchingSnapshot), []);
  assert.deepEqual(
    compareSnapshots(matchingSnapshot, {
      ...matchingSnapshot,
      publicTableCounts: { invoices: "1" },
    }),
    ["public table row counts"],
  );
  const validIntegrityAggregates = {
    auth: {
      ops_session_orphans: "0",
      ops_account_orphans: "0",
      ops_two_factor_orphans: "0",
      storefront_session_orphans: "0",
      storefront_account_orphans: "0",
      storefront_profile_orphans: "0",
    },
    stock: {
      stock_balance_violations: "0",
      stock_movement_value_violations: "0",
      stock_reference_orphans: "0",
    },
    oil: {
      oil_lot_value_violations: "0",
      oil_movement_value_violations: "0",
      oil_reference_orphans: "0",
    },
    invoices: {
      invoice_money_violations: "0",
      invoice_lifecycle_violations: "0",
      invoice_line_violations: "0",
      invoice_customer_orphans: "0",
      invoice_payment_rollup_mismatches: "0",
      ops_sale_reference_orphans: "0",
    },
  };
  assert.deepEqual(integrityIssues(validIntegrityAggregates), []);
  assert.deepEqual(
    integrityIssues({
      ...validIntegrityAggregates,
      auth: { ...validIntegrityAggregates.auth, ops_session_orphans: "1" },
    }),
    ["auth.ops_session_orphans"],
  );

  const clientInstances = [];
  const zeroFields = (fields) => Object.fromEntries(fields.map((field) => [field, "0"]));
  const authRow = zeroFields([
    "ops_users",
    "ops_sessions",
    "ops_accounts",
    "ops_two_factors",
    "storefront_users",
    "storefront_sessions",
    "storefront_accounts",
    "storefront_profiles",
    "ops_session_orphans",
    "ops_account_orphans",
    "ops_two_factor_orphans",
    "storefront_session_orphans",
    "storefront_account_orphans",
    "storefront_profile_orphans",
  ]);
  const stockRow = zeroFields([
    "product_variants",
    "stock_on_hand_total",
    "stock_reserved_total",
    "stock_cost_total",
    "stock_retail_total",
    "stock_movements",
    "stock_delta_total",
    "stock_balance_violations",
    "stock_movement_value_violations",
    "stock_reference_orphans",
  ]);
  const oilRow = zeroFields([
    "oil_lots",
    "oil_received_ml_total",
    "oil_remaining_ml_total",
    "oil_reserved_ml_total",
    "oil_kg_bottles_total",
    "oil_movements",
    "oil_delta_ml_total",
    "oil_lot_value_violations",
    "oil_movement_value_violations",
    "oil_reference_orphans",
  ]);
  const invoiceRow = zeroFields([
    "customers",
    "invoices",
    "invoice_lines",
    "payments",
    "ops_sales",
    "document_number_counters",
    "invoice_subtotal_total",
    "invoice_tax_total",
    "invoice_total",
    "invoice_paid_total",
    "invoice_line_total",
    "payment_total",
    "invoice_money_violations",
    "invoice_lifecycle_violations",
    "invoice_line_violations",
    "invoice_customer_orphans",
    "invoice_payment_rollup_mismatches",
    "ops_sale_reference_orphans",
  ]);
  class SelfTestClient {
    constructor(configuration) {
      this.configuration = configuration;
      this.queries = [];
      this.ended = false;
      clientInstances.push(this);
    }

    async connect() {}

    async end() {
      this.ended = true;
    }

    async query(sql) {
      const query = String(sql);
      this.queries.push(query);
      if (/^BEGIN TRANSACTION/i.test(query) || /^ROLLBACK/i.test(query)) {
        return { rows: [] };
      }
      if (query.includes("to_regclass('drizzle.__drizzle_migrations')")) {
        return { rows: [{ exists: true }] };
      }
      if (query.includes("FROM drizzle.__drizzle_migrations")) {
        return { rows: [{ hash: "migration-hash", created_at: "1" }] };
      }
      if (query.includes("FROM information_schema.tables")) {
        return { rows: CRITICAL_TABLES.map((table_name) => ({ table_name })) };
      }
      if (query.includes('SELECT count(*)::text AS count FROM "public".')) {
        return { rows: [{ count: "0" }] };
      }
      if (query.includes("FROM pg_sequences")) {
        return { rows: [] };
      }
      if (query.includes("AS ops_users")) {
        return { rows: [authRow] };
      }
      if (query.includes("AS product_variants")) {
        return { rows: [stockRow] };
      }
      if (query.includes("AS oil_lots")) {
        return { rows: [oilRow] };
      }
      if (query.includes("AS has_reserved_quantity_ml")) {
        return { rows: [{ has_reserved_quantity_ml: true }] };
      }
      if (query.includes("AS customers")) {
        return { rows: [invoiceRow] };
      }
      throw new Error("unexpected self-test database query");
    }
  }
  await verifySelfHostedPostgresMigration(
    {
      allowTargetHost: null,
      statementTimeoutMs: DEFAULT_STATEMENT_TIMEOUT_MS,
      help: false,
    },
    {
      environment: {
        [SOURCE_URL_ENV]: "postgresql://source_role:secret@source.example.test/perfume_aura?sslmode=verify-full",
        [TARGET_URL_ENV]: "postgresql://target_role:secret@127.0.0.1/perfume_aura_rehearsal",
      },
      pgModule: { Client: SelfTestClient },
    },
  );
  assert.equal(clientInstances.length, 2);
  assert.equal(clientInstances.every((client) => client.ended), true);
  assert.equal(
    clientInstances.every((client) =>
      client.queries.every((query) => /^(SELECT|BEGIN|ROLLBACK)/i.test(query.trim())),
    ),
    true,
  );
  process.stdout.write("self-hosted-postgres-migration verifier self-test ok\n");
}

async function main(argv) {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  if (normalizedArgv[0] === "self-test") {
    await selfTest();
    return;
  }
  const options = parseArgs(normalizedArgv);
  if (options.help) {
    printUsage();
    return;
  }
  await verifySelfHostedPostgresMigration(options);
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${redactSecrets(error instanceof Error ? error.message : String(error))}\n`,
    );
    process.exitCode = 1;
  });
}
