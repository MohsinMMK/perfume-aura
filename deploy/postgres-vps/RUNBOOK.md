# Self-hosted PostgreSQL rehearsal and cutover runbook

Use this runbook only after the source Neon inventory, target VPS admission,
and a scheduled cutover window are recorded. It is deliberately a rehearsal
plan first; no command here deletes the Neon source. Production was cut over
with a fresh schema instead of a copy: the Neon export, parity and rollback-to-Neon
steps no longer apply.

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
3. Create the `POSTGRES_SECRETS_GID` group and every file from
   `secrets/README.md`, copying no secrets into the repository. `repo1` is the
   local `perfume-aura-pgbackrest-repo` volume; set only its cipher passphrase,
   and store a copy of that passphrase off the VPS.
4. Confirm `perfume-aura-ops-internal` and `perfume-aura-storefront-internal`
   already exist from the independent app stacks. This database stack consumes
   those networks but never manages them.
5. Keep inbound port 6432 closed; no pooler publishes a host port. PostgreSQL
   needs no outbound access: its only non-internal network is the
   non-masquerading owner-loopback bridge. Verify from the PostgreSQL container
   that an outside address is unreachable.

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
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres sh -ceu 'psql --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --command="SELECT pg_stat_reset_shared('\''archiver'\'')"'
```

`archive_command` fails until `stanza-create` exists, so a fresh cluster always
records a few early failures. Reset the archiver statistics only after `check`
passes; from then on `failed_count` must stay `0`.

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
proves only the image, pgAdmin isolation, and backup wiring. The
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
connection authenticates as the expected PostgreSQL 18 database/owner identity.
The two
userlist variables must point to separate root-owned
files: the ops list contains only ops, and the storefront list contains only
the storefront runtime and payment-finalizer verifiers. The bootstrap verifies
each atomically written file and force-recreates both poolers after installing
the corresponding Docker-secret sources; this must be inside the planned
maintenance window. It never accepts a pooled runtime URL and it never prints
clear-text passwords or SCRAM verifiers. Before it connects, it also rejects
any matching pair among the owner, ops, storefront, and payment-finalizer
secret files, reporting only their file labels; otherwise a normal storefront
password could authenticate as the finalizer through the storefront userlist.

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

## 3. Test backup recovery before any cutover

Run a full backup, then a differential backup after an intentional rehearsal
write. Enable the supplied timer only after both succeed:

```bash
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura backup --type=full
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura info
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres sh -ceu 'psql --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" -c "CREATE SCHEMA IF NOT EXISTS backup_rehearsal; CREATE TABLE IF NOT EXISTS backup_rehearsal.probe (marker text PRIMARY KEY, written_at timestamptz NOT NULL DEFAULT now()); INSERT INTO backup_rehearsal.probe (marker) VALUES ('\''after-full-before-diff'\'') ON CONFLICT (marker) DO UPDATE SET written_at = now();"'
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura backup --type=diff
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura info
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-backup.service /etc/systemd/system/perfume-aura-postgres-backup.service
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-backup.timer /etc/systemd/system/perfume-aura-postgres-backup.timer
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-full-backup.service /etc/systemd/system/perfume-aura-postgres-full-backup.service
install -o root -g root -m 0644 /srv/perfume-aura/deploy/postgres-vps/systemd/perfume-aura-postgres-full-backup.timer /etc/systemd/system/perfume-aura-postgres-full-backup.timer
systemctl daemon-reload
if systemctl is-enabled --quiet NetworkManager.service; then
  systemctl enable NetworkManager-wait-online.service
elif systemctl is-enabled --quiet systemd-networkd.service; then
  systemctl enable systemd-networkd-wait-online.service
else
  echo "ERROR: enable the host network manager's wait-online unit before backup timers" >&2
  exit 1
