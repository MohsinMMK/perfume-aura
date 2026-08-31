# Self-hosted PostgreSQL rehearsal and cutover runbook

Use this runbook only after the source Neon inventory, target VPS admission,
and a scheduled cutover window are recorded. It is deliberately a rehearsal
plan first; no command here deletes the Neon source.

## 1. Prepare target configuration

1. Install the exact reviewed Perfume Aura repository checkout at
   `/srv/perfume-aura` with root ownership. The target directory is
   `/srv/perfume-aura/deploy/postgres-vps`; keep the checkout read-only to
   application users so the bootstrap can use the source-controlled migrations
   and grant scripts from the same commit. Use a normal root-owned `.git`
   directory rather than a Git worktree pointer, keep every tracked artifact
   root-owned and non-group/other-writable, and leave the checkout clean.
   Before any database secret is read, use a reviewed root-controlled package
   manager to install the exact lockfile with lifecycle scripts disabled
   (`pnpm install --frozen-lockfile --ignore-scripts`), then make the repository
   dependency trees root-owned and non-group/other-writable. The bootstrap
   recursively verifies both dependency trees and every in-repository symlink,
   requires an explicit root-owned Node executable, and invokes the pinned
   Drizzle runner directly rather than resolving `pnpm` from `PATH`.
2. Copy `.env.example` to `/etc/perfume-aura-postgres/compose.env`, set only
   the non-secret values, and keep it `0600 root:root`.
3. Create every file from `secrets/README.md`, copying no secrets into the
   repository. Set the S3-compatible `repo1` details in `pgbackrest.conf`.
4. Create a private client CA offline. Issue a server certificate whose SAN
   matches the final database hostname and issue a distinct storefront client
   certificate. The CA private key must never reach the VPS.
5. Confirm `perfume-aura-ops-internal` already exists from the independent ops
   stack. This database stack consumes that network but never manages it.
6. Before enabling any external port, restrict inbound port 6432 to the
   storefront's verified egress ranges where available. In addition, enforce
   outbound TCP 443 from the PostgreSQL backup-egress path to the independently
   managed pgBackRest repository endpoint only. Verify that enforcement from
   the PostgreSQL container; Docker bridge traffic can bypass a default UFW
   policy. mTLS remains mandatory even when an allowlist is in place.

Validate the fully expanded Compose definition without starting containers:

```bash
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml config --quiet
```

## 2. Bring up an empty rehearsal target

```bash
node /srv/perfume-aura/deploy/postgres-vps/postgres/verify-postgres-image-lock.mjs
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml build --pull postgres
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml up -d postgres pgadmin
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml ps
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura stanza-create
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura check
```

The PostgreSQL Dockerfile and the PgBouncer/pgAdmin Compose services use
immutable reviewed multi-architecture image indexes, so `--pull` cannot
substitute a changed tag. The preceding verifier fails if Docker Hub's current
reviewed tag/index or either Linux amd64/arm64 child digest differs.

To deliberately update the base image, retrieve the official Docker Registry
multi-architecture index for the new reviewed tag, record its index digest and
Linux amd64/arm64 child digests in `postgres/postgres-image.lock`, replace the
single literal base reference in `postgres/Dockerfile`, then run the verifier
and a build on the actual VPS architecture. Review and commit the Dockerfile
and lock together with passing verifier evidence; never update only the tag or
bypass the verifier.

Do not import source data into this container-and-backup smoke target. It
proves only the image, pgAdmin isolation, and off-host backup wiring. The
poolers are created by the controlled role bootstrap after their exact verifier
files exist.
For a schema-and-data logical export, use a fresh target volume/database, not
one that has already received a migration bootstrap. Restore the source as the
target owner first; only then apply any pending reviewed migrations, create the
three distinct runtime roles, apply the restricted grant matrix, and verify that
storefront role cannot read oil, cost, raw-material, or operations-only data.

The reproducible role path always runs migrations before it creates/rotates the
runtime roles. It then invokes the existing reviewed grant scripts and refuses
to continue if either script returns privilege-drift rows. The operations stage
first grants DML on the private current table set, then the existing operations
script narrows the immutable/event/ledger exceptions; storefront remains
deny-first and receives only its explicitly reviewed matrix:

```bash
DATABASE_URL_DIRECT='postgresql://perfume_aura_owner@127.0.0.1:55432/perfume_aura' \
POSTGRES_OWNER_PASSWORD_FILE=/etc/perfume-aura-postgres/secrets/postgres-superuser-password \
PERFUME_AURA_TRUSTED_NODE=/usr/bin/node \
PERFUME_AURA_BOOTSTRAP_GIT_ORIGIN=https://github.com/MohsinMMK/perfume-aura.git \
PERFUME_AURA_BOOTSTRAP_GIT_COMMIT='<exact-40-character-reviewed-commit>' \
SELF_HOSTED_DATABASE_TARGET_HOST=127.0.0.1 \
SELF_HOSTED_DATABASE_BOOTSTRAP_ACK=bootstrap-self-hosted-target \
ALLOW_LOOPBACK_SELF_HOSTED_DATABASE_TARGET=root-controlled-vps-loopback-owner-port \
POSTGRES_COMPOSE_ENV_FILE=/etc/perfume-aura-postgres/compose.env \
OPS_RUNTIME_PASSWORD_FILE=/etc/perfume-aura-postgres/secrets/ops-runtime-password \
STOREFRONT_RUNTIME_PASSWORD_FILE=/etc/perfume-aura-postgres/secrets/storefront-runtime-password \
STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE=/etc/perfume-aura-postgres/secrets/storefront-payment-finalizer-password \
PGBOUNCER_OPS_USERLIST_FILE=/etc/perfume-aura-postgres/secrets/pgbouncer-ops-userlist.txt \
PGBOUNCER_STOREFRONT_USERLIST_FILE=/etc/perfume-aura-postgres/secrets/pgbouncer-storefront-userlist.txt \
bash /srv/perfume-aura/deploy/postgres-vps/bootstrap/bootstrap-runtime-roles.sh
```

Run it only from a root-controlled session. Set `PERFUME_AURA_TRUSTED_NODE` to
the actual absolute Node executable installed from the reviewed system path;
the bootstrap resolves it and rejects a binary or dependency tree that is not
root-owned and non-group/other-writable. It rejects Neon, both poolers, a
wrong database name or owner, and any target whose host does not exactly match
`SELF_HOSTED_DATABASE_TARGET_HOST`; the acknowledgement must have the literal
value shown above. It accepts only the root-controlled VPS loopback owner
listener on the exact `POSTGRES_OWNER_LOOPBACK_PORT` from `compose.env`; it is
not a generic remote migration command. The direct URL deliberately contains no
password. The bootstrap reads `POSTGRES_OWNER_PASSWORD_FILE` into short-lived
`PGPASSWORD`, so neither terminal history nor process arguments expose the
owner secret. Before migrations, it also proves that the running reviewed
Compose stack publishes exactly that loopback listener and that the direct
connection authenticates as the expected PostgreSQL 17 database/owner identity.
The two
userlist variables must point to separate root-owned
files: the private list contains only ops, and the public list contains only
the storefront runtime and payment-finalizer verifiers. The bootstrap verifies
each atomically written file and force-recreates both poolers after installing
the corresponding Docker-secret sources; this must be inside the planned
maintenance window. It never accepts a pooled runtime URL and it never prints
clear-text passwords or SCRAM verifiers. Before it connects, it also rejects
any matching pair among the owner, ops, storefront, and payment-finalizer
secret files, reporting only their file labels; otherwise a normal storefront
password could authenticate as the finalizer through the public userlist.

After migrations and before it applies any runtime grant script, the bootstrap
owner-upserts exactly the `ops`, `storefront`, and `payment_finalizer` rows in
`runtime_capability_roles`. Its machine check returns only a boolean and fails
unless those are the entire registry set and all three runtime principals have
no effective privilege on that table. Payment-state controls then use
`session_user` through this registry rather than hard-coded deployment role
names.

Before any migration, it also rejects a runtime principal that is the owner
role or already owns any cluster/database object. A grant revoke cannot remove
PostgreSQL ownership; use new dedicated runtime names rather than attempting to
reuse a principal that once owned a database, tablespace, schema, relation, or
routine.

It also requires the literal canonical Git origin and the exact approved
40-character commit SHA above. Before invoking `pnpm`, it rejects a linked,
dirty, non-root-owned, group/other-writable, or untracked checkout, and checks
every tracked artifact plus the migration/grant/bootstrap files. Do not point
the root bootstrap at an ad hoc worktree or copy.

