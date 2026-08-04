# Operations

## Production topology

| Domain | Purpose | Hostinger product | Runtime entry |
|---|---|---|---|
| `perfumeaura.com` | Animated public storefront | Node.js Web App | `apps/storefront/server.js` |
| `www.perfumeaura.com` | Apex redirect | Storefront middleware | n/a |
| `app.perfumeaura.com` | Owner and staff operations | Node.js Web App | `apps/ops/server.js` |

`shop.perfumeaura.com` is intentionally deleted and has no redirect. The
previous static apex site is retained only as a downloaded backup and Git
history; no static marketing deployment remains.

## Non-negotiable boundaries

- GoDaddy owns registration and renewal. Hostinger nameservers own DNS; do not
  edit GoDaddy A/CNAME records while they are active.
- Neon PostgreSQL is shared. Never delete, recreate, or migrate it as part of a
  website cutover without the reviewed migration path.
- Do not touch unrelated hPanel sites, mailboxes, databases, or DNS records.
- All secrets live only in Hostinger environment settings. ZIPs, generated Git
  branches, repository files, logs, and documentation must contain none.
- Do not set a fixed `PORT`; Hostinger supplies it.

## Storefront deployment

The storefront is a prebuilt ZIP deployment because Hostinger's monorepo source
build route is not accepted for this project.

```bash
pnpm check
pnpm test:integration
pnpm storefront:pack
```

Upload the clean `dist/perfume-aura-storefront_<sha>.zip` through Hostinger's
Node.js Web App workflow:

| Setting | Value |
|---|---|
| Domain | `perfumeaura.com` |
| Framework | Other |
| Node | 24.x |
| Root directory | `./` |
| Build command | None / prebuilt no-op |
| Output directory | Empty |
| Entry file | `apps/storefront/server.js` |

Copy the existing storefront environment values and change only these origins:

```text
STOREFRONT_URL=https://perfumeaura.com
CUSTOMER_AUTH_URL=https://perfumeaura.com
```

Keep these flags `false` until their independent gates pass:

```text
STOREFRONT_CUSTOMER_AUTH_ENABLED
STOREFRONT_PREVIEW_CATALOG
STOREFRONT_PUBLIC_RELEASE
STOREFRONT_CHECKOUT_RELEASE_APPROVED
STOREFRONT_INQUIRIES_ENABLED
```

After deploy, verify the exact commit plus storefront surface:

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 180000
curl -sSI 'https://www.perfumeaura.com/shop?probe=1'
```

The expected `www` response is `308` with an apex `Location` preserving
`/shop?probe=1`.

## Ops deployment

Routine ops deployment remains the generated Git branch:

```text
main push
  → CI quality + PostgreSQL integration + verified ZIP
  → hostinger-ops-production
  → Hostinger Node.js Web App
  → exact-SHA live verifier
```

Use `pnpm ops:pack` only for the verified emergency ZIP fallback. Hostinger
settings for the generated branch are Node 24.x, Framework Other, root `./`, no
build command, empty output directory, and entry `apps/ops/server.js`.

Ops production migrations are manual, reviewed operations using the direct Neon
owner connection. Reapply restricted runtime grants after schema changes.

### Restricted runtime-role proof

The verified operations grant matrix is explicit and never grants all tables or
sequences. The authenticated owner applies it with a direct connection, then
checks effective privileges before releasing a runtime credential:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "user", "session", "account", "verification", "rate_limit"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE ON TABLE
  "products", "product_variants", "customers", "invoices",
  "invoice_lines", "document_number_counters"
TO :"runtime_role";

GRANT SELECT ON TABLE "locations" TO :"runtime_role";

GRANT SELECT, INSERT ON TABLE
  "stock_movements", "payments"
TO :"runtime_role";

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
SELECT has_database_privilege(:"runtime_role", current_database(), 'TEMP')
  AS can_create_temp_objects;
SELECT has_table_privilege(:"runtime_role", 'public.products', 'SELECT');
SELECT has_sequence_privilege(:"runtime_role", 'public.document_number_counters_id_seq', 'USAGE');
SELECT has_function_privilege(:"runtime_role", 'public.prevent_stock_movement_mutation()', 'EXECUTE');
SELECT * FROM pg_auth_members;
```

Any unexpected effective privilege fails the migration handoff. The runtime role
has no broad sequence grant, DDL, temporary-object, or role-membership power.

## Health acceptance

Never treat `/login` alone as readiness. Check all of:

```text
https://app.perfumeaura.com/api/health/live
https://app.perfumeaura.com/api/health/ready
https://app.perfumeaura.com/api/health/version
https://app.perfumeaura.com/api/auth/get-session
```

Also check a real Next static asset and an authenticated owner page when the
owner authorizes credential use. Storefront checks must cover homepage, shop,
search, cart, controlled media, branded 404, release locks, robots, canonical
metadata, and the `www` redirect.

## Observability activation

Provider projects exist but production telemetry is not active until the
Hostinger variables and an observability-enabled artifact are deployed. Follow
`docs/OBSERVABILITY.md` for the exact provider names, environment mapping,
privacy contract, source-map CI settings, and acceptance procedure.

Observability activation is a normal application deployment and is therefore
blocked by the active ops duplicate-process/NPROC incident. Do not save runtime
variables if hPanel will trigger a redeploy or restart before the scoped repair.
After activation, re-smoke both applications and verify actual PostHog and
Sentry events; a successful build alone is not evidence that either service is
connected.

## Process-limit incident control

Hostinger Business hosting has a shared 120-NPROC ceiling. Its plan-wide
"Stop running processes" action interrupts every site on the plan. Before any
provider change, capture resource usage and endpoint results. Prefer a scoped
provider repair; use the plan-wide action only after explicit authorization,
then re-smoke apex and ops and record the evidence in `CURRENT_STATE.md`.
