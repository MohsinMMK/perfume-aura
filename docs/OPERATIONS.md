# Operations

Read [Current state](CURRENT_STATE.md) before provider, DNS, secret, migration
or release work. This file owns procedures, not live SHAs.

## Authority, topology, and safety boundaries

Only Perfume Aura is in scope. Preserve unrelated VPS stacks, Hostinger sites,
email, DNS records, Neon, recovery artifacts and closed release flags.
GoDaddy owns registration; Hostinger owns DNS. App credentials, tables, cookies
and runtime roles stay separate. Never copy Ops credentials into storefront.

Prefer Hostinger MCP through Docker Gateway, GitHub CLI and private SSH.
Use hPanel only for capabilities absent from the installed MCP tool inventory.
Enable only the specific MCP write tool required, verify, then disable it.
Never weaken branch protection, expose SSH publicly or use plan-wide process stops.

## Storefront deployment and recovery

Both applications run on the VPS. [Current state](CURRENT_STATE.md) owns exact
releases and any acceptance still pending. Storefront implementation lives in
[deploy/storefront-vps](../deploy/storefront-vps/).

Storefront production flow:

```text
protected main merge → scoped quality/integration → clean Linux standalone
→ checksummed artifact → immutable GHCR image → Tailscale forced SSH
→ exact-SHA container health → exact public acceptance
```

