CREATE TYPE "public"."supply_kind" AS ENUM('bottle', 'box', 'base');--> statement-breakpoint
CREATE TYPE "public"."supply_movement_type" AS ENUM('receive', 'sale', 'adjust');--> statement-breakpoint
CREATE TABLE "product_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"oil_concentration_percent" integer DEFAULT 50 NOT NULL,
	"oil_reorder_level_ml" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_series_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_series_values_check" CHECK ("product_series"."oil_concentration_percent" BETWEEN 1 AND 100
        AND "product_series"."oil_reorder_level_ml" >= 0
        AND "product_series"."position" >= 0
        AND btrim("product_series"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "series_sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"size_ml" integer NOT NULL,
	"default_retail_cents" integer DEFAULT 0 NOT NULL,
	"bottle_supply_id" uuid,
	"box_supply_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_sizes_values_check" CHECK ("series_sizes"."size_ml" > 0
        AND "series_sizes"."default_retail_cents" >= 0
        AND "series_sizes"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "supply_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "supply_kind" NOT NULL,
	"name" text NOT NULL,
	"size_ml" integer,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supply_items_values_check" CHECK ("supply_items"."quantity_on_hand" >= 0
        AND "supply_items"."reorder_level" >= 0
        AND "supply_items"."version" >= 0
        AND btrim("supply_items"."name") <> ''
        AND ("supply_items"."size_ml" IS NULL OR "supply_items"."size_ml" > 0)
        AND ("supply_items"."kind" <> 'base' OR "supply_items"."size_ml" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "supply_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supply_id" uuid NOT NULL,
	"type" "supply_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"quantity_after" integer NOT NULL,
	"total_cost_cents" integer,
	"supplier_name" text,
	"ref_type" text,
	"ref_id" text,
	"note" text,
	"idempotency_key" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supply_movements_quantity_check" CHECK ("supply_movements"."quantity_delta" <> 0 AND "supply_movements"."quantity_after" >= 0),
	CONSTRAINT "supply_movements_direction_check" CHECK ((
        ("supply_movements"."type" = 'receive' AND "supply_movements"."quantity_delta" > 0)
        OR ("supply_movements"."type" = 'sale' AND "supply_movements"."quantity_delta" < 0)
        OR "supply_movements"."type" = 'adjust'
      )),
	CONSTRAINT "supply_movements_adjust_note_check" CHECK ("supply_movements"."type" <> 'adjust'
        OR ("supply_movements"."note" IS NOT NULL AND btrim("supply_movements"."note") <> '')),
	CONSTRAINT "supply_movements_cost_check" CHECK ("supply_movements"."total_cost_cents" IS NULL
        OR ("supply_movements"."type" = 'receive' AND "supply_movements"."total_cost_cents" >= 0)),
	CONSTRAINT "supply_movements_reference_pair_check" CHECK (("supply_movements"."ref_type" IS NULL) = ("supply_movements"."ref_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "series_sizes" ADD CONSTRAINT "series_sizes_series_id_product_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."product_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_sizes" ADD CONSTRAINT "series_sizes_bottle_supply_id_supply_items_id_fk" FOREIGN KEY ("bottle_supply_id") REFERENCES "public"."supply_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_sizes" ADD CONSTRAINT "series_sizes_box_supply_id_supply_items_id_fk" FOREIGN KEY ("box_supply_id") REFERENCES "public"."supply_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_movements" ADD CONSTRAINT "supply_movements_supply_id_supply_items_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supply_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "series_sizes_series_id_size_ml_unique" ON "series_sizes" USING btree ("series_id","size_ml");--> statement-breakpoint
CREATE UNIQUE INDEX "supply_items_kind_name_unique" ON "supply_items" USING btree ("kind","name");--> statement-breakpoint
CREATE UNIQUE INDEX "supply_items_one_active_base_unique" ON "supply_items" USING btree ("kind") WHERE "supply_items"."kind" = 'base' AND "supply_items"."status" = 'active';--> statement-breakpoint
CREATE INDEX "supply_movements_supply_id_created_at_idx" ON "supply_movements" USING btree ("supply_id","created_at");--> statement-breakpoint
CREATE INDEX "supply_movements_ref_type_ref_id_idx" ON "supply_movements" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "supply_movements_created_at_idx" ON "supply_movements" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "supply_movements_idempotency_key_unique" ON "supply_movements" USING btree ("idempotency_key");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_series_id_product_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."product_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_series_id_idx" ON "products" USING btree ("series_id");--> statement-breakpoint
CREATE FUNCTION "prevent_supply_movement_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'supply_movements is append-only; use a compensating movement instead of %',
    TG_OP
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "prevent_supply_movement_mutation"() FROM PUBLIC;--> statement-breakpoint
CREATE TRIGGER "supply_movements_append_only"
BEFORE UPDATE OR DELETE ON "supply_movements"
FOR EACH ROW
EXECUTE FUNCTION "prevent_supply_movement_mutation"();--> statement-breakpoint
INSERT INTO "product_series" ("name", "slug", "oil_concentration_percent", "position")
VALUES ('Inspired', 'inspired', 50, 0), ('Signature', 'signature', 50, 1)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "series_sizes" ("series_id", "size_ml", "default_retail_cents", "position")
SELECT "product_series"."id", "sizes"."size_ml", "sizes"."retail_cents", "sizes"."position"
FROM "product_series"
JOIN (VALUES
  ('inspired', 30, 45000, 0),
  ('inspired', 50, 65000, 1),
  ('inspired', 100, 120000, 2),
  ('signature', 50, 120000, 0),
  ('signature', 105, 220000, 1)
) AS "sizes" ("slug", "size_ml", "retail_cents", "position")
  ON "sizes"."slug" = "product_series"."slug"
ON CONFLICT ("series_id", "size_ml") DO NOTHING;--> statement-breakpoint
INSERT INTO "supply_items" ("kind", "name")
VALUES ('base', 'Base mixture')
ON CONFLICT ("kind", "name") DO NOTHING;
