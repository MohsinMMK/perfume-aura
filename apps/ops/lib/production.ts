"use server";

import {
  adjustSupply,
  and,
  asc,
  assignProductSeries,
  count,
  createProductSeries,
  createSeriesProduct,
  createSupplyItem,
  db,
  desc,
  DomainError,
  eq,
  loadVariantCapacity,
  oilLots,
  products,
  productSeries,
  receiveSupply,
  seriesSizes,
  sql,
  supplyItems,
  supplyMovements,
  updateProductSeries,
  updateSupplyItem,
  upsertSeriesSize,
} from "@perfume-aura/db";
import {
  adjustSupplySchema,
  assignProductSeriesSchema,
  createSeriesProductSchema,
  createSeriesSchema,
  createSupplySchema,
  receiveSupplySchema,
  seriesSizeSchema,
  updateSeriesSchema,
  updateSupplySchema,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";
import { rupeesToPaise } from "@/lib/money";
import { hasOpsCapability } from "@/lib/ops-access";
import {
  normalizePageSize,
  pageOffset,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from "@/lib/pagination";
import { requireCapability } from "@/lib/session";
import { shortId, slugify } from "@/lib/slug";

export type SupplyKind = "bottle" | "box" | "base";

export type SupplyRow = {
  id: string;
  kind: SupplyKind;
  name: string;
  sizeMl: number | null;
  quantityOnHand: number;
  reorderLevel: number;
  status: "active" | "archived";
  version: number;
  isLow: boolean;
};

export type SupplyMovementRow = {
  id: string;
  supplyName: string;
  kind: SupplyKind;
  type: "receive" | "sale" | "adjust";
  quantityDelta: number;
  quantityAfter: number;
  totalCostCents: number | null;
  supplierName: string | null;
  refType: string | null;
  note: string | null;
  createdAt: Date;
};

export type SeriesSizeRow = {
  id: string;
  sizeMl: number;
  defaultRetailCents: number;
  bottleSupplyId: string | null;
  bottleName: string | null;
  boxSupplyId: string | null;
  boxName: string | null;
  isActive: boolean;
};

export type SeriesRow = {
  id: string;
  name: string;
  slug: string;
  oilConcentrationPercent: number;
  oilReorderLevelMl: number;
  status: "active" | "archived";
  productCount: number;
  sizes: SeriesSizeRow[];
};

export type OilAlertRow = {
  productId: string;
  productName: string;
  seriesName: string;
  availableMl: number;
  reorderLevelMl: number;
};

export type MaterialAlerts = {
  supplies: SupplyRow[];
  oil: OilAlertRow[];
};

/** A supply needs buying once its count falls to its reorder level. */
function isLowSupply(row: {
  quantityOnHand: number;
  reorderLevel: number;
  status: "active" | "archived";
}): boolean {
  return row.status === "active" && row.quantityOnHand <= row.reorderLevel;
}

function supplyRow(row: typeof supplyItems.$inferSelect): SupplyRow {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    sizeMl: row.sizeMl,
    quantityOnHand: row.quantityOnHand,
    reorderLevel: row.reorderLevel,
    status: row.status,
    version: row.version,
    isLow: isLowSupply(row),
  };
}

function revalidateProduction(extra: readonly string[] = []): void {
  for (const path of [
    "/series",
    "/stock/supplies",
    "/stock/low",
    "/stock/oil",
    "/sales/new",
    "/dashboard",
    "/products",
    ...extra,
  ]) {
    revalidatePath(path);
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function domainFailure(context: string, error: unknown) {
  if (error instanceof DomainError) return actionError(error.message);
  console.error(`[${context}]`, error);
  return actionError("Could not save. Try again.");
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listSupplies(): Promise<SupplyRow[]> {
  await requireCapability("stock.view");
  const rows = await db
    .select()
    .from(supplyItems)
    .orderBy(
      asc(supplyItems.status),
      asc(supplyItems.kind),
      asc(supplyItems.sizeMl),
      asc(supplyItems.name),
    );
  return rows.map(supplyRow);
}

export async function listSupplyMovements(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<SupplyMovementRow>> {
  const session = await requireCapability("stock.view");
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");
  const page = parsePage(opts?.page);
  const pageSize = normalizePageSize(opts?.pageSize);
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: supplyMovements.id,
        supplyName: supplyItems.name,
        kind: supplyItems.kind,
        type: supplyMovements.type,
        quantityDelta: supplyMovements.quantityDelta,
        quantityAfter: supplyMovements.quantityAfter,
        totalCostCents: canViewCost
          ? supplyMovements.totalCostCents
          : sql<number | null>`null::int`,
        supplierName: supplyMovements.supplierName,
        refType: supplyMovements.refType,
        note: supplyMovements.note,
        createdAt: supplyMovements.createdAt,
      })
      .from(supplyMovements)
      .innerJoin(supplyItems, eq(supplyItems.id, supplyMovements.supplyId))
      .orderBy(desc(supplyMovements.createdAt), desc(supplyMovements.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ total: count(supplyMovements.id) }).from(supplyMovements),
  ]);
  return paginatedResult(rows, Number(totals[0]?.total ?? 0), page, pageSize);
}

export async function listSeries(): Promise<SeriesRow[]> {
  await requireCapability("catalog.view");
  const [seriesRows, sizeRows, supplies, productCounts] = await Promise.all([
    db
      .select()
      .from(productSeries)
      .orderBy(asc(productSeries.status), asc(productSeries.position), asc(productSeries.name)),
    db.select().from(seriesSizes).orderBy(asc(seriesSizes.sizeMl)),
    db
      .select({ id: supplyItems.id, name: supplyItems.name })
      .from(supplyItems),
    db
      .select({ seriesId: products.seriesId, total: count(products.id) })
      .from(products)
      .where(eq(products.status, "active"))
      .groupBy(products.seriesId),
  ]);
  const supplyNames = new Map(supplies.map((supply) => [supply.id, supply.name]));
  const countBySeries = new Map(
    productCounts.map((row) => [row.seriesId, Number(row.total)]),
  );
  return seriesRows.map((series) => ({
    id: series.id,
    name: series.name,
    slug: series.slug,
    oilConcentrationPercent: series.oilConcentrationPercent,
    oilReorderLevelMl: series.oilReorderLevelMl,
    status: series.status,
    productCount: countBySeries.get(series.id) ?? 0,
    sizes: sizeRows
      .filter((size) => size.seriesId === series.id)
      .map((size) => ({
        id: size.id,
        sizeMl: size.sizeMl,
        defaultRetailCents: size.defaultRetailCents,
        bottleSupplyId: size.bottleSupplyId,
        bottleName: size.bottleSupplyId
          ? (supplyNames.get(size.bottleSupplyId) ?? null)
          : null,
        boxSupplyId: size.boxSupplyId,
        boxName: size.boxSupplyId ? (supplyNames.get(size.boxSupplyId) ?? null) : null,
        isActive: size.isActive,
      })),
  }));
}

/** Low supplies, and series products whose unreserved oil is at its reorder level. */
export async function listMaterialAlerts(): Promise<MaterialAlerts> {
  await requireCapability("stock.view");
  const [supplies, seriesProducts, oil] = await Promise.all([
    db
      .select()
      .from(supplyItems)
      .where(
        and(
          eq(supplyItems.status, "active"),
          sql`${supplyItems.quantityOnHand} <= ${supplyItems.reorderLevel}`,
        ),
      )
      .orderBy(asc(supplyItems.kind), asc(supplyItems.sizeMl), asc(supplyItems.name)),
    db
      .select({
        productId: products.id,
        productName: products.name,
        seriesName: productSeries.name,
        reorderLevelMl: productSeries.oilReorderLevelMl,
      })
      .from(products)
      .innerJoin(productSeries, eq(productSeries.id, products.seriesId))
      .where(and(eq(products.status, "active"), eq(productSeries.status, "active")))
      .orderBy(asc(products.name)),
    db
      .select({
        productId: oilLots.productId,
        availableMl: sql<number>`coalesce(sum(${oilLots.remainingQuantityMl} - ${oilLots.reservedQuantityMl}), 0)::int`,
      })
      .from(oilLots)
      .groupBy(oilLots.productId),
  ]);
  const oilByProduct = new Map(oil.map((row) => [row.productId, Number(row.availableMl)]));
  return {
    supplies: supplies.map(supplyRow),
    oil: seriesProducts
      .map((row) => ({ ...row, availableMl: oilByProduct.get(row.productId) ?? 0 }))
      .filter((row) => row.availableMl <= row.reorderLevelMl),
  };
}

/** Active series with their active sizes, for creating a product. */
export async function listSeriesForProductCreate(): Promise<
  {
    id: string;
    name: string;
    oilConcentrationPercent: number;
    sizes: { sizeMl: number; defaultRetailCents: number }[];
  }[]
> {
  await requireCapability("catalog.manage-commercials");
  const [seriesRows, sizeRows] = await Promise.all([
    db
      .select()
      .from(productSeries)
      .where(eq(productSeries.status, "active"))
      .orderBy(asc(productSeries.position), asc(productSeries.name)),
    db
      .select()
      .from(seriesSizes)
      .where(eq(seriesSizes.isActive, true))
      .orderBy(asc(seriesSizes.sizeMl)),
  ]);
  return seriesRows.map((series) => ({
    id: series.id,
    name: series.name,
    oilConcentrationPercent: series.oilConcentrationPercent,
    sizes: sizeRows
      .filter((size) => size.seriesId === series.id)
      .map((size) => ({ sizeMl: size.sizeMl, defaultRetailCents: size.defaultRetailCents })),
  }));
}

export async function listActiveSeriesOptions(): Promise<{ id: string; name: string }[]> {
  await requireCapability("catalog.view");
  return db
    .select({ id: productSeries.id, name: productSeries.name })
    .from(productSeries)
    .where(eq(productSeries.status, "active"))
    .orderBy(asc(productSeries.position), asc(productSeries.name));
}

/** Oil and base per bottle, and how many more each variant can make now. */
export type VariantCapacityRow = {
  seriesName: string | null;
  concentrationPercent: number | null;
  oilMlPerBottle: number | null;
  baseMlPerBottle: number | null;
  canMake: number;
  limitedBy: "oil" | "base" | "bottle" | "box" | null;
  blocker: string | null;
};

const variantIdsSchema = z.array(z.string().uuid()).max(200);

export async function listVariantCapacity(
  variantIds: readonly string[],
): Promise<Record<string, VariantCapacityRow>> {
  await requireCapability("catalog.view");
  const ids = variantIdsSchema.parse(variantIds);
  const capacity = await loadVariantCapacity(ids);
  return Object.fromEntries(
    [...capacity].map(([variantId, row]) => [
      variantId,
      {
        seriesName: row.seriesName,
        concentrationPercent: row.concentrationPercent,
        oilMlPerBottle: row.recipe?.oilMl ?? null,
        baseMlPerBottle: row.recipe?.baseMl ?? null,
        canMake: row.canMake,
        limitedBy: row.limitedBy,
        blocker: row.blocker,
      },
    ]),
  );
}

// ── Series ──────────────────────────────────────────────────────────────────

export async function createSeriesAction(
  raw: unknown,
): Promise<ActionResult<{ seriesId: string }>> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = createSeriesSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  try {
    const created = await createProductSeries(parsed.data);
    revalidateProduction();
    return actionOk(created);
  } catch (error) {
    if (error instanceof DomainError && error.code === "SLUG_CONFLICT") {
      return actionError(error.message, { slug: ["This slug is already used"] });
    }
    return domainFailure("createSeries", error);
  }
}

