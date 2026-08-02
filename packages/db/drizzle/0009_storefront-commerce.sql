CREATE TYPE "public"."commerce_cart_status" AS ENUM('active', 'converted', 'expired', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."checkout_status" AS ENUM('open', 'payment_pending', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."commerce_payment_provider" AS ENUM('cashfree', 'cod');--> statement-breakpoint
CREATE TYPE "public"."commerce_inquiry_kind" AS ENUM('contact', 'wholesale');--> statement-breakpoint
CREATE TYPE "public"."commerce_inquiry_status" AS ENUM('new', 'in_progress', 'resolved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."commerce_media_kind" AS ENUM('pack', 'gallery', 'lifestyle', 'seo');--> statement-breakpoint
CREATE TYPE "public"."order_payment_state" AS ENUM('unpaid', 'prepaid_pending', 'paid', 'cod_due', 'cod_collected', 'partially_refunded', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."commerce_order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');--> statement-breakpoint
CREATE TYPE "public"."payment_attempt_status" AS ENUM('created', 'pending', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'blocked', 'approved', 'published', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."commerce_refund_status" AS ENUM('requested', 'processing', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_reservation_status" AS ENUM('active', 'consumed', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('requested', 'approved', 'received', 'refunded', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'booked', 'shipped', 'delivered', 'rto', 'cancelled');--> statement-breakpoint
CREATE TABLE "storefront_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storefront_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "storefront_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "storefront_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "storefront_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "storefront_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storefront_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "commerce_bundle_items_quantity_check" CHECK ("commerce_bundle_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"amount_minor" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_bundles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "commerce_bundles_money_check" CHECK ("commerce_bundles"."currency" = 'INR' AND ("commerce_bundles"."amount_minor" IS NULL OR "commerce_bundles"."amount_minor" >= 0))
);
--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"status" "checkout_status" DEFAULT 'open' NOT NULL,
	"pricing_version" integer DEFAULT 1 NOT NULL,
	"email" text,
	"shipping_address" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_sessions_token_digest_unique" UNIQUE("token_digest"),
	CONSTRAINT "checkout_sessions_pricing_version_check" CHECK ("checkout_sessions"."pricing_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_cart_items_quantity_check" CHECK ("commerce_cart_items"."quantity" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "commerce_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_digest" text NOT NULL,
	"customer_user_id" text,
	"status" "commerce_cart_status" DEFAULT 'active' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_carts_token_digest_unique" UNIQUE("token_digest"),
	CONSTRAINT "commerce_carts_currency_check" CHECK ("commerce_carts"."currency" = 'INR')
);
--> statement-breakpoint
CREATE TABLE "commerce_collection_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "commerce_collection_products_position_check" CHECK ("commerce_collection_products"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "commerce_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "commerce_inquiry_kind" NOT NULL,
	"status" "commerce_inquiry_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"business_name" text,
	"message" text NOT NULL,
	"consent_version" text NOT NULL,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_status" "commerce_order_status",
	"to_status" "commerce_order_status",
	"idempotency_key" text NOT NULL,
	"actor_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_order_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "commerce_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"size_ml_snapshot" integer NOT NULL,
	"unit_price_amount_minor" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_amount_minor" integer NOT NULL,
	"fulfilled_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_order_items_values_check" CHECK ("commerce_order_items"."size_ml_snapshot" > 0 AND "commerce_order_items"."unit_price_amount_minor" >= 0 AND "commerce_order_items"."quantity" > 0 AND "commerce_order_items"."line_total_amount_minor"::bigint = "commerce_order_items"."unit_price_amount_minor"::bigint * "commerce_order_items"."quantity"::bigint AND "commerce_order_items"."fulfilled_quantity" BETWEEN 0 AND "commerce_order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "commerce_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"access_token_digest" text NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"customer_user_id" text,
	"guest_email" text,
	"status" "commerce_order_status" DEFAULT 'pending' NOT NULL,
	"payment_state" "order_payment_state" DEFAULT 'unpaid' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"subtotal_amount_minor" integer NOT NULL,
	"shipping_amount_minor" integer DEFAULT 0 NOT NULL,
	"tax_amount_minor" integer DEFAULT 0 NOT NULL,
	"discount_amount_minor" integer DEFAULT 0 NOT NULL,
	"total_amount_minor" integer NOT NULL,
	"shipping_address_snapshot" jsonb NOT NULL,
	"invoice_id" uuid,
	"invoice_transition_key" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "commerce_orders_access_token_digest_unique" UNIQUE("access_token_digest"),
	CONSTRAINT "commerce_orders_checkout_session_id_unique" UNIQUE("checkout_session_id"),
	CONSTRAINT "commerce_orders_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "commerce_orders_invoice_transition_key_unique" UNIQUE("invoice_transition_key"),
	CONSTRAINT "commerce_orders_money_check" CHECK ("commerce_orders"."currency" = 'INR' AND "commerce_orders"."subtotal_amount_minor" >= 0 AND "commerce_orders"."shipping_amount_minor" >= 0 AND "commerce_orders"."tax_amount_minor" >= 0 AND "commerce_orders"."discount_amount_minor" >= 0 AND "commerce_orders"."total_amount_minor" >= 0 AND "commerce_orders"."total_amount_minor"::bigint = "commerce_orders"."subtotal_amount_minor"::bigint + "commerce_orders"."shipping_amount_minor"::bigint + "commerce_orders"."tax_amount_minor"::bigint - "commerce_orders"."discount_amount_minor"::bigint),
	CONSTRAINT "commerce_orders_customer_check" CHECK ("commerce_orders"."customer_user_id" IS NOT NULL OR "commerce_orders"."guest_email" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "commerce_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_attempt_id" uuid NOT NULL,
	"provider_refund_id" text,
	"idempotency_key" text NOT NULL,
	"status" "commerce_refund_status" DEFAULT 'requested' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"amount_minor" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_refunds_provider_refund_id_unique" UNIQUE("provider_refund_id"),
	CONSTRAINT "commerce_refunds_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "commerce_refunds_money_check" CHECK ("commerce_refunds"."currency" = 'INR' AND "commerce_refunds"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "commerce_return_items_quantity_check" CHECK ("commerce_return_items"."quantity" > 0 AND "commerce_return_items"."received_quantity" BETWEEN 0 AND "commerce_return_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "commerce_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "return_status" DEFAULT 'requested' NOT NULL,
	"reason" text NOT NULL,
	"customer_notes" text,
	"resolution_notes" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "commerce_settings" (
	"id" text PRIMARY KEY DEFAULT 'primary' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"flat_shipping_amount_minor" integer,
	"free_shipping_threshold_minor" integer,
	"tax_treatment" text,
	"support_channel" text,
	"shipping_policy_approved" boolean DEFAULT false NOT NULL,
	"returns_policy_approved" boolean DEFAULT false NOT NULL,
	"cancellation_policy_approved" boolean DEFAULT false NOT NULL,
	"checkout_enabled" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_settings_money_check" CHECK ("commerce_settings"."currency" = 'INR' AND ("commerce_settings"."flat_shipping_amount_minor" IS NULL OR "commerce_settings"."flat_shipping_amount_minor" >= 0) AND ("commerce_settings"."free_shipping_threshold_minor" IS NULL OR "commerce_settings"."free_shipping_threshold_minor" >= 0))
);
--> statement-breakpoint
CREATE TABLE "customer_order_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_user_id" text NOT NULL,
	"email_verified_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_order_claims_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "commerce_payment_provider" NOT NULL,
	"status" "payment_attempt_status" DEFAULT 'created' NOT NULL,
	"provider_order_id" text,
	"provider_payment_id" text,
	"idempotency_key" text NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"amount_minor" integer NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_attempts_money_check" CHECK ("payment_attempts"."currency" = 'INR' AND "payment_attempts"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_attempt_id" uuid,
	"provider" "commerce_payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_digest" text NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"kind" "commerce_media_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"alt_text" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_dimensions_check" CHECK ("product_media"."width" > 0 AND "product_media"."height" > 0 AND "product_media"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_publications" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"public_name" text,
	"public_slug" text,
	"scent_family" text,
	"top_notes" text[],
	"heart_notes" text[],
	"base_notes" text[],
	"intensity" text,
	"occasion" text,
	"longevity_guidance" text,
	"ingredients" text,
	"usage_instructions" text,
	"short_description" text,
	"long_description" text,
	"seo_title" text,
	"seo_description" text,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"legal_approved_at" timestamp with time zone,
	"content_approved_at" timestamp with time zone,
	"media_approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"featured_rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_publications_featured_rank_check" CHECK ("product_publications"."featured_rank" IS NULL OR "product_publications"."featured_rank" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promotion_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_user_id" text,
	"discount_amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_redemptions_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "promotion_redemptions_amount_check" CHECK ("promotion_redemptions"."discount_amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"discount_amount_minor" integer,
	"discount_percent_basis_points" integer,
	"minimum_order_amount_minor" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"usage_limit" integer,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code"),
	CONSTRAINT "promotions_values_check" CHECK ("promotions"."ends_at" > "promotions"."starts_at" AND ("promotions"."discount_amount_minor" IS NULL OR "promotions"."discount_amount_minor" > 0) AND ("promotions"."discount_percent_basis_points" IS NULL OR "promotions"."discount_percent_basis_points" BETWEEN 1 AND 10000) AND (("promotions"."discount_amount_minor" IS NULL) <> ("promotions"."discount_percent_basis_points" IS NULL)) AND ("promotions"."minimum_order_amount_minor" IS NULL OR "promotions"."minimum_order_amount_minor" >= 0) AND ("promotions"."usage_limit" IS NULL OR "promotions"."usage_limit" > 0))
);
--> statement-breakpoint
CREATE TABLE "commerce_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"customer_user_id" text,
	"rating" integer NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"moderated_by" text,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_reviews_order_item_id_unique" UNIQUE("order_item_id"),
	CONSTRAINT "commerce_reviews_rating_check" CHECK ("commerce_reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"courier" text,
	"tracking_number" text,
	"status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"cod_amount_minor" integer,
	"cod_collected_at" timestamp with time zone,
	"cod_reconciled_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"rto_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_cod_amount_check" CHECK ("shipments"."cod_amount_minor" IS NULL OR "shipments"."cod_amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "stock_reservation_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_reservations_quantity_check" CHECK ("stock_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "variant_prices" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"amount_minor" integer NOT NULL,
	"approved_at" timestamp with time zone,
	"active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_prices_money_check" CHECK ("variant_prices"."currency" = 'INR' AND "variant_prices"."amount_minor" >= 0)
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM product_variants
    WHERE cost_cents <> 0 OR retail_cents <> 0
  ) OR EXISTS (
    SELECT 1
    FROM invoices
    WHERE currency <> 'INR'
      AND (
        currency <> 'PKR'
        OR subtotal_cents <> 0
        OR tax_cents <> 0
        OR total_cents <> 0
        OR amount_paid_cents <> 0
      )
    ) OR EXISTS (
      SELECT 1
      FROM invoice_lines
      JOIN invoices ON invoices.id = invoice_lines.invoice_id
      WHERE invoices.currency = 'PKR'
        AND (
          invoice_lines.unit_price_cents <> 0
          OR invoice_lines.line_total_cents <> 0
        )
    ) OR EXISTS (
      SELECT 1 FROM payments WHERE amount_cents <> 0
  ) OR EXISTS (
    SELECT 1
    FROM stock_movements
    WHERE unit_cost_cents IS NOT NULL AND unit_cost_cents <> 0
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'INR migration blocked: non-zero legacy monetary records require an owner-approved treatment; run pnpm currency:audit first';
  END IF;
END $$;--> statement-breakpoint
UPDATE "invoices" SET "currency" = 'INR' WHERE "currency" = 'PKR';--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_money_check";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "storefront_account" ADD CONSTRAINT "storefront_account_user_id_storefront_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."storefront_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_session" ADD CONSTRAINT "storefront_session_user_id_storefront_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."storefront_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_bundle_items" ADD CONSTRAINT "commerce_bundle_items_bundle_id_commerce_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."commerce_bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_bundle_items" ADD CONSTRAINT "commerce_bundle_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_commerce_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."commerce_carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_cart_items" ADD CONSTRAINT "commerce_cart_items_cart_id_commerce_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."commerce_carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_cart_items" ADD CONSTRAINT "commerce_cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_carts" ADD CONSTRAINT "commerce_carts_customer_user_id_storefront_user_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."storefront_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_collection_products" ADD CONSTRAINT "commerce_collection_products_collection_id_commerce_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."commerce_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_collection_products" ADD CONSTRAINT "commerce_collection_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_events" ADD CONSTRAINT "commerce_order_events_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_customer_user_id_storefront_user_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."storefront_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_return_items" ADD CONSTRAINT "commerce_return_items_return_id_commerce_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."commerce_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_return_items" ADD CONSTRAINT "commerce_return_items_order_item_id_commerce_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."commerce_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_returns" ADD CONSTRAINT "commerce_returns_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order_claims" ADD CONSTRAINT "customer_order_claims_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order_claims" ADD CONSTRAINT "customer_order_claims_customer_user_id_storefront_user_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."storefront_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_publications" ADD CONSTRAINT "product_publications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_customer_user_id_storefront_user_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."storefront_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_reviews" ADD CONSTRAINT "commerce_reviews_order_item_id_commerce_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."commerce_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_reviews" ADD CONSTRAINT "commerce_reviews_customer_user_id_storefront_user_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."storefront_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_prices" ADD CONSTRAINT "variant_prices_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "storefront_account_user_id_idx" ON "storefront_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_account_provider_account_unique" ON "storefront_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "storefront_session_user_id_idx" ON "storefront_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_user_email_lower_unique" ON "storefront_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "storefront_user_created_at_idx" ON "storefront_user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "storefront_verification_identifier_idx" ON "storefront_verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_bundle_items_unique" ON "commerce_bundle_items" USING btree ("bundle_id","variant_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_status_expires_idx" ON "checkout_sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_cart_items_cart_variant_unique" ON "commerce_cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "commerce_carts_customer_status_idx" ON "commerce_carts" USING btree ("customer_user_id","status");--> statement-breakpoint
CREATE INDEX "commerce_carts_status_expires_idx" ON "commerce_carts" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_collection_products_unique" ON "commerce_collection_products" USING btree ("collection_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_collection_products_position_unique" ON "commerce_collection_products" USING btree ("collection_id","position");--> statement-breakpoint
CREATE INDEX "commerce_inquiries_kind_status_created_idx" ON "commerce_inquiries" USING btree ("kind","status","created_at");--> statement-breakpoint
CREATE INDEX "commerce_order_events_order_created_idx" ON "commerce_order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "commerce_order_items_order_idx" ON "commerce_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "commerce_orders_customer_placed_idx" ON "commerce_orders" USING btree ("customer_user_id","placed_at");--> statement-breakpoint
CREATE INDEX "commerce_orders_status_placed_idx" ON "commerce_orders" USING btree ("status","placed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_return_items_unique" ON "commerce_return_items" USING btree ("return_id","order_item_id");--> statement-breakpoint
CREATE INDEX "commerce_returns_order_status_idx" ON "commerce_returns" USING btree ("order_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_order_unique" ON "payment_attempts" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_order_created_idx" ON "payment_attempts" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_unique" ON "payment_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_attempt_created_idx" ON "payment_events" USING btree ("payment_attempt_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_product_position_unique" ON "product_media" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "product_media_product_kind_idx" ON "product_media" USING btree ("product_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "product_publications_public_slug_unique" ON "product_publications" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "product_publications_status_featured_idx" ON "product_publications" USING btree ("status","featured_rank");--> statement-breakpoint
CREATE INDEX "promotion_redemptions_promotion_created_idx" ON "promotion_redemptions" USING btree ("promotion_id","created_at");--> statement-breakpoint
CREATE INDEX "commerce_reviews_status_created_idx" ON "commerce_reviews" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "shipments_order_status_idx" ON "shipments" USING btree ("order_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_reservations_checkout_variant_unique" ON "stock_reservations" USING btree ("checkout_session_id","variant_id");--> statement-breakpoint
CREATE INDEX "stock_reservations_status_expires_idx" ON "stock_reservations" USING btree ("status","expires_at");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_money_check" CHECK ("invoices"."currency" = 'INR'
        AND "invoices"."subtotal_cents" >= 0
        AND "invoices"."tax_cents" >= 0
        AND "invoices"."total_cents" >= 0
        AND "invoices"."amount_paid_cents" >= 0
        AND "invoices"."total_cents"::bigint
          = "invoices"."subtotal_cents"::bigint + "invoices"."tax_cents"::bigint
        AND "invoices"."amount_paid_cents" <= "invoices"."total_cents");
