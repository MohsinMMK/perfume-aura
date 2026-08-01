# Operations

Safety-critical source for DNS, Hostinger deployment, Neon cutover, and production recovery.

## Ownership

| Concern | Provider |
|---|---|
| Domain registration/renewal | GoDaddy |
| Authoritative DNS | Hostinger |
| Marketing hosting | Hostinger classic Git |
| Ops hosting | Hostinger Node.js Web App |
| Database | Neon PostgreSQL |
| Source | GitHub `MohsinMMK/perfume-aura`, branch `main` |

Never transfer domain to Hostinger, edit GoDaddy DNS while Hostinger nameservers are active, or deploy ops through classic Git.

## DNS

Nameservers set at GoDaddy:

```text
lunar.dns-parking.com
solar.dns-parking.com
```

Edit records only in Hostinger. Live zone verified 2026-07-25:

- apex ALIAS → `perfumeaura.com.cdn.hstgr.net`;
- `www` CNAME → `www.perfumeaura.com.cdn.hstgr.net`;
- Hostinger mail MX/SPF/DKIM records present.

Do not force historical plan IP when CDN ALIAS is active. Allow up to 24 hours after DNS changes; do not thrash nameservers.

```bash
dig NS perfumeaura.com +short
dig A perfumeaura.com +short
curl -sI -L https://perfumeaura.com
```

## Two deployment products

### Marketing — Path M

Hostinger `perfumeaura.com` → Advanced → Git → GitHub `main` → `public_html`.

```bash
# Edit apps/marketing only.
pnpm marketing:sync
pnpm marketing:check
git add apps/marketing index.html styles.css .htaccess
git commit -m "Describe marketing change"
git push origin main
```

Current classic Git deploy exposes whole repository filesystem, so root `.htaccess` must deny `/apps`, `/packages`, `/docs`, lockfiles, Markdown, `.git`, and env files. Verify protected source returns `403`.

### Ops — automated prebuilt Git branch (Option 1-B / production routine)

Routine developer action:

```bash
git push origin main
```

GitHub Actions then:

1. runs quality + PostgreSQL 16 integration gates;
2. builds and smoke-tests the exact standalone runtime (`pnpm ops:pack`);
3. publishes that verified tree to generated branch `hostinger-ops-production`
   as a single orphan commit (force-with-lease only);
4. optionally polls live `/api/health/version` when repository variable
   `HOSTINGER_OPS_AUTO_DEPLOY_ENABLED=true`.

Release ordering:

- Main workflow concurrency is non-cancelling for `main` pushes. A release that
  already started finishes even if a newer `main` commit arrives while it runs.
- The latest queued/remaining push deploys afterward (eventual sequential
  release). GitHub may drop older still-pending runs in the concurrency group;
  that is acceptable because the newest remaining run still deploys.
- Publisher does **not** require the candidate SHA to equal the live `main` tip.
- Monotonic guard: if `hostinger-ops-production` already exists, its
  `artifact-manifest.json` `source.commit` must be a Git ancestor of the
  candidate source commit. Older/non-descendant sources are rejected so a slow
  older run cannot overwrite a newer already-published deploy source.
- Deploy-branch tip updates stay atomic via `force-with-lease`.
- `git revert` on `main` remains a descendant publish and is allowed.

This is still Hostinger Node.js Web App + GitHub App auto-deploy. CI builds the
runtime; Hostinger only pulls the prebuilt branch and starts
`apps/ops/server.js`. No recurring archive upload.

Current Hostinger ops fields:

| Field | Value |
|---|---|
| Domain | `app.perfumeaura.com` |
| Source | GitHub App → same repo |
| Branch | `hostinger-ops-production` |
| Framework | Other |
| Node | `24.x` |
| Package manager | `pnpm` |
| Root | `./` |
| Build | None (generated branch is already prebuilt) |
| Output | empty |
| Entry | `apps/ops/server.js` |
| Env | existing hPanel runtime set only |

Keep extracted `node_modules`. Never bake secrets into the branch.

### Ops — Path Z (emergency rollback/fallback)

Generated-branch auto-deployment is the production routine. Retain a current,
checksum-verified ZIP only for emergency rollback/fallback:

```bash
nvm use
pnpm ops:pack
```

Same runtime contract and entry `apps/ops/server.js`. Do not return to recurring
manual uploads while the generated branch remains healthy.

