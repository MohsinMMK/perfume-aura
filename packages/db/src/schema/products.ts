import { sql } from "drizzle-orm";
import {
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

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "archived",
]);

export const variantStatusEnum = pgEnum("variant_status", [
  "active",
  "archived",
]);

/**
 * A product line such as Signature or Inspired. Its slug matches the
 * storefront collection slug. Every product made at sale uses the series'
 * oil concentration; the rest of each bottle is the shared base mixture.
 */
export const productSeries = pgTable(
  "product_series",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    oilConcentrationPercent: integer("oil_concentration_percent")
      .notNull()
      .default(50),
    /** Warn when a product's unreserved oil falls to this many ml. */
    oilReorderLevelMl: integer("oil_reorder_level_ml").notNull().default(0),
    position: integer("position").notNull().default(0),
    status: productStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "product_series_values_check",
      sql`${table.oilConcentrationPercent} BETWEEN 1 AND 100
        AND ${table.oilReorderLevelMl} >= 0
        AND ${table.position} >= 0
        AND btrim(${table.name}) <> ''`,
    ),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    brand: text("brand"),
    category: text("category"),
    description: text("description"),
    seriesId: uuid("series_id").references(() => productSeries.id, {
      onDelete: "restrict",
    }),
    status: productStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("products_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    index("products_series_id_idx").on(table.seriesId),
  ],
);

/**
 * Sellable SKU = product × size. Money fields use integer INR minor units (paise)
 * only after the audited currency migration gate passes.
 * quantity_on_hand is the v1 balance cache; ledger is stock_movements.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    barcode: text("barcode"),
    sizeMl: integer("size_ml").notNull(),
    /** Cost in INR integer paise after the currency gate. */
    costCents: integer("cost_cents").notNull().default(0),
    /** Retail in INR integer paise after the currency gate. */
    retailCents: integer("retail_cents").notNull().default(0),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    qtyReserved: integer("qty_reserved").notNull().default(0),
    reorderLevel: integer("reorder_level").notNull().default(0),
    /** Optimistic concurrency for stock updates. */
    version: integer("version").notNull().default(0),
    status: variantStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("product_variants_product_id_size_ml_unique").on(
      table.productId,
      table.sizeMl,
    ),
    index("product_variants_status_idx").on(table.status),
    check(
      "product_variants_values_check",
      sql`${table.sizeMl} > 0
        AND ${table.costCents} >= 0
        AND ${table.retailCents} >= 0
        AND ${table.quantityOnHand} >= 0
        AND ${table.qtyReserved} >= 0
        AND ${table.reorderLevel} >= 0
        AND ${table.version} >= 0
        AND ${table.qtyReserved} <= ${table.quantityOnHand}`,
    ),
  ],
);
