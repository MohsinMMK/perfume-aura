import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Better Auth tables isolated from the owner application's auth boundary. */
export const storefrontUser = pgTable("storefront_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("storefront_user_email_lower_unique").on(table.email),
  index("storefront_user_created_at_idx").on(table.createdAt),
]);

export const storefrontSession = pgTable("storefront_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => storefrontUser.id, { onDelete: "cascade" }),
}, (table) => [index("storefront_session_user_id_idx").on(table.userId)]);

export const storefrontAccount = pgTable("storefront_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => storefrontUser.id, { onDelete: "cascade" }),
  /** Better Auth encrypts OAuth token values before these fields are persisted. */
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("storefront_account_user_id_idx").on(table.userId),
  uniqueIndex("storefront_account_provider_account_unique").on(
    table.providerId,
    table.accountId,
  ),
]);

export const storefrontVerification = pgTable("storefront_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [index("storefront_verification_identifier_idx").on(table.identifier)]);

export const storefrontRateLimit = pgTable("storefront_rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const storefrontUserRelations = relations(storefrontUser, ({ many }) => ({
  sessions: many(storefrontSession),
  accounts: many(storefrontAccount),
}));

export const storefrontSessionRelations = relations(storefrontSession, ({ one }) => ({
  user: one(storefrontUser, {
    fields: [storefrontSession.userId],
    references: [storefrontUser.id],
  }),
}));

export const storefrontAccountRelations = relations(storefrontAccount, ({ one }) => ({
  user: one(storefrontUser, {
    fields: [storefrontAccount.userId],
    references: [storefrontUser.id],
  }),
}));
