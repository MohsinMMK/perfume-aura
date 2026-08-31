import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { DomainError } from "./domain-errors";
import {
  availableOilMl,
  oilMlForBottles,
  receiveOilMl,
  remainingOilAfterDelta,
} from "./oil-math";
import { oilLots, oilMovements, products } from "./schema";
import {
  isUniqueViolation,
  runDomainTransaction,
  type DbTransaction,
} from "./transactions";

export type OilMovementType = "receive" | "sale" | "adjust";

export type ReceiveOilLotInput = {
  productId: string;
  kgBottles: number;
  supplierName?: string | null;
  supplierReference?: string | null;
  totalCostCents?: number | null;
  receivedDate?: string | null;
  note?: string | null;
  userId?: string | null;
  idempotencyKey?: string;
};

export type ReceiveOilLotResult = {
  lotId: string;
  productId: string;
  receivedQuantityMl: number;
  remainingQuantityMl: number;
  kgBottles: number;
  idempotent: boolean;
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

export type OilDemand = {
  productId: string;
  oilMl: number;
};

export type ConsumeOilInput = {
  demands: readonly OilDemand[];
  refType: "invoice" | "commerce_order";
  refId: string;
  userId?: string | null;
  idempotencyPrefix: string;
};

export type ConsumeOilResult = {
  consumedMl: number;
  lotIds: string[];
  idempotent: boolean;
};

export class OilInventoryError extends DomainError {
  constructor(
    code: "INVALID_INPUT" | "NOT_FOUND" | "INVALID_STATE" | "INSUFFICIENT_OIL" | "CONFLICT" | "IDEMPOTENCY_CONFLICT",
    message: string,
    options?: ErrorOptions,
  ) {
    super(code, message, options);
    this.name = "OilInventoryError";
  }
}

async function lockProduct(
  tx: DbTransaction,
  productId: string,
): Promise<{ id: string; name: string; status: "active" | "archived" }> {
  const [product] = await tx
    .select({
      id: products.id,
      name: products.name,
      status: products.status,
    })
    .from(products)
    .where(eq(products.id, productId))
    .for("update")
    .limit(1);
  if (!product) {
    throw new OilInventoryError("NOT_FOUND", "Product not found");
  }
  return product;
}

export async function receiveOilLotInTransaction(
  tx: DbTransaction,
  input: ReceiveOilLotInput,
): Promise<ReceiveOilLotResult> {
  if (input.idempotencyKey) {
    const [existing] = await tx
      .select({
        lotId: oilMovements.lotId,
        productId: oilMovements.productId,
        quantityDeltaMl: oilMovements.quantityDeltaMl,
        quantityAfterMl: oilMovements.quantityAfterMl,
      })
      .from(oilMovements)
      .where(eq(oilMovements.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      const receivedQuantityMl = receiveOilMl(input.kgBottles);
      const [existingLot] = await tx
        .select({
          supplierName: oilLots.supplierName,
          supplierReference: oilLots.supplierReference,
          totalCostCents: oilLots.totalCostCents,
          receivedDate: oilLots.receivedDate,
          note: oilLots.note,
        })
        .from(oilLots)
        .where(eq(oilLots.id, existing.lotId))
        .limit(1);
      if (
        existing.productId !== input.productId ||
        existing.quantityDeltaMl !== receivedQuantityMl ||
        !existingLot ||
        existingLot.supplierName !== emptyToNull(input.supplierName) ||
        existingLot.supplierReference !== emptyToNull(input.supplierReference) ||
        existingLot.totalCostCents !== (input.totalCostCents ?? null) ||
        existingLot.receivedDate !== emptyToNull(input.receivedDate) ||
        existingLot.note !== emptyToNull(input.note)
      ) {
        throw new OilInventoryError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key was already used for a different oil receive",
        );
      }
      return {
        lotId: existing.lotId,
        productId: existing.productId,
        receivedQuantityMl,
        remainingQuantityMl: existing.quantityAfterMl,
        kgBottles: input.kgBottles,
        idempotent: true,
      };
    }
  }

  const product = await lockProduct(tx, input.productId);
  if (product.status !== "active") {
    throw new OilInventoryError("INVALID_STATE", "Product not found or inactive");
  }

  let receivedQuantityMl: number;
  try {
    receivedQuantityMl = receiveOilMl(input.kgBottles);
  } catch (error) {
    throw new OilInventoryError(
      "INVALID_INPUT",
      error instanceof Error ? error.message : "Invalid oil receive",
    );
  }

  const [lot] = await tx
    .insert(oilLots)
    .values({
      productId: input.productId,
      receivedQuantityMl,
      remainingQuantityMl: receivedQuantityMl,
      kgBottles: input.kgBottles,
      supplierName: emptyToNull(input.supplierName),
      supplierReference: emptyToNull(input.supplierReference),
      totalCostCents: input.totalCostCents ?? null,
      receivedDate: emptyToNull(input.receivedDate),
      note: emptyToNull(input.note),
      createdBy: input.userId ?? null,
    })
    .returning({ id: oilLots.id });
  if (!lot) {
    throw new OilInventoryError("CONFLICT", "Failed to create oil lot");
  }

  await tx.insert(oilMovements).values({
    lotId: lot.id,
    productId: input.productId,
    type: "receive",
    quantityDeltaMl: receivedQuantityMl,
    quantityAfterMl: receivedQuantityMl,
    note: input.note?.trim() || `Receive ${input.kgBottles} kg oil`,
    idempotencyKey: input.idempotencyKey ?? null,
    createdBy: input.userId ?? null,
  });

  return {
    lotId: lot.id,
    productId: input.productId,
    receivedQuantityMl,
    remainingQuantityMl: receivedQuantityMl,
    kgBottles: input.kgBottles,
    idempotent: false,
  };
}

export async function receiveOilLot(
  input: ReceiveOilLotInput,
): Promise<ReceiveOilLotResult> {
  try {
    return await runDomainTransaction((tx) =>
      receiveOilLotInTransaction(tx, input),
    );
  } catch (error) {
    if (error instanceof OilInventoryError) throw error;
    if (isUniqueViolation(error) && input.idempotencyKey) {
      throw new OilInventoryError(
        "IDEMPOTENCY_CONFLICT",
        "Idempotency key was already used by a concurrent oil receive",
        { cause: error },
      );
    }
    throw error;
  }
}

function mergeDemands(demands: readonly OilDemand[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const demand of demands) {
    if (!Number.isInteger(demand.oilMl) || demand.oilMl <= 0) {
      throw new OilInventoryError("INVALID_INPUT", "Oil demand must be a positive integer");
    }
    merged.set(demand.productId, (merged.get(demand.productId) ?? 0) + demand.oilMl);
  }
  return merged;
}

export async function consumeOilInTransaction(
  tx: DbTransaction,
  input: ConsumeOilInput,
): Promise<ConsumeOilResult> {
  const merged = mergeDemands(input.demands);
  if (merged.size === 0) {
    throw new OilInventoryError("INVALID_INPUT", "Oil demand is required");
  }

  const productIds = [...merged.keys()].sort();
  const lockedProducts = await tx
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(inArray(products.id, productIds))
    .orderBy(asc(products.id))
    .for("update");
  if (lockedProducts.length !== productIds.length) {
    throw new OilInventoryError("NOT_FOUND", "One or more oil products no longer exist");
  }

  const prefix = `${input.idempotencyPrefix}:`;
  const existing = await tx
    .select({
      lotId: oilMovements.lotId,
      quantityDeltaMl: oilMovements.quantityDeltaMl,
      idempotencyKey: oilMovements.idempotencyKey,
    })
    .from(oilMovements)
    .where(
      and(
        eq(oilMovements.refType, input.refType),
        eq(oilMovements.refId, input.refId),
        eq(oilMovements.type, "sale"),
      ),
    );

  const existingForSale = existing.filter((row) =>
    row.idempotencyKey?.startsWith(prefix),
  );
  if (existingForSale.length > 0) {
    return {
      consumedMl: existingForSale.reduce(
        (total, row) => total + Math.abs(row.quantityDeltaMl),
        0,
      ),
      lotIds: existingForSale.map((row) => row.lotId),
      idempotent: true,
    };
  }

  const lots = await tx
    .select({
      id: oilLots.id,
      productId: oilLots.productId,
      remainingQuantityMl: oilLots.remainingQuantityMl,
      reservedQuantityMl: oilLots.reservedQuantityMl,
      version: oilLots.version,
      createdAt: oilLots.createdAt,
    })
    .from(oilLots)
    .where(
      and(
        inArray(oilLots.productId, productIds),
        gt(oilLots.remainingQuantityMl, oilLots.reservedQuantityMl),
      ),
    )
    .orderBy(asc(oilLots.createdAt), asc(oilLots.id))
    .for("update");

  const lotsByProduct = new Map<string, typeof lots>();
  for (const lot of lots) {
    const bucket = lotsByProduct.get(lot.productId) ?? [];
    bucket.push(lot);
    lotsByProduct.set(lot.productId, bucket);
  }

  const allocations: Array<{
    lot: (typeof lots)[number];
    takeMl: number;
    afterMl: number;
  }> = [];

  for (const productId of productIds) {
    let remainingNeed = merged.get(productId) ?? 0;
    const availableLots = lotsByProduct.get(productId) ?? [];
    const availableMl = availableLots.reduce(
      (total, lot) =>
        total + availableOilMl(lot.remainingQuantityMl, lot.reservedQuantityMl),
      0,
    );
    if (availableMl < remainingNeed) {
      const productName =
        lockedProducts.find((product) => product.id === productId)?.name ??
        productId;
      throw new OilInventoryError(
        "INSUFFICIENT_OIL",
        `Insufficient oil for ${productName}: available ${availableMl} ml, needed ${remainingNeed} ml`,
      );
    }
    for (const lot of availableLots) {
      if (remainingNeed === 0) break;
      const takeMl = Math.min(
        availableOilMl(lot.remainingQuantityMl, lot.reservedQuantityMl),
        remainingNeed,
      );
      allocations.push({
        lot,
        takeMl,
        afterMl: remainingOilAfterDelta(lot.remainingQuantityMl, -takeMl),
      });
      remainingNeed -= takeMl;
    }
  }

  const lotIds: string[] = [];
  let consumedMl = 0;
  for (const allocation of allocations) {
    await tx.insert(oilMovements).values({
      lotId: allocation.lot.id,
      productId: allocation.lot.productId,
      type: "sale",
      quantityDeltaMl: -allocation.takeMl,
      quantityAfterMl: allocation.afterMl,
      refType: input.refType,
      refId: input.refId,
      note: `Sale oil ${input.refType} ${input.refId.slice(0, 8)}`,
      idempotencyKey: `${input.idempotencyPrefix}:${allocation.lot.id}`,
      createdBy: input.userId ?? null,
    });
    const updated = await tx
      .update(oilLots)
      .set({
        remainingQuantityMl: allocation.afterMl,
        version: allocation.lot.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(oilLots.id, allocation.lot.id),
          eq(oilLots.version, allocation.lot.version),
        ),
      )
      .returning({ id: oilLots.id });
    if (updated.length !== 1) {
      throw new OilInventoryError("CONFLICT", "Concurrent oil update");
    }
    lotIds.push(allocation.lot.id);
    consumedMl += allocation.takeMl;
  }

  return { consumedMl, lotIds, idempotent: false };
}

export function oilDemandForVariant(input: {
  productId: string;
  sizeMl: number;
  quantity: number;
}): OilDemand {
  try {
    return {
      productId: input.productId,
      oilMl: oilMlForBottles(input.sizeMl, input.quantity),
    };
  } catch (error) {
    throw new OilInventoryError(
      "INVALID_INPUT",
      error instanceof Error ? error.message : "Invalid oil demand",
    );
  }
}
