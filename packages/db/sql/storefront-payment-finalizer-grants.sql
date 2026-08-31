\set ON_ERROR_STOP on

\if :{?runtime_role}
\else
  \echo 'ERROR: pass the reviewed payment-finalizer role with -v runtime_role=...'
  \quit
\endif

BEGIN;

-- This login is a deliberately narrow capability used to bind the authentic
-- Cashfree provider response and, after independent verification, finalize a
-- payment. It has no direct table access.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM :"runtime_role";
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM :"runtime_role";
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM :"runtime_role";

DO $$
BEGIN
  IF to_regprocedure(
    'public.bind_storefront_cashfree_payment_attempt(uuid,text,text,timestamp with time zone)'
  ) IS NULL
    OR to_regprocedure(
      'public.finalize_storefront_cashfree_payment(uuid,uuid,text,integer,text,timestamp with time zone)'
    ) IS NULL
    OR to_regprocedure(
      'public.cancel_storefront_cashfree_payment_attempt(uuid,text,timestamp with time zone)'
  ) IS NULL THEN
    RAISE EXCEPTION
      'apply migration 0017_storefront_sale_settlement before payment-finalizer grants';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bind_storefront_cashfree_payment_attempt(uuid, text, text, timestamptz)
TO :"runtime_role";
GRANT EXECUTE ON FUNCTION public.finalize_storefront_cashfree_payment(uuid, uuid, text, integer, text, timestamptz)
TO :"runtime_role";
GRANT EXECUTE ON FUNCTION public.cancel_storefront_cashfree_payment_attempt(uuid, text, timestamptz)
TO :"runtime_role";

COMMIT;

-- Any direct table privilege is drift for this capability role.
WITH privileges(privilege) AS (
  VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
         ('REFERENCES'), ('TRIGGER')
)
SELECT table_info.table_name, privileges.privilege
FROM information_schema.tables AS table_info
CROSS JOIN privileges
WHERE table_info.table_schema = 'public'
  AND table_info.table_type = 'BASE TABLE'
  AND has_table_privilege(
    :'runtime_role',
    format('public.%I', table_info.table_name),
    privileges.privilege
  );

-- Only the reviewed Cashfree binding, atomic finalization, and atomic
-- cancellation routines are callable by this role.
WITH allowed(function_oid) AS (
  VALUES
    (to_regprocedure('public.bind_storefront_cashfree_payment_attempt(uuid,text,text,timestamp with time zone)')),
    (to_regprocedure('public.finalize_storefront_cashfree_payment(uuid,uuid,text,integer,text,timestamp with time zone)')),
    (to_regprocedure('public.cancel_storefront_cashfree_payment_attempt(uuid,text,timestamp with time zone)'))
)
SELECT routine.oid::regprocedure::text AS function_name
FROM pg_proc AS routine
INNER JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
WHERE namespace.nspname = 'public'
  AND has_function_privilege(:'runtime_role', routine.oid, 'EXECUTE')
  AND NOT EXISTS (
    SELECT 1 FROM allowed WHERE allowed.function_oid = routine.oid
  );
