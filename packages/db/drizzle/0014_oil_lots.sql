CREATE TYPE "public"."oil_movement_type" AS ENUM('receive', 'sale', 'adjust');--> statement-breakpoint
CREATE TABLE "oil_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"received_quantity_ml" integer NOT NULL,
	"remaining_quantity_ml" integer NOT NULL,
	"kg_bottles" integer NOT NULL,
	"note" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oil_lots_values_check" CHECK ("oil_lots"."kg_bottles" > 0
		AND "oil_lots"."received_quantity_ml" > 0
		AND "oil_lots"."remaining_quantity_ml" >= 0
		AND "oil_lots"."remaining_quantity_ml" <= "oil_lots"."received_quantity_ml"
		AND "oil_lots"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "oil_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "oil_movement_type" NOT NULL,
	"quantity_delta_ml" integer NOT NULL,
	"quantity_after_ml" integer NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"note" text,
	"idempotency_key" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oil_movements_quantity_check" CHECK ("oil_movements"."quantity_delta_ml" <> 0 AND "oil_movements"."quantity_after_ml" >= 0),
	CONSTRAINT "oil_movements_direction_check" CHECK ((
		("oil_movements"."type" = 'receive' AND "oil_movements"."quantity_delta_ml" > 0)
		OR ("oil_movements"."type" = 'sale' AND "oil_movements"."quantity_delta_ml" < 0)
		OR "oil_movements"."type" = 'adjust'
	)),
	CONSTRAINT "oil_movements_adjust_note_check" CHECK ("oil_movements"."type" <> 'adjust'
		OR ("oil_movements"."note" IS NOT NULL AND btrim("oil_movements"."note") <> '')),
	CONSTRAINT "oil_movements_reference_pair_check" CHECK (("oil_movements"."ref_type" IS NULL) = ("oil_movements"."ref_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "ops_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"invoice_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oil_lots" ADD CONSTRAINT "oil_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oil_movements" ADD CONSTRAINT "oil_movements_lot_id_oil_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."oil_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oil_movements" ADD CONSTRAINT "oil_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_sales" ADD CONSTRAINT "ops_sales_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_sales" ADD CONSTRAINT "ops_sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oil_lots_product_id_created_at_idx" ON "oil_lots" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "oil_movements_lot_id_created_at_idx" ON "oil_movements" USING btree ("lot_id","created_at");--> statement-breakpoint
CREATE INDEX "oil_movements_product_id_created_at_idx" ON "oil_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "oil_movements_ref_type_ref_id_idx" ON "oil_movements" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "oil_movements_created_at_idx" ON "oil_movements" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "oil_movements_idempotency_key_unique" ON "oil_movements" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_sales_idempotency_key_unique" ON "ops_sales" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_sales_invoice_id_unique" ON "ops_sales" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "ops_sales_customer_id_created_at_idx" ON "ops_sales" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE FUNCTION "prevent_oil_movement_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'oil_movements is append-only; use a compensating movement instead of %',
    TG_OP
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "prevent_oil_movement_mutation"() FROM PUBLIC;--> statement-breakpoint
CREATE TRIGGER "oil_movements_append_only"
BEFORE UPDATE OR DELETE ON "oil_movements"
FOR EACH ROW
EXECUTE FUNCTION "prevent_oil_movement_mutation"();
