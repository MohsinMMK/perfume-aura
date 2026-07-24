WITH
"raw_document_numbers" AS (
	SELECT
		'invoice'::text AS "kind",
		("match"."parts")[1]::integer AS "year",
		("match"."parts")[2] AS "suffix"
	FROM "invoices"
	CROSS JOIN LATERAL regexp_match(
		"invoices"."number",
		'^INV-([0-9]{4})-([0-9]+)$'
	) AS "match"("parts")
	WHERE
		"invoices"."number" IS NOT NULL
		AND "match"."parts" IS NOT NULL

	UNION ALL

	SELECT
		'payment'::text AS "kind",
		("match"."parts")[1]::integer AS "year",
		("match"."parts")[2] AS "suffix"
	FROM "payments"
	CROSS JOIN LATERAL regexp_match(
		"payments"."number",
		'^PAY-([0-9]{4})-([0-9]+)$'
	) AS "match"("parts")
	WHERE
		"payments"."number" IS NOT NULL
		AND "match"."parts" IS NOT NULL
),
"normalized_document_numbers" AS (
	SELECT
		"kind",
		"year",
		"suffix",
		coalesce(nullif(ltrim("suffix", '0'), ''), '0') AS "normalized_value"
	FROM "raw_document_numbers"
),
"parsed_document_numbers" AS (
	SELECT
		"kind",
		"year",
		"suffix",
		"normalized_value",
		CASE
			WHEN "normalized_value" = '0' THEN false
			WHEN length("normalized_value") < 10 THEN true
			WHEN
				length("normalized_value") = 10
				AND "normalized_value" COLLATE "C" <= '2147483647' COLLATE "C"
				THEN true
			ELSE false
		END AS "in_range"
	FROM "normalized_document_numbers"
),
"invoice_line_totals" AS (
	SELECT
		"invoice_id",
		coalesce(sum("line_total_cents"::bigint), 0) AS "subtotal",
		coalesce(sum("quantity_fulfilled"::bigint), 0) AS "fulfilled"
	FROM "invoice_lines"
	GROUP BY "invoice_id"
),
"line_fulfillment_by_variant" AS (
	SELECT
		"invoice_id"::text AS "invoice_id",
		"variant_id",
		sum("quantity_fulfilled"::bigint) AS "fulfilled"
	FROM "invoice_lines"
	WHERE "variant_id" IS NOT NULL
	GROUP BY "invoice_id", "variant_id"
),
"sale_fulfillment_by_variant" AS (
	SELECT
		"ref_id" AS "invoice_id",
		"variant_id",
		-sum("quantity_delta"::bigint) AS "fulfilled"
	FROM "stock_movements"
	WHERE
		"type" = 'sale'
		AND "ref_type" = 'invoice'
		AND "ref_id" IS NOT NULL
	GROUP BY "ref_id", "variant_id"
),
"invoice_sale_fulfillment_totals" AS (
	SELECT
		"ref_id" AS "invoice_id",
		-sum("quantity_delta"::bigint) AS "fulfilled"
	FROM "stock_movements"
	WHERE
		"type" = 'sale'
		AND "ref_type" = 'invoice'
		AND "ref_id" IS NOT NULL
	GROUP BY "ref_id"
),
"document_maxima" AS (
	SELECT
		"kind",
		"year",
		max(
			CASE
				WHEN "in_range" THEN "normalized_value"::integer
				ELSE NULL
			END
		) AS "last_value"
	FROM "parsed_document_numbers"
	GROUP BY "kind", "year"
	HAVING bool_or("in_range")
),
"payment_totals" AS (
	SELECT "invoice_id", coalesce(sum("amount_cents"), 0)::bigint AS "paid"
	FROM "payments"
	GROUP BY "invoice_id"
),
"latest_movement" AS (
	SELECT DISTINCT ON ("variant_id")
		"variant_id",
		"quantity_after"
	FROM "stock_movements"
	ORDER BY "variant_id", "created_at" DESC, "id" DESC
),
"checks" AS (
	SELECT
		'counter_behind_legacy_maximum'::text AS "check_name",
		count(*)::bigint AS "issue_count"
	FROM "document_maxima" AS "maximum"
	LEFT JOIN "document_number_counters" AS "counter"
		ON "counter"."kind" = "maximum"."kind"
		AND "counter"."year" = "maximum"."year"
	WHERE
		"counter"."kind" IS NULL
		OR "counter"."last_value" < "maximum"."last_value"

	UNION ALL

	SELECT
		'invalid_invoice_number_format',
		count(*)::bigint
	FROM "invoices"
	WHERE
		"number" IS NOT NULL
		AND "number" !~ '^INV-[0-9]{4}-[0-9]{4,}$'

	UNION ALL

	SELECT
		'invoice_number_suffix_out_of_range',
		count(*)::bigint
	FROM "parsed_document_numbers"
	WHERE "kind" = 'invoice' AND NOT "in_range"

	UNION ALL

	SELECT
		'invalid_payment_number_format',
		count(*)::bigint
	FROM "payments"
	WHERE
		"number" IS NULL
		OR "number" !~ '^PAY-[0-9]{4}-[0-9]{4,}$'

	UNION ALL

	SELECT
		'payment_number_suffix_out_of_range',
		count(*)::bigint
	FROM "parsed_document_numbers"
	WHERE "kind" = 'payment' AND NOT "in_range"

	UNION ALL

	SELECT
		'document_number_semantic_collision',
		count(*)::bigint
	FROM (
		SELECT "kind", "year", "normalized_value"
		FROM "parsed_document_numbers"
		WHERE "in_range"
		GROUP BY "kind", "year", "normalized_value"
		HAVING count(*) > 1
	) AS "collisions"

	UNION ALL

	SELECT
		'payment_missing_or_blank_idempotency',
		count(*)::bigint
	FROM "payments"
	WHERE "idempotency_key" IS NULL OR btrim("idempotency_key") = ''

	UNION ALL

	SELECT
		'payment_duplicate_idempotency',
		count(*)::bigint
	FROM (
		SELECT "idempotency_key"
		FROM "payments"
		WHERE "idempotency_key" IS NOT NULL
		GROUP BY "idempotency_key"
		HAVING count(*) > 1
	) AS "duplicates"

	UNION ALL

	SELECT
		'sale_missing_or_invalid_cost_snapshot',
		count(*)::bigint
	FROM "stock_movements"
	WHERE
		"type" = 'sale'
		AND (
			"unit_cost_cents" IS NULL
			OR "unit_cost_cents" < 0
			OR "cost_basis" IS NULL
		)

	UNION ALL

	SELECT
		'non_sale_with_cost_snapshot',
		count(*)::bigint
	FROM "stock_movements"
	WHERE
		"type" <> 'sale'
		AND ("unit_cost_cents" IS NOT NULL OR "cost_basis" IS NOT NULL)

	UNION ALL

	SELECT
		'invalid_product_variant',
		count(*)::bigint
	FROM "product_variants"
	WHERE
		"size_ml" <= 0
		OR "cost_cents" < 0
		OR "retail_cents" < 0
		OR "quantity_on_hand" < 0
		OR "qty_reserved" < 0
		OR "reorder_level" < 0
		OR "version" < 0
		OR "qty_reserved" > "quantity_on_hand"

	UNION ALL

	SELECT
		'duplicate_product_variant_size',
		count(*)::bigint
	FROM (
		SELECT "product_id", "size_ml"
		FROM "product_variants"
		GROUP BY "product_id", "size_ml"
		HAVING count(*) > 1
	) AS "duplicates"

	UNION ALL

	SELECT
		'invalid_stock_movement',
		count(*)::bigint
	FROM "stock_movements"
	WHERE
		"quantity_delta" = 0
		OR "quantity_after" < 0
		OR ("type" IN ('receive', 'return') AND "quantity_delta" <= 0)
		OR ("type" IN ('sale', 'damage') AND "quantity_delta" >= 0)
		OR (
			"type" = 'adjust'
			AND ("note" IS NULL OR btrim("note") = '')
		)
		OR (("ref_type" IS NULL) <> ("ref_id" IS NULL))

	UNION ALL

	SELECT
		'invalid_invoice_line',
		count(*)::bigint
	FROM "invoice_lines"
	WHERE
		"quantity" <= 0
		OR "unit_price_cents" < 0
		OR "line_total_cents" < 0
		OR "line_total_cents"::bigint
			<> "quantity"::bigint * "unit_price_cents"::bigint
		OR "quantity_fulfilled" < 0
		OR "quantity_fulfilled" > "quantity"

	UNION ALL

	SELECT
		'duplicate_invoice_line_position',
		count(*)::bigint
	FROM (
		SELECT "invoice_id", "position"
		FROM "invoice_lines"
		GROUP BY "invoice_id", "position"
		HAVING count(*) > 1
	) AS "duplicates"

	UNION ALL

	SELECT
		'free_text_line_fulfillment_nonzero',
		count(*)::bigint
	FROM "invoice_lines"
	WHERE "variant_id" IS NULL AND "quantity_fulfilled" <> 0

	UNION ALL

	SELECT
		'draft_invoice_fulfillment_nonzero',
		count(*)::bigint
	FROM "invoices"
	LEFT JOIN "invoice_line_totals"
		ON "invoice_line_totals"."invoice_id" = "invoices"."id"
	LEFT JOIN "invoice_sale_fulfillment_totals"
		ON "invoice_sale_fulfillment_totals"."invoice_id" = "invoices"."id"::text
	WHERE
		"invoices"."status" = 'draft'
		AND (
			coalesce("invoice_line_totals"."fulfilled", 0) <> 0
			OR coalesce("invoice_sale_fulfillment_totals"."fulfilled", 0) <> 0
		)

	UNION ALL

	SELECT
		'non_draft_invoice_without_lines',
		count(*)::bigint
	FROM "invoices"
	WHERE
		"status" <> 'draft'
		AND NOT EXISTS (
			SELECT 1
			FROM "invoice_lines"
			WHERE "invoice_lines"."invoice_id" = "invoices"."id"
		)

	UNION ALL

	SELECT
		'invoice_subtotal_cache_mismatch',
		count(*)::bigint
	FROM "invoices"
	LEFT JOIN "invoice_line_totals"
		ON "invoice_line_totals"."invoice_id" = "invoices"."id"
	WHERE
		"invoices"."subtotal_cents"::bigint
		<> coalesce("invoice_line_totals"."subtotal", 0)

	UNION ALL

	SELECT
		'invoice_fulfillment_quantity_mismatch',
		count(*)::bigint
	FROM "line_fulfillment_by_variant"
	FULL OUTER JOIN "sale_fulfillment_by_variant"
		USING ("invoice_id", "variant_id")
	WHERE
		coalesce("line_fulfillment_by_variant"."fulfilled", 0)
		<> coalesce("sale_fulfillment_by_variant"."fulfilled", 0)

	UNION ALL

	SELECT
		'void_invoice_fulfillment_nonzero',
		count(*)::bigint
	FROM "invoices"
	LEFT JOIN "invoice_line_totals"
		ON "invoice_line_totals"."invoice_id" = "invoices"."id"
	LEFT JOIN "invoice_sale_fulfillment_totals"
		ON "invoice_sale_fulfillment_totals"."invoice_id" = "invoices"."id"::text
	WHERE
		"invoices"."status" = 'void'
		AND (
			coalesce("invoice_line_totals"."fulfilled", 0) <> 0
			OR coalesce("invoice_sale_fulfillment_totals"."fulfilled", 0) <> 0
		)

	UNION ALL

	SELECT
		'invalid_invoice_totals_or_lifecycle',
		count(*)::bigint
	FROM "invoices"
	WHERE
		"subtotal_cents" < 0
		OR "tax_cents" < 0
		OR "total_cents" < 0
		OR "amount_paid_cents" < 0
		OR "total_cents"::bigint
			<> "subtotal_cents"::bigint + "tax_cents"::bigint
		OR "amount_paid_cents" > "total_cents"
		OR (
			"status" = 'draft'
			AND (
				"number" IS NOT NULL
				OR "issued_at" IS NOT NULL
				OR "paid_at" IS NOT NULL
				OR "voided_at" IS NOT NULL
				OR "amount_paid_cents" <> 0
			)
		)
		OR (
			"status" = 'issued'
			AND (
				"number" IS NULL
				OR "issued_at" IS NULL
				OR "paid_at" IS NOT NULL
				OR "voided_at" IS NOT NULL
				OR "amount_paid_cents" >= "total_cents"
			)
		)
		OR (
			"status" = 'paid'
			AND (
				"number" IS NULL
				OR "issued_at" IS NULL
				OR "paid_at" IS NULL
				OR "voided_at" IS NOT NULL
				OR "amount_paid_cents" <> "total_cents"
			)
		)
		OR (
			"status" = 'void'
			AND (
				"number" IS NULL
				OR "issued_at" IS NULL
				OR "paid_at" IS NOT NULL
				OR "voided_at" IS NULL
				OR "amount_paid_cents" <> 0
			)
		)

	UNION ALL

	SELECT
		'invalid_payment',
		count(*)::bigint
	FROM "payments"
	WHERE
		"amount_cents" <= 0
		OR "number" IS NULL
		OR "number" !~ '^PAY-[0-9]{4}-[0-9]{4,}$'
		OR "idempotency_key" IS NULL
		OR btrim("idempotency_key") = ''

	UNION ALL

	SELECT
		'payment_customer_mismatch',
		count(*)::bigint
	FROM "payments"
	INNER JOIN "invoices" ON "invoices"."id" = "payments"."invoice_id"
	WHERE
		"payments"."customer_id" IS NOT NULL
		AND "payments"."customer_id" <> "invoices"."customer_id"

	UNION ALL

	SELECT
		'invoice_payment_cache_mismatch',
		count(*)::bigint
	FROM "invoices"
	LEFT JOIN "payment_totals"
		ON "payment_totals"."invoice_id" = "invoices"."id"
	WHERE
		"invoices"."amount_paid_cents"::bigint
		<> coalesce("payment_totals"."paid", 0)

	UNION ALL

	SELECT
		'void_invoice_authoritative_payment_nonzero',
		count(*)::bigint
	FROM "invoices"
	LEFT JOIN "payment_totals"
		ON "payment_totals"."invoice_id" = "invoices"."id"
	WHERE
		"invoices"."status" = 'void'
		AND coalesce("payment_totals"."paid", 0) <> 0

	UNION ALL

	SELECT
		'inventory_latest_balance_mismatch',
		count(*)::bigint
	FROM "product_variants"
	LEFT JOIN "latest_movement"
		ON "latest_movement"."variant_id" = "product_variants"."id"
	WHERE
		"product_variants"."quantity_on_hand"
		<> coalesce("latest_movement"."quantity_after", 0)
)
SELECT "check_name", "issue_count"
FROM "checks"
ORDER BY "check_name";
