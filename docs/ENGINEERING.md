# Engineering

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
in [`PRODUCT.md`](PRODUCT.md).

## Repository layout and boundaries

```text
apps/storefront/  public Next.js application; pack entry apps/storefront/server.js
apps/ops/         internal Next.js application; pack entry apps/ops/server.js
packages/db/      Drizzle schema, 18 SQL migrations, runtime grants, tests
packages/ui/      shadcn/Base UI primitives
packages/validators/  Zod schemas used by ops
scripts/          pack, deploy, verify, commerce, client-JS budgets
deploy/ops-vps/   ops image/compose
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

Hostinger storefront selects Node `24.x`; the API records major 24 only. The
repository pin is `24.6.0`.

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
pnpm test:integration
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
| `deployment-impact` | Fail-closed classifier. Markdown-only → no publish. drizzle/sql → `ops_migration_blocked` |
| `quality` | self-tests, commerce verify, lint, typecheck, unit, audit, both production builds. **Does not run `pnpm check` or client-JS budgets** |
| `postgresql-16-integration` | migrate + all integration tests on `postgres:16` |
| `verified-hostinger-zip` | both packs, checksums, ops image build |
| `publish-and-deploy-vps-ops` / `deploy-hostinger-storefront-archive` | only when auto-deploy flags and not migration-blocked |
| `block-runtime-deploy-on-database-migration` | fails closed |

CodeQL is a separate workflow. Commerce maintenance cron is flags-off unless
`STOREFRONT_COMMERCE_MAINTENANCE_ENABLED=true`.

| Script | Command |
|---|---|
| `pack-storefront-standalone.sh` | `pnpm storefront:pack` |
| `pack-ops-standalone.sh` | `pnpm ops:pack` |
| `deploy-hostinger-storefront-archive.mjs` | `pnpm storefront:deploy-archive` |
| `verify-production-deploy.mjs` | `pnpm ops:verify-production-deploy` |
| `verify-commerce-foundation.mjs` | `pnpm commerce:verify` |

Packers require Node `24.6.0`, npm `11.5.1`, and pnpm `11.25.0`; reject
secret-shaped files; verify Linux x64 Sharp; smoke extracted servers.

Search/discovery implementation lives in `apps/storefront/lib/seo.ts`,
`editorial-guides.ts`, and `public-business.ts`. Product contract:
[`PRODUCT.md`](PRODUCT.md). Do not publish Store schema until NAP facts are
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
preserve reduced motion. Generated traces stay untracked. Dated attestations
in [`REFERENCE.md`](REFERENCE.md#historical-evidence) never override this
policy or `CURRENT_STATE.md`.

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
  store: Hostinger settings for storefront and root-owned VPS configuration for
  ops.
- Use persistent labels, semantic buttons, 44px minimum targets, inert closed
  drawers, focus restoration, and reduced-motion-safe animation.
- Every public release flag remains false unless its owning acceptance evidence
  is recorded.

## Pending outcome

Do not apply `0016` or `0017` to production without the owner migration gate.
Do not treat CI `quality` as `pnpm check`. Capture privacy-safe Core Web Vitals
only after approved catalog content is live. Next production actions live in
[`CURRENT_STATE.md`](CURRENT_STATE.md).
