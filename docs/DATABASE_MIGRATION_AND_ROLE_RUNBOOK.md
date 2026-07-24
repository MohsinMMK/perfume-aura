# Database migration and runtime-role runbook

> Status: Phase 02 design and local validation only. Provider execution is
> reserved for Phase 07. This file contains no live host, role, password, or
> connection string.

## Connection and ownership contract

| Purpose | Environment variable | Endpoint | Privilege |
|---------|----------------------|----------|-----------|
| Forward migrations and grants | `DATABASE_URL_DIRECT` | Direct, non-pooler | Existing database owner / migration administrator |
| Hostinger application runtime | `DATABASE_URL` | Neon pooled (`-pooler`) | Login role with data access only |
| Phase 02 local tests | `TEST_DATABASE_URL` | Loopback PostgreSQL only | Disposable test owner |

Neon documents transaction-mode pooling for pooled connections and recommends a
direct connection for migrations. The application continues to use
`drizzle-orm/node-postgres` with `pg` Pool; ledger transactions must not move to
`neon-http`.

The migration login must own, or be able to act as the owner of, the database
objects. PostgreSQL table grants do not confer `ALTER TABLE`. Do not put the
owner-capable direct URL in Hostinger runtime settings.

## Phase 02 expansion boundary

The ordered expansion set after the immutable `0002` baseline is:

| Order | Journal tag | Journal `when` | Snapshot ID | SQL SHA-256 |
|-------|-------------|----------------|-------------|-------------|
| 3 | `0003_phase02_domain_expansion` | `1784902795186` | `ad7c7163-7482-4ffd-9b0e-d5db95d663ac` | `d9124906b28883dfedbe14fd329e47defb8df54a5a7ac6603fe632bb7e3e29f0` |
| 4 | `0004_phase02_legacy_backfill` | `1784902795825` | `f9248b89-ffc9-4dea-bd74-e39035f89fa0` | `e4e0d50bda7390a8f7580678fe98c5269e97e008a45e20d3475cddc159c21f54` |
| 5 | `0005_phase02_invoice_line_position_unique` | `1784905160582` | `614ec60b-ed4e-4484-b569-13da2b18e538` | `0a6941b3cf770886660906a31fa7360c026fa0e575f976da7b3c25c80469deb7` |
| 6 | `0006_phase02_remaining_integrity_indexes` | `1784905780962` | `7431f5a5-05b5-47b1-89b5-6967fb83340b` | `8546eec9b4c75d134f8c7c456affcdd06c6dd48db9cbdefb335637a2b258bbc0` |

All entries are backward-compatible with the pre-Phase-03 application. The
later contract migration is deliberately unnumbered until the Phase 04 Better
Auth/rate-limit expansion has been generated and committed.

Migration `0005` refuses unresolved duplicate `(invoice_id, position)` values.
Migration `0006` refuses unresolved duplicate product-variant
`(product_id, size_ml)` values and adds the remaining reviewed indexes for
`session.user_id`, `account.user_id`, and unfiltered invoice creation-date
queries.

Immutable baseline SQL checksums:

| Tag | SQL SHA-256 |
|-----|-------------|
| `0000_funny_black_widow` | `dc10435dfb9722dc55ac33261a4c205dc3806638316829eb63516c119133f648` |
| `0001_magical_starfox` | `96a4ce1dece0a936f3fbb3ca2ace8edca4c96c6b7befd55fb6f77cc565e36ad7` |
| `0002_clear_tenebrous` | `7363f1fa3d08a30c99dd9ff069b14dbafb224c5327b3b805fb836998e53f7300` |

## Required rollout gate

Run these steps only during the Phase 07 write freeze and only after taking the
provider restore point and inventory required by that phase.

1. Against the exact `0002` schema, run the SQL in
   `packages/db/sql/phase02-preflight-0002.sql`. Any nonzero result blocks the
   migration. Malformed numbers, numeric suffixes outside PostgreSQL `integer`
   range, semantic number collisions, duplicate invoice-line positions,
   duplicate product-variant sizes, invalid financial/inventory states,
   free-text fulfillment, draft/void fulfillment, missing lines on non-draft
   invoices, subtotal/payment cache mismatches, and fulfillment mismatches
   require an explicit data decision.
2. Apply every recorded expansion migration with the direct migration URL:

   ```bash
   DATABASE_URL_DIRECT='<redacted-direct-url>' pnpm db:migrate
   ```

3. Run `packages/db/sql/phase02-reconciliation.sql`. Any nonzero result blocks
   deployment of the compatible Phase 03/04 application and blocks the later
   contract migration.
4. Record the deployed journal rows and SHA-256 hashes. They must match the
   reviewed repository.
5. Grant the runtime role only after the complete expansion table inventory,
   including Phase 04 auth tables, is known.

The repository's `preflight:phase02` and `reconcile:phase02` commands are
intentionally restricted to disposable loopback PostgreSQL. Phase 07 should run
the reviewed SQL through the operator's direct administrative session rather
than weakening that local-only guard.

