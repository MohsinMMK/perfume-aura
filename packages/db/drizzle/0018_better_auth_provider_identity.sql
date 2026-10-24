DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "account"
		GROUP BY "provider_id", "account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'ops account provider identity collision; migration stopped for manual identity review';
	END IF;
	IF EXISTS (
		SELECT 1
		FROM "storefront_account"
		GROUP BY "provider_id", "account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'storefront account provider identity collision; migration stopped for manual identity review';
	END IF;
END
$$;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_account_provider_account_unique" ON "storefront_account" USING btree ("provider_id","account_id");--> statement-breakpoint
DROP INDEX "account_issuer_account_id_unique";--> statement-breakpoint
DROP INDEX "storefront_account_issuer_account_unique";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_account" ALTER COLUMN "issuer" DROP NOT NULL;
