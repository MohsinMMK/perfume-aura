"use server";

import {
  and,
  businessPeriodBounds,
  customers,
  db,
  desc,
  gte,
  invoices,
  lt,
  oilLots,
  oilMovements,
  payments,
  products,
  productVariants,
  sql,
  stockMovements,
} from "@perfume-aura/db";
import { requireCapability } from "@/lib/session";

export type OperationsReport = {
  from: Date;
  to: Date;
  invoiceCount: number;
  bottlesSold: number;
  bottlesReturned: number;
  oilUsedMl: number;
  newCustomers: number;
  salesCents: number;
  collectedCents: number;
  topProducts: Array<{
    productName: string;
    sizeMl: number;
    quantity: number;
  }>;
  paymentMethods: Array<{
    method: "cash" | "bank_transfer" | "card" | "other";
    count: number;
    amountCents: number;
  }>;
  oilCoverage: Array<{
    productId: string;
    productName: string;
    remainingMl: number;
    usedMl: number;
    estimatedDaysLeft: number | null;
  }>;
};

export async function getOperationsReport(days = 30): Promise<OperationsReport> {
  await requireCapability("finance.view");
  const { from, to } = businessPeriodBounds(days);
  const invoicePeriod = and(gte(invoices.issuedAt, from), lt(invoices.issuedAt, to));
  const paymentPeriod = and(gte(payments.paidAt, from), lt(payments.paidAt, to));
  const oilPeriod = and(gte(oilMovements.createdAt, from), lt(oilMovements.createdAt, to));
  const stockPeriod = and(gte(stockMovements.createdAt, from), lt(stockMovements.createdAt, to));

  const [
    invoiceSummaryRows,
    bottleRows,
    customerRows,
    paymentSummaryRows,
    topProductRows,
    paymentMethodRows,
    oilBalanceRows,
    oilUsageRows,
  ] = await Promise.all([
    db
      .select({
        invoiceCount: sql<number>`count(*) filter (where ${invoices.status} in ('issued', 'paid'))::int`,
        salesCents: sql<number>`coalesce(sum(${invoices.totalCents}) filter (where ${invoices.status} in ('issued', 'paid')), 0)::bigint`,
      })
      .from(invoices)
      .where(invoicePeriod),
    db
      .select({
        bottlesSold: sql<number>`coalesce(sum(abs(${stockMovements.quantityDelta})) filter (where ${stockMovements.type} = 'sale'), 0)::int`,
        bottlesReturned: sql<number>`coalesce(sum(${stockMovements.quantityDelta}) filter (where ${stockMovements.type} = 'return'), 0)::int`,
      })
      .from(stockMovements)
      .where(stockPeriod),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(gte(customers.createdAt, from), lt(customers.createdAt, to))),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint` })
      .from(payments)
      .where(paymentPeriod),
    db
      .select({
        productName: products.name,
        sizeMl: productVariants.sizeMl,
        quantity: sql<number>`coalesce(sum(abs(${stockMovements.quantityDelta})), 0)::int`,
      })
      .from(stockMovements)
      .innerJoin(
        productVariants,
        sql`${productVariants.id} = ${stockMovements.variantId}`,
      )
      .innerJoin(products, sql`${products.id} = ${productVariants.productId}`)
      .where(and(stockPeriod, sql`${stockMovements.type} = 'sale'`))
      .groupBy(products.name, productVariants.sizeMl)
      .orderBy(
        desc(sql`sum(abs(${stockMovements.quantityDelta}))`),
        products.name,
        productVariants.sizeMl,
      )
      .limit(8),
    db
      .select({
        method: payments.method,
        count: sql<number>`count(*)::int`,
        amountCents: sql<number>`sum(${payments.amountCents})::bigint`,
      })
      .from(payments)
      .where(paymentPeriod)
      .groupBy(payments.method)
      .orderBy(desc(sql`sum(${payments.amountCents})`)),
    db
      .select({
        productId: products.id,
        productName: products.name,
        remainingMl: sql<number>`coalesce(sum(${oilLots.remainingQuantityMl}), 0)::int`,
      })
      .from(oilLots)
      .innerJoin(products, sql`${products.id} = ${oilLots.productId}`)
      .where(sql`${products.status} = 'active'`)
      .groupBy(products.id, products.name)
      .orderBy(products.name),
    db
      .select({
        productId: products.id,
        productName: products.name,
        usedMl: sql<number>`coalesce(sum(abs(${oilMovements.quantityDeltaMl})), 0)::int`,
      })
      .from(oilMovements)
      .innerJoin(products, sql`${products.id} = ${oilMovements.productId}`)
      .where(sql`${oilPeriod} and ${oilMovements.type} = 'sale'`)
      .groupBy(products.id, products.name)
      .orderBy(products.name),
  ]);

  const invoiceSummary = invoiceSummaryRows[0];
  const oilByProduct = new Map<
    string,
    { productId: string; productName: string; remainingMl: number; usedMl: number }
  >();
  for (const row of oilBalanceRows) {
    oilByProduct.set(row.productId, {
      productId: row.productId,
      productName: row.productName,
      remainingMl: Number(row.remainingMl),
      usedMl: 0,
    });
  }
  for (const row of oilUsageRows) {
    const existing = oilByProduct.get(row.productId);
    oilByProduct.set(row.productId, {
      productId: row.productId,
      productName: row.productName,
      remainingMl: existing?.remainingMl ?? 0,
      usedMl: Number(row.usedMl),
    });
  }

  const oilCoverage = [...oilByProduct.values()]
    .map((row) => {
      const { remainingMl, usedMl } = row;
      return {
        productId: row.productId,
        productName: row.productName,
        remainingMl,
        usedMl,
        estimatedDaysLeft:
          usedMl > 0 ? Math.floor(remainingMl / (usedMl / days)) : null,
      };
    })
    .filter((row) => row.remainingMl > 0 || row.usedMl > 0)
    .sort((left, right) => {
      if (left.estimatedDaysLeft === null) return 1;
      if (right.estimatedDaysLeft === null) return -1;
      return left.estimatedDaysLeft - right.estimatedDaysLeft;
    });

  return {
    from,
    to,
    invoiceCount: Number(invoiceSummary?.invoiceCount ?? 0),
    bottlesSold: Number(bottleRows[0]?.bottlesSold ?? 0),
    bottlesReturned: Number(bottleRows[0]?.bottlesReturned ?? 0),
    oilUsedMl: oilCoverage.reduce((total, row) => total + row.usedMl, 0),
    newCustomers: Number(customerRows[0]?.total ?? 0),
    salesCents: Number(invoiceSummary?.salesCents ?? 0),
    collectedCents: Number(paymentSummaryRows[0]?.total ?? 0),
    topProducts: topProductRows.map((row) => ({
      productName: row.productName,
      sizeMl: row.sizeMl,
      quantity: Number(row.quantity),
    })),
    paymentMethods: paymentMethodRows.map((row) => ({
      method: row.method,
      count: Number(row.count),
      amountCents: Number(row.amountCents),
    })),
    oilCoverage,
  };
}
