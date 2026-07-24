import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const documentNumberKinds = ["invoice", "payment"] as const;

/**
 * Atomic document-number allocation state.
 *
 * Phase 03 will update one (kind, year) row with
 * INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING.
 */
export const documentNumberCounters = pgTable(
  "document_number_counters",
  {
    kind: text("kind").notNull(),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({
      name: "document_number_counters_kind_year_pk",
      columns: [table.kind, table.year],
    }),
    check(
      "document_number_counters_kind_check",
      sql`${table.kind} in ('invoice', 'payment')`,
    ),
    check(
      "document_number_counters_last_value_check",
      sql`${table.lastValue} >= 0`,
    ),
  ],
);

export type DocumentNumberKind = (typeof documentNumberKinds)[number];
