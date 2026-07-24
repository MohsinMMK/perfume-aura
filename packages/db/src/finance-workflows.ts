import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  BUSINESS_TIMEZONE,
  businessPeriodBounds,
} from "./business-time";
import { db } from "./client";
import {
  invoices,
  payments,
  productVariants,
  stockMovements,
} from "./schema";

export type FinanceSnapshot = {
  from: string;
  to: string;
  timeZone: string;
  inventoryCostCents: number;
  inventoryRetailCents: number;
  openArCents: number;
  revenueIssuedCents: number;
  cashCollectedCents: number;
  cogsSnapshotCents: number;
  cogsLegacyCurrentCents: number;
  cogsTotalCents: number;
  cogsSnapshotDefectCount: number;
  grossMarginCents: number;
};

/**
 * Read-only finance projection.
 *
 * New sale rows are valued only from captured `snapshot` cost. Historical
 * expansion rows remain visibly separated as `legacy_current`; malformed sale
 * rows are surfaced as defects and never silently repriced from a live variant.
 */
export async function getFinanceSnapshot(
  days = 30,
  options: { now?: Date; timeZone?: string } = {},
): Promise<FinanceSnapshot> {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? BUSINESS_TIMEZONE;
  const { from, to } = businessPeriodBounds(days, now, timeZone);
  const period = and(
    gte(stockMovements.createdAt, from),
    lt(stockMovements.createdAt, to),
  );

  const [[inventory], [ar], [revenue], [cash], [cogs]] = await Promise.all([
    db
      .select({
        cost: sql<number>`coalesce(sum(${productVariants.quantityOnHand} * ${productVariants.costCents}), 0)::bigint`,
        retail: sql<number>`coalesce(sum(${productVariants.quantityOnHand} * ${productVariants.retailCents}), 0)::bigint`,
      })
      .from(productVariants),
    db
      .select({
        total: sql<number>`coalesce(sum(${invoices.totalCents} - ${invoices.amountPaidCents}), 0)::bigint`,
      })
      .from(invoices)
      .where(eq(invoices.status, "issued")),
    db
      .select({
        total: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::bigint`,
      })
      .from(invoices)
      .where(
        and(
          sql`${invoices.status} in ('issued', 'paid')`,
          gte(invoices.issuedAt, from),
          lt(invoices.issuedAt, to),
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint`,
      })
      .from(payments)
      .where(and(gte(payments.paidAt, from), lt(payments.paidAt, to))),
    db
      .select({
        snapshot: sql<number>`coalesce(sum(
          case
            when ${stockMovements.costBasis} = 'snapshot'
              and ${stockMovements.unitCostCents} is not null
            then abs(${stockMovements.quantityDelta}) * ${stockMovements.unitCostCents}
            else 0
          end
        ), 0)::bigint`,
        legacy: sql<number>`coalesce(sum(
          case
            when ${stockMovements.costBasis} = 'legacy_current'
              and ${stockMovements.unitCostCents} is not null
            then abs(${stockMovements.quantityDelta}) * ${stockMovements.unitCostCents}
            else 0
          end
        ), 0)::bigint`,
        defects: sql<number>`count(*) filter (
          where ${stockMovements.type} = 'sale'
            and (
              ${stockMovements.costBasis} is null
              or ${stockMovements.unitCostCents} is null
            )
        )::int`,
      })
      .from(stockMovements)
      .where(and(eq(stockMovements.type, "sale"), period)),
  ]);

  const revenueIssuedCents = Number(revenue?.total ?? 0);
  const cogsSnapshotCents = Number(cogs?.snapshot ?? 0);
  const cogsLegacyCurrentCents = Number(cogs?.legacy ?? 0);
  const cogsTotalCents = cogsSnapshotCents + cogsLegacyCurrentCents;

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    timeZone,
    inventoryCostCents: Number(inventory?.cost ?? 0),
    inventoryRetailCents: Number(inventory?.retail ?? 0),
    openArCents: Number(ar?.total ?? 0),
    revenueIssuedCents,
    cashCollectedCents: Number(cash?.total ?? 0),
    cogsSnapshotCents,
    cogsLegacyCurrentCents,
    cogsTotalCents,
    cogsSnapshotDefectCount: Number(cogs?.defects ?? 0),
    grossMarginCents: revenueIssuedCents - cogsTotalCents,
  };
}
