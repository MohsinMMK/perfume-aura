# Engineering

## Repository layout

```text
apps/storefront/  public Next.js application
apps/ops/         internal Next.js application
packages/db/      Drizzle schema, SQL migrations, runtime grants, tests
packages/ui/      shadcn/Base UI shared primitives
packages/validators/
scripts/          packages, deployment verification, commerce checks
```

No static marketing application or generated root publish surface remains.

## Application boundaries

- Storefront uses a controlled public catalog projection and a secure HttpOnly
  cart token. It never returns costs, raw stock, internal notes, or archived
  records.
- Ops uses independent Better Auth owner/staff sessions and private,
  capability-authorized server actions. Roles are exact `owner`, `staff`, or
  `user`; missing, unknown, and comma-separated values fail closed.
- Storefront customer auth has separate tables, secrets, cookies, and trusted
  origins. It is disabled and must not import auth/database code on disabled
  routes.
- `proxy.ts` preserves apex canonicalization and redirects `www` to the exact
  apex path and query.

## Database

- Runtime writes use a restricted pooled Neon role through `pg` and Drizzle
  interactive transactions.
- Migrations and administrative grants use a direct owner connection.
- Integration tests use disposable loopback PostgreSQL only.
- Money persists as integer INR paise; no browser float is authoritative.
- Inventory, invoice/payment, and commerce reservation/order lifecycles are
  transactionally locked and idempotent where a client or provider may retry.
- The Admin/2FA schema uses immutable invitation/audit tables and a database
  owner invariant: a blank database may have zero owners until seeded, then it
  permits one owner only and prevents removal/demotion of the final owner.

### Retained financial and inventory contracts

The following database contracts remain operational safeguards; they are not
legacy deployment behavior:

```sql
CREATE TRIGGER "stock_movements_append_only"
BEFORE UPDATE OR DELETE ON "stock_movements"
FOR EACH ROW EXECUTE FUNCTION "prevent_stock_movement_mutation"();

CHECK ("status" = 'void' AND "amount_paid_cents" = 0);
CHECK ("variant_id" IS NOT NULL OR "quantity_fulfilled" = 0);
```

Intentional payment-trigger deferral remains in force: payment mutation is not
database-trigger-blocked until a linked reversal/credit-note model can preserve
the authoritative net-sum. Fulfillment is aggregate-only for free-text invoice
lines. Return movements are not netted into invoice fulfillment, and a draft line with a matching sale movement is rejected by preflight and reconciliation.

## Local commands

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build:storefront
pnpm build:ops
pnpm storefront:pack
pnpm ops:pack
node scripts/verify-production-deploy.mjs self-test
git diff --check
```

`pnpm check` runs deployment self-tests, commerce verification, lint, typecheck,
unit tests, both production builds, both route client-JavaScript budget checks,
and the full workspace dependency audit. The audit fails on any known severity
and also checks the separate ops runtime lock. Run integration tests separately
with explicitly supplied disposable database URLs.

## CI and packages

`.github/workflows/ops-pack.yml` validates both production builds and both
clean standalone artifacts. Runtime-affecting `main` changes publish only the
surfaces selected by the fail-closed impact classifier. Ops is built as an
immutable GHCR image from the verified package and deployed through Tailscale
forced SSH to the VPS. Storefront publication creates the verified
`hostinger-storefront-production` branch, but live verification remains gated
off until the existing Hostinger app is connected; the verified ZIP is the
current live deployment path.

Markdown-only main changes still run CI and packaging but do not publish or
deploy either surface. Database migration or runtime-grant changes block the
automatic ops deployment until the manual migration gate is satisfied. Missing
or unclassifiable change evidence rebuilds both surfaces so uncertainty cannot
silently suppress verification. CodeQL scans JavaScript and TypeScript on pull
requests, main pushes, and the weekly schedule.

The production verifier always checks the apex storefront plus ops exact SHA,
health, auth-session response, and static assets:

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target ops \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 1200000
```

## Observability boundary

The browser, Node, and Edge integration is documented in
`docs/OBSERVABILITY.md`. Provider SDKs remain disabled when their environment
identifier is absent. PostHog initializes after page load, captures only
page-view/page-leave activity, and registers an application discriminator.
Sentry captures unhandled failures, sampled traces, and typed structured logs.

Privacy sanitizers remove direct-identifier property keys, request bodies,
headers, cookies, query strings, fragments, and opaque URL tokens before an
event can leave either app. Tests for those filters run in each application's
unit suite. Do not add console capture, DOM autocapture, session replay, or
customer/staff email identification without a separate privacy review.

## Quality and security

- Use the official shadcn CLI; shared primitives belong in `packages/ui`.
- Keep secrets only in ignored local env files or the owning platform's secret
  store: Hostinger settings for storefront and root-owned VPS configuration for
  ops.
- Use persistent labels, semantic buttons, 44px minimum targets, inert closed
  drawers, focus restoration, and reduced-motion-safe animation.
- Every public release flag remains false unless its owning acceptance evidence
  is recorded.
