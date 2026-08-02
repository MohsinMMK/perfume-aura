\set ON_ERROR_STOP on

\if :{?runtime_role}
\else
  \echo 'ERROR: pass the reviewed runtime role with -v runtime_role=...'
  \quit
\endif

BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  "two_factor", "staff_invitation_events", "ops_audit_events"
FROM :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "two_factor"
TO :"runtime_role";

-- Immutable event tables permit insertion and readback only. PostgreSQL
-- triggers independently reject updates/deletes even for a compromised path.
GRANT SELECT, INSERT ON TABLE
  "staff_invitation_events", "ops_audit_events"
TO :"runtime_role";

COMMIT;

-- All returned rows are privilege drift.
WITH matrix(table_name, allowed) AS (
  VALUES
    ('two_factor', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('staff_invitation_events', ARRAY['SELECT','INSERT']),
    ('ops_audit_events', ARRAY['SELECT','INSERT'])
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
