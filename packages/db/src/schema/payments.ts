import {
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
    number: text("number").unique(),
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
    /**
     * Nullable during the expansion window so the pre-Phase-03 application
     * can still write. Existing rows are deterministically backfilled.
     */
    idempotencyKey: text("idempotency_key").unique(),
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
  ],
);
