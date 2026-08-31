# Security boundary

This directory defines infrastructure only. It is not an authorization to run
it, change production credentials, open a firewall, or alter DNS.

## Network model

```text
Hostinger storefront -- mTLS + SCRAM ------> pgbouncer-external :6432 --+
VPS ops app -------- Docker-only SCRAM ----> pgbouncer-ops :6432 ------+--> PostgreSQL :5432
root-controlled VPS -- loopback-only SCRAM ----------------------------+
pgAdmin ---------- Docker-internal connection -------------------------+
PostgreSQL ------- encrypted pgBackRest -------------------------------> off-host repository
```

- PostgreSQL publishes its direct owner listener only as
  `127.0.0.1:${POSTGRES_OWNER_LOOPBACK_PORT}`. It is for a root-controlled VPS
  session and SSH tunnels only, never a public listener. PostgreSQL also joins
  the private `perfume-aura-postgres-internal` Docker network and the dedicated
  `perfume-aura-postgres-backup-egress` network; no application service joins
  the backup network.
- `pgbouncer-ops` is reachable only through the existing
  `perfume-aura-ops-internal` network. It never has a host port.
- `pgbouncer-external` is the sole public database listener and requires TLS,
  a client certificate issued by the private client CA, and SCRAM credentials.
  Firewall policy must still allow port 6432 only from the storefront's known
  egress ranges if those ranges can be established reliably.
- pgAdmin binds only to `127.0.0.1`; use a local SSH tunnel and do not proxy it
  through Caddy or public DNS.

## Credential and role rules

- Keep the direct owner/migration role, `ops_runtime`, `storefront_runtime`,
  and `storefront_payment_finalizer` distinct. No shared runtime role is
  permitted. The finalizer role has no direct table access and may execute only
  the narrowly granted provider-session binding and verified payment-finalization
  routines; it cannot use normal storefront DML.
- The owner-only `runtime_capability_roles` registry records exactly the
  `ops`, `storefront`, and `payment_finalizer` login capabilities. The payment
  trigger reads `session_user` through that registry instead of hard-coded role
  names. After migrations and before any grant script, the root bootstrap
  repopulates the exact three mappings and machine-checks both that set and
  that none of the runtime roles has an effective registry-table privilege.
- The bootstrap rejects a runtime principal that is the database owner or that
  already owns a database, tablespace, schema, relation, routine, or other
  database-local object. Ownership is not removable with a grant revoke, so
  reusing an owner-capable role would defeat the reviewed runtime grant matrix.
- Keep separate PgBouncer userlists: the private ops pooler receives only the
  `ops_runtime` SCRAM verifier, and the public pooler receives only the
  `storefront_runtime` and `storefront_payment_finalizer` verifiers. Do not put
  clear-text passwords or the owner role in either file. The owner, ops,
  storefront, and payment-finalizer secret files must all contain different
  values; distinct role names do not isolate the two public credentials when
  their password material matches.
- PostgreSQL, pgBackRest, pooler TLS, pgAdmin, application client-certificate,
  and off-host repository material remain in root-owned files outside Git.
- Rotate a runtime password by changing PostgreSQL, atomically replacing the
  matching verifier file, force-recreating only the relevant pooler in the
  planned maintenance window, and proving the old credential fails. The
  bootstrap verifies the exact generated file before Compose recreates the
  pooler; Docker secrets are immutable for an existing container, so an in-place
  signal is insufficient. Revoke a lost client certificate in the private CA
  process, replace the CA bundle if required, then recreate the external pooler.

## Backup and recovery rules

- A local Docker volume is not a backup. `repo1` must be a separate, encrypted
  off-host storage account or repository controlled independently of the VPS.
- The non-internal Docker `backup_egress` network is an egress path, not a
  firewall. Before cutover, enforce and test an outbound allowlist for the
  PostgreSQL container to the independently managed repository endpoint on TCP
  443 at the VPS/provider firewall layer. Docker bridge traffic can bypass a
  host's default UFW policy, so a rule that merely exists is not evidence.
- Do not import or cut over production data until `stanza-create`, `check`, one
  full backup, one differential backup, and an isolated restore drill pass.
- Treat every backup cipher passphrase as recovery-critical material. Store it
  independently from the VPS and test that it works during the restore drill.

## Operational constraints

- The root bootstrap resets `PATH`, requires an explicit absolute root-owned
  Node executable, and recursively rejects group/other-writable or non-root
  dependency content and any dependency symlink leaving the reviewed checkout.
  It invokes the lockfile-installed Drizzle runner directly; it never resolves
  `pnpm` while the owner password is present.
- Build and digest-inspect images on the VPS architecture before first use.
- `postgres/Dockerfile` and `compose.yaml` pin PostgreSQL, both PgBouncer
  services, and pgAdmin to immutable multi-architecture indexes. Run
  `postgres/verify-postgres-image-lock.mjs` before a build; it fails when any
  reviewed Docker Hub tag/index or either Linux child manifest drifts. Update
  the matching source reference and lock together only through the documented
  review procedure.
- The PostgreSQL image compiles the checksum-pinned official pgBackRest 2.59.1
  distribution against its PostgreSQL 17.10 Debian base; do not replace it with
  an unverified binary copied from a third-party image.
- Never run `docker compose down -v`, delete a named volume, or delete Neon
  during the migration. The source remains the rollback path until live
  acceptance and recovery evidence are recorded.
- PgBouncer transaction pooling requires session-state discipline. The existing
  Node `pg` / Drizzle path must be rehearsed against it before a cutover.
