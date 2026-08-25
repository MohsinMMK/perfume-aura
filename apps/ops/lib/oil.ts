"use server";

import {
  count,
  db,
  desc,
  eq,
  oilLots,
  oilMovements,
  products,
  receiveOilLot,
  OilInventoryError,
} from "@perfume-aura/db";
import {
  receiveOilSchema,
  type ReceiveOilInput,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import {
  normalizePageSize,
  pageOffset,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from "@/lib/pagination";
import { requireCapability } from "@/lib/session";

export type OilBalanceRow = {
  productId: string;
  productName: string;
  remainingMl: number;
  lotCount: number;
};

export type OilMovementRow = {
  id: string;
  productName: string;
  type: "receive" | "sale" | "adjust";
  quantityDeltaMl: number;
  quantityAfterMl: number;
  note: string | null;
  createdAt: Date;
};

export async function listOilBalances(): Promise<OilBalanceRow[]> {
  await requireCapability("stock.view");
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      remainingMl: oilLots.remainingQuantityMl,
      lotId: oilLots.id,
    })
    .from(oilLots)
    .innerJoin(products, eq(products.id, oilLots.productId))
    .where(eq(products.status, "active"))
    .orderBy(products.name, oilLots.createdAt);

  const byProduct = new Map<string, OilBalanceRow>();
  for (const row of rows) {
    const current = byProduct.get(row.productId);
    if (current) {
      current.remainingMl += row.remainingMl;
      current.lotCount += 1;
      continue;
    }
    byProduct.set(row.productId, {
      productId: row.productId,
      productName: row.productName,
      remainingMl: row.remainingMl,
      lotCount: 1,
    });
  }
  return [...byProduct.values()];
}

export async function listActiveProductsForOilSelect(): Promise<
  { id: string; name: string }[]
> {
  await requireCapability("stock.view");
  return db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(products.name, products.id);
}

export async function listRecentOilMovements(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<OilMovementRow>> {
  await requireCapability("stock.view");
  const page = parsePage(opts?.page);
  const pageSize = normalizePageSize(opts?.pageSize);
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: oilMovements.id,
        productName: products.name,
        type: oilMovements.type,
        quantityDeltaMl: oilMovements.quantityDeltaMl,
        quantityAfterMl: oilMovements.quantityAfterMl,
        note: oilMovements.note,
        createdAt: oilMovements.createdAt,
      })
      .from(oilMovements)
      .innerJoin(products, eq(products.id, oilMovements.productId))
      .orderBy(desc(oilMovements.createdAt), desc(oilMovements.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ total: count(oilMovements.id) }).from(oilMovements),
  ]);
  return paginatedResult(
    rows,
    Number(totals[0]?.total ?? 0),
    page,
    pageSize,
  );
}

export async function receiveOilAction(
  raw: unknown,
): Promise<ActionResult<{ remainingQuantityMl: number }>> {
  let session;
  try {
    session = await requireCapability("stock.receive");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = receiveOilSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data: ReceiveOilInput = parsed.data;

  try {
    const result = await receiveOilLot({
      productId: data.productId,
      kgBottles: data.kgBottles,
      note: data.note?.trim() || null,
      userId: session.user.id,
      idempotencyKey: data.idempotencyKey,
    });
    revalidatePath("/stock");
    revalidatePath("/stock/oil");
    revalidatePath("/sales/new");
    revalidatePath("/dashboard");
    return actionOk({ remainingQuantityMl: result.remainingQuantityMl });
  } catch (error) {
    if (error instanceof OilInventoryError) {
      return actionError(error.message);
    }
    console.error("[receiveOil]", error);
    return actionError("Could not receive oil");
  }
}
