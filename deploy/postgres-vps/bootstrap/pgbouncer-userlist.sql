\set ON_ERROR_STOP on

\if :{?runtime_role}
\else
  \echo 'ERROR: pass runtime_role with -v runtime_role=...'
  \quit
\endif

-- The PgBouncer auth-file grammar uses double-quoted strings with backslash
-- escapes. Both fields are escaped explicitly rather than relying on SQL's
-- quoting rules, so a future role/password format cannot produce a malformed
-- userlist entry. psql --command would not interpolate psql variables; keep
-- this as a source-controlled script.
SELECT format(
  '"%s" "%s"',
  replace(replace(rolname, chr(92), chr(92) || chr(92)), chr(34), chr(92) || chr(34)),
  replace(replace(rolpassword, chr(92), chr(92) || chr(92)), chr(34), chr(92) || chr(34))
)
FROM pg_authid
WHERE rolname = :'runtime_role'
  AND rolcanlogin
  AND rolpassword LIKE 'SCRAM-SHA-256$%'
ORDER BY rolname
;
