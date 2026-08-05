# Operations

## Production topology

| Domain | Purpose | Hostinger product | Runtime entry |
|---|---|---|---|
| `perfumeaura.com` | Animated public storefront | Node.js Web App | `apps/storefront/server.js` |
| `www.perfumeaura.com` | Apex redirect | Storefront middleware | n/a |
| `app.perfumeaura.com` | Owner and staff operations | Node.js Web App | `apps/ops/server.js` |
| `www.app.perfumeaura.com` | Unintended alias removed from DNS; must remain absent | No active Hostinger binding | n/a |

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
- Keep `www.app.perfumeaura.com` absent from DNS and outside Better Auth trusted
  origins. The ops application retains a path- and query-preserving permanent
  redirect to `https://app.perfumeaura.com` as defense-in-depth if a provider
  binding is recreated accidentally.
- Hostinger's `24.x` selector does not prove the deployed minor version. Reject
  build logs below Node `24.18.0` or using a pnpm version other than `11.1.3`;
  request a provider-managed runtime update instead of weakening repository
  engine constraints.

## Hostinger access workflow

Use multiple evidence surfaces deliberately; no single Hostinger surface proves
production readiness or process ownership.

### Docker MCP Gateway

Codex is connected to the Docker MCP profile `hostinger-api`. The profile has
one pinned `hostinger-mcp-server`, reads its API token from the Docker Desktop
OS-keychain provider, and exposes only this read-only allowlist by default:

```text
hosting_listWebsitesV1
hosting_listOrdersV1
hosting_listJsDeployments
hosting_showJsDeploymentLogs
DNS_getDNSRecordsV1
DNS_getDNSSnapshotListV1
DNS_getDNSSnapshotV1
```

Never print, export, copy, or document the token value. New Codex tasks should
use the connected `MCP_DOCKER` tools. If the tools are not visible in an
already-running task, start a new task or use the verified CLI bridge:

```bash
docker mcp profile show hostinger-api --format json
docker mcp tools \
  --gateway-arg=--profile \
  --gateway-arg=hostinger-api \
  count
docker mcp tools \
  --gateway-arg=--profile \
  --gateway-arg=hostinger-api \
  call hosting_listWebsitesV1 \
  domain=app.perfumeaura.com per_page=10
docker mcp tools \
  --gateway-arg=--profile \
  --gateway-arg=hostinger-api \
  call hosting_listJsDeployments \
  domain=app.perfumeaura.com page=1 perPage=20
```

Inspect a tool before its first use:

```bash
docker mcp tools \
  --gateway-arg=--profile \
  --gateway-arg=hostinger-api \
  inspect <tool-name>
```

The gateway is appropriate for account-scoped website inventory, JavaScript
deployment state/logs, and read-only DNS reconciliation. It does not expose
shared-hosting resource graphs, Node runtime logs, environment-variable values,
support conversations, or the hPanel restart/redeploy controls.

### Choose the authoritative surface

| Need | Required surface |
|---|---|
| Website/order/deployment inventory or deployment build logs | Hostinger MCP first |
| DNS reconciliation | Hostinger MCP read + authoritative public DNS; mutate only after exact-zone approval |
| Environment flags, live/24-hour resources, runtime logs, support, restart/redeploy | Authenticated hPanel |
| Linux user/domain/path/PID, command counts, process tree, file ownership | Scoped SSH, read-only first |
| Actual customer/runtime behavior | Public HTTPS and `verify-production-deploy.mjs` |

### Ordered provider-operation procedure

1. Read `CURRENT_STATE.md` and this document. Re-derive the exact domain,
   deployment branch/SHA, current flags, and incident boundary.
2. Start read-only: use MCP for inventory/deployment evidence, hPanel for
   provider-only state, SSH for command ownership, and public HTTPS for live
   behavior. Redact credentials, connection strings, customer data, and token
   material from all evidence.
3. State the exact proposed mutation and blast radius. Obtain explicit user
   authorization before a production deploy/redeploy, environment or release
   flag change, DNS write, process stop/restart, firewall/VPS mutation,
   database migration, deletion, or support message that transmits new private
   evidence.