fi
systemctl enable --now perfume-aura-postgres-backup.timer perfume-aura-postgres-full-backup.timer
systemctl list-timers 'perfume-aura-postgres*-backup.timer'
docker compose --env-file /etc/perfume-aura-postgres/compose.env -f /srv/perfume-aura/deploy/postgres-vps/compose.yaml exec -T --user postgres postgres sh -ceu 'psql --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --command="SELECT archived_count, failed_count, last_archived_time, last_failed_time FROM pg_stat_archiver"'
postgres_data_mount="$(docker volume inspect perfume-aura-postgres-pg18-data --format '{{ .Mountpoint }}')"
test -n "$postgres_data_mount"
df -h "$postgres_data_mount" /var/lib/docker
```

The differential timer runs Monday through Saturday; the full timer runs Sunday
at the same UTC time. Both backup commands take the same bounded lock so a
delayed persistent timer cannot run an overlapping full and differential backup.
Require `pg_stat_archiver.failed_count = 0` on the fresh rehearsal target and
record both the PostgreSQL data-volume and Docker-filesystem free space. Repeat
these two checks throughout load rehearsal and the controlled cutover; any
increase in `failed_count` or exhausted-space trajectory stops the window.

The repository shares the VPS disk, so it covers mistakes, corruption and
point-in-time recovery but not loss of the VPS. Keep a second copy outside the
VPS, such as the hosting provider's VPS backup or an administrator-pulled copy
of the encrypted repository volume, and never keep the only copy of the cipher
passphrase on the VPS.

Restore into a separate disposable volume or VPS before production. Stop only
the disposable target, run pgBackRest restore with its exact target config, and
prove row counts, migration journal, runtime grants, application login, and an
operations workflow. Record no customer data in the evidence.

This drill restores into a throwaway volume with no network, mounting the
repository read-only so the restored cluster cannot archive into it. Use the
production `postgresql.conf`: recovery refuses settings below the primary's.

```bash
docker volume create perfume-aura-restore-drill
docker run --rm --network none --user postgres \
  -v perfume-aura-restore-drill:/var/lib/postgresql \
  -v perfume-aura-pgbackrest-repo:/var/lib/pgbackrest-repo:ro \
  -v /etc/perfume-aura-postgres/secrets/pgbackrest.conf:/run/secrets/pgbackrest_config:ro \
  -v /srv/perfume-aura/deploy/postgres-vps/postgres:/etc/postgresql:ro \
  --entrypoint bash perfume-aura-postgres:18.6-pgbackrest-2.60.0 -ceu '
    d=/var/lib/postgresql/18/docker; mkdir -p -m 0700 "$d"
    pgbackrest --config=/run/secrets/pgbackrest_config --stanza=perfume_aura --archive-mode=off restore
    echo "local all all trust" > /tmp/hba
    pg_ctl -D "$d" -l /tmp/pg.log -w -t 180 -o "-c config_file=/etc/postgresql/postgresql.conf -c hba_file=/tmp/hba -c listen_addresses= -c unix_socket_directories=/tmp -c archive_mode=off" start
    psql -h /tmp -U perfume_aura_owner -d perfume_aura -Atc "SELECT marker FROM backup_rehearsal.probe"
    pg_ctl -D "$d" -w stop'
docker volume rm perfume-aura-restore-drill
```

## 4. Rehearse application connections

- Each app uses `postgres-pooler:6432/perfume_aura` on its own existing Docker
  network, with no ssl query parameter and no `DATABASE_TLS_*` variable. Both
  poolers have client TLS disabled and are unreachable outside their network.
- Ops connects as `ops_runtime`.
- Storefront `DATABASE_URL` connects as `storefront_runtime`. Its separately
  configured `STOREFRONT_PAYMENT_FINALIZER_DATABASE_URL` uses the same pooler
  but authenticates only as `storefront_payment_finalizer`; it has no direct
  table privileges and may execute only the provider-session binding and
  verified payment-finalization routines. It must never reuse the normal
  storefront runtime credential.
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
   runtime connection setting. Record `pg_stat_archiver` again, require its
   `failed_count` not to have increased from the accepted rehearsal value, and
   confirm the PostgreSQL data volume and Docker filesystem retain the reviewed
   free-space margin.
6. Update the root-owned ops env to its private pooler URL. In the root-owned
   storefront env, switch `DATABASE_URL` and
   `STOREFRONT_PAYMENT_FINALIZER_DATABASE_URL` together to their distinct
   restricted private pooler URLs.
7. Deploy both exact application artifacts. Verify readiness, unauthenticated
   session behavior, ops login, stock/oil actions, storefront public pages,
   release locks, and a real static asset. Keep commerce and staff flags closed.
8. Keep the source Neon database unchanged and read-only-capable until the
   defined rollback window and a successful independent restore drill.

## 6. Rollback

If either runtime, grants, backup proof, or browser acceptance fails, return the
affected application connection setting to Neon, redeploy the prior known-good
application artifact, and re-verify. The storefront `DATABASE_URL` and
`STOREFRONT_PAYMENT_FINALIZER_DATABASE_URL` must always switch or roll back as
one unit. Do not delete the VPS data volume, run destructive Docker commands,
or alter the source database during rollback.

## 7. Private pgAdmin access

From an administrator workstation, tunnel the loopback-only interface through
an authenticated SSH session, then browse locally. Register `postgres:5432`
inside pgAdmin with the direct owner role only when necessary. Do not publish
pgAdmin, add it to Caddy, or store the owner password in `servers.json`.