export async function updateSeriesAction(raw: unknown): Promise<ActionResult> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = updateSeriesSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  try {
    await updateProductSeries(parsed.data);
    revalidateProduction();
    return actionOk();
  } catch (error) {
    return domainFailure("updateSeries", error);
  }
}

export async function saveSeriesSizeAction(raw: unknown): Promise<ActionResult> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = seriesSizeSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  try {
    await upsertSeriesSize({
      seriesId: data.seriesId,
      sizeMl: data.sizeMl,
      defaultRetailCents: rupeesToPaise(data.defaultRetail),
      bottleSupplyId: data.bottleSupplyId || null,
      boxSupplyId: data.boxSupplyId || null,
      isActive: data.isActive,
    });
    revalidateProduction();
    return actionOk();
  } catch (error) {
    return domainFailure("saveSeriesSize", error);
  }
}

// ── Products in a series ────────────────────────────────────────────────────

export async function createSeriesProductAction(
  raw: unknown,
): Promise<ActionResult<{ productId: string }>> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = createSeriesProductSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  try {
    const base = slugify(data.name);
    const [taken] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, base))
      .limit(1);
    const created = await createSeriesProduct({
      name: data.name.trim(),
      slug: taken ? `${base}-${shortId(6)}` : base,
      brand: emptyToNull(data.brand),
      category: emptyToNull(data.category),
      description: emptyToNull(data.description),
      seriesId: data.seriesId,
      variants: data.variants.map((variant) => ({
        sizeMl: variant.sizeMl,
        sku: variant.sku.trim(),
        retailCents: rupeesToPaise(variant.retail),
        costCents: rupeesToPaise(variant.cost),
        reorderLevel: 0,
      })),
    });
    revalidateProduction([`/products/${created.productId}`]);
    return actionOk({ productId: created.productId });
  } catch (error) {
    if (error instanceof DomainError && error.code === "SKU_CONFLICT") {
      return actionError(error.message);
    }
    return domainFailure("createSeriesProduct", error);
  }
}

