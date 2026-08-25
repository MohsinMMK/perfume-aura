#!/usr/bin/env node
/**
 * Isolated Neon proof for a pending drizzle migration.
 * Creates an expiring copy-on-write branch, applies migrations, optionally
 * reapplies grant scripts, and prints privacy-safe counts only.
 * Never logs connection strings, passwords, or customer rows.
 * Refuses production compute hosts, poolers, and loopback URLs.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MIGRATION_TAG = "0014_oil_lots";
const DEFAULT_PROJECT_ID = "aged-star-64023346";
const FORBIDDEN_HOST_MARKERS = [
  "ep-gentle-scene-azcgwd0x",
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
];
const ROLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NEON_API = "https://console.neon.tech/api/v2";

export function redactSecrets(text) {
  return String(text)
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgresql://redacted")
    .replace(/ep-[a-z0-9-]+[^\s'"]*/gi, "[redacted-host]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]");
}

export function assertSafeDatabaseHost(hostname) {
  const host = String(hostname ?? "").trim().toLowerCase();
  if (!host) {
    throw new Error("database host is required");
  }
  if (host.includes("-pooler.")) {
    throw new Error("isolated proof requires a direct Neon host, not a pooler");
  }
  if (!host.endsWith(".neon.tech")) {
    throw new Error("isolated proof accepts only a neon.tech host");
  }
  for (const marker of FORBIDDEN_HOST_MARKERS) {
    if (host.includes(marker)) {
      throw new Error("refusing production, loopback, or denylisted database host");
    }
  }
  return host;
}

export function parseArgs(argv) {
  const options = {
    projectId: DEFAULT_PROJECT_ID,
    parent: "main",
    migrationTag: DEFAULT_MIGRATION_TAG,
    expiresHours: 24,
    opsRole: null,
    storefrontRole: null,
    skipGrants: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id") {
      options.projectId = String(next ?? "").trim();
      index += 1;
    } else if (arg === "--parent") {
      options.parent = String(next ?? "").trim();
      index += 1;
    } else if (arg === "--migration-tag") {
      options.migrationTag = String(next ?? "").trim();
      index += 1;
    } else if (arg === "--expires-hours") {
      options.expiresHours = Number(next);
      index += 1;
    } else if (arg === "--ops-role") {
      options.opsRole = String(next ?? "").trim();
      index += 1;
    } else if (arg === "--storefront-role") {
      options.storefrontRole = String(next ?? "").trim();
      index += 1;
    } else if (arg === "--skip-grants") {
      options.skipGrants = true;
    } else if (arg === "self-test") {
      options.selfTest = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!options.projectId) {
    throw new Error("--project-id is required");
  }
  if (!Number.isInteger(options.expiresHours) || options.expiresHours < 1 || options.expiresHours > 72) {
    throw new Error("--expires-hours must be an integer from 1 to 72");
  }
  if (options.opsRole && !ROLE_NAME.test(options.opsRole)) {
    throw new Error("invalid --ops-role");
  }
  if (options.storefrontRole && !ROLE_NAME.test(options.storefrontRole)) {
    throw new Error("invalid --storefront-role");
  }
  return options;
}

function readLinkedProjectId() {
  try {
    const raw = JSON.parse(readFileSync(path.join(REPO_ROOT, ".neon"), "utf8"));
    return typeof raw.projectId === "string" ? raw.projectId : null;
  } catch {
    return null;
  }
}

function requireApiKey() {
  const key = process.env.NEON_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "NEON_API_KEY is required. Isolated proof will not read production env files or apply to live Neon.",
    );
  }
  return key;
}

async function neonRequest(apiKey, method, pathname, body) {
  const response = await fetch(`${NEON_API}${pathname}`, {
    method,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const code = parsed?.message || parsed?.error || response.statusText;
    throw new Error(`Neon API ${method} ${pathname} failed: ${response.status} ${code}`);
  }
  return parsed;
}

function runPnpmMigrate(directUrl) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@perfume-aura/db", "migrate"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL_DIRECT: directUrl,
      },
    },
  );
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  process.stdout.write(redactSecrets(combined));
  if (result.status !== 0) {
    throw new Error("drizzle migrate failed on the isolated branch");
  }
}

