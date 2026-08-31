\set ON_ERROR_STOP on

\if :{?runtime_role}
\else
  \echo 'ERROR: pass the reviewed runtime role with -v runtime_role=...'
  \quit
\endif

BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  "storefront_account", "storefront_rate_limit", "storefront_session",
  "storefront_user", "storefront_verification", "storefront_customer_profile",
  "products", "product_variants", "locations", "stock_movements",
  "oil_lots", "oil_movements", "oil_reservations", "stock_reservations",
  "commerce_bundle_items",
  "commerce_bundles", "checkout_sessions", "commerce_cart_items",
  "commerce_carts", "commerce_collection_products", "commerce_collections",
  "commerce_inquiries", "commerce_order_events", "commerce_order_items",
  "commerce_orders", "commerce_refunds", "commerce_return_items",
  "commerce_returns", "commerce_settings", "customer_order_claims",
  "inquiry_notification_outbox", "notification_outbox", "payment_attempts", "payment_events", "product_media",
  "product_publications", "promotion_redemptions", "promotions",
  "commerce_reviews", "shipments", "shipping_serviceability", "variant_prices",
  "runtime_capability_roles"
FROM :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "storefront_account", "storefront_rate_limit", "storefront_session",
  "storefront_user", "storefront_verification", "storefront_customer_profile",
  "commerce_cart_items", "commerce_carts",
  "commerce_inquiries", "commerce_return_items", "commerce_returns"
TO :"runtime_role";

GRANT SELECT ON TABLE
  "checkout_sessions", "commerce_orders"
TO :"runtime_role";

-- Payment identity and successful state are created only by their default or
-- the separately credentialed binding/finalization routines. Keep direct
-- inserts column-scoped so a normal storefront credential cannot synthesize a
-- provider order/session, a paid state, a completed checkout, or a mutable
-- internal identity.
GRANT SELECT ON TABLE "payment_attempts", "commerce_order_items"
TO :"runtime_role";

GRANT INSERT (
  "cart_id", "token_digest", "request_id", "payload_digest", "pricing_version",
  "email", "shipping_address", "expires_at"
)
ON TABLE "checkout_sessions"
TO :"runtime_role";

GRANT INSERT (
  "order_number", "access_token_digest", "checkout_session_id", "customer_user_id",
  "guest_email", "subtotal_amount_minor", "shipping_amount_minor", "tax_amount_minor",
  "discount_amount_minor", "total_amount_minor", "shipping_address_snapshot"
)
ON TABLE "commerce_orders"
TO :"runtime_role";

GRANT INSERT (
  "order_id", "provider", "provider_order_expires_at", "finalization_deadline_at",
  "idempotency_key", "amount_minor"
)
ON TABLE "payment_attempts"
TO :"runtime_role";

GRANT INSERT (
  "order_id", "variant_id", "product_name_snapshot", "sku_snapshot", "size_ml_snapshot",
  "unit_price_amount_minor", "quantity", "line_total_amount_minor"
)
ON TABLE "commerce_order_items"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE ON TABLE
  "commerce_refunds",
  "payment_events", "inquiry_notification_outbox", "notification_outbox"
TO :"runtime_role";

-- Identity, price, and provider facts remain immutable to the regular runtime
-- once inserted. Binding, cancellation, and settlement all use the separate
-- payment-finalizer capability. The customer surface may only claim an order,
-- reconcile metadata, or record a provider-confirmed refund state.
GRANT UPDATE (
  "customer_user_id", "payment_state", "updated_at"
)
ON TABLE "commerce_orders"
TO :"runtime_role";

GRANT UPDATE (
  "last_reconciled_at",
  "reconciliation_attempt_count", "next_reconcile_at", "last_reconciliation_error_code",
  "customer_reconcile_lease_until", "customer_reconciled_at", "updated_at"
)
ON TABLE "payment_attempts"
TO :"runtime_role";

-- Catalog, policy, promotion, review, and fulfillment records are managed by
-- operations. The public storefront may render these approved records, but a
-- leaked storefront credential must never publish, price, or alter them.
GRANT SELECT ON TABLE
  "commerce_bundle_items", "commerce_bundles", "commerce_collection_products",
  "commerce_collections", "commerce_settings", "product_media",
  "product_publications", "promotions", "commerce_reviews", "shipments",
  "variant_prices"
TO :"runtime_role";

-- The customer surface may read a narrow public catalog projection. Reservation
-- counters, stock movements, oil lots, and oil movements are never writable
-- by the storefront runtime; reviewed security-definer routines own every
-- inventory state transition.
GRANT SELECT ("id", "name", "brand", "status")
ON TABLE "products"
TO :"runtime_role";