### Path G — pure monorepo source build blocked

Hostinger shared-host monorepo `pnpm install` + `next build` remains blocked by
esbuild `EACCES` / pnpm PATH behavior. Do not connect `main` source build for
ops. Option 1-B prebuilt branch is the supported GitHub automation path.

Provider API archive upload, MCP deploy, and Connector remain unsupported for
routine release. Read-only provider inspection is allowed; mutations stay with
authorized root operator.

### Production migrations are not auto-run by this deploy path

Push-only schema changes are **not** complete yet. CI does not apply production
Neon migrations. Schema-changing releases still require the reviewed direct-URL
migration procedure in this document before or with a coordinated deploy.
Until dedicated production migration automation exists and is proven, treat
migration-bearing pushes as blocked for fully hands-off release.

## Historical live evidence — 2026-07-25 (superseded)

The following table is **historical only**. It records the pre-cutover stale
Hostinger artifact state and must not be used as current production truth.

| Check | Result 2026-07-25 |
|---|---|
| Marketing `/` | `200` |
| Marketing source path | `403` |
| Apex/www/app TLS | valid |
| Ops `/login` | `200` |
| Ops `/` | `500` |
| `/api/auth/get-session` | `500` |
| `/api/health/live`, `/ready` | `404` |
| Latest listed ops deploy | completed 2026-07-23 archive, Node 20, `apps/ops/server.js` |

## Current live evidence — recovered and re-verified 2026-08-01

Provider/database schema baseline retains the 2026-07-27 cutover proof. Re-check
before acting; dated evidence never replaces a fresh release smoke.

| Check | Evidence |
|---|---|
| `https://perfumeaura.com` | 200 collection preview; auto-deploy from `main` verified 2026-07-30 |
| Marketing public allowlist | `/assets/favicon.svg` 200; repo source/data/Graphify/design paths 403 |
| TLS apex / www / app | valid |
| DNS NS | `lunar` / `solar`; apex ALIAS CDN |
| `https://app.perfumeaura.com/login` | 200 |
| `/api/auth/get-session` | 200 JSON `null` anonymously; authenticated browser returned session + user objects |
| `/api/health/live` · `/ready` | 200 / 200 after credential rotation and redeploy |
| `/api/health/version` | 200 and matched the exact released source SHA on each proof |
| Static runtime asset | Real `/_next/static/…` asset returned 200 with non-empty body |
| Active Hostinger deploy | **Node 24.x** generated branch `hostinger-ops-production`, no build command, entry `apps/ops/server.js` |
| Push deployment proof | GitHub runs `30615774862` and `30623386605` published sources `43edda3e7b05…` and `3e7fa94c1a18…`; hPanel listed corresponding completed deploy commits `db10bb11b724…` and `cd7f2d818d66…`, and immediate root-operator probes returned each exact source from `/api/health/version` |
| Credential rotation | Restricted Neon runtime-role password and Better Auth secret rotated; hPanel values applied and current process re-smoked without recording values |
| Neon production | Main branch migrated through `0008`; restricted runtime role, grants, constraints, trigger, and zero reconciliation drift verified |
| Owner login on prod | **Re-verified 2026-07-31** after rotation; `/dashboard`, `/products`, `/customers`, `/invoices`, `/stock`, and `/finance` returned 200 with expected headings |
| Password reset email | **Not verified** — SMTP hPanel variables/mailbox remain pending |
| Client-IP rate limiting | Shared-bucket fallback until Hostinger trusted-proxy evidence is established |
| Ops Path G monorepo source build | **Blocked** (esbuild EACCES) |
| 2026-08-01 recovery | Hostinger support found the Business Web Hosting order at its hard 120 NPROC limit and stopped plan-wide running processes. Exact source `6d79a495…` then passed the complete production verifier; GitHub run `30690719178` rerun succeeded and live Max Processes fell to about 10/120. A later plan-level LVE snapshot was described as `lsphp`/`index.php` activity, which does not match the Node ops runtime; domain/document-root attribution remains unresolved. See `CURRENT_STATE.md`. |

The first two proof runs predated the repository-variable switch, so their
`verify-hostinger-ops-live` jobs were skipped and the provider completion rows
plus immediate manual version probes are the attestation. The root operator then
set `HOSTINGER_OPS_AUTO_DEPLOY_ENABLED=true`; subsequent `main` releases must
also pass the workflow's automated exact-SHA live poll.