function prepareGrantSql(filePath, roleName) {
  if (!ROLE_NAME.test(roleName)) {
    throw new Error("invalid runtime role");
  }
  const raw = readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("\\"))
    .join("\n");
  return raw
    .replace(/^\\set ON_ERROR_STOP on\s*$/m, "")
    .replace(/^\\if[^\n]*\n\\else\n\\echo[^\n]*\n\\quit\n\\endif\n/m, "")
    .replaceAll(':"runtime_role"', `"${roleName}"`)
    .replaceAll(":'runtime_role'", `'${roleName}'`);
}

async function applyGrantScript(client, filePath, roleName, label) {
  const sql = prepareGrantSql(filePath, roleName);
  const result = await client.query(sql);
  const rows = Array.isArray(result)
    ? result.flatMap((part) => part.rows ?? [])
    : result.rows ?? [];
  process.stdout.write(`${label} grant drift rows=${rows.length}\n`);
  if (rows.length !== 0) {
    throw new Error(`${label} grant drift is not zero`);
  }
}

async function querySafeCounts(client) {
  const migrations = await client.query(
    "SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations",
  );
  const tables = await client.query(`
    SELECT
      to_regclass('public.oil_lots') IS NOT NULL AS oil_lots,
      to_regclass('public.oil_movements') IS NOT NULL AS oil_movements,
      to_regclass('public.ops_sales') IS NOT NULL AS ops_sales,
      to_regclass('public.products') IS NOT NULL AS products
  `);
  return {
    migrationCount: migrations.rows[0]?.count ?? null,
    oilLots: tables.rows[0]?.oil_lots === true,
    oilMovements: tables.rows[0]?.oil_movements === true,
    opsSales: tables.rows[0]?.ops_sales === true,
    products: tables.rows[0]?.products === true,
  };
}

export async function proveIsolatedNeonMigration(options, deps = {}) {
  const apiKey = (deps.requireApiKey ?? requireApiKey)();
  const now = deps.now ?? (() => new Date());
  const fetchImpl = deps.fetchImpl;
  const pg = deps.pg;
  const expires = new Date(now().getTime() + options.expiresHours * 3600_000);
  const branchName = `release-${options.migrationTag}-${now()
    .toISOString()
    .slice(0, 15)
    .replaceAll(/[-:]/g, "")}`;

  const request = fetchImpl
    ? fetchImpl
    : (method, pathname, body) => neonRequest(apiKey, method, pathname, body);

  const created = await request("POST", `/projects/${options.projectId}/branches`, {
    endpoints: [{ type: "read_write" }],
    branch: {
      name: branchName,
      expires_at: expires.toISOString(),
    },
  });
  const branchId = created?.branch?.id;
  const endpointHost = created?.endpoints?.[0]?.host;
  if (!branchId || !endpointHost) {
    throw new Error("Neon branch create did not return an isolated endpoint");
  }
  assertSafeDatabaseHost(endpointHost);
  process.stdout.write(
    `isolated branch ${branchName} id=${branchId} expires=${expires.toISOString()}\n`,
  );

  const uriPayload = await request(
    "GET",
    `/projects/${options.projectId}/connection_uri?branch_id=${encodeURIComponent(
      branchId,
    )}&database_name=neondb&pooled=false`,
  );
  const directUrl = uriPayload?.uri;
  if (typeof directUrl !== "string" || !directUrl.startsWith("postgres")) {
    throw new Error("Neon connection_uri missing isolated direct URL");
  }
  const parsed = new URL(directUrl);
  assertSafeDatabaseHost(parsed.hostname);

  if (deps.skipMigrate) {
    return { branchName, branchId, host: parsed.hostname };
  }
  (deps.runMigrate ?? runPnpmMigrate)(directUrl);

  const pgModule = pg ?? (await import("pg"));
  const client = new pgModule.Client({ connectionString: directUrl });
  await client.connect();
  try {
    const beforeGrants = await querySafeCounts(client);
    process.stdout.write(
      `after migrate migrations=${beforeGrants.migrationCount} oil_lots=${beforeGrants.oilLots} oil_movements=${beforeGrants.oilMovements} ops_sales=${beforeGrants.opsSales} products=${beforeGrants.products}\n`,
    );
    if (
      !beforeGrants.oilLots ||
      !beforeGrants.oilMovements ||
      !beforeGrants.opsSales ||
      !beforeGrants.products
    ) {
      throw new Error("isolated branch is missing expected 0014 oil tables");
    }
    if (!options.skipGrants) {
      if (!options.opsRole || !options.storefrontRole) {
        throw new Error("pass --ops-role and --storefront-role, or --skip-grants");
      }
      await applyGrantScript(
        client,
        path.join(REPO_ROOT, "packages/db/sql/ops-runtime-grants.sql"),
        options.opsRole,
        "ops",
      );
      await applyGrantScript(
        client,
        path.join(REPO_ROOT, "packages/db/sql/storefront-runtime-grants.sql"),
        options.storefrontRole,
        "storefront",
      );
    }
  } finally {
    await client.end().catch(() => undefined);
  }
  process.stdout.write(
    `isolated neon proof ok migration=${options.migrationTag} branch=${branchName}\n`,
  );
  return { branchName, branchId };
}

