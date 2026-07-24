"use server";

import {
  and,
  applyMovement,
  count,
  db,
  desc,
  eq,
  InventoryError,
  lte,
  productVariants,
  products,
  sql,
  stockMovements,
} from "@perfume-aura/db";
import {
  receiveStockSchema,
  adjustStockSchema,
  type ReceiveStockInput,
  type AdjustStockInput,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/session";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";
import { revalidateCommittedStockMutation } from "@/lib/stock-revalidation";
import {
  normalizePageSize,
  pageOffset,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from "@/lib/pagination";

export type LowStockRow = {
  variantId: string;
  productId: string;
  productName: string;
  brand: string | null;
  sku: string;
  sizeMl: number;
  quantityOnHand: number;
  reorderLevel: number;
  costCents: number;
};

export type MovementRow = {
  id: string;
  variantId: string;
  type: string;
  quantityDelta: number;
  quantityAfter: number;
  note: string | null;
  unitCostCents: number | null;
  costBasis: "snapshot" | "legacy_current" | null;
  createdAt: Date;
  sku: string;
  productName: string;
  sizeMl: number;
};

export type DashboardStats = {
  productCount: number;
  totalUnits: number;
  lowStockCount: number;
  inventoryCostCents: number;
};

export async function listLowStock(): Promise<LowStockRow[]> {
  await requireOwnerSession();

  const rows = await db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      productName: products.name,
      brand: products.brand,
      sku: productVariants.sku,
      sizeMl: productVariants.sizeMl,
      quantityOnHand: productVariants.quantityOnHand,
      reorderLevel: productVariants.reorderLevel,
      costCents: productVariants.costCents,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.status, "active"),
        eq(products.status, "active"),
        // qty <= reorder (includes reorder 0 when stock is 0)
        lte(productVariants.quantityOnHand, productVariants.reorderLevel),
      ),
    )
    .orderBy(productVariants.quantityOnHand, products.name);

  return rows;
}

export async function listRecentMovements(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<MovementRow>> {
  await requireOwnerSession();

  const page = parsePage(opts?.page);
  const pageSize = normalizePageSize(opts?.pageSize);
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        variantId: stockMovements.variantId,
        type: stockMovements.type,
        quantityDelta: stockMovements.quantityDelta,
        quantityAfter: stockMovements.quantityAfter,
        note: stockMovements.note,
        unitCostCents: stockMovements.unitCostCents,
        costBasis: stockMovements.costBasis,
        createdAt: stockMovements.createdAt,
        sku: productVariants.sku,
        productName: products.name,
        sizeMl: productVariants.sizeMl,
      })
      .from(stockMovements)
      .innerJoin(
        productVariants,
        eq(productVariants.id, stockMovements.variantId),
      )
      .innerJoin(products, eq(products.id, productVariants.productId))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ total: count(stockMovements.id) }).from(stockMovements),
  ]);

  return paginatedResult(
    rows,
    Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  );
}

export async function getLowStockCount(): Promise<number> {
  await requireOwnerSession();
  const [row] = await db
    .select({ lowStockCount: sql<number>`count(*)::int` })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.status, "active"),
        eq(products.status, "active"),
        lte(productVariants.quantityOnHand, productVariants.reorderLevel),
      ),
    );
  return Number(row?.lowStockCount ?? 0);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireOwnerSession();

  const [[productRow], [stockRow], lowStockCount] = await Promise.all([
    db
      .select({
        productCount: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(eq(products.status, "active")),
    db
      .select({
        totalUnits: sql<number>`coalesce(sum(${productVariants.quantityOnHand}), 0)::int`,
        inventoryCostCents: sql<number>`coalesce(sum(${productVariants.quantityOnHand} * ${productVariants.costCents}), 0)::bigint`,
      })
      .from(productVariants)
      .where(eq(productVariants.status, "active")),
    getLowStockCount(),
  ]);

  return {
    productCount: Number(productRow?.productCount ?? 0),
    totalUnits: Number(stockRow?.totalUnits ?? 0),
    lowStockCount,
    inventoryCostCents: Number(stockRow?.inventoryCostCents ?? 0),
  };
}

function revalidateStockPaths(productId: string) {
  revalidateCommittedStockMutation(
    productId,
    revalidatePath,
    (error, path) => {
      console.error(`[stock action] revalidation failed for ${path}`, error);
    },
  );
}

export async function receiveStockAction(
  raw: unknown,
): Promise<ActionResult<{ quantityAfter: number }>> {
  let session;
  try {
    session = await requireOwnerSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = receiveStockSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const {
    idempotencyKey,
    variantId,
    quantity,
    note,
  }: ReceiveStockInput = parsed.data;

  let result: Awaited<ReturnType<typeof applyMovement>>;
  try {
    result = await applyMovement({
      variantId,
      type: "receive",
      quantity,
      note: note?.trim() || undefined,
      userId: session.user.id,
      idempotencyKey,
    });
  } catch (err) {
    return movementError(err);
  }

  revalidateStockPaths(result.productId);
  return actionOk({ quantityAfter: result.quantityAfter });
}

export async function adjustStockAction(
  raw: unknown,
): Promise<ActionResult<{ quantityAfter: number }>> {
  let session;
  try {
    session = await requireOwnerSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = adjustStockSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const {
    idempotencyKey,
    variantId,
    quantityDelta,
    note,
  }: AdjustStockInput = parsed.data;

  let result: Awaited<ReturnType<typeof applyMovement>>;
  try {
    result = await applyMovement({
      variantId,
      type: "adjust",
      quantityDelta,
      note: note.trim(),
      userId: session.user.id,
      idempotencyKey,
    });
  } catch (err) {
    return movementError(err);
  }

  revalidateStockPaths(result.productId);
  return actionOk({ quantityAfter: result.quantityAfter });
}

function movementError(err: unknown): ActionResult<never> {
  if (err instanceof InventoryError) {
    return actionError(err.message);
  }
  console.error("[stock action]", err);
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("connect") ||
    msg.includes("DATABASE_URL")
  ) {
    return actionError("Database unavailable. Check DATABASE_URL.");
  }
  if (msg.includes("MAIN not found")) {
    return actionError(
      "Location MAIN is missing. Run: pnpm --filter @perfume-aura/db seed",
    );
  }
  return actionError("Stock update failed. Please try again.");
}
