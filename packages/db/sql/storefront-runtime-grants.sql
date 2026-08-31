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
  "oil_lots", "oil_movements",
  "commerce_bundle_items",
  "commerce_bundles", "checkout_sessions", "commerce_cart_items",
  "commerce_carts", "commerce_collection_products", "commerce_collections",
  "commerce_inquiries", "commerce_order_events", "commerce_order_items",
  "commerce_orders", "commerce_refunds", "commerce_return_items",
  "commerce_returns", "commerce_settings", "customer_order_claims",
  "inquiry_notification_outbox", "notification_outbox", "payment_attempts", "payment_events", "product_media",
  "product_publications", "promotion_redemptions", "promotions",
  "commerce_reviews", "shipments", "shipping_serviceability", "stock_reservations", "variant_prices"
FROM :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "storefront_account", "storefront_rate_limit", "storefront_session",
  "storefront_user", "storefront_verification", "storefront_customer_profile",
  "commerce_bundle_items",
  "commerce_bundles", "checkout_sessions", "commerce_cart_items",
  "commerce_carts", "commerce_collection_products", "commerce_collections",
  "commerce_inquiries", "commerce_return_items", "commerce_returns",
  "commerce_settings", "product_media", "product_publications", "promotions",
  "commerce_reviews", "shipments", "variant_prices"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE ON TABLE
  "commerce_orders", "commerce_refunds", "payment_attempts",
  "payment_events", "inquiry_notification_outbox", "notification_outbox", "stock_reservations"
TO :"runtime_role";

-- Storefront settlement can consume oil FIFO without exposing procurement,
-- supplier, cost, or internal-note fields to the public runtime role.
GRANT SELECT ("id", "product_id", "remaining_quantity_ml", "version", "created_at")
ON TABLE "oil_lots"
TO :"runtime_role";

GRANT UPDATE ("remaining_quantity_ml", "version", "updated_at")
ON TABLE "oil_lots"
TO :"runtime_role";

GRANT SELECT ON TABLE
  "shipping_serviceability"
TO :"runtime_role";

GRANT SELECT, INSERT ON TABLE
  "commerce_order_events", "commerce_order_items", "customer_order_claims",
  "promotion_redemptions", "oil_movements"
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
    ('commerce_bundle_items', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_bundles', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('checkout_sessions', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_cart_items', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_carts', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_collection_products', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_collections', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_inquiries', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_return_items', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_returns', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_settings', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('product_media', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('product_publications', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('promotions', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_reviews', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('shipments', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('variant_prices', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('commerce_orders', ARRAY['SELECT','INSERT','UPDATE']),
    ('commerce_refunds', ARRAY['SELECT','INSERT','UPDATE']),
    ('payment_attempts', ARRAY['SELECT','INSERT','UPDATE']),
    ('payment_events', ARRAY['SELECT','INSERT','UPDATE']),
    ('inquiry_notification_outbox', ARRAY['SELECT','INSERT','UPDATE']),
    ('notification_outbox', ARRAY['SELECT','INSERT','UPDATE']),
    ('shipping_serviceability', ARRAY['SELECT']),
    ('stock_reservations', ARRAY['SELECT','INSERT','UPDATE']),
    ('oil_lots', ARRAY[]::text[]),
    ('oil_movements', ARRAY['SELECT','INSERT']),
    ('commerce_order_events', ARRAY['SELECT','INSERT']),
    ('commerce_order_items', ARRAY['SELECT','INSERT']),
    ('customer_order_claims', ARRAY['SELECT','INSERT']),
    ('promotion_redemptions', ARRAY['SELECT','INSERT'])
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

-- All returned rows are column-level privilege drift. The storefront can settle
-- its own oil consumption but must not read procurement provenance or costs.
WITH matrix(column_name, allowed) AS (
  VALUES
    ('id', ARRAY['SELECT']),
    ('product_id', ARRAY['SELECT']),
    ('received_quantity_ml', ARRAY[]::text[]),
    ('remaining_quantity_ml', ARRAY['SELECT','UPDATE']),
    ('kg_bottles', ARRAY[]::text[]),
    ('supplier_name', ARRAY[]::text[]),
    ('supplier_reference', ARRAY[]::text[]),
    ('total_cost_cents', ARRAY[]::text[]),
    ('received_date', ARRAY[]::text[]),
    ('note', ARRAY[]::text[]),
    ('version', ARRAY['SELECT','UPDATE']),
    ('created_by', ARRAY[]::text[]),
    ('created_at', ARRAY['SELECT']),
    ('updated_at', ARRAY['UPDATE'])
), privileges(privilege) AS (
  VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')
)
SELECT matrix.column_name, privileges.privilege,
       has_column_privilege(
         :'runtime_role', 'public.oil_lots', matrix.column_name, privileges.privilege
       ) AS observed,
       privileges.privilege = ANY(matrix.allowed) AS expected
FROM matrix CROSS JOIN privileges
WHERE has_column_privilege(
        :'runtime_role', 'public.oil_lots', matrix.column_name, privileges.privilege
      ) <> (privileges.privilege = ANY(matrix.allowed));

-- Must remain zero rows; these tables use UUID/text identities, not sequences.
SELECT sequence_schema, sequence_name, privilege
FROM information_schema.sequences
CROSS JOIN (VALUES ('USAGE'), ('SELECT'), ('UPDATE')) AS p(privilege)
WHERE has_sequence_privilege(
  :'runtime_role', format('%I.%I', sequence_schema, sequence_name), privilege
);