4. For an authorized API mutation, temporarily enable only the one required
   MCP tool; never enable the complete Hostinger tool set:

   ```bash
   docker mcp profile tools hostinger-api \
     --enable hostinger-mcp-server.<exact-tool-name>
   ```

   Inspect the tool, re-read the exact target, execute once, verify the returned
   state, and then remove the temporary permission:

   ```bash
   docker mcp profile tools hostinger-api \
     --disable hostinger-mcp-server.<exact-tool-name>
   ```

5. After every mutation, verify the exact deployment SHA and the complete ops
   health/auth/static surface, re-smoke the storefront and release locks, check
   the path/query-preserving `www.perfumeaura.com` redirect to the storefront
   apex, and verify that `www.app.perfumeaura.com` remains absent from
   authoritative and public DNS.
   A plan-wide process action additionally requires rechecking every affected
   site.
6. Record the timestamped, privacy-safe result, remaining blocker, and next
   action in `CURRENT_STATE.md`. Do not claim success from an MCP response,
   hPanel `Completed`, `/login`, or a single cached route alone.

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

## Staff and mandatory-2FA release

The `0010_curved_puma` migration is a separate release from the apex cutover.
It adds Better Auth's official Admin and 2FA tables, strict single-value ops
roles, immutable staff invitation/audit records, and the database owner
invariants. Keep both flags below set to `false` until every gate completes:

```text
OPS_TWO_FACTOR_REQUIRED=false
OPS_STAFF_INVITES_ENABLED=false
```

**Detailed pass/fail checklist (function-mapped):**
[STAFF_OPERATIONS_RELEASE_SMOKE.md](./STAFF_OPERATIONS_RELEASE_SMOKE.md) — capability denials, invite-flag order, dual checkout lock (`commerceSettings` ∧ storefront env), and `requireDisposableTestDatabaseUrl` safety. Use it after Hostinger repair; do not open `STOREFRONT_*` commerce flags as part of this release.

1. Create an isolated Neon branch and apply `0010_curved_puma`; run the
   migration and authenticated integration suites there.
2. Review the result, then apply the same migration through the production
   direct owner connection. Never use the pooled runtime connection for DDL.
3. Reapply the additive runtime grants with the reviewed runtime role name:

   ```bash
   psql "$DATABASE_URL_DIRECT" \
     -v runtime_role='<reviewed-runtime-role>' \
     -f packages/db/sql/ops-runtime-grants.sql
   ```

4. Deploy while both flags are still `false`; prove the existing owner login
   and all health endpoints.
5. Prove Hostinger SMTP delivery, enroll the owner in TOTP, and consume one
   recovery code in the authorized test journey.
6. Enable `OPS_TWO_FACTOR_REQUIRED=true`, prove raw 2FA-disable requests are
   rejected, then enable invitations and complete one authorized staff setup.
7. Prove server-action denials for staff price/cost, finance, payment, COD,
   promotion, release-gate, and staff-management attempts. Verify separately
   that a staff shipment update cannot settle COD.

The owner-only break-glass TOTP command requires the exact explicit
confirmation in `apps/ops/.env.example`; it revokes every owner session. Do
not use it for ordinary recovery.

### Restricted runtime-role proof

The verified operations grant matrix is explicit and never grants all tables or
sequences. The authenticated owner applies it with a direct connection, then
checks effective privileges before releasing a runtime credential:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "user", "session", "account", "verification", "rate_limit"
TO :"runtime_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "two_factor"
TO :"runtime_role";

GRANT SELECT, INSERT ON TABLE
  "staff_invitation_events", "ops_audit_events"
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

## Process-limit incident control

Hostinger Business hosting has a shared 120-NPROC ceiling. Its plan-wide
"Stop running processes" action interrupts every site on the plan. Before any
provider change, capture resource usage and endpoint results. Prefer a scoped
provider repair; use the plan-wide action only after explicit authorization,
then re-smoke apex and ops and record the evidence in `CURRENT_STATE.md`.
