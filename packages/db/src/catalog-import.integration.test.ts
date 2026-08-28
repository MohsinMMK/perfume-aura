import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { Pool } from "pg";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const databaseUrl = requireDisposableTestDatabaseUrl();
const packageRoot = resolve(import.meta.dirname, "..");
const signingSecret = "catalog-import-test-signing-secret-1234567890";
let templateRoot = "";

const headers = {
  products: "product_key,internal_name,internal_slug,brand,category,internal_description,public_name,public_slug,scent_family,audience,season,concentration,top_notes,heart_notes,base_notes,intensity,occasion,longevity_guidance,sillage,ingredients,usage_instructions,short_description,long_description,seo_title,seo_description,publication_status,legal_approval_reference,content_approval_reference,media_approval_reference,featured_rank",
  variants: "product_key,sku,size_ml,cost_amount_minor,retail_amount_minor,opening_stock,reorder_level,price_approval_reference,active",
  media: "product_key,kind,storage_key,alt_text,width,height,position,approval_reference",
  serviceability: "postal_code,delhivery_enabled,india_post_enabled,min_business_days,max_business_days,active",
} as const;

function csv(values: readonly string[]): string {
  return values.map((value) => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value).join(",");
}

async function writeTemplates(
  openingStock = "5",
  legalReference = "LEGAL-TEST-2026",
  concentration = "eau de parfum",
): Promise<void> {
  await Promise.all([
    writeFile(join(templateRoot, "catalog-products-review.csv"), `${headers.products}\n${csv([
      "launch-one", "Launch One Internal", "launch-one-internal", "Perfume Aura", "perfume", "Internal record",
      "Launch One", "launch-one", "woody", "all adults", "all seasons", concentration,
      "citrus|pepper", "cedar", "amber", "strong", "evening", "Up to eight hours", "moderate",
      "Fragrance composition", "External use only", "A composed woody scent.",
      "A composed woody scent prepared for the launch catalog.", "Launch One perfume", "Discover Launch One by Perfume Aura.",
      "approved", legalReference, "CONTENT-TEST-2026", "MEDIA-TEST-2026", "0",
    ])}\n`),
    writeFile(join(templateRoot, "catalog-variants-review.csv"), `${headers.variants}\n${csv([
      "launch-one", "LAUNCH-ONE-100", "100", "10000", "19900", openingStock, "2", "CA-PRICE-TEST-2026", "true",
    ])}\n`),
    writeFile(join(templateRoot, "catalog-media-review.csv"), `${headers.media}\n${csv([
      "launch-one", "pack", "catalog/launch-one-pack.webp", "Launch One perfume bottle", "1200", "1600", "0", "MEDIA-ASSET-TEST-2026",
    ])}\n`),
    writeFile(join(templateRoot, "shipping-serviceability-review.csv"), `${headers.serviceability}\n400001,true,true,3,7,true\n`),
  ]);
}

async function writeIdentityConflictTemplates(internalSlug: string): Promise<void> {
  await Promise.all([
    writeFile(join(templateRoot, "catalog-products-review.csv"), `${headers.products}\n${csv([
      "different-product-key", "Conflicting Product", internalSlug, "Perfume Aura", "perfume", "Conflicting internal record",
      "Identity Conflict", "identity-conflict", "woody", "all adults", "all seasons", "eau de parfum",
      "pepper", "cedar", "amber", "strong", "evening", "Up to eight hours", "moderate",
      "Fragrance composition", "External use only", "A conflicting product identity.",
      "This row must never overwrite an existing product with the same internal slug.", "Identity Conflict perfume", "Identity conflict import safety test.",
      "approved", "LEGAL-CONFLICT-2026", "CONTENT-CONFLICT-2026", "MEDIA-CONFLICT-2026", "0",
    ])}\n`),
    writeFile(join(templateRoot, "catalog-variants-review.csv"), `${headers.variants}\n${csv([
      "different-product-key", "IDENTITY-CONFLICT-100", "100", "10000", "19900", "5", "2", "CA-CONFLICT-2026", "true",
    ])}\n`),
    writeFile(join(templateRoot, "catalog-media-review.csv"), `${headers.media}\n${csv([
      "different-product-key", "pack", "catalog/identity-conflict.webp", "Identity conflict perfume bottle", "1200", "1600", "0", "MEDIA-CONFLICT-2026",
    ])}\n`),
    writeFile(join(templateRoot, "shipping-serviceability-review.csv"), `${headers.serviceability}\n400001,true,true,3,7,true\n`),
  ]);
}

