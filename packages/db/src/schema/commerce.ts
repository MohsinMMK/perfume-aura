import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { invoices } from "./invoices";
import { productVariants, products } from "./products";
import { storefrontUser } from "./storefront-auth";

export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "blocked",
  "approved",
  "published",
  "withdrawn",
]);
export const mediaKindEnum = pgEnum("commerce_media_kind", ["pack", "gallery", "lifestyle", "seo"]);
export const cartStatusEnum = pgEnum("commerce_cart_status", ["active", "converted", "expired", "abandoned"]);
export const checkoutStatusEnum = pgEnum("checkout_status", ["open", "payment_pending", "completed", "cancelled", "expired"]);
export const reservationStatusEnum = pgEnum("stock_reservation_status", ["active", "consumed", "released", "expired"]);
export const orderStatusEnum = pgEnum("commerce_order_status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]);
export const orderPaymentStateEnum = pgEnum("order_payment_state", ["unpaid", "prepaid_pending", "paid", "cod_due", "cod_collected", "partially_refunded", "refunded", "failed"]);
export const commercePaymentProviderEnum = pgEnum("commerce_payment_provider", ["cashfree", "cod"]);
export const paymentAttemptStatusEnum = pgEnum("payment_attempt_status", ["created", "pending", "succeeded", "failed", "cancelled"]);
export const paymentEventProcessingStatusEnum = pgEnum("payment_event_processing_status", ["received", "processing", "processed", "failed"]);
export const refundStatusEnum = pgEnum("commerce_refund_status", ["requested", "processing", "succeeded", "failed", "cancelled"]);
export const notificationOutboxStatusEnum = pgEnum("notification_outbox_status", ["pending", "processing", "sent", "failed"]);
export const shipmentStatusEnum = pgEnum("shipment_status", ["pending", "booked", "shipped", "delivered", "rto", "cancelled"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const returnStatusEnum = pgEnum("return_status", ["requested", "approved", "received", "refunded", "rejected", "cancelled"]);
export const inquiryKindEnum = pgEnum("commerce_inquiry_kind", ["contact", "wholesale"]);
export const inquiryStatusEnum = pgEnum("commerce_inquiry_status", ["new", "in_progress", "resolved", "archived"]);

export const productPublications = pgTable("product_publications", {
  productId: uuid("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  publicName: text("public_name"),
  publicSlug: text("public_slug"),
  scentFamily: text("scent_family"),
  audience: text("audience"),
  season: text("season"),
  concentration: text("concentration"),
  topNotes: text("top_notes").array(),
  heartNotes: text("heart_notes").array(),
  baseNotes: text("base_notes").array(),
  intensity: text("intensity"),
  occasion: text("occasion"),
  longevityGuidance: text("longevity_guidance"),
  sillage: text("sillage"),
  ingredients: text("ingredients"),
  usageInstructions: text("usage_instructions"),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  status: publicationStatusEnum("status").notNull().default("draft"),
  legalApprovedAt: timestamp("legal_approved_at", { withTimezone: true }),
  legalApprovalReference: text("legal_approval_reference"),
  contentApprovedAt: timestamp("content_approved_at", { withTimezone: true }),
  contentApprovalReference: text("content_approval_reference"),
  mediaApprovedAt: timestamp("media_approved_at", { withTimezone: true }),
  mediaApprovalReference: text("media_approval_reference"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  featuredRank: integer("featured_rank"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("product_publications_public_slug_unique").on(table.publicSlug),
  index("product_publications_status_featured_idx").on(table.status, table.featuredRank),
  check("product_publications_featured_rank_check", sql`${table.featuredRank} IS NULL OR ${table.featuredRank} >= 0`),
]);

export const productMedia = pgTable("product_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  kind: mediaKindEnum("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  altText: text("alt_text").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  position: integer("position").notNull().default(0),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalReference: text("approval_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("product_media_product_position_unique").on(table.productId, table.position),
  index("product_media_product_kind_idx").on(table.productId, table.kind),
  check("product_media_dimensions_check", sql`${table.width} > 0 AND ${table.height} > 0 AND ${table.position} >= 0`),
]);

export const commerceCollections = pgTable("commerce_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: publicationStatusEnum("status").notNull().default("draft"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const commerceCollectionProducts = pgTable("commerce_collection_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectionId: uuid("collection_id").notNull().references(() => commerceCollections.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
}, (table) => [
  uniqueIndex("commerce_collection_products_unique").on(table.collectionId, table.productId),
  uniqueIndex("commerce_collection_products_position_unique").on(table.collectionId, table.position),
  check("commerce_collection_products_position_check", sql`${table.position} >= 0`),
]);

export const variantPrices = pgTable("variant_prices", {
  variantId: uuid("variant_id").primaryKey().references(() => productVariants.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("INR"),
  amountMinor: integer("amount_minor").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalReference: text("approval_reference"),
  active: boolean("active").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [check("variant_prices_money_check", sql`${table.currency} = 'INR' AND ${table.amountMinor} >= 0`)]);

export const commerceSettings = pgTable("commerce_settings", {
  id: text("id").primaryKey().default("primary"),
  currency: text("currency").notNull().default("INR"),
  flatShippingAmountMinor: integer("flat_shipping_amount_minor"),
  freeShippingThresholdMinor: integer("free_shipping_threshold_minor"),
  taxTreatment: text("tax_treatment"),
  taxPolicyApproved: boolean("tax_policy_approved").notNull().default(false),
  taxApprovalReference: text("tax_approval_reference"),
  catalogLegalApproved: boolean("catalog_legal_approved").notNull().default(false),
  legalApprovalReference: text("legal_approval_reference"),
  supportChannel: text("support_channel"),
  supportOperationsApproved: boolean("support_operations_approved").notNull().default(false),
  shippingPolicyApproved: boolean("shipping_policy_approved").notNull().default(false),
  returnsPolicyApproved: boolean("returns_policy_approved").notNull().default(false),
  cancellationPolicyApproved: boolean("cancellation_policy_approved").notNull().default(false),
  checkoutEnabled: boolean("checkout_enabled").notNull().default(false),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [check("commerce_settings_money_check", sql`${table.currency} = 'INR' AND (${table.flatShippingAmountMinor} IS NULL OR ${table.flatShippingAmountMinor} >= 0) AND (${table.freeShippingThresholdMinor} IS NULL OR ${table.freeShippingThresholdMinor} >= 0)`)]);

export const shippingServiceability = pgTable("shipping_serviceability", {
  postalCode: text("postal_code").primaryKey(),
  delhiveryEnabled: boolean("delhivery_enabled").notNull().default(false),
  indiaPostEnabled: boolean("india_post_enabled").notNull().default(false),
  deliveryMinBusinessDays: integer("delivery_min_business_days").notNull().default(3),
  deliveryMaxBusinessDays: integer("delivery_max_business_days").notNull().default(7),
  active: boolean("active").notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("shipping_serviceability_active_postal_idx").on(table.active, table.postalCode),
  check("shipping_serviceability_postal_check", sql`${table.postalCode} ~ '^[1-9][0-9]{5}$'`),
  check("shipping_serviceability_courier_check", sql`NOT ${table.active} OR ${table.delhiveryEnabled} OR ${table.indiaPostEnabled}`),
  check("shipping_serviceability_delivery_check", sql`${table.deliveryMinBusinessDays} = 3 AND ${table.deliveryMaxBusinessDays} = 7`),
]);

export const commerceCarts = pgTable("commerce_carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenDigest: text("token_digest").notNull().unique(),
  customerUserId: text("customer_user_id").references(() => storefrontUser.id, { onDelete: "set null" }),
  status: cartStatusEnum("status").notNull().default("active"),
  currency: text("currency").notNull().default("INR"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("commerce_carts_customer_status_idx").on(table.customerUserId, table.status),
  index("commerce_carts_status_expires_idx").on(table.status, table.expiresAt),
  check("commerce_carts_currency_check", sql`${table.currency} = 'INR'`),
]);

export const commerceCartItems = pgTable("commerce_cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => commerceCarts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("commerce_cart_items_cart_variant_unique").on(table.cartId, table.variantId),
  check("commerce_cart_items_quantity_check", sql`${table.quantity} BETWEEN 1 AND 10`),
]);

export const checkoutSessions = pgTable("checkout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => commerceCarts.id, { onDelete: "restrict" }),
  tokenDigest: text("token_digest").notNull().unique(),
  requestId: uuid("request_id").notNull().defaultRandom().unique(),
  payloadDigest: text("payload_digest").notNull().default("legacy"),
  status: checkoutStatusEnum("status").notNull().default("open"),
  pricingVersion: integer("pricing_version").notNull().default(1),
  email: text("email"),
  shippingAddress: jsonb("shipping_address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("checkout_sessions_status_expires_idx").on(table.status, table.expiresAt),
  check("checkout_sessions_pricing_version_check", sql`${table.pricingVersion} > 0`),
]);

export const stockReservations = pgTable("stock_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  checkoutSessionId: uuid("checkout_session_id").notNull().references(() => checkoutSessions.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  status: reservationStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  releaseReason: text("release_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("stock_reservations_checkout_variant_unique").on(table.checkoutSessionId, table.variantId),
  index("stock_reservations_status_expires_idx").on(table.status, table.expiresAt),
  check("stock_reservations_quantity_check", sql`${table.quantity} > 0`),
]);

export const commerceOrders = pgTable("commerce_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  accessTokenDigest: text("access_token_digest").notNull().unique(),
  checkoutSessionId: uuid("checkout_session_id").notNull().unique().references(() => checkoutSessions.id, { onDelete: "restrict" }),
  customerUserId: text("customer_user_id").references(() => storefrontUser.id, { onDelete: "set null" }),
  guestEmail: text("guest_email"),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentState: orderPaymentStateEnum("payment_state").notNull().default("unpaid"),
  currency: text("currency").notNull().default("INR"),
  subtotalAmountMinor: integer("subtotal_amount_minor").notNull(),
  shippingAmountMinor: integer("shipping_amount_minor").notNull().default(0),
  taxAmountMinor: integer("tax_amount_minor").notNull().default(0),
  discountAmountMinor: integer("discount_amount_minor").notNull().default(0),
  totalAmountMinor: integer("total_amount_minor").notNull(),
  shippingAddressSnapshot: jsonb("shipping_address_snapshot").notNull(),
  invoiceId: uuid("invoice_id").unique().references(() => invoices.id, { onDelete: "restrict" }),
  invoiceTransitionKey: text("invoice_transition_key").unique(),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("commerce_orders_customer_placed_idx").on(table.customerUserId, table.placedAt),
  index("commerce_orders_status_placed_idx").on(table.status, table.placedAt),
  check("commerce_orders_money_check", sql`${table.currency} = 'INR' AND ${table.subtotalAmountMinor} >= 0 AND ${table.shippingAmountMinor} >= 0 AND ${table.taxAmountMinor} >= 0 AND ${table.discountAmountMinor} >= 0 AND ${table.totalAmountMinor} >= 0 AND ${table.totalAmountMinor}::bigint = ${table.subtotalAmountMinor}::bigint + ${table.shippingAmountMinor}::bigint + ${table.taxAmountMinor}::bigint - ${table.discountAmountMinor}::bigint`),
  check("commerce_orders_customer_check", sql`${table.customerUserId} IS NOT NULL OR ${table.guestEmail} IS NOT NULL`),
]);

export const commerceOrderItems = pgTable("commerce_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  sizeMlSnapshot: integer("size_ml_snapshot").notNull(),
  unitPriceAmountMinor: integer("unit_price_amount_minor").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalAmountMinor: integer("line_total_amount_minor").notNull(),
  fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("commerce_order_items_order_idx").on(table.orderId),
  check("commerce_order_items_values_check", sql`${table.sizeMlSnapshot} > 0 AND ${table.unitPriceAmountMinor} >= 0 AND ${table.quantity} > 0 AND ${table.lineTotalAmountMinor}::bigint = ${table.unitPriceAmountMinor}::bigint * ${table.quantity}::bigint AND ${table.fulfilledQuantity} BETWEEN 0 AND ${table.quantity}`),
]);

export const commerceOrderEvents = pgTable("commerce_order_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  actorId: text("actor_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("commerce_order_events_order_created_idx").on(table.orderId, table.createdAt)]);

export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  provider: commercePaymentProviderEnum("provider").notNull(),
  status: paymentAttemptStatusEnum("status").notNull().default("created"),
  providerOrderId: text("provider_order_id"),
  providerPaymentId: text("provider_payment_id"),
  providerSessionId: text("provider_session_id"),
  providerOrderExpiresAt: timestamp("provider_order_expires_at", { withTimezone: true }),
  finalizationDeadlineAt: timestamp("finalization_deadline_at", { withTimezone: true }),
  lastReconciledAt: timestamp("last_reconciled_at", { withTimezone: true }),
  reconciliationAttemptCount: integer("reconciliation_attempt_count").notNull().default(0),
  nextReconcileAt: timestamp("next_reconcile_at", { withTimezone: true }),
  lastReconciliationErrorCode: text("last_reconciliation_error_code"),
  customerReconcileLeaseUntil: timestamp("customer_reconcile_lease_until", { withTimezone: true }),
  customerReconciledAt: timestamp("customer_reconciled_at", { withTimezone: true }),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  currency: text("currency").notNull().default("INR"),
  amountMinor: integer("amount_minor").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("payment_attempts_provider_order_unique").on(table.provider, table.providerOrderId),
  uniqueIndex("payment_attempts_provider_payment_unique").on(table.provider, table.providerPaymentId),
  index("payment_attempts_order_created_idx").on(table.orderId, table.createdAt),
  index("payment_attempts_reconciliation_due_idx")
    .on(table.status, table.nextReconcileAt, table.createdAt)
    .where(sql`${table.provider} = 'cashfree' AND ${table.status} IN ('created', 'pending')`),
  check("payment_attempts_reconciliation_attempt_check", sql`${table.reconciliationAttemptCount} >= 0`),
  check("payment_attempts_money_check", sql`${table.currency} = 'INR' AND ${table.amountMinor} > 0`),
]);

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id, { onDelete: "set null" }),
  provider: commercePaymentProviderEnum("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadDigest: text("payload_digest").notNull(),
  signatureVerified: boolean("signature_verified").notNull().default(false),
  webhookVersion: text("webhook_version"),
  idempotencyHeader: text("idempotency_header"),
  processingStatus: paymentEventProcessingStatusEnum("processing_status").notNull().default("received"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureCode: text("failure_code"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.providerEventId),
  index("payment_events_attempt_created_idx").on(table.paymentAttemptId, table.createdAt),
]);

export const commerceRefunds = pgTable("commerce_refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentAttemptId: uuid("payment_attempt_id").notNull().references(() => paymentAttempts.id, { onDelete: "restrict" }),
  providerRefundId: text("provider_refund_id").unique(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: refundStatusEnum("status").notNull().default("requested"),
  currency: text("currency").notNull().default("INR"),
  amountMinor: integer("amount_minor").notNull(),
  reason: text("reason").notNull(),
  providerStatus: text("provider_status"),
  arn: text("arn"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  lastReconciledAt: timestamp("last_reconciled_at", { withTimezone: true }),
  reconciliationAttemptCount: integer("reconciliation_attempt_count").notNull().default(0),
  nextReconcileAt: timestamp("next_reconcile_at", { withTimezone: true }),
  lastReconciliationErrorCode: text("last_reconciliation_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("commerce_refunds_reconciliation_due_idx")
    .on(table.status, table.nextReconcileAt, table.createdAt)
    .where(sql`${table.status} = 'processing'`),
  check("commerce_refunds_reconciliation_attempt_check", sql`${table.reconciliationAttemptCount} >= 0`),
  check("commerce_refunds_money_check", sql`${table.currency} = 'INR' AND ${table.amountMinor} > 0`),
]);

export const notificationOutbox = pgTable("notification_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderEventId: uuid("order_event_id").notNull().references(() => commerceOrderEvents.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: notificationOutboxStatusEnum("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("notification_outbox_event_kind_unique").on(table.orderEventId, table.kind),
  index("notification_outbox_status_next_idx").on(table.status, table.nextAttemptAt),
  check("notification_outbox_attempt_count_check", sql`${table.attemptCount} >= 0`),
]);

export const shipments = pgTable("shipments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  courier: text("courier"),
  trackingNumber: text("tracking_number"),
  status: shipmentStatusEnum("status").notNull().default("pending"),
  codAmountMinor: integer("cod_amount_minor"),
  codCollectedAt: timestamp("cod_collected_at", { withTimezone: true }),
  codReconciledAt: timestamp("cod_reconciled_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  rtoAt: timestamp("rto_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("shipments_order_status_idx").on(table.orderId, table.status),
  check("shipments_cod_amount_check", sql`${table.codAmountMinor} IS NULL OR ${table.codAmountMinor} >= 0`),
]);

export const promotions = pgTable("promotions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountAmountMinor: integer("discount_amount_minor"),
  discountPercentBasisPoints: integer("discount_percent_basis_points"),
  minimumOrderAmountMinor: integer("minimum_order_amount_minor"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  usageLimit: integer("usage_limit"),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [check("promotions_values_check", sql`${table.endsAt} > ${table.startsAt} AND (${table.discountAmountMinor} IS NULL OR ${table.discountAmountMinor} > 0) AND (${table.discountPercentBasisPoints} IS NULL OR ${table.discountPercentBasisPoints} BETWEEN 1 AND 10000) AND ((${table.discountAmountMinor} IS NULL) <> (${table.discountPercentBasisPoints} IS NULL)) AND (${table.minimumOrderAmountMinor} IS NULL OR ${table.minimumOrderAmountMinor} >= 0) AND (${table.usageLimit} IS NULL OR ${table.usageLimit} > 0)`)]);

export const promotionRedemptions = pgTable("promotion_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  promotionId: uuid("promotion_id").notNull().references(() => promotions.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().unique().references(() => commerceOrders.id, { onDelete: "restrict" }),
  customerUserId: text("customer_user_id").references(() => storefrontUser.id, { onDelete: "set null" }),
  discountAmountMinor: integer("discount_amount_minor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("promotion_redemptions_promotion_created_idx").on(table.promotionId, table.createdAt),
  check("promotion_redemptions_amount_check", sql`${table.discountAmountMinor} > 0`),
]);

export const bundles = pgTable("commerce_bundles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: publicationStatusEnum("status").notNull().default("draft"),
  currency: text("currency").notNull().default("INR"),
  amountMinor: integer("amount_minor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [check("commerce_bundles_money_check", sql`${table.currency} = 'INR' AND (${table.amountMinor} IS NULL OR ${table.amountMinor} >= 0)`)]);

export const bundleItems = pgTable("commerce_bundle_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bundleId: uuid("bundle_id").notNull().references(() => bundles.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [
  uniqueIndex("commerce_bundle_items_unique").on(table.bundleId, table.variantId),
  check("commerce_bundle_items_quantity_check", sql`${table.quantity} > 0`),
]);

export const reviews = pgTable("commerce_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id").notNull().unique().references(() => commerceOrderItems.id, { onDelete: "restrict" }),
  customerUserId: text("customer_user_id").references(() => storefrontUser.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  status: reviewStatusEnum("status").notNull().default("pending"),
  moderatedBy: text("moderated_by"),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("commerce_reviews_status_created_idx").on(table.status, table.createdAt),
  check("commerce_reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
]);

export const commerceReturns = pgTable("commerce_returns", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  status: returnStatusEnum("status").notNull().default("requested"),
  reason: text("reason").notNull(),
  customerNotes: text("customer_notes"),
  resolutionNotes: text("resolution_notes"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [index("commerce_returns_order_status_idx").on(table.orderId, table.status)]);

export const commerceReturnItems = pgTable("commerce_return_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  returnId: uuid("return_id").notNull().references(() => commerceReturns.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").notNull().references(() => commerceOrderItems.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  receivedQuantity: integer("received_quantity").notNull().default(0),
}, (table) => [
  uniqueIndex("commerce_return_items_unique").on(table.returnId, table.orderItemId),
  check("commerce_return_items_quantity_check", sql`${table.quantity} > 0 AND ${table.receivedQuantity} BETWEEN 0 AND ${table.quantity}`),
]);

export const customerOrderClaims = pgTable("customer_order_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().unique().references(() => commerceOrders.id, { onDelete: "restrict" }),
  customerUserId: text("customer_user_id").notNull().references(() => storefrontUser.id, { onDelete: "restrict" }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }).notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commerceInquiries = pgTable("commerce_inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: inquiryKindEnum("kind").notNull(),
  status: inquiryStatusEnum("status").notNull().default("new"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  businessName: text("business_name"),
  message: text("message").notNull(),
  consentVersion: text("consent_version").notNull(),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("commerce_inquiries_kind_status_created_idx").on(table.kind, table.status, table.createdAt)]);

export const inquiryNotificationOutbox = pgTable("inquiry_notification_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  inquiryId: uuid("inquiry_id").notNull().references(() => commerceInquiries.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("support_inquiry_received"),
  status: notificationOutboxStatusEnum("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("inquiry_notification_outbox_inquiry_kind_unique").on(table.inquiryId, table.kind),
  index("inquiry_notification_outbox_status_next_idx").on(table.status, table.nextAttemptAt),
  check("inquiry_notification_outbox_attempt_count_check", sql`${table.attemptCount} >= 0`),
]);
