import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolClient } from "pg";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const templateRoot = process.env.CATALOG_TEMPLATE_ROOT
  ? resolve(process.env.CATALOG_TEMPLATE_ROOT)
  : resolve(repositoryRoot, "data/catalog/templates");
const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;

type CsvRow = Record<string, string>;

const inputs = {
  products: {
    path: resolve(templateRoot, "catalog-products-review.csv"),
    headers: ["product_key", "internal_name", "internal_slug", "brand", "category", "internal_description", "public_name", "public_slug", "scent_family", "top_notes", "heart_notes", "base_notes", "intensity", "occasion", "longevity_guidance", "ingredients", "usage_instructions", "short_description", "long_description", "seo_title", "seo_description", "publication_status", "legal_approval_reference", "content_approval_reference", "media_approval_reference", "featured_rank"],
  },
  variants: {
    path: resolve(templateRoot, "catalog-variants-review.csv"),
    headers: ["product_key", "sku", "size_ml", "cost_amount_minor", "retail_amount_minor", "opening_stock", "reorder_level", "price_approval_reference", "active"],
  },
  media: {
    path: resolve(templateRoot, "catalog-media-review.csv"),
    headers: ["product_key", "kind", "storage_key", "alt_text", "width", "height", "position", "approval_reference"],
  },
  serviceability: {
    path: resolve(templateRoot, "shipping-serviceability-review.csv"),
    headers: ["postal_code", "delhivery_enabled", "india_post_enabled", "min_business_days", "max_business_days", "active"],
  },
} as const;

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else field += character;
    } else if (character === '"') {
      assert.equal(field, "", "quote must begin a CSV field"); quoted = true;
    } else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  assert.equal(quoted, false, "CSV contains an unterminated quote");
  if (field !== "" || row.length > 0) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((candidate) => candidate.some((value) => value !== ""));
}

async function loadRows(path: string, headers: readonly string[]): Promise<CsvRow[]> {
  const [actualHeaders, ...rows] = parseCsv(await readFile(path, "utf8"));
  assert.deepEqual(actualHeaders, headers, `${path} headers changed`);
  return rows.map((values, index) => {
    assert.equal(values.length, headers.length, `${path}:${index + 2} has the wrong field count`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
  });
}

function required(row: CsvRow, key: string): string {
  const value = row[key]?.trim();
  assert.ok(value, `${key} is required`);
  return value;
}

function integer(row: CsvRow, key: string, minimum: number): number {
  const value = Number(required(row, key));
  assert.ok(Number.isSafeInteger(value) && value >= minimum, `${key} must be an integer >= ${minimum}`);
  return value;
}

function boolean(row: CsvRow, key: string): boolean {
  const value = required(row, key);
  assert.ok(value === "true" || value === "false", `${key} must be true or false`);
  return value === "true";
}

function nullable(value: string | undefined): string | null {
  return value?.trim() || null;
}

function notes(value: string | undefined): string[] | null {
  const parsed = value?.split("|").map((note) => note.trim()).filter(Boolean) ?? [];
  return parsed.length > 0 ? [...new Set(parsed)] : null;
}

function deterministicUuid(key: string): string {
  const hex = createHash("sha256").update(key).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16] ?? "0", 16) % 4] ?? "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

