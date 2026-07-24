DROP INDEX "invoice_lines_invoice_id_position_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_lines_invoice_id_position_unique" ON "invoice_lines" USING btree ("invoice_id","position");