function selfTest() {
  assert.equal(
    redactSecrets("postgresql://owner:secret@ep-gentle-scene-azcgwd0x.c-3.ap-southeast-1.aws.neon.tech/neondb"),
    "postgresql://redacted",
  );
  assert.throws(
    () => assertSafeDatabaseHost("ep-gentle-scene-azcgwd0x.c-3.ap-southeast-1.aws.neon.tech"),
    /denylisted|production/,
  );
  assert.throws(
    () => assertSafeDatabaseHost("ep-foo-pooler.c-3.ap-southeast-1.aws.neon.tech"),
    /pooler/,
  );
  assert.throws(() => assertSafeDatabaseHost("localhost"), /neon.tech|loopback|production/);
  assert.equal(
    assertSafeDatabaseHost("ep-isolated-proof-xxxx.c-3.ap-southeast-1.aws.neon.tech"),
    "ep-isolated-proof-xxxx.c-3.ap-southeast-1.aws.neon.tech",
  );
  const parsed = parseArgs([
    "--project-id",
    "aged-star-64023346",
    "--migration-tag",
    "0014_oil_lots",
    "--expires-hours",
    "24",
    "--skip-grants",
  ]);
  assert.equal(parsed.skipGrants, true);
  assert.equal(parsed.migrationTag, "0014_oil_lots");
  assert.throws(() => parseArgs(["--expires-hours", "0"]), /expires-hours/);
  assert.throws(() => parseArgs(["--ops-role", "bad-role;drop"]), /invalid --ops-role/);
  const linked = readLinkedProjectId();
  if (linked) {
    assert.equal(linked, DEFAULT_PROJECT_ID);
  }
  process.stdout.write("isolated-neon-proof self-test ok\n");
}

async function main(argv) {
  if (argv[0] === "self-test") {
    selfTest();
    return;
  }
  const options = parseArgs(argv);
  if (options.selfTest) {
    selfTest();
    return;
  }
  const linked = readLinkedProjectId();
  if (linked && options.projectId === DEFAULT_PROJECT_ID) {
    options.projectId = linked;
  }
  await proveIsolatedNeonMigration(options);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${redactSecrets(error instanceof Error ? error.message : String(error))}\n`);
    process.exitCode = 1;
  });
}
