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
import { products } from "./products";
import { customers } from "./customers";
import { invoices } from "./invoices";

export const oilMovementTypeEnum = pgEnum("oil_movement_type", [
  "receive",
  "sale",
  "adjust",
]);

/**
 * One received concentrate lot. A 1 kg original bottle is 1000 ml.
 * remaining_quantity_ml is a cache; oil_movements is the ledger.
 */
export const oilLots = pgTable(
  "oil_lots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    receivedQuantityMl: integer("received_quantity_ml").notNull(),
    remainingQuantityMl: integer("remaining_quantity_ml").notNull(),
    kgBottles: integer("kg_bottles").notNull(),
    supplierName: text("supplier_name"),
    supplierReference: text("supplier_reference"),
    totalCostCents: integer("total_cost_cents"),
    receivedDate: date("received_date"),
    note: text("note"),
    version: integer("version").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("oil_lots_product_id_created_at_idx").on(
      table.productId,
      table.createdAt,
    ),
    check(
      "oil_lots_values_check",
      sql`${table.kgBottles} > 0
        AND ${table.receivedQuantityMl} > 0
        AND ${table.remainingQuantityMl} >= 0
        AND ${table.remainingQuantityMl} <= ${table.receivedQuantityMl}
        AND (${table.totalCostCents} IS NULL OR ${table.totalCostCents} >= 0)
        AND ${table.version} >= 0`,
    ),
  ],
);

/**
 * Append-only oil ledger. Every remaining-ml change writes a row
 * in the same transaction as the lot cache update.
 */
export const oilMovements = pgTable(
  "oil_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => oilLots.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    type: oilMovementTypeEnum("type").notNull(),
    quantityDeltaMl: integer("quantity_delta_ml").notNull(),
    quantityAfterMl: integer("quantity_after_ml").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    note: text("note"),
    idempotencyKey: text("idempotency_key"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("oil_movements_lot_id_created_at_idx").on(
      table.lotId,
      table.createdAt,
    ),
    index("oil_movements_product_id_created_at_idx").on(
      table.productId,
      table.createdAt,
    ),
    index("oil_movements_ref_type_ref_id_idx").on(table.refType, table.refId),
    index("oil_movements_created_at_idx").on(table.createdAt),
    uniqueIndex("oil_movements_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    check(
      "oil_movements_quantity_check",
      sql`${table.quantityDeltaMl} <> 0 AND ${table.quantityAfterMl} >= 0`,
    ),
    check(
      "oil_movements_direction_check",
      sql`(
        (${table.type} = 'receive' AND ${table.quantityDeltaMl} > 0)
        OR (${table.type} = 'sale' AND ${table.quantityDeltaMl} < 0)
        OR ${table.type} = 'adjust'
      )`,
    ),
    check(
      "oil_movements_adjust_note_check",
      sql`${table.type} <> 'adjust'
        OR (${table.note} IS NOT NULL AND btrim(${table.note}) <> '')`,
    ),
    check(
      "oil_movements_reference_pair_check",
      sql`(${table.refType} IS NULL) = (${table.refId} IS NULL)`,
    ),
  ],
);

/** Idempotent offline sale completion receipt. */
export const opsSales = pgTable(
  "ops_sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ops_sales_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("ops_sales_invoice_id_unique").on(table.invoiceId),
    index("ops_sales_customer_id_created_at_idx").on(
      table.customerId,
      table.createdAt,
    ),
  ],
);
