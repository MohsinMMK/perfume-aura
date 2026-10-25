import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { productSeries, productStatusEnum } from "./products";

/** Bottles and boxes are counted in pieces; the base mixture in ml. */
export const supplyKindEnum = pgEnum("supply_kind", ["bottle", "box", "base"]);

export const supplyMovementTypeEnum = pgEnum("supply_movement_type", [
  "receive",
  "sale",
  "adjust",
]);

/**
 * Packaging and the shared base mixture used to make a bottle at sale.
 * quantity_on_hand is a cache; supply_movements is the ledger.
 */
export const supplyItems = pgTable(
  "supply_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: supplyKindEnum("kind").notNull(),
    name: text("name").notNull(),
    /** Bottle or box capacity it fits; null for the base mixture. */
    sizeMl: integer("size_ml"),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    reorderLevel: integer("reorder_level").notNull().default(0),
    status: productStatusEnum("status").notNull().default("active"),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("supply_items_kind_name_unique").on(table.kind, table.name),
    /** Every product shares one active base mixture. */
    uniqueIndex("supply_items_one_active_base_unique")
      .on(table.kind)
      .where(sql`${table.kind} = 'base' AND ${table.status} = 'active'`),
    check(
      "supply_items_values_check",
      sql`${table.quantityOnHand} >= 0
        AND ${table.reorderLevel} >= 0
        AND ${table.version} >= 0
        AND btrim(${table.name}) <> ''
        AND (${table.sizeMl} IS NULL OR ${table.sizeMl} > 0)
        AND (${table.kind} <> 'base' OR ${table.sizeMl} IS NULL)`,
    ),
  ],
);

/**
 * Append-only supply ledger. Every on-hand change writes a row in the same
 * transaction as the supply_items cache update.
 */
export const supplyMovements = pgTable(
  "supply_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplyItems.id, { onDelete: "restrict" }),
    type: supplyMovementTypeEnum("type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    /** Purchase cost of a receipt in INR paise. */
    totalCostCents: integer("total_cost_cents"),
    supplierName: text("supplier_name"),
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
    index("supply_movements_supply_id_created_at_idx").on(
      table.supplyId,
      table.createdAt,
    ),
    index("supply_movements_ref_type_ref_id_idx").on(
      table.refType,
      table.refId,
    ),
    index("supply_movements_created_at_idx").on(table.createdAt),
    uniqueIndex("supply_movements_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    check(
      "supply_movements_quantity_check",
      sql`${table.quantityDelta} <> 0 AND ${table.quantityAfter} >= 0`,
    ),
    check(
      "supply_movements_direction_check",
      sql`(
        (${table.type} = 'receive' AND ${table.quantityDelta} > 0)
        OR (${table.type} = 'sale' AND ${table.quantityDelta} < 0)
        OR ${table.type} = 'adjust'
      )`,
    ),
    check(
      "supply_movements_adjust_note_check",
      sql`${table.type} <> 'adjust'
        OR (${table.note} IS NOT NULL AND btrim(${table.note}) <> '')`,
    ),
    check(
      "supply_movements_cost_check",
      sql`${table.totalCostCents} IS NULL
        OR (${table.type} = 'receive' AND ${table.totalCostCents} >= 0)`,
    ),
    check(
      "supply_movements_reference_pair_check",
      sql`(${table.refType} IS NULL) = (${table.refId} IS NULL)`,
    ),
  ],
);

/**
 * A size a series is sold in, its default price and the packaging one
 * finished bottle uses. Products in the series get a variant per size.
 */
export const seriesSizes = pgTable(
  "series_sizes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => productSeries.id, { onDelete: "restrict" }),
    sizeMl: integer("size_ml").notNull(),
    /** Default retail for new variants of this size, INR paise. */
    defaultRetailCents: integer("default_retail_cents").notNull().default(0),
    bottleSupplyId: uuid("bottle_supply_id").references(() => supplyItems.id, {
      onDelete: "restrict",
    }),
    boxSupplyId: uuid("box_supply_id").references(() => supplyItems.id, {
      onDelete: "restrict",
    }),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("series_sizes_series_id_size_ml_unique").on(
      table.seriesId,
      table.sizeMl,
    ),
    check(
      "series_sizes_values_check",
      sql`${table.sizeMl} > 0
        AND ${table.defaultRetailCents} >= 0
        AND ${table.position} >= 0`,
    ),
  ],
);
