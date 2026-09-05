# Engineering

## Find the implementation

Start with Current state. Use Graphify's current lessons and a small vocabulary-
expanded query for code relationships, then verify the returned paths with `rg`.
The graph does not currently cover VPS/provider deployment; go directly to
[Operations](OPERATIONS.md) for that work. Do not rebuild the graph for routine questions.

| Need | Source |
|---|---|
| Product routes, flags, launch gates, business policies | [Commerce](COMMERCE.md#product-behavior) |
| Catalog identities, legal/source evidence, visual constraints | [Reference](REFERENCE.md) |
| Storefront deployment | `.github/workflows/ops-pack.yml`, `deploy/storefront-vps/` |
| Deployment scope and CI gates | `scripts/classify-deployment-impact.mjs`, `scripts/verify-ci-workflow.mjs` |
| Exact release acceptance | `scripts/verify-production-deploy.mjs`, app `lib/build-version.ts` and `lib/health.ts` |

Keep generated Graphify output untracked. After source changes, refresh only the
affected graph scope using the skill's update procedure; retain healthy graphs
when extraction is incomplete. Documentation is the fallback for missing edges.

- [Repository and boundaries](#repository-layout-and-boundaries)
- [Runtime and tooling](#locked-runtime-and-tooling)
- [Shared UI](#shared-ui-contract)
- [Data, database, and auth](#data-database-and-auth-contracts)
- [Local validation and CI](#local-development-and-validation)
- [Performance engineering](#performance-engineering)
- [Observability code and privacy](#observability-code-and-privacy)
- [Pending outcome](#pending-outcome)

Live SHAs, deploy flags, and rollback belong in
[`CURRENT_STATE.md`](CURRENT_STATE.md). Product routes and release locks belong
in [Product behavior](COMMERCE.md#product-behavior).

## Repository layout and boundaries

```text
apps/storefront/  public Next.js application; pack entry apps/storefront/server.js
apps/ops/         internal Next.js application; pack entry apps/ops/server.js
packages/db/      Drizzle schema, 18 SQL migrations, runtime grants, tests
packages/ui/      shadcn/Base UI primitives
packages/validators/  Zod schemas used by ops
scripts/          pack, deploy, verify, commerce, client-JS budgets
deploy/ops-vps/   ops image/compose
deploy/storefront-vps/  isolated storefront image, Compose and forced SSH deployment
deploy/postgres-vps/  approved self-hosted PG target (not cut over)
```

No static marketing app, generated storefront branch, root `tsconfig.json`, or
`turbo.json` remains.

- Until `STOREFRONT_PUBLIC_RELEASE=true`, `/shop` is the workbook listing in
  `apps/storefront/lib/listing-catalog.ts`, not the Neon projection.
- Public catalog queries omit cost, raw stock, internal notes, and archives.
- Cart cookie is `pa_storefront_cart`. Customer cookies use prefix `pa_customer`.
- `www` → apex is `apps/storefront/next.config.ts` `redirects()` (`permanent:
  true` → 308). There is no storefront `proxy.ts` or `middleware.ts`.
- Ops `apps/ops/proxy.ts` is a cookie-presence gate for dashboard routes, not
  the security boundary and not canonicalization.

## Locked runtime and tooling

Change stack only through an explicit reviewed decision. No Vercel production.

| Area | Choice |
|---|---|
| Workspace | pnpm `11.25.0` (`packageManager`), engines Node `>=24.6.0 <25` |
| Pins | Node `24.6.0`, npm `11.5.1` (`.nvmrc`, CI, ops image, packers) |
| Apps | Next.js `16.3.4`, React `19.2.8`, App Router, `output: "standalone"` |
| TypeScript | `tsc` is `7.0.2` via `@typescript/native`. Package named `typescript` is `@typescript/typescript6@6.0.2` for eslint/Next compiler API. `strict: true` |
| UI | shadcn `^4.19.1`, `@base-ui/react` `^1.7.0`, Tailwind `4.3.3`, Hugeicons. No Radix runtime |
| Fonts | Ops: IBM Plex Sans + Raleway. Storefront: self-hosted Londrina Solid/Outline + Inter Tight |
| Auth | Better Auth `1.7.2`, two Drizzle adapters |
| Database | drizzle-orm `0.45.2`, drizzle-kit `^0.31.10`, `pg` `8.23.0` Pool (`max: 10`) |
| Validation | Zod `4.5.4` |
| Telemetry | `posthog-js` `1.424.0`, `@sentry/nextjs` `10.73.0` |
| Payments | Cashfree JS `^1.0.7`; dashboard TTL 20 minutes; provider order expiry 15 minutes |

`pnpm-workspace.yaml` overrides: `sharp@0.35.3`, `postcss@8.5.23`,
`@hono/node-server@1.19.14 → 2.0.10`, `brace-expansion@5.0.9`,
`esbuild@0.18.20 → 0.25.12`, `fast-uri@3.1.5`, `hono@4.12.34`,
`ip-address@10.3.1`, `js-yaml@4.3.1`, `nanoid@3.3.18`, `undici@7.29.0`. Patch:
`patches/minimatch@3.1.5.patch`. Change an override only with dependency-path
evidence, then verify audit, lint, shadcn preset resolution, migrations, both
builds, and both packages.

Both production images and CI pin Node `24.6.0`.

## Shared UI contract

- Base UI package: `packages/ui` (`@perfume-aura/ui`).
- Apps import `@perfume-aura/ui/components/*`. Never place base UI under
  `apps/*/components/ui`.
- Preset identity `b23PPibQOI` lives in `packages/ui/src/globals.css`.
  `components.json` uses `style: "base-luma"`.
- Tokens: `packages/ui/src/globals.css` only. Ops `components.json` must point
  `tailwind.css` at `../../packages/ui/src/globals.css`.

```bash
pnpm dlx shadcn@latest preset resolve -c apps/ops
pnpm dlx shadcn@latest add button -c apps/ops -y
pnpm dlx shadcn@latest preset resolve -c apps/storefront
```

Preset resolve must return `b23PPibQOI` without fallback.

Skills live under `.agents/skills/` and are locked by `skills-lock.json`.
Never use Vercel deploy skills.

## Data, database, and auth contracts

- Runtime transactional work: pooled `DATABASE_URL` through `pg` Pool.
- Migrations and administrative SQL: `DATABASE_URL_DIRECT`.
- Tests: disposable loopback PostgreSQL only. Names must match
  `perfume_aura_phaseNN_<purpose>`. Never load application env files.
- Money persists as integer INR paise. Ops/invoice columns often `*_cents`;
  commerce columns often `amount_minor`. Same unit. No browser float is
  authoritative.
- Repo migrations: `0000`–`0017` (18 files). Production has not applied
  `0017`. `0016` is in the live source; its Neon apply is unrecorded — confirm
  the journal before oil-provenance work. See [`CURRENT_STATE.md`](CURRENT_STATE.md).
- `oil_reservations` and settlement routines are SQL in `0017`, not Drizzle TS
  tables. Finalizer env: `STOREFRONT_PAYMENT_FINALIZER_DATABASE_URL`. That role
  has no table grants.
- Legacy COD enum values stay for historical rows only. Active flows must not
  create or advertise COD.

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

### Auth isolation

- Ops: `apps/ops/lib/auth.ts`. Public sign-up disabled. Roles exact `owner` /
  `staff` / `user`. Admin + 2FA plugins. Flags default off.
- Customer: `apps/storefront/lib/customer-auth.ts`. Enabled only when
  `STOREFRONT_CUSTOMER_AUTH_ENABLED === "true"`.
- `/api/customer-auth/[...all]` lazy-imports Better Auth after the 404 gate.
- Checkout, reviews, returns, claim-order, and delivery-profile **statically
  import** customer auth (claim-order also imports `@perfume-aura/db`) and then
  404. Do not “fix” that without review.
- Disabled account **pages** render flags-off UX; they do not 404.
- Browser mutations require the exact storefront `Origin`; `sec-fetch-site:
  cross-site` is rejected (`isTrustedStorefrontMutation`).
- Password length 12–256. Generic reset responses. Never expose
  `BETTER_AUTH_SECRET`, `CUSTOMER_AUTH_SECRET`, SMTP passwords, or database URLs.

### Database package workflow

`packages/db` owns schema, migrations, the pooled client, and inventory APIs.
`drizzle.config.ts` fails closed without `DATABASE_URL_DIRECT`. Applications
import schema only through `@perfume-aura/db`.

```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
```

Grant SQL: `packages/db/sql/ops-runtime-grants.sql`,
`storefront-runtime-grants.sql`, `storefront-payment-finalizer-grants.sql`.
Reapply restricted grants after every production schema change. Procedure:
[`OPERATIONS.md`](OPERATIONS.md#migrations-and-runtime-grants).

Inventory rules that remain in force:

1. `applyMovement()` owns non-commerce receive, return, sale, damage, and
   adjustment. Commerce checkout uses `reserveCheckoutStock` /
   `releaseCheckoutReservations`. The finalizer role may only bind an authentic
   Cashfree session, cancel a failed/expired bound intent, and settle an
   independently verified payment. `consumeCheckoutReservations` is owner-only
   support/test plumbing.
2. Stock never goes negative. Sales respect `available = on_hand - qty_reserved`.
   Finished-bottle sales consume concentrate from `oil_lots` at 50% of bottle
   millilitres (1 kg = 1000 ml; Signature 105 ml consumes 53 ml, ceiled).
   Checkout reserves exact FIFO lots before a provider session can be bound.
3. Owner-authorized local invoice-line returns restore finished stock, never
   restore consumed oil, and never imply a provider refund.
4. `0013_silly_vanisher` is the Better Auth 1.7 issuer boundary.
   `0014_oil_lots` owns the concentrate ledger. `0016_even_silk_fever` adds
   optional oil-lot provenance. `0017_storefront_sale_settlement` owns
   reservations and finalizer routines.

## Local development and validation

```bash
pnpm check
PERFUME_AURA_TEST_DB_URL='<migrated-disposable-loopback-url>'
TEST_DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL_DIRECT="$PERFUME_AURA_TEST_DB_URL" \
  pnpm db:migrate
TEST_DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL_DIRECT="$PERFUME_AURA_TEST_DB_URL" \
  pnpm test:integration
node deploy/storefront-vps/test-contract.mjs
git diff --check
```

`pnpm check` runs deployment self-tests, `pnpm commerce:verify`, lint,
typecheck, unit tests, both production builds, both client-JS budget asserts,
and the workspace plus ops-runtime audits. Integration tests are **not** inside
`pnpm check`.

Tests use Node built-in runner via `tsx --test` (not Vitest/Jest). Inventory
guard: `scripts/check-test-inventory.mjs`. Approximately 73 unit files (~302
cases) and 18 integration files (110 cases). DB integration uses
`--test-concurrency=1`.

Ops local bootstrap:

```bash
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner
pnpm dev:ops
```

Owner seeding is atomic and idempotent. Normal recovery uses
`/forgot-password`. Destructive recovery belongs in
[`OPERATIONS.md`](OPERATIONS.md#owner-recovery-and-break-glass).

## CI, packaging, and impact classification

`.github/workflows/ops-pack.yml` (`ci-and-ops-artifact`):

| Job | Runs |
|---|---|
| `deployment-impact` | Central fail-closed planner for validation and publication. Markdown-only → neither surface; deployment tooling → validate both/publish neither; drizzle/sql → validate/publish both plus `ops_migration_blocked` |
| `storefront-quality` / `ops-quality` | Surface lint, shared dependency typecheck/unit tests, production build, and client-JS budget only for the planned surface |
| `shared-database-integration` | Database integration once when either runtime is affected |
| `storefront-integration` / `ops-integration` | Application integration tests only for the planned surface |
| `verified-storefront-source-build` | Linux standalone build, smoke, container validation and checksummed artifact |
| `verified-ops-artifact` | Ops standalone ZIP, checksum, manifest, and hardened container validation only when ops is affected |
| `quality` | Stable required-check aggregator; succeeds for Markdown-only changes after repository contract tests and rejects missing/extra surface work |
| `publish-and-deploy-vps-ops` / `publish-and-deploy-vps-storefront` | independent, gated releases only after `quality`; migrations block both |
| `block-runtime-deploy-on-database-migration` | fails closed |

CodeQL is a separate workflow. Commerce maintenance cron is flags-off unless
`STOREFRONT_COMMERCE_MAINTENANCE_ENABLED=true`.

The manifests under `scripts/ops-runtime-deps/` supply Sharp to both standalone
builders, so changes select both surfaces. Deployment-tooling edits validate both
without publishing. CI never creates a secondary deployment branch.

| Script | Command |
|---|---|
| `build-hostinger-storefront-source.sh` | `pnpm hostinger:build:storefront` (Linux standalone for VPS CI) |
| `pack-ops-standalone.sh` | `pnpm ops:pack` |
| `verify-production-deploy.mjs` | `pnpm ops:verify-production-deploy` |
| `verify-commerce-foundation.mjs` | `pnpm commerce:verify` |

The ops packer pins Node `24.6.0`, npm `11.5.1`, and pnpm `11.25.0`. The
storefront source build uses CI Node `24.6.0` and pins pnpm `11.25.0`.
Both reject secret-shaped output, verify Linux x64/glibc Sharp, and smoke their
materialized servers.

Search/discovery implementation lives in `apps/storefront/lib/seo.ts`,
`editorial-guides.ts`, and `public-business.ts`. Product contract:
[Product behavior](COMMERCE.md#product-behavior). Do not publish Store schema until NAP facts are
confirmed.

## Performance engineering

Preserve auth, money, database, release-lock, accessibility, and deployment
contracts. Client-JS budgets are asserted by `pnpm check`, not by CI `quality`.

| App | Route | Budget (bytes) |
|---|---|---:|
| Storefront | `/` | 226_500 |
| Storefront | `/shop` | 220_000 |
| Storefront | `/products/[slug]` | 240_000 |
| Storefront | `/cart` | 218_000 |
| Storefront | `/checkout` | 233_500 |
| Storefront | `/search` | 235_000 |
| Storefront | `/account/sign-in` | 235_000 |
| Ops | login | 185_000 |
| Ops | forgot / reset / 2FA | 181_000 / 184_000 / 176_000 |
| Ops | dashboard | 396_000 |

Animate only `transform` and `opacity` where behavior remains equivalent;
preserve reduced motion. Generated traces stay untracked. Fresh measurements and `CURRENT_STATE.md` own acceptance; do not reuse old attestations.

## Observability code and privacy

Neither PostHog nor Sentry is a source of truth for commerce, authentication,
inventory, or finance. Provider SDKs remain disabled when their environment
identifier is absent.

Both applications contain the official Next.js instrumentation surfaces:

```text
instrumentation-client.ts
  -> Sentry browser errors + route transitions
  -> deferred PostHog initialization after page load

instrumentation.ts
  -> sentry.server.config.ts for Node
  -> sentry.edge.config.ts for Edge
  -> Next.js onRequestError hook

app/global-error.tsx
  -> captures root React failures and provides an accessible retry surface
```

PostHog initializes after page load, captures page-view/page-leave activity and
the allowlisted `storefront_contact_action` event, and registers an application
discriminator. Contact actions contain only `application`, `surface`, and
`action`. Broad DOM autocapture, surveys, experiments, feature flags, exception
capture, and session replay remain disabled. Storefront persistence is
`sessionStorage`; ops is `localStorage`.

Privacy sanitizers remove direct-identifier property keys, request bodies,
headers, cookies, query strings, fragments, and opaque URL tokens. Authenticated
identification uses only the stable internal user ID. Do not add console
capture, DOM autocapture, session replay, or email identification without a
separate privacy review.

Activation procedure:
[`OPERATIONS.md`](OPERATIONS.md#observability-configuration-and-activation).

## Quality and accessibility

- Use the official shadcn CLI; shared primitives belong in `packages/ui`.
- Keep secrets only in ignored local env files or the owning platform's secret
  store: separate root-owned VPS environment files for storefront and Ops.
- Use persistent labels, semantic buttons, 44px minimum targets, inert closed
  drawers, focus restoration, and reduced-motion-safe animation.
- Every public release flag remains false unless its owning acceptance evidence
  is recorded.

## Pending outcome

Do not apply `0016` or `0017` to production without the owner migration gate.
Do not treat CI `quality` as `pnpm check`. Capture privacy-safe Core Web Vitals
only after approved catalog content is live. Next production actions live in
[`CURRENT_STATE.md`](CURRENT_STATE.md).
