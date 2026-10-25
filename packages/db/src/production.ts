import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import { db } from "./client";
import { DomainError } from "./domain-errors";
import { applyMovementInTransaction } from "./inventory";
import { availableQuantity } from "./inventory-math";
import { consumeOilInTransaction } from "./oil-inventory";
import {
  bottlesCanMake,
  recipeForBottles,
  type BottleRecipe,
  type CanMakeResult,
} from "./production-math";
import { mapProductConstraint } from "./product-workflows";
import {
  oilLots,
  products,
  productSeries,
  productVariants,
  seriesSizes,
  supplyItems,
  supplyMovements,
} from "./schema";
import {
  isUniqueViolation,
  postgresConstraint,
  runDomainTransaction,
  type DbTransaction,
} from "./transactions";

export type SupplyKind = (typeof supplyItems.$inferSelect)["kind"];

const SUPPLY_LABEL: Record<SupplyKind, string> = {
  bottle: "bottles",
  box: "boxes",
  base: "base mixture",
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function assertPositiveInt(value: number, message: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError("INVALID_INPUT", message);
  }
}

function assertNonNegativeInt(value: number, message: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainError("INVALID_INPUT", message);
  }
}

function assertConcentration(percent: number): void {
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    throw new DomainError(
      "INVALID_INPUT",
      "Oil share must be a whole percent from 1 to 100",
    );
  }
}

// ── Series ──────────────────────────────────────────────────────────────────

export type ProductSeriesInput = {
  name: string;
  oilConcentrationPercent: number;
  oilReorderLevelMl: number;
};

function validateSeries(input: ProductSeriesInput): string {
  const name = input.name.trim();
  if (!name) throw new DomainError("INVALID_INPUT", "Series name is required");
  assertConcentration(input.oilConcentrationPercent);
  assertNonNegativeInt(
    input.oilReorderLevelMl,
    "Oil reorder level must be a whole number of ml",
  );
  return name;
}

export async function createProductSeries(
  input: ProductSeriesInput & { slug: string },
): Promise<{ seriesId: string }> {
  const name = validateSeries(input);
  const slug = input.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new DomainError(
      "INVALID_INPUT",
      "Use lowercase letters, numbers and dashes for the slug",
    );
  }
  try {
    return await runDomainTransaction(async (tx) => {
      const [last] = await tx
        .select({ position: max(productSeries.position) })
        .from(productSeries);
      const [created] = await tx
        .insert(productSeries)
        .values({
          name,
          slug,
          oilConcentrationPercent: input.oilConcentrationPercent,
          oilReorderLevelMl: input.oilReorderLevelMl,
          position: (last?.position ?? -1) + 1,
        })
        .returning({ id: productSeries.id });
      if (!created) throw new DomainError("CONFLICT", "Failed to create series");
      return { seriesId: created.id };
    });
  } catch (error) {
    if (
      isUniqueViolation(error) &&
      postgresConstraint(error) === "product_series_slug_unique"
    ) {
      throw new DomainError("SLUG_CONFLICT", "A series with this slug already exists", {
        cause: error,
      });
    }
    throw error;
  }
}

