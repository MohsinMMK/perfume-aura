ALTER TABLE "oil_lots" DROP CONSTRAINT "oil_lots_values_check";--> statement-breakpoint
ALTER TABLE "oil_lots" ADD COLUMN "supplier_name" text;--> statement-breakpoint
ALTER TABLE "oil_lots" ADD COLUMN "supplier_reference" text;--> statement-breakpoint
ALTER TABLE "oil_lots" ADD COLUMN "total_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "oil_lots" ADD COLUMN "received_date" date;--> statement-breakpoint
ALTER TABLE "oil_lots" ADD CONSTRAINT "oil_lots_values_check" CHECK ("oil_lots"."kg_bottles" > 0
        AND "oil_lots"."received_quantity_ml" > 0
        AND "oil_lots"."remaining_quantity_ml" >= 0
        AND "oil_lots"."remaining_quantity_ml" <= "oil_lots"."received_quantity_ml"
        AND ("oil_lots"."total_cost_cents" IS NULL OR "oil_lots"."total_cost_cents" >= 0)
        AND "oil_lots"."version" >= 0);