GRANT SELECT (
  "id", "product_id", "sku", "size_ml", "quantity_on_hand",
  "qty_reserved", "version", "status"
)
ON TABLE "product_variants"
TO :"runtime_role";

DO $$
BEGIN
  IF to_regprocedure(
    'public.reserve_storefront_checkout_stock(uuid,uuid[],integer[],timestamp with time zone)'
  ) IS NULL
    OR to_regprocedure(
      'public.release_storefront_checkout_reservations(uuid,text,timestamp with time zone)'
    ) IS NULL
    OR to_regprocedure(
      'public.settle_storefront_checkout_reservations(uuid,uuid,timestamp with time zone)'
    ) IS NULL
    OR to_regprocedure(
      'public.bind_storefront_cashfree_payment_attempt(uuid,text,text,timestamp with time zone)'
    ) IS NULL
    OR to_regprocedure(
      'public.finalize_storefront_cashfree_payment(uuid,uuid,text,integer,text,timestamp with time zone)'
    ) IS NULL
    OR to_regprocedure(
      'public.cancel_storefront_cashfree_payment_attempt(uuid,text,timestamp with time zone)'
    ) IS NULL THEN
    RAISE EXCEPTION
      'apply migration 0017_storefront_sale_settlement before storefront runtime grants';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_storefront_checkout_stock(uuid, uuid[], integer[], timestamptz)
FROM :"runtime_role";
REVOKE ALL ON FUNCTION public.release_storefront_checkout_reservations(uuid, text, timestamptz)
FROM :"runtime_role";
REVOKE ALL ON FUNCTION public.settle_storefront_checkout_reservations(uuid, uuid, timestamptz)
FROM :"runtime_role";
REVOKE ALL ON FUNCTION public.bind_storefront_cashfree_payment_attempt(uuid, text, text, timestamptz)
FROM :"runtime_role";
REVOKE ALL ON FUNCTION public.finalize_storefront_cashfree_payment(uuid, uuid, text, integer, text, timestamptz)
FROM :"runtime_role";
REVOKE ALL ON FUNCTION public.cancel_storefront_cashfree_payment_attempt(uuid, text, timestamptz)
FROM :"runtime_role";
GRANT EXECUTE ON FUNCTION public.reserve_storefront_checkout_stock(uuid, uuid[], integer[], timestamptz)
TO :"runtime_role";
GRANT EXECUTE ON FUNCTION public.release_storefront_checkout_reservations(uuid, text, timestamptz)
TO :"runtime_role";

GRANT SELECT ON TABLE
  "shipping_serviceability"
TO :"runtime_role";

GRANT SELECT, INSERT ON TABLE
  "commerce_order_events", "customer_order_claims",
  "promotion_redemptions"
TO :"runtime_role";

COMMIT;