Fulfillment reconciliation is deliberately aggregate-only. Movements identify
an invoice and variant but not an individual invoice line, so each
`(invoice_id, variant_id)` compares summed line `quantity_fulfilled` with the
negative sum of invoice-referenced `sale` deltas. Returns are not netted into
fulfillment until a linked reversal model exists. Multiple lines for the same
variant therefore cannot be reconciled individually. Independently of that
aggregate equality, both draft and void invoices must have zero line and
invoice-referenced sale fulfillment; matching nonzero aggregates do not make
either status valid.

## Phase 07 role and database-privilege inventory

PostgreSQL database privileges are additive. In particular, a direct
`REVOKE TEMPORARY ... FROM runtime_role` does not make the result false while
`PUBLIC` still has `TEMPORARY`. Do not change `PUBLIC` during Phase 02. During
the Phase 07 write freeze, inventory every login and special-purpose role
before deciding whether a database-wide `PUBLIC` revoke is safe:

```sql
\set ON_ERROR_STOP on
\set database_name 'REDACTED_DATABASE'

SELECT
  rolname,
  rolcanlogin,
  rolsuper,
  rolcreaterole,
  rolcreatedb
FROM pg_roles
WHERE rolcanlogin
   OR rolsuper
   OR rolcreaterole
   OR rolcreatedb
ORDER BY rolname;

SELECT
  database.datname,
  CASE
    WHEN acl.grantee = 0 THEN 'PUBLIC'
    ELSE pg_get_userbyid(acl.grantee)
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_database AS database
CROSS JOIN LATERAL aclexplode(
  COALESCE(
    database.datacl,
    acldefault('d', database.datdba)
  )
) AS acl
WHERE database.datname = :'database_name'
ORDER BY grantee, acl.privilege_type;

SELECT
  rolname,
  has_database_privilege(
    rolname,
    :'database_name',
    'CONNECT'
  ) AS can_connect,
  has_database_privilege(
    rolname,
    :'database_name',
    'TEMPORARY'
  ) AS can_create_temp_objects
FROM pg_roles
WHERE rolcanlogin
ORDER BY rolname;
```

If, and only if, the inventory shows that revoking `TEMPORARY` from `PUBLIC`
will not break provider or maintenance workflows, revoke it in Phase 07 and
explicitly regrant it to each reviewed nonowner role that needs it. The
migration role below is one such explicit regrant. Add one named `GRANT` per
other reviewed nonowner admin or maintenance role; never regrant it to runtime.

## Runtime-role grant template

Run as the database owner. Replace every redacted psql variable interactively or
from the approved secret manager; never commit the values.

```sql
\set ON_ERROR_STOP on
\set database_name 'REDACTED_DATABASE'
\set migration_role 'REDACTED_MIGRATION_ROLE'
\set runtime_role 'REDACTED_RUNTIME_ROLE'
\set runtime_password 'REDACTED_ROTATED_PASSWORD'

BEGIN;

CREATE ROLE :"runtime_role"
  LOGIN
  NOINHERIT
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  PASSWORD :'runtime_password';

GRANT CONNECT ON DATABASE :"database_name" TO :"runtime_role";
REVOKE CREATE ON DATABASE :"database_name" FROM :"runtime_role";

-- Phase 07 only, and only after the role inventory above has been reviewed.
-- PUBLIC privileges are additive, so the PUBLIC revoke is what makes a direct
-- runtime TEMPORARY revoke effective.
REVOKE TEMPORARY ON DATABASE :"database_name" FROM PUBLIC;
GRANT TEMPORARY ON DATABASE :"database_name" TO :"migration_role";
-- Repeat an explicit GRANT for each other reviewed role that genuinely needs
-- temporary objects. Do not use PUBLIC as the grantee.
REVOKE TEMPORARY ON DATABASE :"database_name" FROM :"runtime_role";

-- First inventory other roles. If PUBLIC still has CREATE on this application's
-- public schema, remove it so the targeted runtime revoke cannot be bypassed.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"runtime_role";
REVOKE CREATE ON SCHEMA public FROM :"runtime_role";

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "user",
  "session",
  "account",
  "verification"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE ON TABLE
  "products",
  "product_variants",
  "customers",
  "invoices",
  "document_number_counters"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "invoice_lines"
TO :"runtime_role";

GRANT SELECT ON TABLE
  "locations"
TO :"runtime_role";

GRANT SELECT, INSERT ON TABLE
  "stock_movements",
  "payments"
TO :"runtime_role";

COMMIT;
```

Do not grant `CREATE` on the database/schema, ownership, role membership, DDL,
`TRUNCATE`, `REFERENCES`, `TRIGGER`, or sequence privileges to runtime.
`document_number_counters` deliberately has no `DELETE`; `invoice_lines` is the
only non-auth business table with `DELETE`; and both ledgers are
`SELECT`/`INSERT` only. Do not use broad default table privileges. Phase 04
auth/rate-limit table grants and every sequence grant are deferred until the
complete Phase 04 catalog is reviewed. Add only the privileges that the
reviewed application paths actually require, then re-run the exact matrix
below.

## Catalog verification

Run as the database owner after grants. The table matrix uses
`has_table_privilege` for the named runtime role, so it checks effective access,
including privileges inherited through role membership or `PUBLIC`, rather
than only direct grant rows:

```sql
SELECT
  has_database_privilege(
    :'runtime_role',
    :'database_name',
    'CONNECT'
  ) AS can_connect,
  has_database_privilege(
    :'runtime_role',
    :'database_name',
    'TEMPORARY'
  ) AS can_create_temp_objects,
  has_schema_privilege(
    :'runtime_role',
    'public',
    'USAGE'
  ) AS can_use_schema,
  has_schema_privilege(
    :'runtime_role',
    'public',
    'CREATE'
  ) AS can_create_in_schema;

WITH expected AS (
  SELECT table_name, privilege_type
  FROM (
    VALUES
      ('user'),
      ('session'),
      ('account'),
      ('verification')
  ) AS mutable_with_delete(table_name)
  CROSS JOIN unnest(
    ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]
  ) AS privilege(privilege_type)

  UNION ALL

  SELECT table_name, privilege_type
  FROM (
    VALUES
      ('product_variants'),
      ('products'),
      ('customers'),
      ('invoices'),
      ('document_number_counters')
  ) AS mutable_without_delete(table_name)
  CROSS JOIN unnest(
    ARRAY['SELECT', 'INSERT', 'UPDATE']::text[]
  ) AS privilege(privilege_type)

  UNION ALL

  SELECT 'invoice_lines', privilege_type
  FROM unnest(
    ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]
  ) AS privilege(privilege_type)

  UNION ALL

  SELECT 'locations', 'SELECT'

  UNION ALL

  SELECT table_name, privilege_type
  FROM (VALUES ('stock_movements'), ('payments')) AS ledger(table_name)
  CROSS JOIN unnest(
    ARRAY['SELECT', 'INSERT']::text[]
  ) AS privilege(privilege_type)
),
effective AS (
  SELECT
    tables.table_name,
    privileges.privilege_type,
    has_table_privilege(
      :'runtime_role',
      format('%I.%I', tables.table_schema, tables.table_name),
      privileges.privilege_type
    ) AS has_privilege
  FROM information_schema.tables AS tables
  CROSS JOIN (
    VALUES
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE'),
      ('TRUNCATE'),
      ('REFERENCES'),
      ('TRIGGER')
  ) AS privileges(privilege_type)
  WHERE
    tables.table_schema = 'public'
    AND tables.table_type = 'BASE TABLE'
)
SELECT
  COALESCE(expected.table_name, effective.table_name) AS table_name,
  COALESCE(expected.privilege_type, effective.privilege_type) AS privilege_type,
  CASE
    WHEN effective.table_name IS NULL THEN 'expected table absent'
    WHEN expected.table_name IS NULL THEN 'unexpected effective privilege'
    ELSE 'missing effective privilege'
  END AS status
FROM expected
FULL OUTER JOIN effective
  USING (table_name, privilege_type)
WHERE
  effective.table_name IS NULL
  OR effective.has_privilege
    <> (expected.table_name IS NOT NULL)
ORDER BY table_name, privilege_type;

SELECT
  namespace.nspname AS sequence_schema,
  sequence.relname AS sequence_name,
  privilege.privilege_type
FROM pg_class AS sequence
JOIN pg_namespace AS namespace
  ON namespace.oid = sequence.relnamespace
CROSS JOIN (
  VALUES ('USAGE'), ('SELECT'), ('UPDATE')
) AS privilege(privilege_type)
WHERE sequence.relkind = 'S'
  AND namespace.nspname = 'public'
  AND has_sequence_privilege(
    :'runtime_role',
    sequence.oid,
    privilege.privilege_type
  )
ORDER BY sequence.relname, privilege.privilege_type;

SELECT
  has_table_privilege(
    :'runtime_role',
    'public.stock_movements',
    'UPDATE'
  ) AS can_update_stock_history,
  has_table_privilege(
    :'runtime_role',
    'public.payments',
    'UPDATE'
  ) AS can_update_payment_history,
  has_table_privilege(
    :'runtime_role',
    'public.stock_movements',
    'DELETE'
  ) AS can_delete_stock_history,
  has_table_privilege(
    :'runtime_role',
    'public.payments',
    'DELETE'
  ) AS can_delete_payment_history;
```

Expected: connect and schema usage are true; temporary-object creation and
schema create are false; the exact table-matrix query and sequence query return
zero rows; and all four ledger mutation checks are false. Then connect using
the pooled runtime URL and prove supported application/auth reads and writes
plus expected failures for `CREATE TEMP TABLE`, `CREATE TABLE`, `ALTER TABLE`,
ledger `UPDATE`, ledger `DELETE`, counter `DELETE`, and `TRUNCATE`. Do not print
either connection string.

## Official sources

- Drizzle migrations: <https://orm.drizzle.team/docs/migrations>
- Drizzle Kit generate: <https://orm.drizzle.team/docs/drizzle-kit-generate>
- Drizzle custom migrations: <https://orm.drizzle.team/docs/kit-custom-migrations>
- PostgreSQL privileges: <https://www.postgresql.org/docs/current/ddl-priv.html>
- Neon connection pooling: <https://neon.com/docs/connect/connection-pooling>
