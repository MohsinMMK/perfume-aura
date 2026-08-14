# Operations

Read `CURRENT_STATE.md` before any provider or database action.

## Topology

| Domain | Purpose | Entry |
|---|---|---|
| `perfumeaura.com` | Public storefront | `apps/storefront/server.js` |
| `www.perfumeaura.com` | Path-preserving apex redirect | Storefront middleware |
| `app.perfumeaura.com` | Private operations | `apps/ops/server.js` |

`www.app.perfumeaura.com` and `shop.perfumeaura.com` must remain absent. The
previous static storefront exists only in an external backup and Git history.

## Managed Hostinger topology

The existing managed deployment remains the production topology:

| Platform | Production responsibility |
|---|---|
| Hostinger managed Node.js Web App | `perfumeaura.com` storefront and the `www` redirect |
| Hostinger managed Node.js Web App | `app.perfumeaura.com` private operations |
| Neon | Shared PostgreSQL, with separate restricted runtime connections and manual owner migrations |
| GitHub Actions | Build, scan, package, publish, and identify the exact source commit for both deployments |

The public URLs and DNS topology do not change. GoDaddy remains
registration-only while Hostinger nameservers are authoritative. Neon remains
independent of the web deployments and must never be copied into, deleted by,
or recreated during a deployment.

Both applications select Hostinger Node `24.x`. Live deployment logs currently
show the provider-managed baseline Node `24.6.0` and pnpm `10.32.1`. Repository
compatibility must be tested against that baseline; do not require an exact
patch that hPanel cannot select. Reinspect the logs whenever Hostinger changes
the managed runtime.

The unresolved managed-hosting process incident must still be durably repaired
before prepared application work is published. Require scoped process
attribution, restart and routing causes, a case ID, and fresh smoke evidence for
both applications. Do not use a plan-wide process stop or modify unrelated sites
to work around the provider issue.

## Safety boundaries

- GoDaddy owns registration; Hostinger nameservers own DNS.
- Neon is shared by storefront and ops. Never delete or recreate it during web
  work.
- Do not modify unrelated Hostinger sites, mail, DNS, databases, or processes.
- Secrets belong only in ignored env files or Hostinger settings.
- Do not set `PORT`; Hostinger supplies it.
- Select Hostinger Node `24.x`; treat the exact Node patch and pnpm version from
  fresh deployment logs as the production compatibility baseline.
- Do not publish until CI, packers, lockfiles, and extracted-artifact smoke pass
  against the observed managed baseline.
- Deploy, redeploy, restart, process stop, DNS write, production migration, and
  release-flag changes require explicit authorization.

## Evidence workflow

Use the narrowest authoritative surface:

| Need | Surface |
|---|---|
| Website, deployment, build-log, or DNS inventory | Read-only Hostinger MCP |
| Resource graphs, runtime logs, flags, or support | Authenticated hPanel |
| Process owner/tree/path | Hostinger support evidence or scoped managed-hosting access |
| Customer-visible behavior | Public HTTPS and the production verifier |

The `hostinger-api` Docker MCP profile is read-only by default. Inspect a tool
before first use and never print its token.

```bash
docker mcp tools --gateway-arg=--profile --gateway-arg=hostinger-api count
docker mcp tools --gateway-arg=--profile --gateway-arg=hostinger-api \
  call hosting_listWebsitesV1 domain=app.perfumeaura.com per_page=10
docker mcp tools --gateway-arg=--profile --gateway-arg=hostinger-api \
  call hosting_listJsDeployments domain=app.perfumeaura.com page=1 perPage=20
```

For an authorized provider mutation, enable only its exact MCP tool, execute it
once, verify the result, then disable it. Record privacy-safe production changes
in `CURRENT_STATE.md`.

## Storefront deployment

Routine deployment uses the verified prebuilt tree through a generated GitHub
branch; the Hostinger monorepo source build is not the deployment path:

```text
runtime-affecting main push → CI quality/integration/package
  → hostinger-storefront-production → Hostinger Node Web App
  → exact storefront SHA and public-surface verification
```

Markdown-only changes do not publish either generated branch. For a controlled
idempotent republish of the exact `main` source, dispatch `ops-pack.yml` with
`deploy_target=storefront`. Repository variable
`HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED=true` enables the live verification
job; it does not weaken the pre-publish gates.

The verified ZIP remains the emergency fallback:

```bash
pnpm check
TEST_DATABASE_URL='<migrated-disposable-loopback-url>' pnpm test:integration
pnpm storefront:pack
```