async function runImporter(args: readonly string[], extraEnvironment: NodeJS.ProcessEnv = {}): Promise<Readonly<{
  code: number;
  stderr: string;
  stdout: string;
}>> {
  return new Promise((resolveResult, reject) => {
    const child = spawn("pnpm", ["exec", "tsx", "src/catalog-import.ts", ...args], {
      cwd: packageRoot,
      env: {
        ...process.env,
        CATALOG_MANIFEST_SIGNING_SECRET: signingSecret,
        CATALOG_TEMPLATE_ROOT: templateRoot,
        ...extraEnvironment,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code) => resolveResult({ code: code ?? -1, stderr, stdout }));
  });
}

describe("reviewed catalog importer", () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });

  before(async () => {
    templateRoot = await mkdtemp(join(tmpdir(), "perfume-aura-catalog-import-"));
    await writeTemplates();
  });

  after(async () => {
    await pool.end();
    await rm(templateRoot, { recursive: true, force: true });
  });

  it("produces a signed deterministic plan and applies opening stock once", async () => {
    const dryRun = await runImporter(["--dry-run"]);
    assert.equal(dryRun.code, 0, dryRun.stderr);
    const manifest = JSON.parse(dryRun.stdout.trim()) as { digest: string; signature: string; approvedPublicUrlManifest: { schemaVersion: number; mode: string; paths: string[] }; counts: Record<string, number> };
    assert.match(manifest.digest, /^[a-f0-9]{64}$/);
    assert.match(manifest.signature, /^[a-f0-9]{64}$/);
    assert.deepEqual(manifest.counts, { products: 1, variants: 1, media: 1, serviceability: 1 });
    assert.deepEqual(manifest.approvedPublicUrlManifest, {
      schemaVersion: 1,
      mode: "public-catalog",
      paths: [],
    });

    const confirmationEnvironment = {
      CONFIRM_CATALOG_IMPORT: "APPLY_REVIEWED_CATALOG",
      CONFIRM_CATALOG_DIGEST: manifest.digest,
      CONFIRM_CATALOG_SIGNATURE: manifest.signature,
      DATABASE_URL_DIRECT: databaseUrl,
    };
    const first = await runImporter(["--apply"], confirmationEnvironment);
    assert.equal(first.code, 0, first.stderr);
    const replay = await runImporter(["--apply"], confirmationEnvironment);
    assert.equal(replay.code, 0, replay.stderr);

    const result = await pool.query<{ movement_count: string; quantity_on_hand: number }>(`
      SELECT pv.quantity_on_hand,
             count(sm.id) FILTER (WHERE sm.idempotency_key='catalog-opening:LAUNCH-ONE-100')::text AS movement_count
      FROM product_variants pv
      LEFT JOIN stock_movements sm ON sm.variant_id=pv.id
      WHERE pv.sku='LAUNCH-ONE-100'
      GROUP BY pv.id
    `);
    assert.deepEqual(result.rows[0], { quantity_on_hand: 5, movement_count: "1" });
    const profile = await pool.query<{
      audience: string;
      concentration: string;
      season: string;
      sillage: string;
    }>(`
      SELECT audience, concentration, season, sillage
      FROM product_publications pp
      INNER JOIN products p ON p.id=pp.product_id
      WHERE p.slug='launch-one-internal'
    `);
    assert.deepEqual(profile.rows[0], {
      audience: "all adults",
      concentration: "eau de parfum",
      season: "all seasons",
      sillage: "moderate",
    });
  });

  it("rejects an approved product with an incomplete public scent profile", async () => {
    await writeTemplates("5", "LEGAL-TEST-2026", "");
    const invalid = await runImporter(["--dry-run"]);
    assert.notEqual(invalid.code, 0);
    assert.match(invalid.stderr, /concentration is required/);
    await writeTemplates();
  });

  it("rejects approval gaps and rolls back a conflicting opening balance", async () => {
    await writeTemplates("5", "");
    const invalid = await runImporter(["--dry-run"]);
    assert.notEqual(invalid.code, 0);
    assert.match(invalid.stderr, /legal_approval_reference is required/);

    await writeTemplates("6");
    const dryRun = await runImporter(["--dry-run"]);
    assert.equal(dryRun.code, 0, dryRun.stderr);
    const manifest = JSON.parse(dryRun.stdout.trim()) as { digest: string; signature: string };
    const conflict = await runImporter(["--apply"], {
      CONFIRM_CATALOG_IMPORT: "APPLY_REVIEWED_CATALOG",
      CONFIRM_CATALOG_DIGEST: manifest.digest,
      CONFIRM_CATALOG_SIGNATURE: manifest.signature,
      DATABASE_URL_DIRECT: databaseUrl,
    });
    assert.notEqual(conflict.code, 0);
    assert.match(conflict.stderr, /opening stock changed/);
    const result = await pool.query<{ quantity_on_hand: number }>("SELECT quantity_on_hand FROM product_variants WHERE sku='LAUNCH-ONE-100'");
    assert.equal(result.rows[0]?.quantity_on_hand, 5);
  });

  it("rejects a slug that belongs to another deterministic product identity", async () => {
    const conflictingSlug = `existing-${randomUUID()}`;
    const existingId = randomUUID();
    await pool.query(
      "INSERT INTO products (id, name, slug, status) VALUES ($1, 'Existing Product', $2, 'active')",
      [existingId, conflictingSlug],
    );
    await writeIdentityConflictTemplates(conflictingSlug);
    const dryRun = await runImporter(["--dry-run"]);
    assert.equal(dryRun.code, 0, dryRun.stderr);
    const manifest = JSON.parse(dryRun.stdout.trim()) as { digest: string; signature: string };
    const conflict = await runImporter(["--apply"], {
      CONFIRM_CATALOG_IMPORT: "APPLY_REVIEWED_CATALOG",
      CONFIRM_CATALOG_DIGEST: manifest.digest,
      CONFIRM_CATALOG_SIGNATURE: manifest.signature,
      DATABASE_URL_DIRECT: databaseUrl,
    });
    assert.notEqual(conflict.code, 0);
    assert.match(conflict.stderr, /belongs to a different product identity/);
    const result = await pool.query<{ name: string }>("SELECT name FROM products WHERE id=$1", [existingId]);
    assert.equal(result.rows[0]?.name, "Existing Product");
  });
});
