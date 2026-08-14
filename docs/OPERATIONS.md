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

## Production topology

The storefront remains managed while private operations runs on the isolated
VPS service:

| Platform | Production responsibility |
|---|---|
| Hostinger managed Node.js Web App | `perfumeaura.com` storefront and the `www` redirect |
| VPS Caddy and hardened container | `app.perfumeaura.com` private operations |
| Neon | Shared PostgreSQL, with separate restricted runtime connections and manual owner migrations |
| GitHub Actions | Build, scan, package, publish, and identify the exact source commit for both deployments |

GoDaddy remains registration-only while Hostinger nameservers are
authoritative. `app.perfumeaura.com` is an `A` record to `194.164.149.3` with
no `AAAA`; Caddy proxies it to `127.0.0.1:3020`. Neon remains independent of
the web deployments and must never be copied into, deleted by, or recreated
during a deployment.

The storefront selects Hostinger Node `24.x`; live deployment logs established
Node `24.6.0` and pnpm `10.32.1` as its current managed baseline. Ops uses the
repository-pinned Node image in its immutable VPS artifact. Reinspect the
managed logs whenever Hostinger changes the storefront runtime.

The unresolved managed-hosting process incident remains a storefront/shared-plan
risk but is no longer on the public ops path. Do not use a plan-wide process
stop or modify unrelated sites to work around it.

## Safety boundaries

- GoDaddy owns registration; Hostinger nameservers own DNS.
- Neon is shared by storefront and ops. Never delete or recreate it during web
  work.
- Do not modify unrelated Hostinger sites, mail, DNS, databases, or processes.
- Secrets belong only in ignored env files or Hostinger settings.
- Do not set a fixed storefront `PORT`; Hostinger supplies it. The VPS Compose
  contract sets the internal ops port and publishes it only on loopback.
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

The verified ZIP is the current routine and emergency storefront deployment
path until Hostinger GitHub connectivity is enabled. The generated branch is
the future routine path:

```text
runtime-affecting main push → CI quality/integration/package
  → hostinger-storefront-production → [provider Git connection required]
  → Hostinger Node Web App
  → exact storefront SHA and public-surface verification
```

Markdown-only changes do not publish either generated branch. For a controlled
idempotent republish of the exact `main` source, dispatch `ops-pack.yml` with
`deploy_target=storefront`. Set repository variable
`HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED=true` only after Hostinger is
actually connected. It enables the live verification job; it does not weaken
the pre-publish gates.

Build the verified ZIP for either a routine deployment or emergency recovery:

```bash
pnpm check
TEST_DATABASE_URL='<migrated-disposable-loopback-url>' pnpm test:integration
pnpm storefront:pack
```

Target Hostinger settings: GitHub branch `hostinger-storefront-production`,
Node 24.x, Framework Other, root `./`, no build command, empty output directory,
and entry `apps/storefront/server.js`. Set
`STOREFRONT_URL` and `CUSTOMER_AUTH_URL` to `https://perfumeaura.com`.

Hostinger's current upload-sourced storefront UI does not expose an in-place
`Connect to GitHub` control. Do not delete/recreate the apex Web App without a
fresh backup, a tested replacement, captured DNS/HCDN/runtime settings, and
explicit authorization. Until then the generated branch is prepared state
only. The current
live archive and generated branch manifest both identify source
`917499d7dae04aa04697a7af7fd3d062c029c7f6`.

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
runtime-affecting main push → CI quality/integration/package
  → verified standalone ZIP → immutable GHCR image
  → Tailscale forced SSH → hardened VPS container
  → exact-SHA public verification
```

A change set containing only Markdown files still runs CI but does not publish
or deploy. Empty, invalid, or mixed change evidence publishes normally so the
guard cannot silently suppress a runtime deployment.

The workflow deploys only when `VPS_OPS_AUTO_DEPLOY_ENABLED=true`, joins the
tailnet with the dedicated OAuth credentials, and authenticates through the
`perfume-deploy` forced command. It must pass an exact 40-character source SHA
and immutable `sha256:` image digest; the server validates both the OCI
revision label and embedded artifact manifest before replacing the loopback
service. Routine releases also require
`VPS_OPS_PUBLIC_VERIFICATION_ENABLED=true`; this runs the external verifier
after the candidate is healthy. Verify a production release reproducibly with
its exact source SHA:

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target ops \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 1200000
```

The Compose contract uses UID/GID `10001`, read-only root, `cap_drop: ALL`,
`no-new-privileges`, no Docker socket, `127.0.0.1:3020:3000`, 1 CPU, 768 MiB,
256 PIDs, tmpfs runtime caches, and `/api/health/ready`. Runtime secrets live in
root-owned `/etc/khanect/perfume-aura-ops.env`; deploy automation never sends
them. Use `pnpm ops:pack` only for artifact recovery.

The old Hostinger ops Web App is off public DNS and frozen for exactly 48 hours
after the DNS-cutover acceptance anchor at 2026-08-14 14:47:58 UTC. It becomes
eligible for removal no earlier than 2026-08-16 14:47:58 UTC, and only with
explicit authorization and fresh exact-SHA acceptance evidence. Its rotated
database credential was applied and its exact Git branch redeployed on
2026-08-14. A rollback restores the captured DNS records and verifies the old
exact SHA; do not republish or delete it casually.

Production migrations remain manual direct-owner operations. Reapply restricted
runtime grants after every schema change.

## Staff release order

Migration `0010_curved_puma`, Admin/2FA, staff invitations, and mandatory 2FA
are one ordered release. Follow
[`STAFF_OPERATIONS_RELEASE_SMOKE.md`](STAFF_OPERATIONS_RELEASE_SMOKE.md).

1. Prove the active VPS ops release and database-migration gate are healthy.
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
platform-specific runtime values and an observability-enabled artifact are
deployed. Follow
`docs/OBSERVABILITY.md` for provider names, environment mapping, privacy,
source-map CI settings, and acceptance evidence.

Activation is a normal deployment. After authorization and activation,
re-smoke both applications and verify actual privacy-filtered PostHog and
Sentry events; a successful build is not runtime proof.

## NPROC incident control

The shared plan has a 120-process ceiling. Its process-stop control affects the
whole plan, not the VPS ops service. Capture resources and storefront endpoint
evidence before provider action; prefer a scoped repair. Use plan-wide stop only
with explicit authorization, then re-smoke every affected managed site and
update `CURRENT_STATE.md`.

## Official Hostinger references

- [Node.js hosting options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)
- [Select the Node.js version](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/)
- [Add a Node.js Web App](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Troubleshoot Node.js build failures](https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/)
