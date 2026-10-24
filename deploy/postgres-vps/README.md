# Perfume Aura self-hosted PostgreSQL

This directory is the version-controlled infrastructure for the production
database; both apps use it and Neon is retired. Production was created from a
fresh schema rather than a Neon copy. It does **not** deploy a database on its own and it does
not change the existing ops or storefront Compose stacks, application code,
Neon project, production DNS, or credentials.

## What it provides

| Component | Scope | Version / exposure |
| --- | --- | --- |
| PostgreSQL | primary database | `postgres:18.6-trixie` pinned to the reviewed immutable index in `postgres/postgres-image.lock`; root-controlled loopback owner port only |
| PgBouncer for ops | private app pool | `edoburu/pgbouncer:v1.26.1-p0` pinned to the reviewed immutable index; existing ops Docker network only |
| PgBouncer for storefront | private app pool | same pinned image; existing storefront Docker network only |
| pgBackRest | PITR and recovery | `2.60.0`, built from the checksummed release; runs beside PostgreSQL; encrypted `repo1` on its own VPS volume |
| pgAdmin | break-glass UI | `dpage/pgadmin4:9.18` pinned to the reviewed immutable index; `127.0.0.1` only |

`compose.yaml` intentionally uses two poolers, each attached to exactly one
app's existing Docker network under the alias `postgres-pooler`. Each pooler's
userlist holds only its own app's roles, so neither app can authenticate as the
other. No database port is public.

## Required before deployment

1. Complete the source inventory and target capacity/SSH admission.
2. Rehearse an import and restore with anonymized or disposable data first.
3. Set the pgBackRest cipher passphrase, keep a copy of it off the VPS, and
   arrange a second backup copy outside the VPS.
4. Create distinct direct-owner, operations-runtime, storefront-runtime, and
   storefront-payment-finalizer roles and prove the complete grant matrix. Use
   `bootstrap/bootstrap-runtime-roles.sh`; it migrates first, then invokes the
   exact grant scripts with drift checks. The direct owner URL contains no
   password; the bootstrap reads the root-owned owner password file into a
   short-lived `PGPASSWORD` environment variable. Every one of those four
   role-secret files must contain a different value; the bootstrap rejects a
   duplicate without printing it.
5. Build/digest-inspect images on the actual VPS architecture, then run the
   exact rehearsal and live acceptance gates in `RUNBOOK.md`. PostgreSQL,
   both PgBouncer services, and pgAdmin are immutable reviewed
   multi-architecture indexes, checked by
   `postgres/verify-postgres-image-lock.mjs` before a VPS build.
6. Run the root bootstrap only from a clean, root-owned normal Git checkout at
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
