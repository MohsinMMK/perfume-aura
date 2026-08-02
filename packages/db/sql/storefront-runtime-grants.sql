\set ON_ERROR_STOP on

\if :{?runtime_role}
\else
  \echo 'ERROR: pass the reviewed runtime role with -v runtime_role=...'
  \quit
\endif

BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  "storefront_account", "storefront_rate_limit", "storefront_session",
  "storefront_user", "storefront_verification", "commerce_bundle_items",
  "commerce_bundles", "checkout_sessions", "commerce_cart_items",
  "commerce_carts", "commerce_collection_products", "commerce_collections",
  "commerce_inquiries", "commerce_order_events", "commerce_order_items",
  "commerce_orders", "commerce_refunds", "commerce_return_items",
  "commerce_returns", "commerce_settings", "customer_order_claims",
  "payment_attempts", "payment_events", "product_media",
  "product_publications", "promotion_redemptions", "promotions",
  "commerce_reviews", "shipments", "stock_reservations", "variant_prices"
FROM :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "storefront_account", "storefront_rate_limit", "storefront_session",
  "storefront_user", "storefront_verification", "commerce_bundle_items",
  "commerce_bundles", "checkout_sessions", "commerce_cart_items",
  "commerce_carts", "commerce_collection_products", "commerce_collections",
  "commerce_inquiries", "commerce_return_items", "commerce_returns",
  "commerce_settings", "product_media", "product_publications", "promotions",
  "commerce_reviews", "shipments", "variant_prices"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE ON TABLE
  "commerce_orders", "commerce_refunds", "payment_attempts",
  "stock_reservations"
TO :"runtime_role";

GRANT SELECT, INSERT ON TABLE
  "commerce_order_events", "commerce_order_items", "customer_order_claims",
  "payment_events", "promotion_redemptions"
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
    ('stock_reservations', ARRAY['SELECT','INSERT','UPDATE']),
    ('commerce_order_events', ARRAY['SELECT','INSERT']),
    ('commerce_order_items', ARRAY['SELECT','INSERT']),
    ('customer_order_claims', ARRAY['SELECT','INSERT']),
    ('payment_events', ARRAY['SELECT','INSERT']),
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

-- Must remain zero rows; these tables use UUID/text identities, not sequences.
SELECT sequence_schema, sequence_name, privilege
FROM information_schema.sequences
CROSS JOIN (VALUES ('USAGE'), ('SELECT'), ('UPDATE')) AS p(privilege)
WHERE has_sequence_privilege(
  :'runtime_role', format('%I.%I', sequence_schema, sequence_name), privilege
);
