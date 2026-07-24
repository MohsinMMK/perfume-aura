DROP INDEX "product_variants_product_id_size_ml_idx";--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_id_size_ml_unique" ON "product_variants" USING btree ("product_id","size_ml");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");