export async function assignProductSeriesAction(raw: unknown): Promise<ActionResult> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = assignProductSeriesSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  try {
    await assignProductSeries({
      productId: parsed.data.productId,
      seriesId: parsed.data.seriesId || null,
    });
    revalidateProduction([`/products/${parsed.data.productId}`]);
    return actionOk();
  } catch (error) {
    return domainFailure("assignProductSeries", error);
  }
}

// ── Supplies ────────────────────────────────────────────────────────────────

export async function createSupplyAction(
  raw: unknown,
): Promise<ActionResult<{ supplyId: string }>> {
  try {
    await requireCapability("stock.adjust");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = createSupplySchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  try {
    const created = await createSupplyItem({
      kind: data.kind,
      name: data.name,
      sizeMl: data.kind === "base" ? null : (data.sizeMl ?? null),
      reorderLevel: data.reorderLevel,
    });
    revalidateProduction();
    return actionOk(created);
  } catch (error) {
    return domainFailure("createSupply", error);
  }
}

export async function updateSupplyAction(raw: unknown): Promise<ActionResult> {
  try {
    await requireCapability("stock.adjust");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = updateSupplySchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  try {
    await updateSupplyItem({ ...data, sizeMl: data.sizeMl ?? null });
    revalidateProduction();
    return actionOk();
  } catch (error) {
    return domainFailure("updateSupply", error);
  }
}

export async function receiveSupplyAction(
  raw: unknown,
): Promise<ActionResult<{ quantityAfter: number }>> {
  let session;
  try {
    session = await requireCapability("stock.receive");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = receiveSupplySchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");
  if (data.totalCost !== undefined && !canViewCost) {
    return actionError("Only an owner can record purchase costs");
  }
  try {
    const result = await receiveSupply({
      supplyId: data.supplyId,
      quantity: data.quantity,
      totalCostCents:
        canViewCost && data.totalCost !== undefined
          ? rupeesToPaise(data.totalCost)
          : null,
      supplierName: emptyToNull(data.supplierName),
      note: emptyToNull(data.note),
      userId: session.user.id,
      idempotencyKey: data.idempotencyKey,
    });
    revalidateProduction(["/reports"]);
    return actionOk({ quantityAfter: result.quantityAfter });
  } catch (error) {
    return domainFailure("receiveSupply", error);
  }
}

export async function adjustSupplyAction(
  raw: unknown,
): Promise<ActionResult<{ quantityAfter: number }>> {
  let session;
  try {
    session = await requireCapability("stock.adjust");
  } catch {
    return actionError("You must be signed in");
  }
  const parsed = adjustSupplySchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  try {
    const result = await adjustSupply({
      supplyId: data.supplyId,
      quantityDelta: data.quantityDelta,
      note: data.note,
      userId: session.user.id,
      idempotencyKey: data.idempotencyKey,
    });
    revalidateProduction();
    return actionOk({ quantityAfter: result.quantityAfter });
  } catch (error) {
    return domainFailure("adjustSupply", error);
  }
}
