import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { productVariants } from "./products";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "void",
]);

/**
 * Sales invoice. Stock is NOT decremented on issue — only on fulfill
 * via stock_movements (ref_type=invoice, ref_id=invoices.id).
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Null while draft; set on issue as INV-YYYY-#### */
    number: text("number").unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    issueDate: date("issue_date"),
    dueDate: date("due_date"),
    currency: text("currency").notNull().default("INR"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    notes: text("notes"),
    createdBy: text("created_by"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("invoices_customer_id_created_at_idx").on(
      table.customerId,
      table.createdAt,
    ),
    index("invoices_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    index("invoices_status_issued_at_idx").on(table.status, table.issuedAt),
    index("invoices_created_at_idx").on(table.createdAt),
    check(
      "invoices_money_check",
      sql`${table.currency} = 'INR'
        AND ${table.subtotalCents} >= 0
        AND ${table.taxCents} >= 0
        AND ${table.totalCents} >= 0
        AND ${table.amountPaidCents} >= 0
        AND ${table.totalCents}::bigint
          = ${table.subtotalCents}::bigint + ${table.taxCents}::bigint
        AND ${table.amountPaidCents} <= ${table.totalCents}`,
    ),
    check(
      "invoices_number_format_check",
      sql`CASE
        WHEN ${table.number} IS NULL THEN true
        WHEN ${table.number} !~ '^INV-[0-9]{4}-[0-9]{4,}$' THEN false
        WHEN coalesce(
          nullif(ltrim(substring(${table.number} from '-([0-9]+)$'), '0'), ''),
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
      END`,
    ),
    check(
      "invoices_lifecycle_check",
      sql`(
        (
          ${table.status} = 'draft'
          AND ${table.number} IS NULL
          AND ${table.issuedAt} IS NULL
          AND ${table.paidAt} IS NULL
          AND ${table.voidedAt} IS NULL
          AND ${table.amountPaidCents} = 0
        )
        OR (
          ${table.status} = 'issued'
          AND ${table.number} IS NOT NULL
          AND ${table.issuedAt} IS NOT NULL
          AND ${table.paidAt} IS NULL
          AND ${table.voidedAt} IS NULL
          AND ${table.amountPaidCents} < ${table.totalCents}
        )
        OR (
          ${table.status} = 'paid'
          AND ${table.number} IS NOT NULL
          AND ${table.issuedAt} IS NOT NULL
          AND ${table.paidAt} IS NOT NULL
          AND ${table.voidedAt} IS NULL
          AND ${table.amountPaidCents} = ${table.totalCents}
        )
        OR (
          ${table.status} = 'void'
          AND ${table.number} IS NOT NULL
          AND ${table.issuedAt} IS NOT NULL
          AND ${table.paidAt} IS NULL
          AND ${table.voidedAt} IS NOT NULL
          AND ${table.amountPaidCents} = 0
        )
      )`,
    ),
  ],
);

export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    /** Null for free-text lines (no stock fulfill). */
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    /** Bottles already fulfilled (sale movements posted). */
    quantityFulfilled: integer("quantity_fulfilled").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("invoice_lines_invoice_id_position_unique").on(
      table.invoiceId,
      table.position,
    ),
    index("invoice_lines_variant_id_idx").on(table.variantId),
    check(
      "invoice_lines_values_check",
      sql`${table.quantity} > 0
        AND ${table.unitPriceCents} >= 0
        AND ${table.lineTotalCents} >= 0
        AND ${table.lineTotalCents}::bigint
          = ${table.quantity}::bigint * ${table.unitPriceCents}::bigint
        AND ${table.quantityFulfilled} BETWEEN 0 AND ${table.quantity}
        AND (
          ${table.variantId} IS NOT NULL
          OR ${table.quantityFulfilled} = 0
        )`,
    ),
  ],
);
