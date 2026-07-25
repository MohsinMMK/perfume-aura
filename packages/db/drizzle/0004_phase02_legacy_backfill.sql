-- Phase 02 expansion backfill. This migration remains compatible with the
-- pre-Phase-03 application: the new columns intentionally stay nullable.

UPDATE "payments"
SET "idempotency_key" = 'legacy:' || "id"::text
WHERE "idempotency_key" IS NULL;--> statement-breakpoint

UPDATE "stock_movements" AS "movement"
SET
	"unit_cost_cents" = "variant"."cost_cents",
	"cost_basis" = 'legacy_current'::"stock_cost_basis"
FROM "product_variants" AS "variant"
WHERE
	"movement"."type" = 'sale'
	AND "movement"."variant_id" = "variant"."id"
	AND "movement"."unit_cost_cents" IS NULL
	AND "movement"."cost_basis" IS NULL;--> statement-breakpoint

WITH
"raw_document_numbers" AS (
	SELECT
		'invoice'::text AS "kind",
		("match"."parts")[1]::integer AS "year",
		("match"."parts")[2] AS "suffix"
	FROM "invoices"
	CROSS JOIN LATERAL regexp_match(
		"invoices"."number",
		'^INV-([0-9]{4})-([0-9]{4,})$'
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
		'^PAY-([0-9]{4})-([0-9]{4,})$'
	) AS "match"("parts")
	WHERE
		"payments"."number" IS NOT NULL
		AND "match"."parts" IS NOT NULL
),
"normalized_document_numbers" AS (
	SELECT
		"kind",
		"year",
		coalesce(nullif(ltrim("suffix", '0'), ''), '0') AS "normalized_value"
	FROM "raw_document_numbers"
),
"parsed_document_numbers" AS (
	SELECT
		"kind",
		"year",
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
"maxima" AS (
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
)
INSERT INTO "document_number_counters" (
	"kind",
	"year",
	"last_value",
	"updated_at"
)
SELECT "kind", "year", "last_value", now()
FROM "maxima"
ON CONFLICT ("kind", "year") DO UPDATE
SET
	"last_value" = greatest(
		"document_number_counters"."last_value",
		excluded."last_value"
	),
	"updated_at" = now();