Hostinger settings: GitHub branch `hostinger-storefront-production`, Node 24.x,
Framework Other, root `./`, no build command, empty output directory, and entry
`apps/storefront/server.js`. Set
`STOREFRONT_URL` and `CUSTOMER_AUTH_URL` to `https://perfumeaura.com`.

Keep these flags false until their separate gates pass:

```text
STOREFRONT_CUSTOMER_AUTH_ENABLED
STOREFRONT_PREVIEW_CATALOG
STOREFRONT_PUBLIC_RELEASE
STOREFRONT_CHECKOUT_RELEASE_APPROVED
STOREFRONT_INQUIRIES_ENABLED
```

Verify after deployment:

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target storefront \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --www-base https://www.perfumeaura.com \
  --timeout-ms 180000
curl -sSI 'https://www.perfumeaura.com/shop?probe=1'
```

The verifier requires the exact storefront version response, the matching
release marker in ordinary cached HTML, a real Next static asset, release locks,
and the `www` `308` preserving `/shop?probe=1`. The packaged smoke test
separately asserts that the version response uses `cache-control: no-store`.

If exact verification fails, do not automatically roll back, purge HCDN, stop
plan-wide processes, or republish an older source. Inspect the scoped failure;
use the known-good ZIP or a scoped HCDN purge only with explicit authorization.

## Ops deployment

Routine deployment is:

```text
main push → CI quality/integration/package → hostinger-ops-production
  → Hostinger Node Web App → exact-SHA verification
```

A change set containing only Markdown files still runs CI but does not publish
the generated branch. Empty, invalid, or mixed change evidence publishes
normally so the guard cannot silently suppress a runtime deployment.

Use `pnpm ops:pack` only for emergency fallback. Hostinger settings are Node
24.x, Framework Other, root `./`, no build command, empty output directory, and
entry `apps/ops/server.js`.

Production migrations remain manual direct-owner operations. Reapply restricted
runtime grants after every schema change.

## Staff release order

Migration `0010_curved_puma`, Admin/2FA, staff invitations, and mandatory 2FA
are one ordered release. Follow
[`STAFF_OPERATIONS_RELEASE_SMOKE.md`](STAFF_OPERATIONS_RELEASE_SMOKE.md).

1. Prove the Hostinger incident is durably repaired.
2. Test the migration on an isolated Neon branch.
3. Apply it to production through the direct owner connection.
4. Reapply and verify runtime grants.
5. Deploy with both `OPS_*` flags false and verify owner login and health.
6. Prove SMTP, owner TOTP, and one recovery-code journey.
7. Enable mandatory 2FA, then invitations, then prove staff denials.

Never open storefront commerce flags as part of this release.

## Runtime grant contract

Apply `packages/db/sql/ops-runtime-grants.sql` with the reviewed role name. The
effective matrix is deliberately explicit:

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
SELECT has_sequence_privilege(
  :"runtime_role",
  'public.document_number_counters_id_seq',
  'USAGE'
);
SELECT has_function_privilege(
  :"runtime_role",
  'public.prevent_stock_movement_mutation()',
  'EXECUTE'
);
SELECT * FROM pg_auth_members;
```

Any unexpected effective privilege fails the handoff. The runtime role has no
DDL, temporary-object, role-membership, or broad sequence power.

## Production acceptance

Never infer readiness from `/login` or a Hostinger `Completed` label. Verify:

```text
https://app.perfumeaura.com/api/health/live
https://app.perfumeaura.com/api/health/ready
https://app.perfumeaura.com/api/health/version
https://app.perfumeaura.com/api/auth/get-session
```

Also verify a real static asset, the authenticated owner journey when
authorized, storefront locks, robots, canonical metadata, and both DNS
requirements.

## Observability activation

Provider projects exist but production telemetry is not active until the
Hostinger variables and an observability-enabled artifact are deployed. Follow
`docs/OBSERVABILITY.md` for provider names, environment mapping, privacy,
source-map CI settings, and acceptance evidence.

Activation is a normal deployment and remains blocked by the unresolved NPROC
incident. After authorization and activation, re-smoke both applications and
verify actual privacy-filtered PostHog and Sentry events; a successful build is
not runtime proof.

## NPROC incident control

The shared plan has a 120-process ceiling. Its process-stop control affects the
whole plan. Capture resources and endpoint evidence before provider action;
prefer a scoped repair. Use plan-wide stop only with explicit authorization,
then re-smoke every affected site and update `CURRENT_STATE.md`.

## Official Hostinger references

- [Node.js hosting options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)
- [Select the Node.js version](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/)
- [Add a Node.js Web App](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Troubleshoot Node.js build failures](https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/)