-- All rows returned by this query are privilege drift and must be resolved.
WITH matrix(table_name, allowed) AS (
  VALUES
    ('storefront_account', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('storefront_rate_limit', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('storefront_session', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('storefront_user', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('storefront_verification', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('storefront_customer_profile', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_bundle_items', ARRAY['SELECT']),
    ('commerce_bundles', ARRAY['SELECT']),
    ('checkout_sessions', ARRAY['SELECT']),
    ('commerce_cart_items', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_carts', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_collection_products', ARRAY['SELECT']),
    ('commerce_collections', ARRAY['SELECT']),
    ('commerce_inquiries', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_return_items', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_returns', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_settings', ARRAY['SELECT']),
    ('product_media', ARRAY['SELECT']),
    ('product_publications', ARRAY['SELECT']),
    ('promotions', ARRAY['SELECT']),
    ('commerce_reviews', ARRAY['SELECT']),
    ('shipments', ARRAY['SELECT']),
    ('variant_prices', ARRAY['SELECT']),
    ('commerce_orders', ARRAY['SELECT']),
    ('commerce_refunds', ARRAY['SELECT','INSERT','UPDATE']),
    ('payment_attempts', ARRAY['SELECT']),
    ('payment_events', ARRAY['SELECT','INSERT','UPDATE']),
    ('inquiry_notification_outbox', ARRAY['SELECT','INSERT','UPDATE']),
    ('notification_outbox', ARRAY['SELECT','INSERT','UPDATE']),
    ('shipping_serviceability', ARRAY['SELECT']),
    ('products', ARRAY[]::text[]),
    ('product_variants', ARRAY[]::text[]),
    ('locations', ARRAY[]::text[]),
    ('stock_reservations', ARRAY[]::text[]),
    ('stock_movements', ARRAY[]::text[]),
    ('oil_lots', ARRAY[]::text[]),
    ('oil_movements', ARRAY[]::text[]),
    ('oil_reservations', ARRAY[]::text[]),
    ('commerce_order_events', ARRAY['SELECT','INSERT']),
    ('commerce_order_items', ARRAY['SELECT']),
    ('customer_order_claims', ARRAY['SELECT','INSERT']),
    ('promotion_redemptions', ARRAY['SELECT','INSERT']),
    ('runtime_capability_roles', ARRAY[]::text[])
), privileges(privilege) AS (
  VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
         ('REFERENCES'), ('TRIGGER')
)
SELECT matrix.table_name, privileges.privilege,
       has_table_privilege(
         :'runtime_role', format('public.%I', matrix.table_name), privileges.privilege
       ) AS observed,
       privileges.privilege = ANY(matrix.allowed) AS expected
FROM matrix CROSS JOIN privileges
WHERE has_table_privilege(
        :'runtime_role', format('public.%I', matrix.table_name), privileges.privilege
      ) <> (privileges.privilege = ANY(matrix.allowed));

-- All returned rows are catalog-column privilege drift. The storefront can
-- render availability, but not mutate on-hand/reserved balance or read cost,
-- barcode, reorder, or internal catalog fields.
WITH matrix(table_name, column_name, allowed) AS (
  VALUES
    ('products', 'id', ARRAY['SELECT']),
    ('products', 'name', ARRAY['SELECT']),
    ('products', 'slug', ARRAY[]::text[]),
    ('products', 'brand', ARRAY['SELECT']),
    ('products', 'category', ARRAY[]::text[]),
    ('products', 'description', ARRAY[]::text[]),
    ('products', 'status', ARRAY['SELECT']),
    ('products', 'created_at', ARRAY[]::text[]),
    ('products', 'updated_at', ARRAY[]::text[]),
    ('product_variants', 'id', ARRAY['SELECT']),
    ('product_variants', 'product_id', ARRAY['SELECT']),
    ('product_variants', 'sku', ARRAY['SELECT']),
    ('product_variants', 'barcode', ARRAY[]::text[]),
    ('product_variants', 'size_ml', ARRAY['SELECT']),
    ('product_variants', 'cost_cents', ARRAY[]::text[]),
    ('product_variants', 'retail_cents', ARRAY[]::text[]),
    ('product_variants', 'quantity_on_hand', ARRAY['SELECT']),
    ('product_variants', 'qty_reserved', ARRAY['SELECT']),
    ('product_variants', 'reorder_level', ARRAY[]::text[]),
    ('product_variants', 'version', ARRAY['SELECT']),
    ('product_variants', 'status', ARRAY['SELECT']),
    ('product_variants', 'created_at', ARRAY[]::text[]),
    ('product_variants', 'updated_at', ARRAY[]::text[])
), privileges(privilege) AS (
  VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')
)
SELECT matrix.table_name, matrix.column_name, privileges.privilege,
       has_column_privilege(
         :'runtime_role',
         format('public.%I', matrix.table_name),
         matrix.column_name,
         privileges.privilege
       ) AS observed,
       privileges.privilege = ANY(matrix.allowed) AS expected
FROM matrix CROSS JOIN privileges
WHERE has_column_privilege(
        :'runtime_role',
        format('public.%I', matrix.table_name),
        matrix.column_name,
        privileges.privilege
      ) <> (privileges.privilege = ANY(matrix.allowed));

-- The normal storefront may update only non-payment reconciliation metadata,
-- an authenticated customer claim, and a verified refund state. Checkout,
-- cancellation, binding, and settlement transitions are finalizer-only.
WITH allowed_updates(table_name, column_name) AS (
  VALUES
    ('commerce_orders', 'customer_user_id'),
    ('commerce_orders', 'payment_state'),
    ('commerce_orders', 'updated_at'),
    ('payment_attempts', 'last_reconciled_at'),
    ('payment_attempts', 'reconciliation_attempt_count'),
    ('payment_attempts', 'next_reconcile_at'),
    ('payment_attempts', 'last_reconciliation_error_code'),
    ('payment_attempts', 'customer_reconcile_lease_until'),
    ('payment_attempts', 'customer_reconciled_at'),
    ('payment_attempts', 'updated_at')
)
SELECT column_info.table_name, column_info.column_name
FROM information_schema.columns AS column_info
WHERE column_info.table_schema = 'public'
  AND column_info.table_name IN (
    'checkout_sessions', 'commerce_orders', 'payment_attempts'
  )
  AND has_column_privilege(
    :'runtime_role',
    format('public.%I', column_info.table_name),
    column_info.column_name,
    'UPDATE'
  ) <> EXISTS (
    SELECT 1
    FROM allowed_updates
    WHERE allowed_updates.table_name = column_info.table_name
      AND allowed_updates.column_name = column_info.column_name
  );

-- Initial payment-intent records are also fail-closed. A normal storefront
-- connection can create only the non-provider shell; defaults create the
-- pending-safe states and the finalizer capability later binds Cashfree's
-- provider values after validating the whole immutable order intent.
WITH allowed_inserts(table_name, column_name) AS (
  VALUES
    ('checkout_sessions', 'cart_id'),
    ('checkout_sessions', 'token_digest'),
    ('checkout_sessions', 'request_id'),
    ('checkout_sessions', 'payload_digest'),
    ('checkout_sessions', 'pricing_version'),
    ('checkout_sessions', 'email'),
    ('checkout_sessions', 'shipping_address'),
    ('checkout_sessions', 'expires_at'),
    ('commerce_orders', 'order_number'),
    ('commerce_orders', 'access_token_digest'),
    ('commerce_orders', 'checkout_session_id'),
    ('commerce_orders', 'customer_user_id'),
    ('commerce_orders', 'guest_email'),
    ('commerce_orders', 'subtotal_amount_minor'),
    ('commerce_orders', 'shipping_amount_minor'),
    ('commerce_orders', 'tax_amount_minor'),
    ('commerce_orders', 'discount_amount_minor'),
    ('commerce_orders', 'total_amount_minor'),
    ('commerce_orders', 'shipping_address_snapshot'),
    ('payment_attempts', 'order_id'),
    ('payment_attempts', 'provider'),
    ('payment_attempts', 'provider_order_expires_at'),
    ('payment_attempts', 'finalization_deadline_at'),
    ('payment_attempts', 'idempotency_key'),
    ('payment_attempts', 'amount_minor'),
    ('commerce_order_items', 'order_id'),
    ('commerce_order_items', 'variant_id'),
    ('commerce_order_items', 'product_name_snapshot'),
    ('commerce_order_items', 'sku_snapshot'),
    ('commerce_order_items', 'size_ml_snapshot'),
    ('commerce_order_items', 'unit_price_amount_minor'),
    ('commerce_order_items', 'quantity'),
    ('commerce_order_items', 'line_total_amount_minor')
)
SELECT column_info.table_name, column_info.column_name
FROM information_schema.columns AS column_info
WHERE column_info.table_schema = 'public'
  AND column_info.table_name IN (
    'checkout_sessions', 'commerce_orders', 'payment_attempts', 'commerce_order_items'
  )
  AND has_column_privilege(
    :'runtime_role',
    format('public.%I', column_info.table_name),
    column_info.column_name,
    'INSERT'
  ) <> EXISTS (
    SELECT 1
    FROM allowed_inserts
    WHERE allowed_inserts.table_name = column_info.table_name
      AND allowed_inserts.column_name = column_info.column_name
  );

-- The two reviewed reservation routines are the only storefront database
-- functions beyond the bootstrap-granted UUID default helper. Cashfree
-- provider binding and settlement are isolated to the separate
-- payment-finalizer role.
WITH matrix(function_name, allowed) AS (
  VALUES
    ('public.reserve_storefront_checkout_stock(uuid,uuid[],integer[],timestamp with time zone)', ARRAY['EXECUTE']),
    ('public.release_storefront_checkout_reservations(uuid,text,timestamp with time zone)', ARRAY['EXECUTE'])
), privileges(privilege) AS (
  VALUES ('EXECUTE')
)
SELECT matrix.function_name, privileges.privilege,
       has_function_privilege(:'runtime_role', matrix.function_name, privileges.privilege) AS observed,
       privileges.privilege = ANY(matrix.allowed) AS expected
FROM matrix CROSS JOIN privileges
WHERE has_function_privilege(:'runtime_role', matrix.function_name, privileges.privilege)
  <> (privileges.privilege = ANY(matrix.allowed));

-- New public routines default to no storefront access. This scans every public
-- function rather than only this migration's names, so a future explicit grant
-- cannot silently widen the customer database capability.
WITH allowed(function_oid) AS (
  VALUES
    (to_regprocedure('public.reserve_storefront_checkout_stock(uuid,uuid[],integer[],timestamp with time zone)')),
    (to_regprocedure('public.release_storefront_checkout_reservations(uuid,text,timestamp with time zone)')),
    (to_regprocedure('public.gen_random_uuid()'))
)
SELECT routine.oid::regprocedure::text AS function_name
FROM pg_proc AS routine
INNER JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
WHERE namespace.nspname = 'public'
  AND has_function_privilege(:'runtime_role', routine.oid, 'EXECUTE')
  AND NOT EXISTS (
    SELECT 1 FROM allowed WHERE allowed.function_oid = routine.oid
  );
