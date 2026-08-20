CREATE TABLE "inquiry_notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"kind" text DEFAULT 'support_inquiry_received' NOT NULL,
	"status" "notification_outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_notification_outbox_attempt_count_check" CHECK ("inquiry_notification_outbox"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipping_serviceability" (
	"postal_code" text PRIMARY KEY NOT NULL,
	"delhivery_enabled" boolean DEFAULT false NOT NULL,
	"india_post_enabled" boolean DEFAULT false NOT NULL,
	"delivery_min_business_days" integer DEFAULT 3 NOT NULL,
	"delivery_max_business_days" integer DEFAULT 7 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_serviceability_postal_check" CHECK ("shipping_serviceability"."postal_code" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "shipping_serviceability_courier_check" CHECK (NOT "shipping_serviceability"."active" OR "shipping_serviceability"."delhivery_enabled" OR "shipping_serviceability"."india_post_enabled"),
	CONSTRAINT "shipping_serviceability_delivery_check" CHECK ("shipping_serviceability"."delivery_min_business_days" = 3 AND "shipping_serviceability"."delivery_max_business_days" = 7)
);
--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD COLUMN "reconciliation_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD COLUMN "next_reconcile_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD COLUMN "last_reconciliation_error_code" text;--> statement-breakpoint
ALTER TABLE "commerce_settings" ADD COLUMN "tax_policy_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_settings" ADD COLUMN "tax_approval_reference" text;--> statement-breakpoint
ALTER TABLE "commerce_settings" ADD COLUMN "catalog_legal_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_settings" ADD COLUMN "legal_approval_reference" text;--> statement-breakpoint
ALTER TABLE "commerce_settings" ADD COLUMN "support_operations_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "reconciliation_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "next_reconcile_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "last_reconciliation_error_code" text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "customer_reconcile_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "customer_reconciled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_media" ADD COLUMN "approval_reference" text;--> statement-breakpoint
ALTER TABLE "product_media" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_publications" ADD COLUMN "legal_approval_reference" text;--> statement-breakpoint
ALTER TABLE "product_publications" ADD COLUMN "content_approval_reference" text;--> statement-breakpoint
ALTER TABLE "product_publications" ADD COLUMN "media_approval_reference" text;--> statement-breakpoint
ALTER TABLE "variant_prices" ADD COLUMN "approval_reference" text;--> statement-breakpoint
ALTER TABLE "inquiry_notification_outbox" ADD CONSTRAINT "inquiry_notification_outbox_inquiry_id_commerce_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."commerce_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inquiry_notification_outbox_inquiry_kind_unique" ON "inquiry_notification_outbox" USING btree ("inquiry_id","kind");--> statement-breakpoint
CREATE INDEX "inquiry_notification_outbox_status_next_idx" ON "inquiry_notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "shipping_serviceability_active_postal_idx" ON "shipping_serviceability" USING btree ("active","postal_code");--> statement-breakpoint
CREATE INDEX "commerce_refunds_reconciliation_due_idx" ON "commerce_refunds" USING btree ("status","next_reconcile_at","created_at") WHERE "commerce_refunds"."status" = 'processing';--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "payment_attempts"
    WHERE "provider_payment_id" IS NOT NULL
    GROUP BY "provider", "provider_payment_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'payment provider identity collision; resolve duplicate provider_payment_id rows before migration';
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_payment_unique" ON "payment_attempts" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_reconciliation_due_idx" ON "payment_attempts" USING btree ("status","next_reconcile_at","created_at") WHERE "payment_attempts"."provider" = 'cashfree' AND "payment_attempts"."status" IN ('created', 'pending');--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_reconciliation_attempt_check" CHECK ("commerce_refunds"."reconciliation_attempt_count" >= 0);--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_reconciliation_attempt_check" CHECK ("payment_attempts"."reconciliation_attempt_count" >= 0);