/** The slug is the storefront collection key, so it never changes here. */
export async function updateProductSeries(
  input: ProductSeriesInput & {
    seriesId: string;
    status: "active" | "archived";
  },
): Promise<void> {
  const name = validateSeries(input);
  await runDomainTransaction(async (tx) => {
    const [updated] = await tx
      .update(productSeries)
      .set({
        name,
        oilConcentrationPercent: input.oilConcentrationPercent,
        oilReorderLevelMl: input.oilReorderLevelMl,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(productSeries.id, input.seriesId))
      .returning({ id: productSeries.id });
    if (!updated) throw new DomainError("NOT_FOUND", "Series not found");
  });
}

async function assertPackaging(
  tx: DbTransaction,
  supplyId: string | null,
  kind: "bottle" | "box",
): Promise<void> {
  if (!supplyId) return;
  const [supply] = await tx
    .select({ kind: supplyItems.kind, status: supplyItems.status })
    .from(supplyItems)
    .where(eq(supplyItems.id, supplyId))
    .limit(1);
  if (!supply || supply.kind !== kind || supply.status !== "active") {
    throw new DomainError(
      "INVALID_INPUT",
      kind === "bottle" ? "Pick an active bottle" : "Pick an active box",
    );
  }
}

export type SeriesSizeInput = {
  seriesId: string;
  sizeMl: number;
  defaultRetailCents: number;
  bottleSupplyId: string | null;
  boxSupplyId: string | null;
  isActive: boolean;
};

/** Adds a size to a series, or updates it when the series already has it. */
export async function upsertSeriesSize(
  input: SeriesSizeInput,
): Promise<{ seriesSizeId: string }> {
  assertPositiveInt(input.sizeMl, "Size must be a whole number of ml");
  assertNonNegativeInt(input.defaultRetailCents, "Price must not be negative");
  return runDomainTransaction(async (tx) => {
    const [series] = await tx
      .select({ id: productSeries.id })
      .from(productSeries)
      .where(eq(productSeries.id, input.seriesId))
      .limit(1);
    if (!series) throw new DomainError("NOT_FOUND", "Series not found");
    await assertPackaging(tx, input.bottleSupplyId, "bottle");
    await assertPackaging(tx, input.boxSupplyId, "box");

    const [last] = await tx
      .select({ position: max(seriesSizes.position) })
      .from(seriesSizes)
      .where(eq(seriesSizes.seriesId, input.seriesId));
    const [row] = await tx
      .insert(seriesSizes)
      .values({
        seriesId: input.seriesId,
        sizeMl: input.sizeMl,
        defaultRetailCents: input.defaultRetailCents,
        bottleSupplyId: input.bottleSupplyId,
        boxSupplyId: input.boxSupplyId,
        isActive: input.isActive,
        position: (last?.position ?? -1) + 1,
      })
      .onConflictDoUpdate({
        target: [seriesSizes.seriesId, seriesSizes.sizeMl],
        set: {
          defaultRetailCents: input.defaultRetailCents,
          bottleSupplyId: input.bottleSupplyId,
          boxSupplyId: input.boxSupplyId,
          isActive: input.isActive,
          updatedAt: new Date(),
        },
      })
      .returning({ id: seriesSizes.id });
    if (!row) throw new DomainError("CONFLICT", "Failed to save the size");
    return { seriesSizeId: row.id };
  });
}

export type SeriesProductVariantInput = {
  sizeMl: number;
  sku: string;
  retailCents: number;
  costCents: number;
  reorderLevel: number;
};

export type CreateSeriesProductInput = {
  name: string;
  slug: string;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  seriesId: string;
  variants: readonly SeriesProductVariantInput[];
};

/** A product in a series and one variant per chosen size commit together. */
export async function createSeriesProduct(
  input: CreateSeriesProductInput,
): Promise<{ productId: string; variantIds: string[] }> {
  if (input.variants.length === 0) {
    throw new DomainError("INVALID_INPUT", "Pick at least one size");
  }
  const sizes = new Set(input.variants.map((variant) => variant.sizeMl));
  if (sizes.size !== input.variants.length) {
    throw new DomainError("INVALID_INPUT", "Each size can be added once");
  }
  try {
    return await runDomainTransaction(async (tx) => {
      const [series] = await tx
        .select({ id: productSeries.id, status: productSeries.status })
        .from(productSeries)
        .where(eq(productSeries.id, input.seriesId))
        .limit(1);
      if (!series || series.status !== "active") {
        throw new DomainError("INVALID_STATE", "Pick an active series");
      }
      const [product] = await tx
        .insert(products)
        .values({
          name: input.name,
          slug: input.slug,
          brand: input.brand ?? null,
          category: input.category ?? null,
          description: input.description ?? null,
          seriesId: input.seriesId,
          status: "active",
        })
        .returning({ id: products.id });
      if (!product) throw new DomainError("CONFLICT", "Failed to create product");

      const variantIds: string[] = [];
      for (const variant of input.variants) {
        const [created] = await tx
          .insert(productVariants)
          .values({
            productId: product.id,
            sku: variant.sku,
            sizeMl: variant.sizeMl,
            costCents: variant.costCents,
            retailCents: variant.retailCents,
            reorderLevel: variant.reorderLevel,
            status: "active",
          })
          .returning({ id: productVariants.id });
        if (!created) throw new DomainError("CONFLICT", "Failed to create a size");
        variantIds.push(created.id);
      }
      return { productId: product.id, variantIds };
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    mapProductConstraint(error);
  }
}

/** Moves a product into a series, or out of every series with null. */
export async function assignProductSeries(input: {
  productId: string;
  seriesId: string | null;
}): Promise<void> {
  await runDomainTransaction(async (tx) => {
    if (input.seriesId) {
      const [series] = await tx
        .select({ status: productSeries.status })
        .from(productSeries)
        .where(eq(productSeries.id, input.seriesId))
        .limit(1);
      if (!series || series.status !== "active") {
        throw new DomainError("INVALID_STATE", "Pick an active series");
      }
    }
    const [updated] = await tx
      .update(products)
      .set({ seriesId: input.seriesId, updatedAt: new Date() })
      .where(eq(products.id, input.productId))
      .returning({ id: products.id });
    if (!updated) throw new DomainError("NOT_FOUND", "Product not found");
  });
}

// ── Supplies ────────────────────────────────────────────────────────────────

export type SupplyItemInput = {
  name: string;
  sizeMl: number | null;
  reorderLevel: number;
};

function validateSupply(kind: SupplyKind, input: SupplyItemInput): string {
  const name = input.name.trim();
  if (!name) throw new DomainError("INVALID_INPUT", "Name is required");
  assertNonNegativeInt(input.reorderLevel, "Reorder level must not be negative");
  if (kind === "base" && input.sizeMl !== null) {
    throw new DomainError("INVALID_INPUT", "The base mixture has no size");
  }
  if (input.sizeMl !== null) {
    assertPositiveInt(input.sizeMl, "Size must be a whole number of ml");
  }
  return name;
}

function mapSupplyConstraint(error: unknown): never {
  if (isUniqueViolation(error)) {
    const constraint = postgresConstraint(error);
    if (constraint === "supply_items_kind_name_unique") {
      throw new DomainError("CONFLICT", "A supply with this name already exists", {
        cause: error,
      });
    }
    if (constraint === "supply_items_one_active_base_unique") {
      throw new DomainError(
        "CONFLICT",
        "Only one base mixture can be active. Archive the current one first.",
        { cause: error },
      );
    }
  }
  throw error;
}

export async function createSupplyItem(
  input: SupplyItemInput & { kind: SupplyKind },
): Promise<{ supplyId: string }> {
  const name = validateSupply(input.kind, input);
  try {
    return await runDomainTransaction(async (tx) => {
      const [created] = await tx
        .insert(supplyItems)
        .values({
          kind: input.kind,
          name,
          sizeMl: input.sizeMl,
          reorderLevel: input.reorderLevel,
        })
        .returning({ id: supplyItems.id });
      if (!created) throw new DomainError("CONFLICT", "Failed to add the supply");
      return { supplyId: created.id };
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    mapSupplyConstraint(error);
  }
}

export async function updateSupplyItem(
  input: SupplyItemInput & {
    supplyId: string;
    expectedVersion: number;
    status: "active" | "archived";
  },
): Promise<void> {
  try {
    await runDomainTransaction(async (tx) => {
      const [supply] = await tx
        .select({ kind: supplyItems.kind, version: supplyItems.version })
        .from(supplyItems)
        .where(eq(supplyItems.id, input.supplyId))
        .for("update")
        .limit(1);
      if (!supply) throw new DomainError("NOT_FOUND", "Supply not found");
      if (supply.version !== input.expectedVersion) {
        throw new DomainError(
          "STALE_WRITE",
          "This supply changed after you opened it. Reload and try again.",
        );
      }
      const name = validateSupply(supply.kind, input);
      await tx
        .update(supplyItems)
        .set({
          name,
          sizeMl: input.sizeMl,
          reorderLevel: input.reorderLevel,
          status: input.status,
          version: supply.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(supplyItems.id, input.supplyId));
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    mapSupplyConstraint(error);
  }
}

export type SupplyMovementResult = {
  movementId: string;
  quantityAfter: number;
  idempotent: boolean;
};

async function recordSupplyMovement(input: {
  supplyId: string;
  type: "receive" | "adjust";
  quantityDelta: number;
  totalCostCents?: number | null;
  supplierName?: string | null;
  note?: string | null;
  userId?: string | null;
  idempotencyKey: string;
}): Promise<SupplyMovementResult> {
  if (!input.idempotencyKey.trim()) {
    throw new DomainError("INVALID_INPUT", "Idempotency key is required");
  }
  return runDomainTransaction(async (tx) => {
    const [supply] = await tx
      .select()
      .from(supplyItems)
      .where(eq(supplyItems.id, input.supplyId))
      .for("update")
      .limit(1);
    if (!supply) throw new DomainError("NOT_FOUND", "Supply not found");

    const [existing] = await tx
      .select()
      .from(supplyMovements)
      .where(eq(supplyMovements.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      if (
        existing.supplyId !== input.supplyId ||
        existing.type !== input.type ||
        existing.quantityDelta !== input.quantityDelta
      ) {
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "This request was already used for a different supply change",
        );
      }
      return {
        movementId: existing.id,
        quantityAfter: existing.quantityAfter,
        idempotent: true,
      };
    }

    if (supply.status !== "active") {
      throw new DomainError("INVALID_STATE", "Reactivate this supply first");
    }
    const quantityAfter = supply.quantityOnHand + input.quantityDelta;
    if (quantityAfter < 0) {
      throw new DomainError(
        "INSUFFICIENT_SUPPLIES",
        `Only ${supply.quantityOnHand} on hand; the change would go below zero`,
      );
    }

    const [movement] = await tx
      .insert(supplyMovements)
      .values({
        supplyId: input.supplyId,
        type: input.type,
        quantityDelta: input.quantityDelta,
        quantityAfter,
        totalCostCents: input.totalCostCents ?? null,
        supplierName: emptyToNull(input.supplierName),
        note: emptyToNull(input.note),
        idempotencyKey: input.idempotencyKey,
        createdBy: input.userId ?? null,
      })
      .returning({ id: supplyMovements.id });
    if (!movement) throw new DomainError("CONFLICT", "Failed to record the change");

    await tx
      .update(supplyItems)
      .set({
        quantityOnHand: quantityAfter,
        version: supply.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(supplyItems.id, input.supplyId));
    return { movementId: movement.id, quantityAfter, idempotent: false };
  });
}

/** Records a purchase: pieces for bottles and boxes, ml for the base. */
export async function receiveSupply(input: {
  supplyId: string;
  quantity: number;
  totalCostCents?: number | null;
  supplierName?: string | null;
  note?: string | null;
  userId?: string | null;
  idempotencyKey: string;
}): Promise<SupplyMovementResult> {
  assertPositiveInt(input.quantity, "Quantity must be a positive whole number");
  if (input.totalCostCents != null) {
    assertNonNegativeInt(input.totalCostCents, "Cost must not be negative");
  }
  return recordSupplyMovement({ ...input, type: "receive", quantityDelta: input.quantity });
}

/** A counted correction (breakage, recount). A note is required. */
export async function adjustSupply(input: {
  supplyId: string;
  quantityDelta: number;
  note: string;
  userId?: string | null;
  idempotencyKey: string;
}): Promise<SupplyMovementResult> {
  if (!Number.isInteger(input.quantityDelta) || input.quantityDelta === 0) {
    throw new DomainError("INVALID_INPUT", "Enter a non-zero whole number");
  }
  if (!input.note.trim()) {
    throw new DomainError("INVALID_INPUT", "Say why the count changed");
  }
  return recordSupplyMovement({ ...input, type: "adjust" });
}

// ── Making bottles at sale ──────────────────────────────────────────────────

export type MakeBottlesLine = {
  /** The invoice line the bottles are made for. */
  lineId: string;
  variantId: string;
  quantity: number;
};

export type MakeBottlesInput = {
  lines: readonly MakeBottlesLine[];
  refType: "invoice";
  refId: string;
  userId?: string | null;
};

export type MakeBottlesResult = {
  filledBottles: number;
  oilConsumedMl: number;
  baseConsumedMl: number;
};

type FillPlan = {
  line: MakeBottlesLine;
  productId: string;
  label: string;
  quantity: number;
  oilMl: number;
  baseMl: number;
  bottleSupplyId: string;
  boxSupplyId: string | null;
};

/**
 * Makes the bottles finished stock cannot cover, just before they are sold:
 * oil at the series share, the shared base for the rest of the bottle, plus
 * the size's bottle and box. The made bottles enter finished stock as a
 * receive (ref_type `fill`), so the sale movement that follows stays the one
 * record of what left the shop.
 *
 * The caller holds product locks, then variant locks, both in id order.
 * Supply rows are locked next in id order, then oil lots.
 */
export async function makeBottlesInTransaction(
  tx: DbTransaction,
  input: MakeBottlesInput,
): Promise<MakeBottlesResult> {
  const result: MakeBottlesResult = {
    filledBottles: 0,
    oilConsumedMl: 0,
    baseConsumedMl: 0,
  };
  if (input.lines.length === 0) return result;

  const variantIds = [...new Set(input.lines.map((line) => line.variantId))].sort();
  const variants = await tx
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      sizeMl: productVariants.sizeMl,
      status: productVariants.status,
      quantityOnHand: productVariants.quantityOnHand,
      qtyReserved: productVariants.qtyReserved,
      productName: products.name,
      productStatus: products.status,
      seriesId: products.seriesId,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(productVariants.id, variantIds));
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  // Finished stock is used first; a variant on several lines shares it.
  const finishedLeft = new Map(
    variants.map((variant) => [
      variant.id,
      availableQuantity(variant.quantityOnHand, variant.qtyReserved),
    ]),
  );
  const shortfalls: Array<{ line: MakeBottlesLine; quantity: number }> = [];
  for (const line of input.lines) {
    const variant = variantsById.get(line.variantId);
    if (!variant) {
      throw new DomainError("NOT_FOUND", "One or more products were not found");
    }
    const finished = finishedLeft.get(variant.id) ?? 0;
    const fromStock = Math.min(finished, line.quantity);
    finishedLeft.set(variant.id, finished - fromStock);
    if (line.quantity > fromStock) {
      shortfalls.push({ line, quantity: line.quantity - fromStock });
    }
  }
  if (shortfalls.length === 0) return result;

  const seriesIds = [
    ...new Set(
      shortfalls.flatMap(({ line }) => {
        const seriesId = variantsById.get(line.variantId)?.seriesId;
        return seriesId ? [seriesId] : [];
      }),
    ),
  ];
  const seriesRows = seriesIds.length
    ? await tx
        .select({
          id: productSeries.id,
          name: productSeries.name,
          status: productSeries.status,
          oilConcentrationPercent: productSeries.oilConcentrationPercent,
        })
        .from(productSeries)
        .where(inArray(productSeries.id, seriesIds))
    : [];
  const seriesById = new Map(seriesRows.map((series) => [series.id, series]));
  const sizeRows = seriesIds.length
    ? await tx
        .select()
        .from(seriesSizes)
        .where(inArray(seriesSizes.seriesId, seriesIds))
    : [];

  const plans: FillPlan[] = [];
  for (const { line, quantity } of shortfalls) {
    const variant = variantsById.get(line.variantId);
    if (!variant) {
      throw new DomainError("NOT_FOUND", "One or more products were not found");
    }
    const label = `${variant.productName} ${variant.sizeMl} ml`;
    if (variant.productStatus !== "active" || variant.status !== "active") {
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        `${label} is archived, so only bottles already in stock can be sold`,
      );
    }
    const series = variant.seriesId ? seriesById.get(variant.seriesId) : undefined;
    if (!series) {
      // Without a series there is no recipe, so only finished stock sells.
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        `Not enough ${label} in stock. Put ${variant.productName} in a series to make more bottles at sale.`,
      );
    }
    if (series.status !== "active") {
      throw new DomainError("INVALID_STATE", `The ${series.name} series is archived`);
    }
    const size = sizeRows.find(
      (row) => row.seriesId === series.id && row.sizeMl === variant.sizeMl,
    );
    if (!size || !size.isActive) {
      throw new DomainError(
        "INVALID_STATE",
        `${series.name} is not made in ${variant.sizeMl} ml. Add the size under Series.`,
      );
    }
    if (!size.bottleSupplyId) {
      throw new DomainError(
        "INVALID_STATE",
        `Choose the bottle for ${series.name} ${variant.sizeMl} ml under Series`,
      );
    }
    const recipe = recipeForBottles(
      variant.sizeMl,
      quantity,
      series.oilConcentrationPercent,
    );
    plans.push({
      line,
      productId: variant.productId,
      label,
      quantity,
      oilMl: recipe.oilMl,
      baseMl: recipe.baseMl,
      bottleSupplyId: size.bottleSupplyId,
      boxSupplyId: size.boxSupplyId,
    });
  }

  const totalBaseMl = plans.reduce((total, plan) => total + plan.baseMl, 0);
  let baseSupplyId: string | null = null;
  if (totalBaseMl > 0) {
    const [base] = await tx
      .select({ id: supplyItems.id })
      .from(supplyItems)
      .where(and(eq(supplyItems.kind, "base"), eq(supplyItems.status, "active")))
      .limit(1);
    if (!base) {
      throw new DomainError(
        "INVALID_STATE",
        "Add the base mixture under Supplies before making bottles",
      );
    }
    baseSupplyId = base.id;
  }

  // Each plan's draw on each supply row.
  const draws: Array<{ plan: FillPlan; supplyId: string; quantity: number }> = [];
  for (const plan of plans) {
    if (baseSupplyId && plan.baseMl > 0) {
      draws.push({ plan, supplyId: baseSupplyId, quantity: plan.baseMl });
    }
    draws.push({ plan, supplyId: plan.bottleSupplyId, quantity: plan.quantity });
    if (plan.boxSupplyId) {
      draws.push({ plan, supplyId: plan.boxSupplyId, quantity: plan.quantity });
    }
  }
  const needBySupply = new Map<string, number>();
  for (const draw of draws) {
    needBySupply.set(draw.supplyId, (needBySupply.get(draw.supplyId) ?? 0) + draw.quantity);
  }

  const supplyIds = [...needBySupply.keys()].sort();
  const lockedSupplies = await tx
    .select()
    .from(supplyItems)
    .where(inArray(supplyItems.id, supplyIds))
    .orderBy(asc(supplyItems.id))
    .for("update");
  const suppliesById = new Map(lockedSupplies.map((supply) => [supply.id, supply]));
  for (const supplyId of supplyIds) {
    const supply = suppliesById.get(supplyId);
    const need = needBySupply.get(supplyId) ?? 0;
    if (!supply || supply.status !== "active") {
      throw new DomainError(
        "INVALID_STATE",
        `${supply?.name ?? "A linked supply"} is archived. Link an active one under Series.`,
      );
    }
    if (supply.quantityOnHand < need) {
      const unit = supply.kind === "base" ? " ml" : "";
      throw new DomainError(
        "INSUFFICIENT_SUPPLIES",
        `Not enough ${supply.name} (${SUPPLY_LABEL[supply.kind]}): have ${supply.quantityOnHand}${unit}, need ${need}${unit}`,
      );
    }
  }

  // Oil first: it raises the clearest shortage before any supply is written.
  for (const plan of plans) {
    const oil = await consumeOilInTransaction(tx, {
      demands: [{ productId: plan.productId, oilMl: plan.oilMl }],
      refType: input.refType,
      refId: input.refId,
      userId: input.userId ?? null,
      idempotencyPrefix: `oil:${input.refType}:${input.refId}:${plan.line.lineId}`,
    });
    result.oilConsumedMl += oil.consumedMl;
  }

  const onHand = new Map(
    lockedSupplies.map((supply) => [supply.id, supply.quantityOnHand]),
  );
  for (const draw of draws) {
    const after = (onHand.get(draw.supplyId) ?? 0) - draw.quantity;
    onHand.set(draw.supplyId, after);
    await tx.insert(supplyMovements).values({
      supplyId: draw.supplyId,
      type: "sale",
      quantityDelta: -draw.quantity,
      quantityAfter: after,
      refType: input.refType,
      refId: input.refId,
      note: `Made ${draw.plan.quantity} × ${draw.plan.label}`,
      idempotencyKey: `supply:${input.refType}:${input.refId}:${draw.plan.line.lineId}:${draw.supplyId}`,
      createdBy: input.userId ?? null,
    });
  }
  for (const supply of lockedSupplies) {
    const updated = await tx
      .update(supplyItems)
      .set({
        quantityOnHand: onHand.get(supply.id) ?? supply.quantityOnHand,
        version: supply.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(supplyItems.id, supply.id), eq(supplyItems.version, supply.version)))
      .returning({ id: supplyItems.id });
    if (updated.length !== 1) {
      throw new DomainError("CONFLICT", "Supplies changed during the sale. Try again.");
    }
  }

  for (const plan of plans) {
    await applyMovementInTransaction(tx, {
      variantId: plan.line.variantId,
      type: "receive",
      quantity: plan.quantity,
      note: `Made at sale`,
      userId: input.userId ?? undefined,
      refType: "fill",
      refId: input.refId,
      idempotencyKey: `fill:${input.refType}:${input.refId}:${plan.line.lineId}`,
    });
    result.filledBottles += plan.quantity;
    result.baseConsumedMl += plan.baseMl;
  }
  return result;
}

// ── What the shelf can still make ───────────────────────────────────────────

export type VariantCapacity = {
  seriesName: string | null;
  /** Oil share of each bottle the series makes, in percent. */
  concentrationPercent: number | null;
  /** Oil and base one bottle uses, when the variant can be made. */
  recipe: BottleRecipe | null;
  /** Bottles the materials on hand make, ignoring other sizes' demand. */
  canMake: number;
  limitedBy: CanMakeResult["limitedBy"] | null;
  /** Why none can be made at all, as a fix staff can act on. */
  blocker: string | null;
};

/**
 * How many more bottles of each variant the oil, base and packaging on hand
 * could make. Each figure assumes the materials go to that variant alone, so
 * sizes that share a bottle or the base compete for the same stock.
 */
export async function loadVariantCapacity(
  variantIds: readonly string[],
): Promise<Map<string, VariantCapacity>> {
  const capacity = new Map<string, VariantCapacity>();
  if (variantIds.length === 0) return capacity;

  const variants = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sizeMl: productVariants.sizeMl,
      seriesId: products.seriesId,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(productVariants.id, [...variantIds]));
  const seriesIds = [
    ...new Set(variants.flatMap((variant) => (variant.seriesId ? [variant.seriesId] : []))),
  ];
  const productIds = [...new Set(variants.map((variant) => variant.productId))];

  const [seriesRows, sizeRows, supplyRows, oilRows] = await Promise.all([
    seriesIds.length
      ? db.select().from(productSeries).where(inArray(productSeries.id, seriesIds))
      : Promise.resolve([]),
    seriesIds.length
      ? db.select().from(seriesSizes).where(inArray(seriesSizes.seriesId, seriesIds))
      : Promise.resolve([]),
    db.select().from(supplyItems),
    db
      .select({
        productId: oilLots.productId,
        availableMl: sql<number>`coalesce(sum(${oilLots.remainingQuantityMl} - ${oilLots.reservedQuantityMl}), 0)::int`,
      })
      .from(oilLots)
      .where(inArray(oilLots.productId, productIds))
      .groupBy(oilLots.productId),
  ]);
  const seriesById = new Map(seriesRows.map((series) => [series.id, series]));
  const supplyById = new Map(supplyRows.map((supply) => [supply.id, supply]));
  const oilByProduct = new Map(oilRows.map((row) => [row.productId, Number(row.availableMl)]));
  const base = supplyRows.find(
    (supply) => supply.kind === "base" && supply.status === "active",
  );

  for (const variant of variants) {
    const series = variant.seriesId ? seriesById.get(variant.seriesId) : undefined;
    const blocked = (blocker: string, recipe: BottleRecipe | null = null) =>
      capacity.set(variant.id, {
        seriesName: series?.name ?? null,
        concentrationPercent: series?.oilConcentrationPercent ?? null,
        recipe,
        canMake: 0,
        limitedBy: null,
        blocker,
      });
    if (!series) {
      blocked("Not in a series");
      continue;
    }
    if (series.status !== "active") {
      blocked(`${series.name} is archived`);
      continue;
    }
    const recipe = recipeForBottles(variant.sizeMl, 1, series.oilConcentrationPercent);
    const size = sizeRows.find(
      (row) => row.seriesId === series.id && row.sizeMl === variant.sizeMl,
    );
    if (!size || !size.isActive) {
      blocked(`${series.name} has no ${variant.sizeMl} ml size`, recipe);
      continue;
    }
    const bottle = size.bottleSupplyId ? supplyById.get(size.bottleSupplyId) : undefined;
    if (!bottle || bottle.status !== "active") {
      blocked(`Link a ${variant.sizeMl} ml bottle`, recipe);
      continue;
    }
    const box = size.boxSupplyId ? supplyById.get(size.boxSupplyId) : undefined;
    if (box && box.status !== "active") {
      blocked(`${box.name} is archived`, recipe);
      continue;
    }
    if (!base) {
      blocked("Add the base mixture", recipe);
      continue;
    }
    const made = bottlesCanMake({
      sizeMl: variant.sizeMl,
      concentrationPercent: series.oilConcentrationPercent,
      oilAvailableMl: Math.max(0, oilByProduct.get(variant.productId) ?? 0),
      baseAvailableMl: base.quantityOnHand,
      bottlesOnHand: bottle.quantityOnHand,
      boxesOnHand: box ? box.quantityOnHand : null,
    });
    capacity.set(variant.id, {
      seriesName: series.name,
      concentrationPercent: series.oilConcentrationPercent,
      recipe,
      canMake: made.quantity,
      limitedBy: made.limitedBy,
      blocker: null,
    });
  }
  return capacity;
}
