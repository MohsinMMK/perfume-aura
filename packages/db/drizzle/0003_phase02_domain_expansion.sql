CREATE TYPE "public"."stock_cost_basis" AS ENUM('snapshot', 'legacy_current');--> statement-breakpoint
CREATE TABLE "document_number_counters" (
	"kind" text NOT NULL,
	"year" integer NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_number_counters_kind_year_pk" PRIMARY KEY("kind","year"),
	CONSTRAINT "document_number_counters_kind_check" CHECK ("document_number_counters"."kind" in ('invoice', 'payment')),
	CONSTRAINT "document_number_counters_last_value_check" CHECK ("document_number_counters"."last_value" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "unit_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "cost_basis" "stock_cost_basis";--> statement-breakpoint
CREATE INDEX "customers_status_created_at_idx" ON "customers" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_id_position_idx" ON "invoice_lines" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "invoice_lines_variant_id_idx" ON "invoice_lines" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_id_created_at_idx" ON "invoices" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "invoices_status_created_at_idx" ON "invoices" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "invoices_status_issued_at_idx" ON "invoices" USING btree ("status","issued_at");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_paid_at_idx" ON "payments" USING btree ("invoice_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_customer_id_idx" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_size_ml_idx" ON "product_variants" USING btree ("product_id","size_ml");--> statement-breakpoint
CREATE INDEX "product_variants_status_idx" ON "product_variants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_status_created_at_idx" ON "products" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_variant_id_created_at_idx" ON "stock_movements" USING btree ("variant_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_location_id_created_at_idx" ON "stock_movements" USING btree ("location_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_ref_type_ref_id_idx" ON "stock_movements" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "stock_movements_type_created_at_idx" ON "stock_movements" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key");