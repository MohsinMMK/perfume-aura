\set ON_ERROR_STOP on

\if :{?database_name}
\else
  \echo 'ERROR: pass database_name with -v database_name=...'
  \quit
\endif

\if :{?owner_role}
\else
  \echo 'ERROR: pass owner_role with -v owner_role=...'
  \quit
\endif

\if :{?ops_runtime_role}
\else
  \echo 'ERROR: pass ops_runtime_role with -v ops_runtime_role=...'
  \quit
\endif

\if :{?storefront_runtime_role}
\else
  \echo 'ERROR: pass storefront_runtime_role with -v storefront_runtime_role=...'
  \quit
\endif

\if :{?storefront_payment_finalizer_role}
\else
  \echo 'ERROR: pass storefront_payment_finalizer_role with -v storefront_payment_finalizer_role=...'
  \quit
\endif

\getenv ops_runtime_password OPS_RUNTIME_PASSWORD
\getenv storefront_runtime_password STOREFRONT_RUNTIME_PASSWORD
\getenv storefront_payment_finalizer_password STOREFRONT_PAYMENT_FINALIZER_PASSWORD

\if :{?ops_runtime_password}
\else
  \echo 'ERROR: OPS_RUNTIME_PASSWORD must be provided through the process environment'
  \quit
\endif

\if :{?storefront_runtime_password}
\else
  \echo 'ERROR: STOREFRONT_RUNTIME_PASSWORD must be provided through the process environment'
  \quit
\endif

\if :{?storefront_payment_finalizer_password}
\else
  \echo 'ERROR: STOREFRONT_PAYMENT_FINALIZER_PASSWORD must be provided through the process environment'
  \quit
\endif

BEGIN;

-- These roles are direct login principals, not group roles. Roles are created
-- or rotated here before any grant script is invoked, but schema/table grants
-- remain entirely in the reviewed source-controlled grant scripts.
SELECT format(
  'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD %L',
  :'ops_runtime_role',
  :'ops_runtime_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'ops_runtime_role'
)
\gexec

SELECT format(
  'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 8 PASSWORD %L',
  :'storefront_payment_finalizer_role',
  :'storefront_payment_finalizer_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'storefront_payment_finalizer_role'
)
\gexec

SELECT format(
  'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD %L',
  :'storefront_runtime_role',
  :'storefront_runtime_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'storefront_runtime_role'
)
\gexec

SELECT format(
  'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD %L',
  :'ops_runtime_role',
  :'ops_runtime_password'
)
\gexec

SELECT format(
  'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 8 PASSWORD %L',
  :'storefront_payment_finalizer_role',
  :'storefront_payment_finalizer_password'
)
\gexec

SELECT format(
  'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD %L',
  :'storefront_runtime_role',
  :'storefront_runtime_password'
)
\gexec

-- The reviewed migration owns this registry. Keep its exact three capability
-- bindings transactional so payment-state triggers can distinguish the login
-- principal without embedding deployment-specific role names. Delete retired
-- bindings first so a renamed principal cannot retain a former capability.
DELETE FROM public.runtime_capability_roles
WHERE (capability = 'ops' AND role_name <> :'ops_runtime_role')
   OR (capability = 'storefront' AND role_name <> :'storefront_runtime_role')
   OR (
     capability = 'payment_finalizer'
     AND role_name <> :'storefront_payment_finalizer_role'
   );

INSERT INTO public.runtime_capability_roles (role_name, capability)
VALUES
  (:'ops_runtime_role', 'ops'),
  (:'storefront_runtime_role', 'storefront'),
  (:'storefront_payment_finalizer_role', 'payment_finalizer')
ON CONFLICT (role_name) DO UPDATE
SET capability = EXCLUDED.capability;

-- A runtime role may not inherit any existing role, nor may another principal
-- inherit a runtime role. This is intentionally exact rather than broad.
SELECT format('REVOKE %I FROM %I', parent_role.rolname, member_role.rolname)
FROM pg_auth_members AS member
JOIN pg_roles AS parent_role ON parent_role.oid = member.roleid
JOIN pg_roles AS member_role ON member_role.oid = member.member
WHERE member_role.rolname IN (:'ops_runtime_role', :'storefront_runtime_role', :'storefront_payment_finalizer_role')
\gexec

SELECT format('REVOKE %I FROM %I', runtime_role.rolname, member_role.rolname)
FROM pg_auth_members AS member
JOIN pg_roles AS runtime_role ON runtime_role.oid = member.roleid
JOIN pg_roles AS member_role ON member_role.oid = member.member
WHERE runtime_role.rolname IN (:'ops_runtime_role', :'storefront_runtime_role', :'storefront_payment_finalizer_role')
\gexec

