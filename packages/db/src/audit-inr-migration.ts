import { pool } from "./client";
import {
  evaluateCurrencyMigration,
  type CurrencyAuditSnapshot,
} from "./currency-migration-audit";

type NumericRow = Record<string, string | number | null>;

function amount(row: NumericRow, key: string): number {
  const value = Number(row[key] ?? 0);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Currency audit value ${key} exceeds safe integer range`);
  }
  return value;
}

export async function runCurrencyMigrationAudit(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the read-only INR migration audit");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    // A checked-out pg Client executes one query at a time. Keep the read-only
    // snapshot sequential inside this repeatable-read transaction (pg 9 removes
    // support for concurrent query calls on one client).
    const productsResult = await client.query<NumericRow>(`
          SELECT
            count(*)::bigint AS variant_count,
            count(*) FILTER (WHERE cost_cents <> 0 OR retail_cents <> 0)::bigint
              AS non_zero_money_variant_count,
            coalesce(sum(cost_cents), 0)::bigint AS cost_amount_minor,
            coalesce(sum(retail_cents), 0)::bigint AS retail_amount_minor,
            coalesce(sum(quantity_on_hand::bigint * cost_cents::bigint), 0)::bigint
              AS inventory_cost_amount_minor,
            coalesce(sum(quantity_on_hand::bigint * retail_cents::bigint), 0)::bigint
              AS inventory_retail_amount_minor
          FROM product_variants
        `);
    const invoicesResult = await client.query<NumericRow>(`
          SELECT
            count(*)::bigint AS total_count,
            count(*) FILTER (WHERE currency = 'PKR')::bigint AS pkr_labelled_count,
            count(*) FILTER (
              WHERE currency = 'PKR'
                AND (subtotal_cents <> 0 OR tax_cents <> 0 OR total_cents <> 0 OR amount_paid_cents <> 0)
            )::bigint AS non_zero_pkr_count,
            coalesce(sum(subtotal_cents) FILTER (WHERE currency = 'PKR'), 0)::bigint AS subtotal_amount_minor,
            coalesce(sum(tax_cents) FILTER (WHERE currency = 'PKR'), 0)::bigint AS tax_amount_minor,
            coalesce(sum(total_cents) FILTER (WHERE currency = 'PKR'), 0)::bigint AS total_amount_minor,
            coalesce(sum(amount_paid_cents) FILTER (WHERE currency = 'PKR'), 0)::bigint AS paid_amount_minor,
            coalesce(sum(total_cents - amount_paid_cents) FILTER (
              WHERE currency = 'PKR' AND status = 'issued'
            ), 0)::bigint AS open_receivable_amount_minor
          FROM invoices
        `);
    const invoiceLinesResult = await client.query<NumericRow>(`
          SELECT
            count(*)::bigint AS line_count,
            count(*) FILTER (
              WHERE invoice_lines.unit_price_cents <> 0
                OR invoice_lines.line_total_cents <> 0
            )::bigint AS non_zero_line_count,
            coalesce(sum(invoice_lines.line_total_cents), 0)::bigint
              AS line_amount_minor
          FROM invoice_lines
          JOIN invoices ON invoices.id = invoice_lines.invoice_id
          WHERE invoices.currency = 'PKR'
        `);
    const paymentsResult = await client.query<NumericRow>(`
          SELECT
            count(*)::bigint AS total_count,
            count(*) FILTER (WHERE invoices.currency = 'PKR')::bigint AS pkr_linked_count,
            coalesce(sum(payments.amount_cents) FILTER (WHERE invoices.currency = 'PKR'), 0)::bigint
              AS pkr_linked_amount_minor
          FROM payments
          JOIN invoices ON invoices.id = payments.invoice_id
        `);
    const financeResult = await client.query<NumericRow>(`
          SELECT
            coalesce((SELECT sum(total_cents) FROM invoices WHERE currency = 'PKR' AND status IN ('issued', 'paid')), 0)::bigint
              AS issued_revenue_amount_minor,
            coalesce((SELECT sum(payments.amount_cents) FROM payments JOIN invoices ON invoices.id = payments.invoice_id WHERE invoices.currency = 'PKR'), 0)::bigint
              AS collected_amount_minor,
            coalesce((SELECT sum(abs(quantity_delta)::bigint * unit_cost_cents::bigint) FROM stock_movements WHERE type = 'sale' AND unit_cost_cents IS NOT NULL), 0)::bigint
              AS cogs_amount_minor
        `);

    const products = productsResult.rows[0] ?? {};
    const invoices = invoicesResult.rows[0] ?? {};
    const invoiceLines = invoiceLinesResult.rows[0] ?? {};
    const payments = paymentsResult.rows[0] ?? {};
    const finance = financeResult.rows[0] ?? {};
    const snapshot: CurrencyAuditSnapshot = {
      products: {
        variantCount: amount(products, "variant_count"),
        nonZeroMoneyVariantCount: amount(products, "non_zero_money_variant_count"),
        costAmountMinor: amount(products, "cost_amount_minor"),
        retailAmountMinor: amount(products, "retail_amount_minor"),
        inventoryCostAmountMinor: amount(products, "inventory_cost_amount_minor"),
        inventoryRetailAmountMinor: amount(products, "inventory_retail_amount_minor"),
      },
      invoices: {
        totalCount: amount(invoices, "total_count"),
        pkrLabelledCount: amount(invoices, "pkr_labelled_count"),
        nonZeroPkrCount: amount(invoices, "non_zero_pkr_count"),
        lineCount: amount(invoiceLines, "line_count"),
        nonZeroLineCount: amount(invoiceLines, "non_zero_line_count"),
        lineAmountMinor: amount(invoiceLines, "line_amount_minor"),
        subtotalAmountMinor: amount(invoices, "subtotal_amount_minor"),
        taxAmountMinor: amount(invoices, "tax_amount_minor"),
        totalAmountMinor: amount(invoices, "total_amount_minor"),
        paidAmountMinor: amount(invoices, "paid_amount_minor"),
        openReceivableAmountMinor: amount(invoices, "open_receivable_amount_minor"),
      },
      payments: {
        totalCount: amount(payments, "total_count"),
        pkrLinkedCount: amount(payments, "pkr_linked_count"),
        pkrLinkedAmountMinor: amount(payments, "pkr_linked_amount_minor"),
      },
      finance: {
        issuedRevenueAmountMinor: amount(finance, "issued_revenue_amount_minor"),
        collectedAmountMinor: amount(finance, "collected_amount_minor"),
        cogsAmountMinor: amount(finance, "cogs_amount_minor"),
      },
    };

    await client.query("COMMIT");
    process.stdout.write(`${JSON.stringify(evaluateCurrencyMigration(snapshot), null, 2)}\n`);
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await runCurrencyMigrationAudit();
