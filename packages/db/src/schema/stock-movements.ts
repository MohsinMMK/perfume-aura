import {
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

/**
 * Append-only inventory ledger. Every balance change has a row written
 * in the same transaction as the quantity_on_hand update.
 */
export const stockMovements = pgTable("stock_movements", {
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
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