REVOKE ALL PRIVILEGES ON DATABASE :"database_name" FROM PUBLIC;
REVOKE TEMPORARY ON DATABASE :"database_name" FROM :"ops_runtime_role", :"storefront_runtime_role", :"storefront_payment_finalizer_role";
GRANT CONNECT ON DATABASE :"database_name" TO :"ops_runtime_role", :"storefront_runtime_role", :"storefront_payment_finalizer_role";

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"ops_runtime_role", :"storefront_runtime_role", :"storefront_payment_finalizer_role";

-- Remove accidental implicit access before the reviewed role stages grant
-- their exact matrices. Sequences and routines remain deny-by-default.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM :"ops_runtime_role", :"storefront_runtime_role", :"storefront_payment_finalizer_role";
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM :"ops_runtime_role", :"storefront_runtime_role", :"storefront_payment_finalizer_role";
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM :"ops_runtime_role", :"storefront_runtime_role", :"storefront_payment_finalizer_role";

-- UUID defaults are evaluated as the inserting runtime role. pgcrypto may
-- install this helper in public on supported PostgreSQL versions, so restore
-- only this exact routine when it exists; all application routines remain
-- deny-by-default until their reviewed grant scripts run.
SELECT format(
  'GRANT EXECUTE ON FUNCTION %I.%I() TO %I, %I',
  namespace.nspname,
  routine.proname,
  :'ops_runtime_role',
  :'storefront_runtime_role'
)
FROM pg_proc AS routine
INNER JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
WHERE namespace.nspname IN ('public', 'pg_catalog')
  AND routine.proname = 'gen_random_uuid'
  AND routine.pronargs = 0
\gexec

-- Operations needs the current private data plane. Its reviewed delta script
-- runs immediately after this transaction and narrows immutable/event/ledger
-- tables again. Storefront remains deny-first and is granted only explicitly.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"ops_runtime_role";

-- The role-capability registry is bootstrap-owned input to security-definer
-- payment controls. Never leave it in the broad operations grant, and never
-- grant it to either storefront principal.
REVOKE ALL PRIVILEGES ON TABLE public.runtime_capability_roles
FROM :"ops_runtime_role", :"storefront_runtime_role", :"storefront_payment_finalizer_role", PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;

-- This output is intentionally machine-checkable by the wrapper. Every value
-- must match `f|f|f|f|f|f|f|t|t` after grants are applied.
SELECT
  ops.rolsuper,
  ops.rolcreaterole,
  ops.rolcreatedb,
  ops.rolreplication,
  ops.rolbypassrls,
  ops.rolinherit,
  has_database_privilege(:'ops_runtime_role', :'database_name', 'TEMP'),
  has_schema_privilege(:'ops_runtime_role', 'public', 'USAGE'),
  has_database_privilege(:'ops_runtime_role', :'database_name', 'CONNECT')
FROM pg_roles AS ops
WHERE ops.rolname = :'ops_runtime_role';

SELECT
  storefront.rolsuper,
  storefront.rolcreaterole,
  storefront.rolcreatedb,
  storefront.rolreplication,
  storefront.rolbypassrls,
  storefront.rolinherit,
  has_database_privilege(:'storefront_runtime_role', :'database_name', 'TEMP'),
  has_schema_privilege(:'storefront_runtime_role', 'public', 'USAGE'),
  has_database_privilege(:'storefront_runtime_role', :'database_name', 'CONNECT')
FROM pg_roles AS storefront
WHERE storefront.rolname = :'storefront_runtime_role';

SELECT
  payment_finalizer.rolsuper,
  payment_finalizer.rolcreaterole,
  payment_finalizer.rolcreatedb,
  payment_finalizer.rolreplication,
  payment_finalizer.rolbypassrls,
  payment_finalizer.rolinherit,
  has_database_privilege(:'storefront_payment_finalizer_role', :'database_name', 'TEMP'),
  has_schema_privilege(:'storefront_payment_finalizer_role', 'public', 'USAGE'),
  has_database_privilege(:'storefront_payment_finalizer_role', :'database_name', 'CONNECT')
FROM pg_roles AS payment_finalizer
WHERE payment_finalizer.rolname = :'storefront_payment_finalizer_role';

SELECT member_role.rolname, parent_role.rolname
FROM pg_auth_members AS member
JOIN pg_roles AS parent_role ON parent_role.oid = member.roleid
JOIN pg_roles AS member_role ON member_role.oid = member.member
WHERE member_role.rolname IN (:'ops_runtime_role', :'storefront_runtime_role', :'storefront_payment_finalizer_role')
   OR parent_role.rolname IN (:'ops_runtime_role', :'storefront_runtime_role', :'storefront_payment_finalizer_role');
