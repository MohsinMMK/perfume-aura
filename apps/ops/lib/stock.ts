"use server";

import {
  and,
  applyMovement,
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
import { requireSession } from "@/lib/session";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";

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
  await requireSession();

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

export async function listRecentMovements(
  limit = 50,
): Promise<MovementRow[]> {
  await requireSession();

  const rows = await db
    .select({
      id: stockMovements.id,
      variantId: stockMovements.variantId,
      type: stockMovements.type,
      quantityDelta: stockMovements.quantityDelta,
      quantityAfter: stockMovements.quantityAfter,
      note: stockMovements.note,
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
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);

  return rows;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireSession();

  const [productRow] = await db
    .select({
      productCount: sql<number>`count(*)::int`,
    })
    .from(products)
    .where(eq(products.status, "active"));

  const [stockRow] = await db
    .select({
      totalUnits: sql<number>`coalesce(sum(${productVariants.quantityOnHand}), 0)::int`,
      inventoryCostCents: sql<number>`coalesce(sum(${productVariants.quantityOnHand} * ${productVariants.costCents}), 0)::bigint`,
    })
    .from(productVariants)
    .where(eq(productVariants.status, "active"));

  const [lowRow] = await db
    .select({
      lowStockCount: sql<number>`count(*)::int`,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.status, "active"),
        eq(products.status, "active"),
        lte(productVariants.quantityOnHand, productVariants.reorderLevel),
      ),
    );

  return {
    productCount: Number(productRow?.productCount ?? 0),
    totalUnits: Number(stockRow?.totalUnits ?? 0),
    lowStockCount: Number(lowRow?.lowStockCount ?? 0),
    inventoryCostCents: Number(stockRow?.inventoryCostCents ?? 0),
  };
}

function revalidateStockPaths(productId?: string) {
  revalidatePath("/stock");
  revalidatePath("/stock/low");
  revalidatePath("/dashboard");
  revalidatePath("/products");
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export async function receiveStockAction(
  raw: unknown,
): Promise<ActionResult<{ quantityAfter: number }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = receiveStockSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const { variantId, quantity, note }: ReceiveStockInput = parsed.data;

  try {
    const result = await applyMovement({
      variantId,
      type: "receive",
      quantity,
      note: note?.trim() || undefined,
      userId: session.user.id,
    });

    const [v] = await db
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    revalidateStockPaths(v?.productId);
    return actionOk({ quantityAfter: result.quantityAfter });
  } catch (err) {
    return movementError(err);
  }
}

export async function adjustStockAction(
  raw: unknown,
): Promise<ActionResult<{ quantityAfter: number }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = adjustStockSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const { variantId, quantityDelta, note }: AdjustStockInput = parsed.data;

  try {
    const result = await applyMovement({
      variantId,
      type: "adjust",
      quantityDelta,
      note: note.trim(),
      userId: session.user.id,
    });

    const [v] = await db
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    revalidateStockPaths(v?.productId);
    return actionOk({ quantityAfter: result.quantityAfter });
  } catch (err) {
    return movementError(err);
  }
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
