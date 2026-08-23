ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "account"
		WHERE "provider_id" <> 'credential'
	) THEN
		RAISE EXCEPTION 'ops account provider requires an explicit trusted issuer mapping';
	END IF;
END
$$;--> statement-breakpoint
UPDATE "account"
SET
	"issuer" = 'local:credential',
	"account_id" = "user_id"
WHERE "provider_id" = 'credential';--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "account"
		GROUP BY "issuer", "account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'ops account issuer collision; migration stopped for manual identity review';
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_account_id_unique" ON "account" USING btree ("issuer","account_id");
