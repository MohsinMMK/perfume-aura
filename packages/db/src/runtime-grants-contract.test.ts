import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("customer commerce runtime grant matrices", () => {
  it("keeps raw stock, reservations, and oil writes behind reviewed routines", async () => {
    const [
      storefront,
      paymentFinalizer,
      ops,
      migration,
      reservations,
      paymentFinalization,
      finalizerClient,
      checkout,
      roleBootstrap,
      roleBootstrapScript,
    ] = await Promise.all([
      readFile(new URL("../sql/storefront-runtime-grants.sql", import.meta.url), "utf8"),
      readFile(new URL("../sql/storefront-payment-finalizer-grants.sql", import.meta.url), "utf8"),
      readFile(new URL("../sql/ops-runtime-grants.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0017_storefront_sale_settlement.sql", import.meta.url), "utf8"),
      readFile(new URL("./commerce-reservations.ts", import.meta.url), "utf8"),
      readFile(new URL("../../../apps/storefront/lib/payment-finalization.ts", import.meta.url), "utf8"),
      readFile(new URL("../../../apps/storefront/lib/payment-finalizer-client.ts", import.meta.url), "utf8"),
      readFile(new URL("../../../apps/storefront/lib/checkout.ts", import.meta.url), "utf8"),
      readFile(new URL("../../../deploy/postgres-vps/bootstrap/runtime-roles.sql", import.meta.url), "utf8"),
      readFile(new URL("../../../deploy/postgres-vps/bootstrap/bootstrap-runtime-roles.sh", import.meta.url), "utf8"),
    ]);

    assert.match(storefront, /storefront_customer_profile/);
    assert.match(storefront, /'payment_events', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(storefront, /'inquiry_notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(storefront, /'notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(storefront, /'shipping_serviceability', ARRAY\['SELECT'\]/);
    assert.match(ops, /'inquiry_notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'shipping_serviceability', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'oil_lots', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'oil_movements', ARRAY\['SELECT','INSERT'\]/);
    assert.match(ops, /'ops_sales', ARRAY\['SELECT','INSERT'\]/);

    assert.match(
      storefront,
      /REVOKE ALL PRIVILEGES ON TABLE[\s\S]*?"oil_lots", "oil_movements", "oil_reservations", "stock_reservations"/,
    );
    assert.match(storefront, /\('stock_reservations', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('stock_movements', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('oil_lots', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('oil_movements', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('oil_reservations', ARRAY\[\]::text\[\]\)/);
    assert.match(ops, /\('oil_reservations', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('product_variants', 'cost_cents', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('commerce_settings', ARRAY\['SELECT'\]\)/);
    assert.match(storefront, /\('product_publications', ARRAY\['SELECT'\]\)/);
    assert.match(storefront, /\('variant_prices', ARRAY\['SELECT'\]\)/);
    assert.doesNotMatch(
      storefront,
      /GRANT UPDATE \("qty_reserved", "version", "updated_at"\)[\s\S]*?ON TABLE "product_variants"/,
    );
    assert.doesNotMatch(storefront, /GRANT SELECT \([^)]*oil_lots/);
    assert.doesNotMatch(storefront, /GRANT UPDATE \([^)]*oil_lots/);
    assert.doesNotMatch(storefront, /"oil_movements"\nTO :"runtime_role"/);

    assert.match(
      storefront,
      /GRANT EXECUTE ON FUNCTION public\.reserve_storefront_checkout_stock\(uuid, uuid\[\], integer\[\], timestamptz\)/,
    );
    assert.match(
      storefront,
      /GRANT EXECUTE ON FUNCTION public\.release_storefront_checkout_reservations\(uuid, text, timestamptz\)/,
    );
    assert.doesNotMatch(
      storefront,
      /GRANT EXECUTE ON FUNCTION public\.settle_storefront_checkout_reservations\(uuid, uuid, timestamptz\)/,
    );
    assert.doesNotMatch(
      storefront,
      /GRANT EXECUTE ON FUNCTION public\.finalize_storefront_cashfree_payment\(uuid, uuid, text, integer, text, timestamptz\)/,
    );
    assert.doesNotMatch(
      storefront,
      /GRANT EXECUTE ON FUNCTION public\.bind_storefront_cashfree_payment_attempt\(uuid, text, text, timestamptz\)/,
    );
    assert.doesNotMatch(
      storefront,
      /GRANT EXECUTE ON FUNCTION public\.cancel_storefront_cashfree_payment_attempt\(uuid, text, timestamptz\)/,
    );
    assert.doesNotMatch(storefront, /settle_storefront_sale_stock/);
    assert.match(storefront, /namespace\.nspname = 'public'/);
    assert.match(storefront, /public\.gen_random_uuid/);

    assert.match(
      paymentFinalizer,
      /GRANT EXECUTE ON FUNCTION public\.bind_storefront_cashfree_payment_attempt\(uuid, text, text, timestamptz\)/,
    );
    assert.match(
      paymentFinalizer,
      /GRANT EXECUTE ON FUNCTION public\.finalize_storefront_cashfree_payment\(uuid, uuid, text, integer, text, timestamptz\)/,
    );
    assert.match(
      paymentFinalizer,
      /GRANT EXECUTE ON FUNCTION public\.cancel_storefront_cashfree_payment_attempt\(uuid, text, timestamptz\)/,
    );
    assert.match(paymentFinalizer, /REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public/);
    assert.match(paymentFinalizer, /cancellation routines/);

    assert.equal((migration.match(/SECURITY DEFINER/g) ?? []).length, 7);
    assert.equal(
      (migration.match(/SET search_path = pg_catalog, public, pg_temp/g) ?? []).length,
      7,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.reserve_storefront_checkout_stock\(uuid, uuid\[\], integer\[\], timestamptz\) FROM PUBLIC/,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.release_storefront_checkout_reservations\(uuid, text, timestamptz\) FROM PUBLIC/,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.settle_storefront_checkout_reservations\(uuid, uuid, timestamptz\) FROM PUBLIC/,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.bind_storefront_cashfree_payment_attempt\(uuid, text, text, timestamptz\) FROM PUBLIC/,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.finalize_storefront_cashfree_payment\(uuid, uuid, text, integer, text, timestamptz\) FROM PUBLIC/,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.cancel_storefront_cashfree_payment_attempt\(uuid, text, timestamptz\) FROM PUBLIC/,
    );
    assert.match(migration, /runtime_capability_roles/);
    assert.match(migration, /checkout_sessions_storefront_payment_transition_guard/);
    assert.match(migration, /commerce_orders_storefront_payment_transition_guard/);
    assert.match(migration, /payment_attempts_storefront_payment_transition_guard/);
    assert.match(migration, /session_user/);
    assert.match(migration, /product_variant\.cost_cents/);
    assert.match(migration, /INSERT INTO public\.stock_movements/);
    assert.match(migration, /INSERT INTO public\.oil_movements/);
    assert.match(migration, /p_reason IS NULL/);

    assert.match(reservations, /SELECT reservation_id, variant_id, quantity, expires_at, idempotent/);
    assert.match(reservations, /SELECT released_count, idempotent, has_consumed/);
    assert.match(reservations, /SELECT consumed_count, idempotent/);
    assert.doesNotMatch(reservations, /productVariants\.costCents/);
    assert.doesNotMatch(reservations, /consumeOilInTransaction/);
    assert.doesNotMatch(reservations, /stockReservations\./);

    assert.match(paymentFinalization, /finalizeVerifiedCashfreePayment/);
    assert.doesNotMatch(paymentFinalization, /consumeCheckoutReservations/);
    assert.doesNotMatch(paymentFinalization, /db\.transaction/);
    assert.match(finalizerClient, /STOREFRONT_PAYMENT_FINALIZER_DATABASE_URL/);
    assert.doesNotMatch(finalizerClient, /process\.env\.DATABASE_URL/);
    assert.match(finalizerClient, /bind_storefront_cashfree_payment_attempt/);
    assert.match(finalizerClient, /finalize_storefront_cashfree_payment/);
    assert.match(finalizerClient, /expectedAmountMinor/);
    assert.match(migration, /v_attempt\.provider_order_id IS DISTINCT FROM p_provider_order_id/);
    assert.match(migration, /v_attempt\.amount_minor <> p_expected_amount_minor/);
    assert.match(
      storefront,
      /GRANT UPDATE \(\s*\"customer_user_id\", \"payment_state\", \"updated_at\"\s*\)\s*ON TABLE \"commerce_orders\"/,
    );
    assert.doesNotMatch(
      storefront,
      /GRANT UPDATE \([^)]*\b(?:status|cancelled_at)\b[^)]*\)\s*ON TABLE \"commerce_orders\"/,
    );
    assert.doesNotMatch(storefront, /"provider_order_id", "provider_session_id"\s*\)\s*\nON TABLE "payment_attempts"/);
    assert.match(
      storefront,
      /GRANT INSERT \([\s\S]*?"order_id", "provider", "provider_order_expires_at", "finalization_deadline_at",[\s\S]*?ON TABLE "payment_attempts"/,
    );
    assert.doesNotMatch(storefront, /GRANT INSERT \([\s\S]*?"provider_order_id"[\s\S]*?ON TABLE "payment_attempts"/);
    assert.match(storefront, /WITH allowed_updates\(table_name, column_name\)/);
    assert.match(storefront, /WITH allowed_inserts\(table_name, column_name\)/);
    assert.match(storefront, /\('runtime_capability_roles', ARRAY\[\]::text\[\]\)/);

    assert.match(checkout, /bindCreatedCashfreePaymentAttempt/);
    assert.doesNotMatch(checkout, /transaction\.update\(paymentAttempts\)\.set\(\{[\s\S]*?providerOrderId/);
    assert.doesNotMatch(checkout, /transaction\.update\(checkoutSessions\)\.set\(\{ status: "payment_pending" \}\)/);
    assert.doesNotMatch(checkout, /paymentState: "prepaid_pending"/);
    assert.doesNotMatch(checkout, /status: "created"/);

    assert.match(roleBootstrap, /REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC/);
    assert.match(roleBootstrap, /routine\.proname = 'gen_random_uuid'/);
    assert.match(roleBootstrap, /storefront_payment_finalizer_role/);
    assert.match(roleBootstrap, /runtime_capability_roles/);
    assert.match(roleBootstrapScript, /registry_verification/);
    assert.match(roleBootstrapScript, /runtime_capability_roles/);
    assert.match(roleBootstrapScript, /runtime capability registry mappings or privileges failed verification/);
    assert.match(roleBootstrapScript, /POSTGRES_OWNER_ROLE must differ from OPS_RUNTIME_ROLE/);
    assert.match(roleBootstrapScript, /POSTGRES_OWNER_ROLE must differ from STOREFRONT_RUNTIME_ROLE/);
    assert.match(
      roleBootstrapScript,
      /POSTGRES_OWNER_ROLE must differ from STOREFRONT_PAYMENT_FINALIZER_ROLE/,
    );
    assert.match(roleBootstrapScript, /require_distinct_secret_values\(\)/);
    assert.match(roleBootstrapScript, /runtime database passwords must be distinct/);
    assert.match(roleBootstrapScript, /PERFUME_AURA_TRUSTED_NODE is required/);
    assert.match(roleBootstrapScript, /require_root_owned_nonwritable_dependency_tree/);
    assert.match(roleBootstrapScript, /reviewed dependency symlink escapes the repository/);
    assert.match(roleBootstrapScript, /PATH="\$trusted_system_path"/);
    assert.doesNotMatch(roleBootstrapScript, /pnpm --filter @perfume-aura\/db migrate/);
    assert.match(
      roleBootstrapScript,
      /"\$trusted_node" "\$migration_runner" migrate --config/,
    );
    const ownerCredentialUse = roleBootstrapScript.match(
      /export\s+PGPASSWORD=/,
    )?.index ?? -1;
    const dependencyTreeGuard = roleBootstrapScript.match(
      /require_root_owned_nonwritable_dependency_tree\s+"?\$repo_root"?/,
    )?.index ?? -1;
    assert.ok(
      dependencyTreeGuard >= 0
        && ownerCredentialUse >= 0
        && dependencyTreeGuard < ownerCredentialUse,
      "bootstrap must verify executable dependencies before exposing the owner credential",
    );
    const storefrontFinalizerSecretGuard = roleBootstrapScript.match(
      /"STOREFRONT_RUNTIME_PASSWORD_FILE"\s+"\$STOREFRONT_RUNTIME_PASSWORD"\s+\\?\s+"STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE"\s+"\$STOREFRONT_PAYMENT_FINALIZER_PASSWORD"/,
    )?.index ?? -1;
    assert.ok(
      storefrontFinalizerSecretGuard >= 0
        && ownerCredentialUse >= 0
        && storefrontFinalizerSecretGuard < ownerCredentialUse,
      "bootstrap must reject a shared storefront/finalizer password before it can use database credentials",
    );
    assert.match(roleBootstrapScript, /validate_runtime_principal_ownership/);
    assert.match(roleBootstrapScript, /pg_shdepend AS dependency/);
    assert.match(
      roleBootstrapScript,
      /runtime principals must be new or own no cluster\/database objects before bootstrap/,
    );
  });
});
