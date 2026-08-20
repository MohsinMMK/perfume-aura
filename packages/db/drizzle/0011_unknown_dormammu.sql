CREATE TYPE "public"."notification_outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_event_processing_status" AS ENUM('received', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "storefront_customer_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"recipient_name" text NOT NULL,
	"phone" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'IN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storefront_customer_profile_country_check" CHECK ("storefront_customer_profile"."country" = 'IN'),
	CONSTRAINT "storefront_customer_profile_postal_check" CHECK ("storefront_customer_profile"."postal_code" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "storefront_customer_profile_phone_check" CHECK ("storefront_customer_profile"."phone" ~ '^\+91[6-9][0-9]{9}$')
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_event_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" "notification_outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_outbox_attempt_count_check" CHECK ("notification_outbox"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "storefront_account" ADD COLUMN "issuer" text;--> statement-breakpoint
DROP INDEX "storefront_account_provider_account_unique";--> statement-breakpoint
UPDATE "storefront_account"
SET
	"issuer" = CASE
		WHEN "provider_id" = 'credential' THEN 'local:credential'
		WHEN "provider_id" = 'google' THEN 'https://accounts.google.com'
		WHEN "provider_id" = 'apple' THEN 'https://appleid.apple.com'
		ELSE 'urn:better-auth:provider:' || "provider_id"
	END,
	"account_id" = CASE
		WHEN "provider_id" = 'credential' THEN "user_id"
		ELSE "account_id"
	END;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "storefront_account"
		GROUP BY "issuer", "account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'storefront account issuer collision; migration stopped for manual identity review';
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "storefront_account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "payload_digest" text;--> statement-breakpoint
UPDATE "checkout_sessions"
SET "request_id" = "id", "payload_digest" = 'legacy:' || "id"::text;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ALTER COLUMN "request_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ALTER COLUMN "payload_digest" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ALTER COLUMN "request_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "checkout_sessions" ALTER COLUMN "payload_digest" SET DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD COLUMN "provider_status" text;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD COLUMN "arn" text;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD COLUMN "last_reconciled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "provider_session_id" text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "provider_order_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "finalization_deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "last_reconciled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "webhook_version" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "idempotency_header" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "processing_status" "payment_event_processing_status" DEFAULT 'received' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "storefront_customer_profile" ADD CONSTRAINT "storefront_customer_profile_user_id_storefront_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."storefront_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_order_event_id_commerce_order_events_id_fk" FOREIGN KEY ("order_event_id") REFERENCES "public"."commerce_order_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_event_kind_unique" ON "notification_outbox" USING btree ("order_event_id","kind");--> statement-breakpoint
CREATE INDEX "notification_outbox_status_next_idx" ON "notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_account_issuer_account_unique" ON "storefront_account" USING btree ("issuer","account_id");--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_request_id_unique" UNIQUE("request_id");
