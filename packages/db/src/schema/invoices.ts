import {
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
    currency: text("currency").notNull().default("PKR"),
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
  ],
);