Never infer continued production readiness from `/login` alone. Re-check
readiness, auth session, a real static asset, and an authenticated owner page
after every deploy or provider configuration change.

## Required production environment

Set in hPanel; never commit or print values:

```text
DATABASE_URL=<Neon pooled runtime URL using restricted role>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://app.perfumeaura.com
BUSINESS_TIMEZONE=Asia/Karachi
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<mailbox>
SMTP_PASSWORD=<mailbox password>
SMTP_FROM=<approved sender>
NODE_ENV=production
```

Do not configure a fixed `PORT` in hPanel. Hostinger supplies
`process.env.PORT`; the standalone server falls back to `3000` only when the
platform does not provide one.

`DATABASE_URL_DIRECT` belongs only in migration/admin session, not Hostinger runtime.

## Production database cutover

Provider mutations require explicit target confirmation, Neon restore point, prior known-good ZIP, write freeze, and redacted evidence. Never run local-only preflight/reconciliation wrappers against production; run reviewed SQL through direct administrative session.

Exact order—never reorder:

1. Confirm exact Neon project/branch and Hostinger app.
2. Capture restore point, journal, counts, role inventory, current settings/logs, prior ZIP.
3. Enable write freeze and run `phase02-preflight-0002.sql`; every result must be zero.
4. Create bare runtime login directly in SQL. Do not use Neon role API.
5. Apply bounded migrations through `0007` only; prove exact eight-row journal/hash.
6. Apply and verify runtime database/schema/table grant matrix.
7. Set hPanel runtime env to pooled restricted role; upload compatible Path Z ZIP.
8. Require login/liveness/readiness/auth smoke while still pre-`0008`.
9. Run `phase02-reconciliation.sql`; every result must be zero.
10. Apply only pending `0008`; prove nine-row journal/hash and contract catalog.
11. Re-verify runtime grants after `0008`.
12. Seed MAIN and owner against that production database.
13. Final owner, reset-email, business, static-asset, and rollback smoke; end freeze only after pass.

### Block 1 — bare role before `0007`

Run as database owner. Substitute values interactively.

```sql
\set ON_ERROR_STOP on
\set runtime_role 'REDACTED_RUNTIME_ROLE'
\set runtime_password 'REDACTED_ROTATED_PASSWORD'

CREATE ROLE :"runtime_role"
  LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS
  PASSWORD :'runtime_password';

SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreatedb,
       rolcreaterole, rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname = :'runtime_role';

SELECT parent.rolname AS inherited_role
FROM pg_auth_members membership
JOIN pg_roles parent ON parent.oid = membership.roleid
JOIN pg_roles member ON member.oid = membership.member
WHERE member.rolname = :'runtime_role';
```

Expected: one login row, every elevated attribute false, zero membership rows. Existing role must be inspected/corrected instead of blindly recreated.

### Apply expansion through `0007`

```bash
DATABASE_URL_DIRECT='<redacted-direct-url>' \
  pnpm --filter @perfume-aura/db migrate:through-auth-expansion
```

Command must prove exactly eight journal rows ending at `0007` and leave `0008` pending. Independently verify boundary:

```bash
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
  "SELECT count(*), max(created_at) FROM drizzle.__drizzle_migrations"
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784912984473"
# Expected: count|max = 8|1784912984473
# Expected hash: 49bede137e6fd29d1c87a84170502e4f4e1329ab36521a9e37d2fc5f3d5dfa7f|1784912984473
```

Do not run root `pnpm db:migrate` yet.

### Block 2 — grants after `0007`

Review all provider/admin roles before changing `PUBLIC` privileges. Explicitly regrant `TEMPORARY` only to reviewed nonowner admin/migration roles that need it.