## 3. Test off-host recovery before any cutover

Run a full backup, then a differential backup after an intentional rehearsal
write. Enable the supplied timer only after both succeed:

```bash
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura backup --type=full
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura info
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-backup.service /etc/systemd/system/perfume-aura-postgres-backup.service
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-backup.timer /etc/systemd/system/perfume-aura-postgres-backup.timer
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-full-backup.service /etc/systemd/system/perfume-aura-postgres-full-backup.service
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-full-backup.timer /etc/systemd/system/perfume-aura-postgres-full-backup.timer
systemctl daemon-reload
systemctl enable --now perfume-aura-postgres-backup.timer perfume-aura-postgres-full-backup.timer
systemctl list-timers 'perfume-aura-postgres*-backup.timer'
```

The differential timer runs Monday through Saturday; the full timer runs Sunday
at the same UTC time. Both backup commands take the same bounded lock so a
delayed persistent timer cannot run an overlapping full and differential backup.

Restore into a separate disposable volume or VPS before production. Stop only
the disposable target, run pgBackRest restore with its exact target config, and
prove row counts, migration journal, runtime grants, application login, and an
operations workflow. Record no customer data in the evidence.

## 4. Rehearse application connections

- Ops must use `postgres-pooler:6432` on the existing Docker network with its
  `ops_runtime` URL. It does not use the public address, a client certificate,
  or any `DATABASE_TLS_*` environment variable; the private pooler has client
  TLS disabled and is inaccessible outside that Docker network.
- Storefront must use the final public database hostname on port `6432`, verify
  the server certificate hostname, provide its client certificate and key, and
  connect as `storefront_runtime`. Its separately configured payment-finalizer
  connection uses the same mTLS endpoint but authenticates only as
  `storefront_payment_finalizer`; it has no direct table privileges and may
  execute only the provider-session binding and verified payment-finalization
  routines. It must never reuse the normal storefront runtime credential. Set
  all four `DATABASE_TLS_*` values only in that storefront environment; the
  material applies to both restricted storefront URLs.
- Owner migrations stay direct to the raw PostgreSQL container through a
  root-controlled VPS loopback operation or an SSH tunnel terminating at that
  listener; they never use either transaction pooler.
- Run the full integration suite and the browser operations/storefront flows
  against the rehearsal target. Confirm transaction pooling supports the app's
  Drizzle transactions and no session-only feature is relied on.

## 5. Controlled cutover

1. Freeze writes on the source using the approved maintenance/release mechanism.
2. Take and checksum a final logical source backup and retain it unchanged.
3. Restore it into a fresh empty VPS target volume/database using the owner
   path; do not restore a schema-and-data dump over a database previously
   initialized by bootstrap. Then apply only reviewed, source-controlled
   migrations needed to reconcile the target.
4. Reapply and prove the full least-privilege grant matrix. Verify schema
   migration journal, row-count summaries, foreign-key integrity, sequence
   positions, and role separation without printing customer data.
5. Take a fresh pgBackRest full backup and repeat `check` before changing either
   runtime connection setting.
6. Update the root-owned ops secret store to the private pooler URL. Update the
   Hostinger storefront environment to the mTLS external pooler URL and its
   client certificate material through the owning provider mechanism.
7. Deploy both exact application artifacts. Verify readiness, unauthenticated
   session behavior, ops login, stock/oil actions, storefront public pages,
   release locks, and a real static asset. Keep commerce and staff flags closed.
8. Keep the source Neon database unchanged and read-only-capable until the
   defined rollback window and a successful independent restore drill.

## 6. Rollback

If either runtime, grants, backup proof, or browser acceptance fails, return
only the affected application connection setting to Neon, redeploy the prior
known-good application artifact, and re-verify. Do not delete the VPS data
volume, run destructive Docker commands, or alter the source database during
rollback.

## 7. Private pgAdmin access

From an administrator workstation, tunnel the loopback-only interface through
an authenticated SSH session, then browse locally. Register `postgres:5432`
inside pgAdmin with the direct owner role only when necessary. Do not publish
pgAdmin, add it to Caddy, or store the owner password in `servers.json`.
