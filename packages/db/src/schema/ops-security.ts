import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Invitation history is event-sourced: no bootstrap credentials, reset URLs,
 * one-time codes, or mail-provider payloads are ever persisted here.
 */
export const staffInvitationEventTypeEnum = pgEnum(
  "staff_invitation_event_type",
  ["created", "delivered", "accepted", "revoked", "expired"],
);

export type OpsAuditMetadata = Record<
  string,
  string | number | boolean | null
>;

export const staffInvitationEvents = pgTable(
  "staff_invitation_events",
  {
    id: text("id").primaryKey(),
    staffUserId: text("staff_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    eventType: staffInvitationEventTypeEnum("event_type").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    metadata: jsonb("metadata")
      .$type<OpsAuditMetadata>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("staff_invitation_events_staff_user_idx").on(table.staffUserId),
    index("staff_invitation_events_email_idx").on(table.email),
    index("staff_invitation_events_occurred_at_idx").on(table.occurredAt),
  ],
);

/**
 * Immutable, redacted operations audit log. Application code accepts only
 * scalar allowlisted metadata, never request bodies, credentials, or tokens.
 */
export const opsAuditEvents = pgTable(
  "ops_audit_events",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata")
      .$type<OpsAuditMetadata>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ops_audit_events_actor_user_idx").on(table.actorUserId),
    index("ops_audit_events_target_idx").on(table.targetType, table.targetId),
    index("ops_audit_events_occurred_at_idx").on(table.occurredAt),
  ],
);
