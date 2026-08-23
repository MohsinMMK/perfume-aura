# Operations

Read [`CURRENT_STATE.md`](CURRENT_STATE.md) before any provider, database, DNS,
secret, or release-flag action.

- [Authority and topology](#authority-topology-and-safety-boundaries)
- [Storefront deployment and recovery](#storefront-deployment-and-recovery)
- [Ops deployment and recovery](#ops-deployment-and-recovery)
- [Migrations and runtime grants](#migrations-and-runtime-grants)
- [Production acceptance](#production-acceptance)
- [Staff release procedure](#staff-operations-release-procedure)
- [Owner recovery and break glass](#owner-recovery-and-break-glass)
- [Observability activation](#observability-configuration-and-activation)
- [Incident control](#nproc-incident-control)
- [Pending outcome](#pending-outcome)

## Authority, topology, and safety boundaries

| Domain | Purpose | Entry |
|---|---|---|
| `perfumeaura.com` | Public storefront | `apps/storefront/server.js` |
| `www.perfumeaura.com` | Path-preserving apex redirect | Storefront middleware |
| `app.perfumeaura.com` | Private operations | `apps/ops/server.js` |

`www.app.perfumeaura.com` and `shop.perfumeaura.com` must remain absent. The
previous static storefront exists only in an external backup and Git history.

| Platform | Production responsibility |
|---|---|
| Hostinger managed Node.js Web App | `perfumeaura.com` storefront and the `www` redirect |
| VPS Caddy and hardened container | `app.perfumeaura.com` private operations |
| Neon | Shared PostgreSQL, with separate restricted runtime connections and manual owner migrations |
| GitHub Actions | Build, scan, package, publish, and identify the exact source commit for both deployments |

GoDaddy remains registration-only while Hostinger nameservers are
authoritative. Exact live DNS, IP, SHA, digest, and rollback-window values
belong in [`CURRENT_STATE.md`](CURRENT_STATE.md). Neon remains independent of
the web deployments and must never be copied into, deleted by, or recreated
during a deployment.

The storefront selects Hostinger Node `24.x`; live deployment logs established
Node `24.6.0` and pnpm `10.32.1` as its current managed baseline. Ops uses the
repository-pinned Node image in its immutable VPS artifact. Reinspect the
managed logs whenever Hostinger changes the storefront runtime.

The unresolved managed-hosting process incident remains a storefront/shared-plan
risk but is no longer on the public ops path. Do not use a plan-wide process
stop or modify unrelated sites to work around it.

- GoDaddy owns registration; Hostinger nameservers own DNS.
- Neon is shared by storefront and ops. Never delete or recreate it during web
  work.
- Do not modify unrelated Hostinger sites, mail, DNS, databases, or processes.
- Secrets belong only in ignored local env files or the owning platform's
  secret store: Hostinger settings for storefront and root-owned VPS
  configuration for ops.
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

## Storefront deployment and recovery

The GitHub-connected generated branch is the routine storefront deployment
path. The verified ZIP remains an emergency recovery artifact:

```text
runtime-affecting main push → CI quality/integration/package
  → hostinger-storefront-production
  → Hostinger Node Web App
  → exact storefront SHA and public-surface verification
```

Markdown-only changes do not publish either generated branch. For a controlled
idempotent republish of the exact `main` source, dispatch `ops-pack.yml` with
`deploy_target=storefront`. Set repository variable
`HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED=true` enables the live verification
job after Hostinger deploys the generated branch; it does not weaken the
pre-publish gates.

Build the verified ZIP for either a routine deployment or emergency recovery:

```bash
pnpm check
PERFUME_AURA_TEST_DB_URL='<migrated-disposable-loopback-url>'
TEST_DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL_DIRECT="$PERFUME_AURA_TEST_DB_URL" \
  pnpm test:integration
pnpm storefront:pack
```

Target Hostinger settings: GitHub branch `hostinger-storefront-production`,
Node 24.x, Framework Other, root `./`, no build command, empty output directory,
and entry `apps/storefront/server.js`. Set
`STOREFRONT_URL` and `CUSTOMER_AUTH_URL` to `https://perfumeaura.com`.

The live Web App is connected only to `hostinger-storefront-production`.
Preserve its runtime and environment settings. The previous upload-sourced app
and fresh pre-cutover backup are rollback state; do not reassign the apex,
delete either recovery path, or copy mutable source identifiers into this
runbook. Read [`CURRENT_STATE.md`](CURRENT_STATE.md) for current identities.

Keep these flags false until their separate gates pass:

```text
STOREFRONT_CUSTOMER_AUTH_ENABLED
STOREFRONT_PREVIEW_CATALOG
STOREFRONT_PUBLIC_RELEASE
STOREFRONT_CHECKOUT_RELEASE_APPROVED
STOREFRONT_INQUIRIES_ENABLED
```

The shop listing of 21 Signature and 48 Inspired-by titles comes from the launch
workbook and does not require `STOREFRONT_PREVIEW_CATALOG` or
`STOREFRONT_PUBLIC_RELEASE`. Those flags still gate in-memory preview carts and
Neon-published sellable products. Do not import the launch workbook into
production Neon or open checkout without a separate authorized gate.

Cashfree owner refund actions in ops require the same reviewed merchant
`CASHFREE_ENV`, `CASHFREE_CLIENT_ID`, and `CASHFREE_CLIENT_SECRET` values as the
storefront. Keep them only in the root-owned ops runtime secret store. The
storefront additionally requires `CASHFREE_PAYMENT_TTL_MINUTES=20`; a missing
or different value blocks checkout expiry processing and checkout creation.

Once the account and checkout release gates have passed, invoke these bounded
storefront maintenance endpoints with `POST` and the existing
`STOREFRONT_MAINTENANCE_SECRET` bearer token. They are idempotent batch workers;
do not expose them to browsers or replace them with an unauthenticated cron:

| Endpoint | Responsibility |
|---|---|
| `/api/internal/reconcile-payments` | Verify pending Cashfree attempts against provider state |
| `/api/internal/expire-checkouts` | Release only provider-final expired holds and restore the cart |
| `/api/internal/reconcile-refunds` | Advance pending Cashfree refunds from server-verified state |
| `/api/internal/send-order-emails` | Drain the transactional order-email outbox with retry/backoff |
| `/api/internal/send-inquiry-notifications` | Drain the separate support-inquiry notification outbox without persisting PII in it |

Keep all five jobs disabled until migrations through `0012_amused_cloak`, restricted
runtime grants, Cashfree sandbox behavior, and Hostinger SMTP delivery are
proven on their owning environments. A failed or ambiguous provider response
must retain stock and remain available for the next reconciliation run.
The repository-owned scheduler is
`.github/workflows/storefront-commerce-maintenance.yml`. Configure the same
32-character-or-longer `STOREFRONT_MAINTENANCE_SECRET` in Hostinger and GitHub
Actions, then set the repository variable
`STOREFRONT_COMMERCE_MAINTENANCE_ENABLED=true` only after every preceding gate
passes. The scheduler reconciles payments before attempting expiry. Expiry still
runs after a degraded reconciliation batch because it independently verifies
provider finality for each checkout; ambiguous records retain stock. Refund,
order-email, and inquiry-email streams also run independently, and the final
step reports any degraded stream. Its default remains disabled.

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

If exact verification fails, do not automatically roll back, stop plan-wide
processes, or republish an older source. Inspect the scoped failure. The root
layout must remain dynamically rendered so HCDN does not retain release-marked
HTML across deployments; immutable Next assets may remain cached. Use the
known-good ZIP only with explicit authorization and the owning release gate
recorded in `CURRENT_STATE.md`; follow it with exact-SHA and clean-browser
verification. Use a scoped HCDN purge only with explicit authorization and
record its result in `CURRENT_STATE.md`.

## Current outcome

The live app follows only `hostinger-storefront-production` and preserves Node
24.x, Framework Other, root `./`, empty build/output settings, existing
environment values, and entry `apps/storefront/server.js`. Each
runtime-affecting main merge must publish the generated branch, rely on
Hostinger auto-deployment, and pass exact HCDN and clean-browser verification.

## Ops deployment and recovery

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

The old Hostinger ops Web App is off public DNS and retained only as frozen
rollback state. [`CURRENT_STATE.md`](CURRENT_STATE.md) owns its current
retention deadline and eligibility. Removal requires explicit authorization and
fresh exact-SHA VPS acceptance evidence. A rollback restores the captured DNS
records and verifies the frozen exact source; do not republish or delete it
casually.

Production migrations remain manual direct-owner operations. Reapply restricted
runtime grants after every schema change.

## Migrations and runtime grants

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

## Staff operations release procedure

Prior path: `docs/runbooks/STAFF_OPERATIONS_RELEASE.md`. Run only after the
active VPS ops release passes fresh exact-SHA acceptance. The unresolved
Hostinger shared-plan incident still gates managed-storefront provider changes,
but does not gate an independently authorized VPS ops release. Stop at the first
failure and record privacy-safe production results in `CURRENT_STATE.md`.

### Preconditions

- Active VPS ops exact-SHA acceptance passes, and storefront locks plus the
  path-preserving `www` redirect pass a fresh re-smoke.
- The staff commit and deployment artifact are CI-verified.
- `OPS_TWO_FACTOR_REQUIRED` and `OPS_STAFF_INVITES_ENABLED` are not `true`.
- Every `STOREFRONT_*` release flag remains false.
- Integration tests set `TEST_DATABASE_URL`, `DATABASE_URL`, and
  `DATABASE_URL_DIRECT` to the same loopback PostgreSQL database with a name
  matching `perfume_aura_phaseNN_<purpose>`.

Never use production or Neon as an integration-test database.

### Phase A — schema and flags-off deploy

1. Create an isolated Neon branch and apply `0010_curved_puma`.
2. Validate the migration and restricted grant contract on that Neon branch;
   do not run the integration suite there.
3. Apply the same migration to a disposable loopback PostgreSQL database and
   run authenticated integration tests with all three database URL variables
   set to that exact loopback database.
4. Apply the reviewed migration to production using `DATABASE_URL_DIRECT`.
5. Reapply `packages/db/sql/ops-runtime-grants.sql` with the reviewed runtime
   role; reject any unexpected effective privilege.
6. Deploy ops with both security flags false.
7. Verify exact SHA, live, ready, version, unauthenticated session, a real static
   asset, and existing owner login.
8. Re-smoke storefront, its release locks, and the path-preserving `www` `308`.

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target ops \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 1200000
```

### Phase B — owner security

1. Prove one real Hostinger SMTP delivery to the owner mailbox.
2. Enroll the owner in TOTP.
3. Complete one authorized recovery-code sign-in.
4. Set `OPS_TWO_FACTOR_REQUIRED=true`.
5. Prove pending-2FA sessions cannot access protected data and raw 2FA-disable
   requests are rejected.

Do not enable invitations yet. The break-glass TOTP reset is not part of normal
release testing; it revokes every owner session.

### Owner recovery and break glass

Use `/forgot-password` for normal owner recovery. Owner seeding never replaces
an existing password. Only an explicitly authorized break-glass event may run:

```bash
CONFIRM_OWNER_RECOVERY=REVOKE_ALL_OWNER_SESSIONS \
  pnpm --filter @perfume-aura/ops recover:owner
```

This atomically replaces the password and revokes every owner session. Lost
owner authenticator recovery is separate:

```bash
CONFIRM_OWNER_TWO_FACTOR_RESET=RESET_OWNER_TWO_FACTOR_AND_REVOKE_SESSIONS \
  pnpm --filter @perfume-aura/ops reset:owner-two-factor
```

It removes the TOTP/recovery-code record and revokes all owner sessions. Never
print or commit passwords, setup links, TOTP secrets, recovery codes, raw
request bodies, or sensitive audit metadata.

### Phase C — staff

Set `OPS_STAFF_INVITES_ENABLED=true` only after Phase B passes. Complete one
owner-created invitation, password setup, staff sign-in, and append-only
invitation/audit record check.

The capability matrix must remain:

| Capability | Owner | Staff |
|---|---:|---:|
| Staff management and security audit | Yes | No |
| Cost and commercial fields | Yes | No |
| Finance and payment recording | Yes | No |
| Refunds and payment exception handling | Yes | No |
| Promotions and release gates | Yes | No |
| Approved shipment update | Yes | Yes |

Prove staff denial through direct server actions, not only hidden navigation:

- invite, deactivate, and list staff;
- view cost or change commercial fields;
- adjust stock where owner-only;
- record payments or view finance;
- manage refunds or payment exceptions;
- manage promotions or release gates;
- void invoices;
- change payment state while updating a shipment.

Unknown, missing, stale, comma-separated, or non-staff roles must fail closed.

### Phase D — checkout lock

Staff release does not authorize commerce. Effective checkout requires both:

```text
commerceSettings.checkoutEnabled === true
&& STOREFRONT_CHECKOUT_RELEASE_APPROVED === "true"
```

Prove checkout stays locked with either plane false, public catalog stays empty
while public release is false, unpublished products return `404`, and the
zero-value cart contract remains intact.

### Final acceptance

- Owner login requires TOTP.
- One authorized staff account is active.
- Every owner-only server action denies staff.
- Invitation and audit rows are append-only.
- Ops and storefront pass a final full smoke.
- All storefront commerce flags remain closed.
- `CURRENT_STATE.md` records deploy SHA, flag state, evidence time, and residual
  risk without secrets.

Completion order:

```text
fresh exact-SHA VPS and storefront acceptance
→ isolated migration/tests
→ production migration/grants
→ flags-off deploy and health
→ SMTP/TOTP/recovery
→ mandatory 2FA
→ invitations
→ staff denial matrix
→ final re-smoke
→ stop; commerce remains closed
```

Never open storefront commerce flags as part of this release.

## Observability configuration and activation

Provider projects exist but production telemetry is not active until the
platform-specific runtime values and an observability-enabled artifact are
deployed.

| Service | Cloud object | Application separation | Current provider state |
|---|---|---|---|
| PostHog US Cloud | Project `Perfume Aura Web` (ID `541869`) | Required event property `application=storefront` or `application=operations` | Free project exists; client IP storage is disabled |
| Sentry | Project `perfume-aura-storefront` in organization `khanect` | Dedicated storefront project | Free project exists; high-priority email alerts enabled |
| Sentry | Project `perfume-aura-ops` in organization `khanect` | Dedicated private-ops project | Free project exists; high-priority email alerts enabled |

The active PostHog free plan permits one project. Both web applications use
that project and must be filtered by the mandatory `application` property.
Sentry remains split because operational errors and public-storefront errors
have different access, urgency, and privacy boundaries.

Use the same PostHog project token for both applications, with distinct
variable names so an accidental cross-app package cannot silently inherit it.
The token and Sentry DSNs are write-only/public client identifiers, but they
still belong in GitHub variables, platform runtime settings, or ignored local
environment files rather than committed source. Storefront server runtime
values live in Hostinger; ops server runtime values live in root-owned
`/etc/khanect/perfume-aura-ops.env` on the VPS. Repository variables
`POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`, `STOREFRONT_SENTRY_DSN`, and
`OPS_SENTRY_DSN` currently supply the prebuilt browser bundles.

| Application | Runtime variables |
|---|---|
| Storefront | `NEXT_PUBLIC_STOREFRONT_POSTHOG_TOKEN`, `NEXT_PUBLIC_STOREFRONT_POSTHOG_HOST`, `NEXT_PUBLIC_STOREFRONT_SENTRY_DSN`, `STOREFRONT_SENTRY_DSN`, `NEXT_PUBLIC_STOREFRONT_SENTRY_TRACES_SAMPLE_RATE`, `STOREFRONT_SENTRY_TRACES_SAMPLE_RATE` |
| Operations | `NEXT_PUBLIC_OPS_POSTHOG_TOKEN`, `NEXT_PUBLIC_OPS_POSTHOG_HOST`, `NEXT_PUBLIC_OPS_SENTRY_DSN`, `OPS_SENTRY_DSN`, `NEXT_PUBLIC_OPS_SENTRY_TRACES_SAMPLE_RATE`, `OPS_SENTRY_TRACES_SAMPLE_RATE` |

Use `https://us.i.posthog.com` for both PostHog host variables. Start both
trace sample rates at `0.1`; adjust only from measured volume and incident
needs.

Authenticated CI builds additionally require:

```text
SENTRY_ORG=khanect
STOREFRONT_SENTRY_PROJECT=perfume-aura-storefront
OPS_SENTRY_PROJECT=perfume-aura-ops
SENTRY_AUTH_TOKEN=<CI secret only>
```

GitHub Actions currently has `SENTRY_AUTH_TOKEN` as a repository secret created
with Sentry's limited `org:ci` scope. Never copy it into Hostinger or a
`NEXT_PUBLIC_*` variable.

The build uploads source maps only when the organization, application project,
and auth token are all present. Otherwise builds remain valid and source-map
upload is disabled. Uploaded browser source maps are deleted from the build
output afterward. The credential is exposed only to the verified package job on
`main`; pull-request and ordinary quality builds do not receive it.

On 2026-08-04, controlled non-production connection events reached both
Sentry projects and the shared PostHog project. PostHog showed one event with
`application=storefront` and one with `application=operations`; Sentry showed
one event in each matching application project. The temporary Sentry issues
were resolved after verification, leaving both unresolved issue feeds clean.
Both applications also passed production builds with the provider identifiers
enabled. Route client-JavaScript measurements were compared with a clean
`origin/main` build and did not increase on any guarded storefront or ops
route. That comparison is wiring and ingestion proof, not production
activation or source-map verification against a deployed release.

Treat observability activation as an explicit deployment on each platform. The
historical Hostinger duplicate-process/NPROC incident still gates storefront
provider changes, but it no longer blocks an independently authorized VPS ops
deployment:

1. Add the storefront server-only Sentry values in Hostinger and the ops
   server-only Sentry values in `/etc/khanect/perfume-aura-ops.env`. The
   `NEXT_PUBLIC_*` values must be present during the prebuilt CI/package build
   and cannot be added after the artifact is built.
2. Confirm the existing build-only `SENTRY_AUTH_TOKEN` secret is available to
   the trusted main-branch build; never expose it to pull requests from forks
   or through `NEXT_PUBLIC_`.
3. Run `pnpm check`, then run `pnpm test:integration` with
   `TEST_DATABASE_URL`, `DATABASE_URL`, and `DATABASE_URL_DIRECT` all set to the
   same migrated disposable loopback URL; run both package commands and
   `git diff --check`.
4. Deploy through the existing verified paths and run the exact-SHA production
   verifier plus the full storefront and ops smoke tests.
5. In a controlled, non-sensitive test route, produce one handled test error
   per application. Confirm the issue, structured log, release, readable stack,
   and `application` tag in the correct Sentry project.
6. Confirm a page view from each application in PostHog and filter by
   `application`. Verify that the event URL has no query string and the person
   contains no email or name.
7. Reconfirm PostHog IP discard remains enabled and that no session recordings
   are created.

No production readiness claim is valid until the provider event and source-map
checks pass. Monitoring must not open a storefront commerce flag or the staff
security flags.

## NPROC incident control

The shared plan has a 120-process ceiling. Its process-stop control affects the
whole plan, not the VPS ops service. Capture resources and storefront endpoint
evidence before provider action; prefer a scoped repair. Use plan-wide stop only
with explicit authorization, then re-smoke every affected managed site and
update `CURRENT_STATE.md`.

## Official references

- [Node.js hosting options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)
- [Select the Node.js version](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/)
- [Add a Node.js Web App](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Troubleshoot Node.js build failures](https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/)
