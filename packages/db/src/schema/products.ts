import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  brand: text("brand"),
  category: text("category"),
  description: text("description"),
  status: productStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Sellable SKU = product × size. Money fields are integer PKR cents (paisa).
 * quantity_on_hand is the v1 balance cache; ledger is stock_movements.
 */
export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  sizeMl: integer("size_ml").notNull(),
  /** Cost in PKR integer cents (paisa). */
  costCents: integer("cost_cents").notNull().default(0),
  /** Retail in PKR integer cents (paisa). */
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
});