| Setting | Contract |
|---|---|
| Workflow | `.github/workflows/ops-pack.yml`, storefront target |
| Build | `scripts/build-hostinger-storefront-source.sh`; Linux x64/glibc, Node 24.6.0, pnpm 11.25.0 |
| Image | `ghcr.io/mohsinmmk/perfume-aura-storefront@sha256:<digest>` |
| Compose | `/srv/khanect/stacks/perfume-aura-storefront/compose.yaml` |
| Runtime env | `/etc/khanect/perfume-aura-storefront.env`, root:root 0600 |
| Deploy user | `perfume-storefront-deploy`; forced `deploy <40-char-sha> <sha256-digest>` only |
| Deployment state | `/srv/khanect/data/perfume-aura-storefront/{current,previous}.env`, root-only |
| Exposure | `127.0.0.1:3031:3000`; Caddy owns public TLS |
| Isolation | UID/GID 10001, read-only, cap-drop ALL, no-new-privileges, 0.75 CPU, 768 MiB, 256 PIDs, bounded logs |
| CI secret | `VPS_STOREFRONT_SSH_KEY`; never grants Ops or an interactive shell |
| Shared CI transport | `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, `VPS_OPS_KNOWN_HOSTS`, `VPS_OPS_TAILSCALE_IP` |
| Enablement | `VPS_STOREFRONT_AUTO_DEPLOY_ENABLED=true`; public acceptance requires `VPS_STOREFRONT_PUBLIC_VERIFICATION_ENABLED=true` |

The source builder materializes pnpm links, copies public/static assets,
verifies Linux Sharp, rejects secrets and checks version/homepage/static output.
The Dockerfile rejects dirty, wrong-app or mismatched artifacts. Build with only
`.hostinger/storefront` as context, never the source checkout or env directory.
`EXPECTED_SOURCE_SHA` is a health assertion, not an embedded-version override.
Public telemetry identifiers must be supplied at build time; runtime secrets
never enter artifacts or GitHub build variables.

CI changes images only. Compose, SSH/sudo policy and deploy-script changes need
a reviewed admin installation, syntax validation and scoped reload; the CI user
must never be able to edit its own root command or authorized key policy.

Provisioning and DNS rules:

1. Preserve current DNS, env and exact accepted recovery artifact. Transfer the
   storefront's own env securely; verify names and flags without printing values.
2. Install the root-owned Compose, forced-command scripts and restricted key.
   Verify probe, invalid-command denial and immutable-image pull permissions.
3. Complete protected CI. Enable only VPS storefront deployment and dispatch
   `deploy_target=storefront`. Do not deploy Ops or apply `0017`.
4. Check candidate version, homepage, static asset, flags and production env.
   Back up Caddy configuration; add only apex/www, validate, then reload Caddy.
5. Disable Hostinger CDN and opt this site out of automatic CDN before changing
   its web records. CDN deactivation can restore provider A/AAAA records: remove
   those retired web targets, then set apex A to the VPS and www CNAME to apex.
   Change only apex/www web records. Preserve MX/TXT/CAA, app A and nameservers.
   Check authoritative NS plus public resolvers. Do not infer a missing app A
   from the Hostinger API: its zone response may omit that record.
   DNS validation alone is insufficient: an existing ALIAS must be removed
   before creating an A record. Use structured MCP arguments for record arrays;
   Docker's direct tools-call CLI stringifies them. Verify actual DNS afterward.
6. Pass [public acceptance](#production-acceptance), enable public CI verification,
   then prove a scoped GitHub release reaches the exact public SHA.
7. Remove obsolete Perfume Aura Web Apps only after backup/acceptance. Preserve
   email, DNS and other sites. Disconnect Hostinger Git triggers and remove
   unused repository variables/token only after confirming no active consumer.
8. Remove the private preview by its exact Compose project. Keep accepted
   recovery images/state; never run global Docker or volume prune.

A failed container startup restores the recorded healthy storefront image.
Public verification failure requires diagnosis; it does not authorize arbitrary
DNS rollback. For an authorized application rollback, read the previous
root-owned SHA/digest and call the same restricted deploy command, then verify.
DNS rollback additionally requires the retained hosting app and its original
web records. Never delete recovery material before accepting its replacement.

Retired Hostinger integration remains disabled until the pending site cleanup:
`hostinger-storefront-production` is gated by
`HOSTINGER_STOREFRONT_GIT_DEPLOY_ENABLED=false`. Keep recovery material until
provider disconnection and accepted VPS public routing are both verified.

## Ops deployment and recovery

Ops remains independent: scoped quality/integration/package → verified standalone
ZIP → immutable GHCR image → Tailscale `perfume-deploy` forced command →
hardened container → exact public verification.

Runtime env: root-owned `/etc/khanect/perfume-aura-ops.env`.
Compose: `/srv/khanect/stacks/perfume-aura-ops/compose.yaml`.
Loopback port 3020; 1 CPU, 768 MiB, read-only, UID/GID 10001, no Docker socket.
CI gates: `VPS_OPS_AUTO_DEPLOY_ENABLED` and
`VPS_OPS_PUBLIC_VERIFICATION_ENABLED`. Recovery:
`sudo khanect rollback perfume-aura-ops` only after authorization.
Do not deploy main while the pending migration owner gate is incomplete.
Keep `VPS_OPS_AUTO_DEPLOY_ENABLED=false` until that gate passes; this does not
stop the accepted Ops container. Shared-runtime changes do not automatically
deploy the storefront while they also classify as Ops scope. After review,
dispatch only `deploy_target=storefront` when a shared change is safe for the
storefront without updating Ops or applying migrations.

## Production acceptance

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target storefront --public-surface storefront \
  --public-base https://perfumeaura.com \
  --www-base https://www.perfumeaura.com --timeout-ms 1200000
node scripts/verify-production-deploy.mjs <ops-40-character-sha> \
  --target ops --public-surface storefront \
  --public-base https://perfumeaura.com --timeout-ms 1200000
```

Require exact public version, release-marked HTML, real static asset, all seven
discovery sitemap URLs, canonical/indexability, genuine 404s, locked commerce,
and www 308 preserving `/shop?probe=1`. Ops also needs live, ready, version,
unauthenticated session and a real static asset; login alone is insufficient.
Check Ops container identity/start time stays unchanged during storefront work.
Use current browser acceptance for desktop/mobile and relevant user journeys.

After an accepted storefront release, `pnpm storefront:indexnow` submits the
deployed sitemap. Receipt does not guarantee indexing. Public-catalog releases
also require `--seo-mode public-catalog --expected-sitemap-manifest <reviewed-json>`.

## Migrations and runtime grants

Production is Neon. Runtime uses pooled `pg`; migrations use the direct owner
connection. Never run integration tests on Neon or migrate as a deployment side
effect. Confirm the journal, prove the intended changes on an isolated Neon
branch, test on disposable loopback PostgreSQL, then obtain owner apply approval.

