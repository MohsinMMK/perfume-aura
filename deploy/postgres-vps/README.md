# Perfume Aura self-hosted PostgreSQL target

This directory is the version-controlled target infrastructure for the chosen
VPS migration path. It does **not** deploy a database on its own and it does
not change the existing ops Compose stack, application code, Neon project,
production DNS, or credentials.

## What it provides

| Component | Scope | Version / exposure |
| --- | --- | --- |
| PostgreSQL | primary database | `postgres:17.10-bookworm` pinned to the reviewed immutable index in `postgres/postgres-image.lock`; root-controlled loopback owner port only |
| PgBouncer for ops | private app pool | `edoburu/pgbouncer:v1.25.2-p0` pinned to the reviewed immutable index; existing Docker network only |
| PgBouncer for storefront | public app pool | `edoburu/pgbouncer:v1.25.2-p0` pinned to the reviewed immutable index; mTLS + SCRAM on `6432` |
| pgBackRest | PITR and recovery | runs beside PostgreSQL; encrypted, off-host `repo1` required |
| pgAdmin | break-glass UI | `dpage/pgadmin4:9.17` pinned to the reviewed immutable index; `127.0.0.1` only |

`compose.yaml` intentionally uses two poolers. The split prevents a public
listener from becoming an implicit path into operations, and allows the
existing operations container to remain on its private Docker network.

## Required before deployment

1. Complete the source inventory and target capacity/SSH admission.
2. Rehearse an import and restore with anonymized or disposable data first.
3. Provision an independent, encrypted off-host pgBackRest repository.
4. Create distinct direct-owner, operations-runtime, storefront-runtime, and
   storefront-payment-finalizer roles and prove the complete grant matrix. Use
   `bootstrap/bootstrap-runtime-roles.sh`; it migrates first, then invokes the
   exact grant scripts with drift checks. The direct owner URL contains no
   password; the bootstrap reads the root-owned owner password file into a
   short-lived `PGPASSWORD` environment variable. Every one of those four
   role-secret files must contain a different value; the bootstrap rejects a
   duplicate without printing it.
5. Establish the storefront's secure mTLS client-certificate delivery path in
   Hostinger. Do not fall back to a public password-only PostgreSQL port.
6. Build/digest-inspect images on the actual VPS architecture, then run the
   exact rehearsal and live acceptance gates in `RUNBOOK.md`. PostgreSQL,
   both PgBouncer services, and pgAdmin are immutable reviewed
   multi-architecture indexes, checked by
   `postgres/verify-postgres-image-lock.mjs` before a VPS build.
7. Run the root bootstrap only from a clean, root-owned normal Git checkout at
   the canonical repository origin and the explicit reviewed 40-character
   commit SHA. It rejects worktrees, symbolic links, or mutable tracked
   artifacts. Install the frozen dependency tree with lifecycle scripts
   disabled before secrets are introduced, make it root-owned/non-writable to
   other users, and provide the absolute reviewed Node executable. The
   bootstrap recursively verifies those inputs before it can invoke the pinned
   Drizzle migration runner or SQL.

See `SECURITY.md` for the network and credential model, `RUNBOOK.md` for the
rehearsal/cutover procedure, `secrets/README.md` for root-only material, and
`systemd/` for the backup timer. The supplied `.env.example` is safe to track;
copy it only to the root-owned location named in the runbook.
