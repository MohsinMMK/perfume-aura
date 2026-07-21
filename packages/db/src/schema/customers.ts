import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "archived",
]);

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  addressLine: text("address_line"),
  city: text("city"),
  notes: text("notes"),
  status: customerStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