Use `pnpm db:prove-isolated-migration` with the reviewed migration tag and roles.
After apply, reapply `packages/db/sql/ops-runtime-grants.sql`,
`storefront-runtime-grants.sql` and the finalizer grants where applicable.
Unexpected effective privileges fail acceptance: no runtime DDL, TEMP, role
membership or broad sequence power. Finalizer has function-only access, no table
grants. Preserve append-only stock/audit/invitation records.

`0017` adds oil reservations/FIFO settlement and is not applied. Confirm the
unrecorded `0016` journal before oil provenance work. Do not change either
runtime database URL during this web migration.

### Runtime grant verification

Use the reviewed grant scripts and verify their effective result. Any
unexpected effective privilege fails the handoff. This matrix is a safety
contract, not an instruction to apply grants during web deployment.

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

## Self-hosted PostgreSQL target

[PostgreSQL runbook](../deploy/postgres-vps/RUNBOOK.md) owns this separate,
not-live project. It requires independent encrypted off-VPS pgBackRest backup
and an on-VPS restore drill before cutover. Never expose port 6432 or change
runtime connections merely because templates exist.

Ordering: source export → disposable restore/parity → migrations/grants →
off-host backup → independent restore → controlled write freeze/cutover →
exact acceptance. Retain Neon until the accepted recovery window completes.
The read-only `pnpm db:verify-self-hosted-migration` uses explicit direct source
and target URLs and rejects Neon/pooler targets; never print data or URLs.

## Staff operations release procedure

Keep both staff flags false until acceptance. Owner sequence: SMTP delivery →
TOTP enrollment → authorized recovery-code login → mandatory 2FA and direct
disable/session denial checks → invitations → one real staff journey.
Prove direct-action denials for staff management, costs, finance, refunds,
promotions, publication, owner-only stock/invoice mutations and payment changes.
Staff may perform approved shipment updates only. Unknown/stale roles fail closed.
Re-smoke both applications; staff acceptance never opens commerce.

### Owner recovery and break glass

Normal recovery uses `/forgot-password`; seeding never overwrites a password.
Only explicitly authorized break glass may run:

```bash
CONFIRM_OWNER_RECOVERY=REVOKE_ALL_OWNER_SESSIONS pnpm --filter @perfume-aura/ops recover:owner
CONFIRM_OWNER_TWO_FACTOR_RESET=RESET_OWNER_TWO_FACTOR_AND_REVOKE_SESSIONS pnpm --filter @perfume-aura/ops reset:owner-two-factor
```

Both revoke every owner session. Never print passwords, setup links, TOTP
secrets, recovery codes or sensitive audit metadata.

## Observability configuration and activation

Build identifiers: `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`,
`STOREFRONT_SENTRY_DSN`, `OPS_SENTRY_DSN` repository variables.
Use app-specific `NEXT_PUBLIC_*` names from each app's env example.
Server identifiers belong in the owning runtime secret store.
`SENTRY_AUTH_TOKEN` is trusted-main build-only, never runtime or public.
Sentry organization is khanect; projects are perfume-aura-storefront and
perfume-aura-ops. PostHog is the shared Perfume Aura Web project (541869),
distinguished by mandatory application property. Host is us.i.posthog.com.

Acceptance needs controlled privacy-safe events in each correct project,
release/readable stack, no query strings/email/name/IP retention/autocapture/
session replay, and a fresh production check. SDK presence alone is not acceptance.

Commerce maintenance stays off until provider and launch gates pass.
`.github/workflows/storefront-commerce-maintenance.yml` uses the same 32+
character `STOREFRONT_MAINTENANCE_SECRET` as storefront runtime. Its five POST
workers reconcile payments, expire checkouts, reconcile refunds, send order
email and send inquiry notifications. Ambiguous provider states retain work
and stock. Do not enable jobs, Cashfree credentials or inquiries in this migration.
Cashfree TTL must remain 20 minutes; Ops refunds use the same reviewed merchant.
[Commerce launch gates](COMMERCE.md#launch-gates) own provider/business approval.

## Official references

- [Hostinger website deletion](https://www.hostinger.com/support/3624731-how-to-delete-a-website-from-a-hosting-plan-in-hostinger/)
- [Hostinger DNS editor](https://www.hostinger.com/support/how-to-use-hostingers-dns-zone-editor/)
- [Docker Compose health wait](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Private GitHub runners with Tailscale](https://tailscale.com/kb/1586/secure-github-runners)
