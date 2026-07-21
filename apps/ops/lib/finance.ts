"use server";

import {
  and,
  db,
  eq,
  gte,
  invoices,
  lt,
  payments,
  productVariants,
  sql,
  stockMovements,
} from "@perfume-aura/db";
import { requireSession } from "@/lib/session";

export type FinanceSummary = {
  from: string;
  to: string;
  inventoryCostCents: number;
  inventoryRetailCents: number;
  openArCents: number;
  revenueIssuedCents: number;
  cashCollectedCents: number;
  /** Approx COGS from sale movements in period × current variant cost */
  cogsApproxCents: number;
  grossMarginApproxCents: number;
};

function periodBounds(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

/**
 * Phase 4 finance aggregates. COGS uses current cost_cents × sale qty
 * (no historical cost snapshot yet — see PHASE4_FINANCE.md).
 */
export async function getFinanceSummary(
  days = 30,
): Promise<FinanceSummary> {
  await requireSession();
  const { from, to } = periodBounds(days);

  const [invStock] = await db
    .select({
      cost: sql<number>`coalesce(sum(${productVariants.quantityOnHand} * ${productVariants.costCents}), 0)::bigint`,
      retail: sql<number>`coalesce(sum(${productVariants.quantityOnHand} * ${productVariants.retailCents}), 0)::bigint`,
    })
    .from(productVariants)
    .where(eq(productVariants.status, "active"));

  const [ar] = await db
    .select({
      total: sql<number>`coalesce(sum(${invoices.totalCents} - ${invoices.amountPaidCents}), 0)::bigint`,
    })
    .from(invoices)
    .where(eq(invoices.status, "issued"));

  const [rev] = await db
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
    );

  const [cash] = await db
    .select({
      total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint`,
    })
    .from(payments)
    .where(and(gte(payments.paidAt, from), lt(payments.paidAt, to)));

  const [cogs] = await db
    .select({
      total: sql<number>`coalesce(sum(abs(${stockMovements.quantityDelta}) * ${productVariants.costCents}), 0)::bigint`,
    })
    .from(stockMovements)
    .innerJoin(
      productVariants,
      eq(productVariants.id, stockMovements.variantId),
    )
    .where(
      and(
        eq(stockMovements.type, "sale"),
        gte(stockMovements.createdAt, from),
        lt(stockMovements.createdAt, to),
      ),
    );

  const revenueIssuedCents = Number(rev?.total ?? 0);
  const cogsApproxCents = Number(cogs?.total ?? 0);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    inventoryCostCents: Number(invStock?.cost ?? 0),
    inventoryRetailCents: Number(invStock?.retail ?? 0),
    openArCents: Number(ar?.total ?? 0),
    revenueIssuedCents,
    cashCollectedCents: Number(cash?.total ?? 0),
    cogsApproxCents,
    grossMarginApproxCents: revenueIssuedCents - cogsApproxCents,
  };
}
