# Security boundary

This directory defines infrastructure only. It is not an authorization to run
it, change production credentials, open a firewall, or alter DNS.

## Network model

```text
VPS storefront app -- Docker-only SCRAM --> pgbouncer-storefront :6432 -+
VPS ops app -------- Docker-only SCRAM ----> pgbouncer-ops :6432 ------+--> PostgreSQL :5432
root-controlled VPS -- loopback-only SCRAM ----------------------------+
pgAdmin ---------- Docker-internal connection -------------------------+
PostgreSQL ------- encrypted pgBackRest -------------------------------> local repository volume
```

- PostgreSQL publishes its direct owner listener only as
  `127.0.0.1:${POSTGRES_OWNER_LOOPBACK_PORT}`. It is for a root-controlled VPS
  session and SSH tunnels only, never a public listener. PostgreSQL also joins
  the private `perfume-aura-postgres-internal` Docker network and the
  non-masquerading `perfume-aura-postgres-owner-loopback` network that carries
  only that publish, so it has no outbound route; no application service joins
  either network.
- `pgbouncer-ops` is reachable only through the existing
  `perfume-aura-ops-internal` network, and `pgbouncer-storefront` only through
  the existing `perfume-aura-storefront-internal` network. Each is aliased
  `postgres-pooler` on its app network and never has a host port. Neither app
  network can reach raw PostgreSQL, pgAdmin or the other app's pooler.
- No database port is public. Port 6432 must stay closed at the firewall.
- pgAdmin binds only to `127.0.0.1`; use a local SSH tunnel and do not proxy it
  through Caddy or public DNS. Its publish rides a dedicated non-masquerading
  bridge, so pgAdmin has no outbound route. That relies on Docker managing
  iptables; verify on the VPS that pgAdmin cannot reach an outside address.
- The container socket accepts the owner only by peer login from the
  container's `postgres` OS user (`pg_ident.conf`); every TCP client uses SCRAM.

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
- Keep separate PgBouncer userlists: the ops pooler receives only the
  `ops_runtime` SCRAM verifier, and the storefront pooler receives only the
  `storefront_runtime` and `storefront_payment_finalizer` verifiers. Do not put
  clear-text passwords or the owner role in either file. The owner, ops,
  storefront, and payment-finalizer secret files must all contain different
  values; distinct role names do not isolate the two storefront credentials when
  their password material matches.
- PostgreSQL, pgBackRest and pgAdmin material remain in
  root-owned files outside Git. Compose bind-mounts file secrets with host
  ownership, so the four files non-root services read are `root:<gid> 0640` for
  a memberless `POSTGRES_SECRETS_GID`; only the poolers, pgAdmin and the
  image's `postgres` user hold it. Everything else stays `root:root 0600`.
- Rotate a runtime password by changing PostgreSQL, atomically replacing the
  matching verifier file, force-recreating only the relevant pooler in the
  planned maintenance window, and proving the old credential fails. The
  bootstrap verifies the exact generated file before Compose recreates the
  pooler; Docker secrets are immutable for an existing container, so an in-place
  signal is insufficient.

## Backup and recovery rules

- `repo1` is an encrypted pgBackRest repository on the dedicated
  `perfume-aura-pgbackrest-repo` volume. It is separate from the data volume
  but shares the VPS disk, so it does not survive loss of the VPS. Keep a second
  copy outside the VPS, and never remove the repository volume with the data
  volume.
- The owner-loopback bridge disables masquerading, so PostgreSQL cannot reach
  the internet. That relies on Docker managing iptables; verify on the VPS that
  PostgreSQL cannot reach an outside address.
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
- The PostgreSQL image compiles the checksum-pinned official pgBackRest 2.60.0
  distribution against its PostgreSQL 18.6 Debian trixie base; do not replace it with
  an unverified binary copied from a third-party image.
- Never run `docker compose down -v`, delete a named volume, or delete Neon
  during the migration. The source remains the rollback path until live
  acceptance and recovery evidence are recorded.
- PgBouncer transaction pooling requires session-state discipline. The existing
  Node `pg` / Drizzle path must be rehearsed against it before a cutover.
