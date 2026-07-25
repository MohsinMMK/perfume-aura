ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_values_check"
  CHECK (
    "size_ml" > 0
    AND "cost_cents" >= 0
    AND "retail_cents" >= 0
    AND "quantity_on_hand" >= 0
    AND "qty_reserved" >= 0
    AND "reorder_level" >= 0
    AND "version" >= 0
    AND "qty_reserved" <= "quantity_on_hand"
  ) NOT VALID;
--> statement-breakpoint
ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_quantity_check"
  CHECK ("quantity_delta" <> 0 AND "quantity_after" >= 0) NOT VALID,
  ADD CONSTRAINT "stock_movements_direction_check"
  CHECK (
    ("type" IN ('receive', 'return') AND "quantity_delta" > 0)
    OR ("type" IN ('sale', 'damage') AND "quantity_delta" < 0)
    OR "type" = 'adjust'
  ) NOT VALID,
  ADD CONSTRAINT "stock_movements_adjust_note_check"
  CHECK (
    "type" <> 'adjust'
    OR ("note" IS NOT NULL AND btrim("note") <> '')
  ) NOT VALID,
  ADD CONSTRAINT "stock_movements_reference_pair_check"
  CHECK (("ref_type" IS NULL) = ("ref_id" IS NULL)) NOT VALID,
  ADD CONSTRAINT "stock_movements_cost_snapshot_check"
  CHECK (
    (
      "type" = 'sale'
      AND "unit_cost_cents" IS NOT NULL
      AND "unit_cost_cents" >= 0
      AND "cost_basis" IS NOT NULL
    )
    OR (
      "type" <> 'sale'
      AND "unit_cost_cents" IS NULL
      AND "cost_basis" IS NULL
    )
  ) NOT VALID;
--> statement-breakpoint
ALTER TABLE "invoice_lines"
  ADD CONSTRAINT "invoice_lines_values_check"
  CHECK (
    "quantity" > 0
    AND "unit_price_cents" >= 0
    AND "line_total_cents" >= 0
    AND "line_total_cents"::bigint
      = "quantity"::bigint * "unit_price_cents"::bigint
    AND "quantity_fulfilled" BETWEEN 0 AND "quantity"
    AND ("variant_id" IS NOT NULL OR "quantity_fulfilled" = 0)
  ) NOT VALID;
--> statement-breakpoint
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_money_check"
  CHECK (
    "subtotal_cents" >= 0
    AND "tax_cents" >= 0
    AND "total_cents" >= 0
    AND "amount_paid_cents" >= 0
    AND "total_cents"::bigint
      = "subtotal_cents"::bigint + "tax_cents"::bigint
    AND "amount_paid_cents" <= "total_cents"
  ) NOT VALID,
  ADD CONSTRAINT "invoices_number_format_check"
  CHECK (
    CASE
      WHEN "number" IS NULL THEN true
      WHEN "number" !~ '^INV-[0-9]{4}-[0-9]{4,}$' THEN false
      WHEN
        coalesce(
          nullif(
            ltrim(substring("number" from '-([0-9]+)$'), '0'),
            ''
          ),
          '0'
        ) = '0'
        THEN false
      WHEN
        length(
          ltrim(substring("number" from '-([0-9]+)$'), '0')
        ) < 10
        THEN true
      WHEN
        length(
          ltrim(substring("number" from '-([0-9]+)$'), '0')
        ) = 10
        AND
          ltrim(substring("number" from '-([0-9]+)$'), '0')
          COLLATE "C" <= '2147483647' COLLATE "C"
        THEN true
      ELSE false
    END
  ) NOT VALID,
  ADD CONSTRAINT "invoices_lifecycle_check"
  CHECK (
    (
      "status" = 'draft'
      AND "number" IS NULL
      AND "issued_at" IS NULL
      AND "paid_at" IS NULL
      AND "voided_at" IS NULL
      AND "amount_paid_cents" = 0
    )
    OR (
      "status" = 'issued'
      AND "number" IS NOT NULL
      AND "issued_at" IS NOT NULL
      AND "paid_at" IS NULL
      AND "voided_at" IS NULL
      AND "amount_paid_cents" < "total_cents"
    )
    OR (
      "status" = 'paid'
      AND "number" IS NOT NULL
      AND "issued_at" IS NOT NULL
      AND "paid_at" IS NOT NULL
      AND "voided_at" IS NULL
      AND "amount_paid_cents" = "total_cents"
    )
    OR (
      "status" = 'void'
      AND "number" IS NOT NULL
      AND "issued_at" IS NOT NULL
      AND "paid_at" IS NULL
      AND "voided_at" IS NOT NULL
      AND "amount_paid_cents" = 0
    )
  ) NOT VALID;
--> statement-breakpoint
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_values_check"
  CHECK (
    "amount_cents" > 0
    AND CASE
      WHEN "number" IS NULL THEN false
      WHEN "number" !~ '^PAY-[0-9]{4}-[0-9]{4,}$' THEN false
      WHEN
        coalesce(
          nullif(
            ltrim(substring("number" from '-([0-9]+)$'), '0'),
            ''
          ),
          '0'
        ) = '0'
        THEN false
      WHEN
        length(
          ltrim(substring("number" from '-([0-9]+)$'), '0')
        ) < 10
        THEN true
      WHEN
        length(
          ltrim(substring("number" from '-([0-9]+)$'), '0')
        ) = 10
        AND
          ltrim(substring("number" from '-([0-9]+)$'), '0')
          COLLATE "C" <= '2147483647' COLLATE "C"
        THEN true
      ELSE false
    END
    AND "idempotency_key" IS NOT NULL
    AND btrim("idempotency_key") <> ''
  ) NOT VALID;
--> statement-breakpoint
ALTER TABLE "product_variants"
  VALIDATE CONSTRAINT "product_variants_values_check";
--> statement-breakpoint
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_quantity_check";
--> statement-breakpoint
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_direction_check";
--> statement-breakpoint
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_adjust_note_check";
--> statement-breakpoint
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_reference_pair_check";
--> statement-breakpoint
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_cost_snapshot_check";
--> statement-breakpoint
ALTER TABLE "invoice_lines"
  VALIDATE CONSTRAINT "invoice_lines_values_check";
--> statement-breakpoint
ALTER TABLE "invoices"
  VALIDATE CONSTRAINT "invoices_money_check";
--> statement-breakpoint
ALTER TABLE "invoices"
  VALIDATE CONSTRAINT "invoices_number_format_check";
--> statement-breakpoint
ALTER TABLE "invoices"
  VALIDATE CONSTRAINT "invoices_lifecycle_check";
--> statement-breakpoint
ALTER TABLE "payments"
  VALIDATE CONSTRAINT "payments_values_check";
--> statement-breakpoint
ALTER TABLE "payments"
  ALTER COLUMN "number" SET NOT NULL,
  ALTER COLUMN "idempotency_key" SET NOT NULL;
--> statement-breakpoint
CREATE FUNCTION "prevent_stock_movement_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'stock_movements is append-only; use a compensating movement instead of %',
    TG_OP
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "prevent_stock_movement_mutation"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "stock_movements_append_only"
BEFORE UPDATE OR DELETE ON "stock_movements"
FOR EACH ROW
EXECUTE FUNCTION "prevent_stock_movement_mutation"();
