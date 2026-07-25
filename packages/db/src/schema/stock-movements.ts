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
import { productVariants } from "./products";
import { locations } from "./locations";

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "receive",
  "sale",
  "adjust",
  "damage",
  "return",
]);

export const stockCostBasisEnum = pgEnum("stock_cost_basis", [
  "snapshot",
  "legacy_current",
]);

/**
 * Append-only inventory ledger. Every balance change has a row written
 * in the same transaction as the quantity_on_hand update.
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    type: stockMovementTypeEnum("type").notNull(),
    /** Signed delta applied to on-hand (receive/return +, sale/damage −). */
    quantityDelta: integer("quantity_delta").notNull(),
    /** On-hand balance after this movement. */
    quantityAfter: integer("quantity_after").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    note: text("note"),
    idempotencyKey: text("idempotency_key").unique(),
    /**
     * Historical per-unit cost for a sale. The column remains nullable because
     * non-sale rows must omit it; the contract check requires it on every sale.
     */
    unitCostCents: integer("unit_cost_cents"),
    costBasis: stockCostBasisEnum("cost_basis"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("stock_movements_variant_id_created_at_idx").on(
      table.variantId,
      table.createdAt,
    ),
    index("stock_movements_location_id_created_at_idx").on(
      table.locationId,
      table.createdAt,
    ),
    index("stock_movements_ref_type_ref_id_idx").on(
      table.refType,
      table.refId,
    ),
    index("stock_movements_type_created_at_idx").on(
      table.type,
      table.createdAt,
    ),
    /** Supports the unfiltered recent-movements list and date-only scans. */
    index("stock_movements_created_at_idx").on(table.createdAt),
    check(
      "stock_movements_quantity_check",
      sql`${table.quantityDelta} <> 0 AND ${table.quantityAfter} >= 0`,
    ),
    check(
      "stock_movements_direction_check",
      sql`(
        (${table.type} IN ('receive', 'return') AND ${table.quantityDelta} > 0)
        OR (${table.type} IN ('sale', 'damage') AND ${table.quantityDelta} < 0)
        OR ${table.type} = 'adjust'
      )`,
    ),
    check(
      "stock_movements_adjust_note_check",
      sql`${table.type} <> 'adjust'
        OR (${table.note} IS NOT NULL AND btrim(${table.note}) <> '')`,
    ),
    check(
      "stock_movements_reference_pair_check",
      sql`(${table.refType} IS NULL) = (${table.refId} IS NULL)`,
    ),
    check(
      "stock_movements_cost_snapshot_check",
      sql`(
        (
          ${table.type} = 'sale'
          AND ${table.unitCostCents} IS NOT NULL
          AND ${table.unitCostCents} >= 0
          AND ${table.costBasis} IS NOT NULL
        )
        OR (
          ${table.type} <> 'sale'
          AND ${table.unitCostCents} IS NULL
          AND ${table.costBasis} IS NULL
        )
      )`,
    ),
  ],
);