async function validate() {
  const [products, variants, media, serviceability] = await Promise.all([
    loadRows(inputs.products.path, inputs.products.headers),
    loadRows(inputs.variants.path, inputs.variants.headers),
    loadRows(inputs.media.path, inputs.media.headers),
    loadRows(inputs.serviceability.path, inputs.serviceability.headers),
  ]);
  const productKeys = new Set<string>();
  const slugs = new Set<string>();
  const statuses = new Set(["draft", "blocked", "approved", "published", "withdrawn"]);
  for (const row of products) {
    const key = required(row, "product_key");
    assert.ok(!productKeys.has(key), `duplicate product_key ${key}`); productKeys.add(key);
    const internalSlug = required(row, "internal_slug");
    const publicSlug = required(row, "public_slug");
    assert.match(internalSlug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(publicSlug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!slugs.has(publicSlug), `duplicate public_slug ${publicSlug}`); slugs.add(publicSlug);
    required(row, "internal_name"); required(row, "public_name");
    required(row, "short_description"); required(row, "long_description");
    required(row, "seo_title"); required(row, "seo_description");
    const status = required(row, "publication_status");
    assert.ok(statuses.has(status), `invalid publication_status ${status}`);
    if (status === "approved" || status === "published") {
      required(row, "legal_approval_reference");
      required(row, "content_approval_reference");
      required(row, "media_approval_reference");
    }
    if (row.featured_rank) integer(row, "featured_rank", 0);
  }
  const skus = new Set<string>();
  const variantCounts = new Map<string, number>();
  const activeVariantCounts = new Map<string, number>();
  for (const row of variants) {
    const productKey = required(row, "product_key");
    assert.ok(productKeys.has(productKey), "variant references an unknown product_key");
    variantCounts.set(productKey, (variantCounts.get(productKey) ?? 0) + 1);
    const sku = required(row, "sku"); assert.ok(!skus.has(sku), `duplicate SKU ${sku}`); skus.add(sku);
    integer(row, "size_ml", 1); integer(row, "cost_amount_minor", 1);
    integer(row, "retail_amount_minor", 1); const openingStock = integer(row, "opening_stock", 0); integer(row, "reorder_level", 0);
    required(row, "price_approval_reference");
    if (boolean(row, "active")) {
      assert.ok(openingStock > 0, `active SKU ${sku} requires reviewed opening stock`);
      activeVariantCounts.set(productKey, (activeVariantCounts.get(productKey) ?? 0) + 1);
    }
  }
  const mediaPositions = new Set<string>();
  const mediaCounts = new Map<string, number>();
  for (const row of media) {
    const productKey = required(row, "product_key");
    assert.ok(productKeys.has(productKey), "media references an unknown product_key");
    assert.ok(["pack", "gallery", "lifestyle", "seo"].includes(required(row, "kind")), "invalid media kind");
    required(row, "storage_key"); required(row, "alt_text"); required(row, "approval_reference");
    integer(row, "width", 1); integer(row, "height", 1);
    const position = integer(row, "position", 0);
    const positionKey = `${productKey}:${position}`;
    assert.ok(!mediaPositions.has(positionKey), `duplicate media position ${positionKey}`); mediaPositions.add(positionKey);
    mediaCounts.set(productKey, (mediaCounts.get(productKey) ?? 0) + 1);
  }
  for (const row of products) {
    const status = required(row, "publication_status");
    if (status === "approved" || status === "published") {
      const productKey = required(row, "product_key");
      assert.ok((variantCounts.get(productKey) ?? 0) > 0, `${status} product ${productKey} requires a reviewed variant`);
      assert.ok((activeVariantCounts.get(productKey) ?? 0) > 0, `${status} product ${productKey} requires an active stocked variant`);
      assert.ok((mediaCounts.get(productKey) ?? 0) > 0, `${status} product ${productKey} requires reviewed media`);
    }
  }
  const postalCodes = new Set<string>();
  for (const row of serviceability) {
    const postalCode = required(row, "postal_code"); assert.match(postalCode, /^[1-9][0-9]{5}$/);
    assert.ok(!postalCodes.has(postalCode), `duplicate postal_code ${postalCode}`); postalCodes.add(postalCode);
    const delhivery = boolean(row, "delhivery_enabled"); const indiaPost = boolean(row, "india_post_enabled");
    const active = boolean(row, "active");
    if (active) assert.ok(delhivery || indiaPost, `active PIN ${postalCode} requires a courier`);
    const min = integer(row, "min_business_days", 1); const max = integer(row, "max_business_days", 1);
    assert.equal(min, 3, `PIN ${postalCode} minimum must remain 3 business days`);
    assert.equal(max, 7, `PIN ${postalCode} maximum must remain 7 business days`);
  }
  const canonical = { products, variants, media, serviceability };
  const digest = createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
  const signingSecret = process.env.CATALOG_MANIFEST_SIGNING_SECRET;
  const signature = signingSecret && signingSecret.length >= 32
    ? createHmac("sha256", signingSecret).update(digest).digest("hex")
    : null;
  return { ...canonical, digest, signature };
}

async function applyPlan(plan: Awaited<ReturnType<typeof validate>>): Promise<void> {
  assert.equal(process.env.CONFIRM_CATALOG_IMPORT, "APPLY_REVIEWED_CATALOG", "catalog import confirmation is missing");
  assert.equal(process.env.CONFIRM_CATALOG_DIGEST, plan.digest, "reviewed catalog digest does not match the current templates");
  assert.ok(plan.signature, "CATALOG_MANIFEST_SIGNING_SECRET of at least 32 characters is required for apply mode");
  assert.equal(process.env.CONFIRM_CATALOG_SIGNATURE, plan.signature, "reviewed catalog signature does not match the current templates");
  if (plan.products.some((row) => row.publication_status === "published")) {
    assert.equal(process.env.CONFIRM_CATALOG_PUBLICATION, "ALLOW_REVIEWED_PUBLICATION", "publication confirmation is missing");
  }
  const connectionString = process.env.DATABASE_URL_DIRECT;
  assert.ok(connectionString, "DATABASE_URL_DIRECT is required for apply mode");
  assert.ok(plan.products.length > 0, "refusing an empty catalog import");
  const pool = new Pool({ connectionString, max: 1, application_name: "perfume-aura-reviewed-catalog-import" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('perfume-aura-catalog-import'))");
    const productIds = new Map<string, string>();
    for (const row of plan.products) {
      const productId = await upsertProduct(client, row);
      productIds.set(required(row, "product_key"), productId);
      await upsertPublication(client, productId, row);
    }
    for (const row of plan.variants) await upsertVariant(client, productIds, row, plan.digest);
    for (const row of plan.media) await upsertMedia(client, productIds, row);
    for (const row of plan.serviceability) await upsertServiceability(client, row);
    await client.query(`INSERT INTO ops_audit_events (id, action, target_type, target_id, metadata)
      VALUES ($1, 'commerce.catalog.import_applied', 'catalog_import', $2, $3::jsonb)`, [
      randomUUID(), plan.digest, JSON.stringify({ product_count: plan.products.length, variant_count: plan.variants.length, media_count: plan.media.length, postal_count: plan.serviceability.length }),
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK"); throw error;
  } finally { client.release(); await pool.end(); }
}

async function upsertProduct(client: PoolClient, row: CsvRow): Promise<string> {
  const id = deterministicUuid(`product:${required(row, "product_key")}`);
  const slug = required(row, "internal_slug");
  const existing = await client.query<{ id: string; slug: string }>(
    "SELECT id, slug FROM products WHERE id=$1 OR slug=$2 FOR UPDATE",
    [id, slug],
  );
  assert.ok(
    existing.rows.every((product) => product.id === id),
    `internal slug ${slug} belongs to a different product identity`,
  );
  assert.ok(existing.rows.length <= 1, `product identity conflict for ${slug}`);
  const result = await client.query<{ id: string }>(`INSERT INTO products (id, name, slug, brand, category, description, status)
    VALUES ($1,$2,$3,$4,$5,$6,'active') ON CONFLICT (id) DO UPDATE SET name=excluded.name, slug=excluded.slug, brand=excluded.brand, category=excluded.category, description=excluded.description, updated_at=now() RETURNING id`,
  [id, required(row, "internal_name"), slug, nullable(row.brand), nullable(row.category), nullable(row.internal_description)]);
  const saved = result.rows[0]; assert.ok(saved); return saved.id;
}

async function upsertPublication(client: PoolClient, productId: string, row: CsvRow): Promise<void> {
  const status = required(row, "publication_status");
  await client.query(`INSERT INTO product_publications (product_id, public_name, public_slug, scent_family, top_notes, heart_notes, base_notes, intensity, occasion, longevity_guidance, ingredients, usage_instructions, short_description, long_description, seo_title, seo_description, status, legal_approved_at, legal_approval_reference, content_approved_at, content_approval_reference, media_approved_at, media_approval_reference, published_at, featured_rank)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,($17::text)::publication_status,CASE WHEN $18::text IS NULL THEN NULL ELSE now() END,$18,CASE WHEN $19::text IS NULL THEN NULL ELSE now() END,$19,CASE WHEN $20::text IS NULL THEN NULL ELSE now() END,$20,CASE WHEN $17::text='published' THEN now() ELSE NULL END,$21)
    ON CONFLICT (product_id) DO UPDATE SET public_name=excluded.public_name, public_slug=excluded.public_slug, scent_family=excluded.scent_family, top_notes=excluded.top_notes, heart_notes=excluded.heart_notes, base_notes=excluded.base_notes, intensity=excluded.intensity, occasion=excluded.occasion, longevity_guidance=excluded.longevity_guidance, ingredients=excluded.ingredients, usage_instructions=excluded.usage_instructions, short_description=excluded.short_description, long_description=excluded.long_description, seo_title=excluded.seo_title, seo_description=excluded.seo_description, status=excluded.status, legal_approved_at=excluded.legal_approved_at, legal_approval_reference=excluded.legal_approval_reference, content_approved_at=excluded.content_approved_at, content_approval_reference=excluded.content_approval_reference, media_approved_at=excluded.media_approved_at, media_approval_reference=excluded.media_approval_reference, published_at=excluded.published_at, featured_rank=excluded.featured_rank, updated_at=now()`, [
      productId, required(row, "public_name"), required(row, "public_slug"), nullable(row.scent_family), notes(row.top_notes), notes(row.heart_notes), notes(row.base_notes), nullable(row.intensity), nullable(row.occasion), nullable(row.longevity_guidance), nullable(row.ingredients), nullable(row.usage_instructions), required(row, "short_description"), required(row, "long_description"), required(row, "seo_title"), required(row, "seo_description"), status, nullable(row.legal_approval_reference), nullable(row.content_approval_reference), nullable(row.media_approval_reference), row.featured_rank ? integer(row, "featured_rank", 0) : null,
    ]);
}

async function upsertVariant(client: PoolClient, productIds: Map<string, string>, row: CsvRow, manifestDigest: string): Promise<void> {
  const productId = productIds.get(required(row, "product_key")); assert.ok(productId);
  const sku = required(row, "sku"); const size = integer(row, "size_ml", 1);
  const conflict = await client.query<{ id: string; product_id: string; size_ml: number }>("SELECT id, product_id, size_ml FROM product_variants WHERE sku=$1 OR (product_id=$2 AND size_ml=$3) FOR UPDATE", [sku, productId, size]);
  assert.ok(conflict.rows.every((existing) => existing.product_id === productId && existing.size_ml === size), `SKU or size conflict for ${sku}`);
  assert.ok(conflict.rows.length <= 1, `SKU and size resolve to different variants for ${sku}`);
  const id = conflict.rows[0]?.id ?? deterministicUuid(`variant:${sku}`);
  await client.query(`INSERT INTO product_variants (id, product_id, sku, size_ml, cost_cents, retail_cents, reorder_level, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET sku=excluded.sku, size_ml=excluded.size_ml, cost_cents=excluded.cost_cents, retail_cents=excluded.retail_cents, reorder_level=excluded.reorder_level, status=excluded.status, version=product_variants.version+1, updated_at=now()`, [
      id, productId, sku, size, integer(row, "cost_amount_minor", 0), integer(row, "retail_amount_minor", 1), integer(row, "reorder_level", 0), boolean(row, "active") ? "active" : "archived",
    ]);
  await client.query(`INSERT INTO variant_prices (variant_id, currency, amount_minor, approved_at, approval_reference, active)
    VALUES ($1,'INR',$2,now(),$3,$4) ON CONFLICT (variant_id) DO UPDATE SET amount_minor=excluded.amount_minor, approved_at=excluded.approved_at, approval_reference=excluded.approval_reference, active=excluded.active, updated_at=now()`, [id, integer(row, "retail_amount_minor", 1), required(row, "price_approval_reference"), boolean(row, "active")]);
  await applyOpeningStock(client, { manifestDigest, openingStock: integer(row, "opening_stock", 0), sku, variantId: id });
}

async function applyOpeningStock(client: PoolClient, input: Readonly<{
  manifestDigest: string;
  openingStock: number;
  sku: string;
  variantId: string;
}>): Promise<void> {
  const idempotencyKey = `catalog-opening:${input.sku}`;
  const existing = await client.query<{ quantity_delta: number; variant_id: string }>(
    "SELECT variant_id, quantity_delta FROM stock_movements WHERE idempotency_key=$1 FOR UPDATE",
    [idempotencyKey],
  );
  if (existing.rows[0]) {
    assert.equal(existing.rows[0].variant_id, input.variantId, `opening stock identity changed for ${input.sku}`);
    assert.equal(existing.rows[0].quantity_delta, input.openingStock, `opening stock changed for ${input.sku}; use an audited adjustment instead`);
    return;
  }
  if (input.openingStock === 0) return;

  const variant = await client.query<{ quantity_on_hand: number; qty_reserved: number; version: number }>(
    "SELECT quantity_on_hand, qty_reserved, version FROM product_variants WHERE id=$1 FOR UPDATE",
    [input.variantId],
  );
  const locked = variant.rows[0];
  assert.ok(locked);
  assert.equal(locked.quantity_on_hand, 0, `opening stock requires a zero balance for ${input.sku}`);
  assert.equal(locked.qty_reserved, 0, `opening stock cannot run with reservations for ${input.sku}`);
  await client.query("INSERT INTO locations (code, name) VALUES ('MAIN', 'Main') ON CONFLICT (code) DO NOTHING");
  const location = await client.query<{ id: string }>("SELECT id FROM locations WHERE code='MAIN'");
  assert.ok(location.rows[0]);
  const updated = await client.query(
    "UPDATE product_variants SET quantity_on_hand=$2, version=version+1, updated_at=now() WHERE id=$1 AND version=$3",
    [input.variantId, input.openingStock, locked.version],
  );
  assert.equal(updated.rowCount, 1, `concurrent opening-stock update for ${input.sku}`);
  await client.query(`INSERT INTO stock_movements (
      variant_id, location_id, type, quantity_delta, quantity_after,
      ref_type, ref_id, note, idempotency_key
    ) VALUES ($1,$2,'receive',$3,$3,'catalog_import',$4,'Reviewed opening inventory',$5)`, [
    input.variantId,
    location.rows[0].id,
    input.openingStock,
    input.manifestDigest,
    idempotencyKey,
  ]);
}

async function upsertMedia(client: PoolClient, productIds: Map<string, string>, row: CsvRow): Promise<void> {
  const productId = productIds.get(required(row, "product_key")); assert.ok(productId);
  const position = integer(row, "position", 0);
  const id = deterministicUuid(`media:${productId}:${position}`);
  await client.query(`INSERT INTO product_media (id, product_id, kind, storage_key, alt_text, width, height, position, approved_at, approval_reference)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9) ON CONFLICT (product_id, position) DO UPDATE SET kind=excluded.kind, storage_key=excluded.storage_key, alt_text=excluded.alt_text, width=excluded.width, height=excluded.height, approved_at=excluded.approved_at, approval_reference=excluded.approval_reference, updated_at=now()`, [
      id, productId, required(row, "kind"), required(row, "storage_key"), required(row, "alt_text"), integer(row, "width", 1), integer(row, "height", 1), position, required(row, "approval_reference"),
    ]);
}

async function upsertServiceability(client: PoolClient, row: CsvRow): Promise<void> {
  await client.query(`INSERT INTO shipping_serviceability (postal_code, delhivery_enabled, india_post_enabled, delivery_min_business_days, delivery_max_business_days, active)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (postal_code) DO UPDATE SET delhivery_enabled=excluded.delhivery_enabled, india_post_enabled=excluded.india_post_enabled, delivery_min_business_days=excluded.delivery_min_business_days, delivery_max_business_days=excluded.delivery_max_business_days, active=excluded.active, updated_at=now()`, [
      required(row, "postal_code"), boolean(row, "delhivery_enabled"), boolean(row, "india_post_enabled"), integer(row, "min_business_days", 1), integer(row, "max_business_days", 1), boolean(row, "active"),
    ]);
}

const plan = await validate();
process.stdout.write(`${JSON.stringify({ mode: dryRun ? "dry-run" : "apply", digest: plan.digest, signature: plan.signature, counts: { products: plan.products.length, variants: plan.variants.length, media: plan.media.length, serviceability: plan.serviceability.length } })}\n`);
if (apply) { await applyPlan(plan); process.stdout.write("Reviewed catalog import committed\n"); }
