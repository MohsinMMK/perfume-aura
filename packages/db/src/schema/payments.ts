import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { invoices } from "./invoices";

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "card",
  "other",
]);

/**
 * Manual payment ledger (Phase 3). Never touches stock.
 * amount_paid_cents on invoices is kept in sync as a cache.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** PAY-YYYY-#### when recorded */
    number: text("number").notNull().unique(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    method: paymentMethodEnum("method").notNull().default("cash"),
    amountCents: integer("amount_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    reference: text("reference"),
    note: text("note"),
    /** Stable retry key supplied by the caller for exactly-once semantics. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_invoice_id_paid_at_idx").on(
      table.invoiceId,
      table.paidAt,
    ),
    index("payments_customer_id_idx").on(table.customerId),
    index("payments_paid_at_idx").on(table.paidAt),
    check(
      "payments_values_check",
      sql`${table.amountCents} > 0
        AND CASE
          WHEN ${table.number} IS NULL THEN false
          WHEN ${table.number} !~ '^PAY-[0-9]{4}-[0-9]{4,}$' THEN false
          WHEN coalesce(
            nullif(
              ltrim(substring(${table.number} from '-([0-9]+)$'), '0'),
              ''
            ),
            '0'
          ) = '0' THEN false
          WHEN length(
            ltrim(substring(${table.number} from '-([0-9]+)$'), '0')
          ) < 10 THEN true
          WHEN length(
            ltrim(substring(${table.number} from '-([0-9]+)$'), '0')
          ) = 10
            AND ltrim(substring(${table.number} from '-([0-9]+)$'), '0')
              COLLATE "C" <= '2147483647' COLLATE "C"
          THEN true
          ELSE false
        END
        AND ${table.idempotencyKey} IS NOT NULL
        AND btrim(${table.idempotencyKey}) <> ''`,
    ),
  ],
);