```sql
\set ON_ERROR_STOP on
\set database_name 'REDACTED_DATABASE'
\set migration_role 'REDACTED_MIGRATION_ROLE'
\set runtime_role 'REDACTED_RUNTIME_ROLE'

BEGIN;
GRANT CONNECT ON DATABASE :"database_name" TO :"runtime_role";
REVOKE CREATE ON DATABASE :"database_name" FROM :"runtime_role";
REVOKE TEMPORARY ON DATABASE :"database_name" FROM PUBLIC;
GRANT TEMPORARY ON DATABASE :"database_name" TO :"migration_role";
REVOKE TEMPORARY ON DATABASE :"database_name" FROM :"runtime_role";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"runtime_role";
REVOKE CREATE ON SCHEMA public FROM :"runtime_role";
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "user", "session", "account", "verification", "rate_limit"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE ON TABLE
  "products", "product_variants", "customers", "invoices",
  "document_number_counters"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "invoice_lines"
TO :"runtime_role";
GRANT SELECT ON TABLE "locations" TO :"runtime_role";
GRANT SELECT, INSERT ON TABLE "stock_movements", "payments"
TO :"runtime_role";
COMMIT;
```

Catalog proof must be executable, not inferred from direct grants. Effective privileges include `PUBLIC` and inherited roles.

```sql
\set ON_ERROR_STOP on
\set database_name 'REDACTED_DATABASE'
\set runtime_role 'REDACTED_RUNTIME_ROLE'

-- Attributes, memberships, database and schema privileges.
SELECT rolname, rolinherit, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls
FROM pg_roles WHERE rolname = :'runtime_role';
SELECT parent.rolname AS inherited_role
FROM pg_auth_members membership
JOIN pg_roles parent ON parent.oid = membership.roleid
JOIN pg_roles member ON member.oid = membership.member
WHERE member.rolname = :'runtime_role';
SELECT
  has_database_privilege(:'runtime_role', :'database_name', 'CONNECT') AS can_connect,
  has_database_privilege(:'runtime_role', :'database_name', 'CREATE') AS can_create_database_objects,
  has_database_privilege(:'runtime_role', :'database_name', 'TEMPORARY') AS can_create_temp_objects,
  has_schema_privilege(:'runtime_role', 'public', 'USAGE') AS can_use_schema,
  has_schema_privilege(:'runtime_role', 'public', 'CREATE') AS can_create_schema_objects;

-- Expected table matrix. This query must return zero rows; any row is an
-- unexpected effective privilege or a missing required privilege.
WITH matrix(table_name, allowed) AS (
  VALUES
    ('user', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('session', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('account', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('verification', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('rate_limit', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('products', ARRAY['SELECT','INSERT','UPDATE']),
    ('product_variants', ARRAY['SELECT','INSERT','UPDATE']),
    ('customers', ARRAY['SELECT','INSERT','UPDATE']),
    ('invoices', ARRAY['SELECT','INSERT','UPDATE']),
    ('document_number_counters', ARRAY['SELECT','INSERT','UPDATE']),
    ('invoice_lines', ARRAY['SELECT','INSERT','UPDATE','DELETE']),
    ('locations', ARRAY['SELECT']),
    ('stock_movements', ARRAY['SELECT','INSERT']),
    ('payments', ARRAY['SELECT','INSERT'])
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

-- Must return zero rows: no effective sequence privilege.
SELECT sequence_schema, sequence_name, privilege
FROM information_schema.sequences
CROSS JOIN (VALUES ('USAGE'), ('SELECT'), ('UPDATE')) AS p(privilege)
WHERE has_sequence_privilege(
  :'runtime_role', format('%I.%I', sequence_schema, sequence_name), privilege
);

```

Expected before `0008`: least-privilege attributes, zero memberships, connect/schema usage true, database/schema create and temporary false, table drift query zero rows, and sequence query zero rows. Only then may Hostinger use runtime role. Function checks run only after `0008` creates the guard function.

### Expansion smoke, reconciliation, contract

```bash
# After compatible Path Z deploy:
test "$(curl -sS -o /dev/null -w '%{http_code}' \
  https://app.perfumeaura.com/api/health/ready)" = "200"
test "$(curl -sS -o /dev/null -w '%{http_code}' \
  https://app.perfumeaura.com/api/auth/get-session)" != "500"

psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 \
  -f packages/db/sql/phase02-reconciliation.sql

# Only after zero reconciliation; 0008 must be sole pending migration.
DATABASE_URL_DIRECT='<redacted-direct-url>' pnpm db:migrate
```

After `0008`, prove nine journal rows and exact contract hash:

```bash
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
  "SELECT count(*), max(created_at) FROM drizzle.__drizzle_migrations"
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784913049848"
# Expected: count|max = 9|1784913049848
# Expected hash: 3f7d6d86e395cfc2e996cdfe81c0820bb93b4dfd7b6c7cebe78d8ee239e45e56|1784913049848
```

Then rerun the complete role/table/sequence catalog proof above and verify guard function privileges:

```sql
\set ON_ERROR_STOP on
\set runtime_role 'REDACTED_RUNTIME_ROLE'

-- Must be false after 0008.
SELECT has_function_privilege(
  :'runtime_role', 'public.prevent_stock_movement_mutation()', 'EXECUTE'
) AS runtime_can_execute_stock_guard;

-- Must return zero rows: PUBLIC has no explicit/default EXECUTE on guard.
SELECT acl.privilege_type
FROM pg_proc function
JOIN pg_namespace namespace ON namespace.oid = function.pronamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(function.proacl, acldefault('f', function.proowner))
) AS acl
WHERE namespace.nspname = 'public'
  AND function.proname = 'prevent_stock_movement_mutation'
  AND acl.grantee = 0
  AND acl.privilege_type = 'EXECUTE';
```

Also prove contract checks, enabled append-only trigger, and unchanged grant matrix.

### Seed after contract

```bash
DATABASE_URL='<Neon pooled production>' pnpm --filter @perfume-aura/db seed

DATABASE_URL='<Neon pooled production>' \
BETTER_AUTH_SECRET='<same hPanel secret>' \
BETTER_AUTH_URL='https://app.perfumeaura.com' \
OWNER_EMAIL='...' OWNER_PASSWORD='...' \
pnpm --filter @perfume-aura/ops seed:owner
```

Never guess owner credentials. Password must be 12–256 characters.

## Smoke and troubleshooting

Check in this order:

1. Public `/login`, `/api/health/live`, `/api/health/ready`, `/api/auth/get-session`.
   If Hostinger/hCDN returns `503` while Next reports Ready, capture live and
   historical NPROC evidence before any plan-wide process stop; follow
   `CURRENT_STATE.md`.
2. Hostinger deployment entry, Node version, build/start logs, restart state.
3. Presence—not values—of required env keys.
4. Database target, journal, restricted role, grants, reconciliation/catalog.
5. MAIN and owner seed on same database.
6. Real owner login, core pages, password reset mailbox/link.
7. Hostinger proxy/IP trust and live rate limiting before ending write freeze:
   - inspect provider-controlled forwarding header and full proxy chain;
   - reject client-forgeable forwarding values;
   - prove separate client IPs receive separate buckets;
   - sixth protected sign-in attempt returns `429` with positive retry header;
   - restart app and prove durable bucket remains enforced.

Do not enable trusted proxy/IP extraction until Hostinger header behavior is proven. `/ready` may return `503` for database failure; `/live` should return `200` when current server runs. Auth/root `500` means environment/database/auth failure, not invalid password.

## Rollback

- Retain previous production-known-good ZIP and checksum/manifest.
- Before contract: expansion-compatible previous ZIP may be used only if explicitly proven.
- After `0008` but before any new production write, a reviewed Neon restore point may be used only under write freeze with explicit data-loss boundary confirmation.
- **After any production invoice, payment, stock, owner, or other durable write, never restore an older database state.** Deploy compatible code or roll forward; restoring older Neon state would discard ledger/business writes.
- Prefer reviewed restore points over destructive down migrations only when write-boundary rule permits.
- Keep write freeze until rollback or forward recovery is verified.

## Production completion checklist

- [ ] GitHub Dependency Review gate resolved and main artifact retained.
- [x] Generated branch connected with Node 24.x settings and exact-SHA production smoke; retain checksum-verified Path Z ZIP for emergency rollback only — recovered and re-verified 2026-08-01.
- [ ] hPanel env and SMTP keys present.
- [ ] Bare role, `0007`, grant proof, expansion smoke, reconciliation, `0008`, grant reproof complete.
- [ ] MAIN and owner seeded on production.
- [ ] Login, auth session, live/ready, core reads, controlled business smoke pass.
- [ ] Proxy/IP chain proven non-forgeable; separate buckets, sixth-attempt `429`, retry header, and restart persistence verified.
- [ ] Reset email/link works.
- [ ] Marketing remains `200`, source protection `403`, TLS valid.
- [ ] Path G remains disabled until independently proven.
