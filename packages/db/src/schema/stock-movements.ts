import {
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
     * Historical per-unit cost for a sale. Nullable until Phase 03 writes
     * snapshots and the later post-auth contract migration tightens it.
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
  ],
);
