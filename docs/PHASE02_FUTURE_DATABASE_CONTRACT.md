# Database contract applied after the Phase 04 auth expansion

> Implemented locally as `0008_phase03_contract`, ordered immediately after
> additive Better Auth/rate-limit migration `0007_phase04_auth_expansion`.
> Provider application remains reserved for the Phase 07 write-freeze gate.
> The SQL below remains the reviewed contract and test target.

## Precondition

`packages/db/sql/phase02-reconciliation.sql` must return zero for every check.
That includes clean invoice subtotal caches, clean aggregate fulfillment at
`(invoice_id, variant_id)`, zero fulfillment on free-text lines, no fulfilled
draft or void invoice, and no non-draft invoice without lines. The write freeze
remains active while this contract is applied. The deployed application must
already write payment idempotency keys and sale cost snapshots, must use atomic
counters, and must never clean up stock movements with update/delete. Payment
immutability remains deferred as described below.

## Applied check and nullability SQL

```sql
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

ALTER TABLE "product_variants"
  VALIDATE CONSTRAINT "product_variants_values_check";
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_quantity_check";
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_direction_check";
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_adjust_note_check";
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_reference_pair_check";
ALTER TABLE "stock_movements"
  VALIDATE CONSTRAINT "stock_movements_cost_snapshot_check";
ALTER TABLE "invoice_lines"
  VALIDATE CONSTRAINT "invoice_lines_values_check";
ALTER TABLE "invoices"
  VALIDATE CONSTRAINT "invoices_money_check";
ALTER TABLE "invoices"
  VALIDATE CONSTRAINT "invoices_number_format_check";
ALTER TABLE "invoices"
  VALIDATE CONSTRAINT "invoices_lifecycle_check";
ALTER TABLE "payments"
  VALIDATE CONSTRAINT "payments_values_check";

ALTER TABLE "payments"
  ALTER COLUMN "number" SET NOT NULL,
  ALTER COLUMN "idempotency_key" SET NOT NULL;
```

`stock_cost_basis` already limits values to `snapshot|legacy_current`.
`legacy_current` is an estimate derived from the variant's then-current cost;
new sale rows must use `snapshot`.

Invoice fulfillment is intentionally not expressed as a cross-row `CHECK`.
`stock_movements` records an invoice reference and variant, but has no
`invoice_line_id`, so the enforceable rollout/application invariant is
aggregate-only: for each `(invoice_id, variant_id)`, summed
`invoice_lines.quantity_fulfilled` must equal the negative sum of matching
invoice-referenced `sale` movement deltas. Return movements are not netted into
that comparison until the project defines an explicit fulfillment-reversal
model. Multiple lines for the same variant therefore reconcile only as one
aggregate and cannot be attributed individually.

Aggregate equality alone is insufficient for invoice status: a draft line with
fulfilled quantity and a matching sale movement still reconciles numerically
but is invalid. Preflight, reconciliation, and the application must separately
require zero line and invoice-referenced sale fulfillment for both `draft` and
`void` invoices.

## Applied stock-ledger trigger SQL

```sql
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

REVOKE ALL ON FUNCTION "prevent_stock_movement_mutation"() FROM PUBLIC;

CREATE TRIGGER "stock_movements_append_only"
BEFORE UPDATE OR DELETE ON "stock_movements"
FOR EACH ROW
EXECUTE FUNCTION "prevent_stock_movement_mutation"();
```

### Intentional payment-trigger deferral

Do not create a `payments` update/delete trigger in this contract. Payments are
positive-only and the project does not yet have a linked reversal/credit-note
row, authorization policy, or authoritative net-sum definition. Making the
table immutable now would remove every safe correction path; inserting another
positive payment is not compensation. Runtime remains limited to
`SELECT, INSERT`, while exceptional correction is an audited administrator
procedure. A future migration may add payment immutability only together with
the reviewed reversal representation and net-sum reconciliation.

## Required future tests

- Every check above rejects its invalid direct-SQL case after validation.
- Invoice and payment number suffixes accept only numeric values from
  `1` through `2147483647`, without overflow-prone casts.
- Draft and void invoices require zero line/sale fulfillment even when those
  two aggregates match; void invoices additionally require a zero cached paid
  amount and zero authoritative payment sum.
- Free-text invoice lines reject nonzero fulfillment.
- Reconciliation proves every invoice subtotal equals the sum of its line
  totals, every non-draft invoice has at least one line, and every aggregate
  `(invoice_id, variant_id)` fulfillment quantity equals invoice-referenced
  sale movements without netting returns.
- Payment `number` and `idempotency_key` reject null/blank values.
- Sale rows require a nonnegative cost with `snapshot|legacy_current`; non-sale
  rows reject cost fields.
- Updating a variant cost never changes an existing movement cost.
- Runtime and owner sessions both receive SQLSTATE `55000` for stock movement
  update/delete; compensating stock movements remain allowed.
- No payments append-only trigger exists before the linked reversal/net-sum
  model is implemented.
- The runtime role cannot bypass triggers, create/alter/truncate objects, or
  acquire the migration role.
- The final journal order is: Phase 02 expansion set, Phase 04 auth expansion,
  then this contract.

PostgreSQL `CHECK` expressions accept null unless nullability is asserted, which
is why the contract explicitly validates required-value checks before applying
`SET NOT NULL`.
