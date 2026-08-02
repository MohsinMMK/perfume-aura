# Engineering

## Repository shape

```text
apps/marketing/       static marketing source
apps/ops/             Next.js internal operations app
apps/storefront/      Next.js public ecommerce storefront (release-gated)
packages/ui/          shared shadcn UI package
packages/db/          Drizzle schema, migrations, workflows, tests
packages/validators/  shared validation
scripts/              marketing sync, ops packaging, storefront packaging, verification
```

Root `index.html`, `styles.css`, and `.htaccess` are generated from `apps/marketing`; never hand-edit them.

## Architecture

- Next.js App Router with server-rendered pages and Server Actions.
- Owner session checked server-side before protected reads/mutations.
- Domain workflows live in `packages/db`; UI actions validate input then call workflows.
- PostgreSQL transactions use deterministic lock order and retry policy for retryable conflicts.
- Shared UI primitives live in `packages/ui`; app-specific compositions stay in `apps/ops/components`.
- Ops standalone output uses monorepo layout with entry `apps/ops/server.js`.
- Storefront standalone output uses entry `apps/storefront/server.js` and is
  independently packed/smoked for a separate Hostinger Node Web App.

## Database model

Core tables:

| Area | Tables |
|---|---|
| Auth | `user`, `session`, `account`, `verification`, `rate_limit` |
| Catalog | `products`, `product_variants` |
| Inventory | `locations`, `stock_movements` |
| Sales | `customers`, `invoices`, `invoice_lines`, `payments` |
| Numbering | `document_number_counters` |
| Store publication | `product_publications`, `product_media`, `commerce_collections`, `commerce_collection_products`, `variant_prices`, `commerce_settings` |
| Customer auth | `storefront_user`, `storefront_session`, `storefront_account`, `storefront_verification`, `storefront_rate_limit` |
| Store orders | `commerce_carts`, `commerce_cart_items`, `checkout_sessions`, `stock_reservations`, `commerce_orders`, `commerce_order_items`, `commerce_order_events` |
| Store payments/fulfillment | `payment_attempts`, `payment_events`, `commerce_refunds`, `shipments` |
| Merchandising/support | `promotions`, `promotion_redemptions`, `commerce_bundles`, `commerce_bundle_items`, `commerce_reviews`, `commerce_returns`, `commerce_return_items`, `commerce_inquiries`, `customer_order_claims` |

Key invariants:

- UUID/text keys; integer paisa and quantities.
- Unique product SKU and `(product_id, size_ml)`.
- Unique invoice/payment number and payment idempotency key.
- Unique invoice line position.
- Payment and cost fields validated by final contract.
- Stock movement ledger append-only after `0008`.
- Payment ledger runtime privilege is insert/read only; reversal model is deferred.

## Migration journal

| ID | Purpose |
|---|---|
| `0000` | Baseline auth and inventory |
| `0001` | Customers, invoices, lines |
| `0002` | Payments |
| `0003–0006` | Domain expansion, backfill, uniqueness, indexes |
| `0007` | `rate_limit`, `user.role` default, verification-token lookup index |
| `0008` | Required checks and stock append-only contract |
| `0009` | Fail-closed INR semantic cutover plus storefront/customer-commerce schema; generated, not applied |

`0003–0007` are compatible expansion migrations. `0008` is contract migration and must follow compatible deployment plus reconciliation. Production order lives only in [OPERATIONS.md](./OPERATIONS.md).

### Final contract notes

Migration `0008` contains `CREATE TRIGGER "stock_movements_append_only"`; payment append-only trigger is intentionally absent.

**Intentional payment-trigger deferral:** immutable positive-only payments would have no valid correction path. Payment mutation enforcement stays at restricted runtime grants until a linked reversal/credit-note model and authoritative net-sum semantics exist.

Required invoice checks include:

```sql
"status" = 'void' AND "amount_paid_cents" = 0
"variant_id" IS NOT NULL OR "quantity_fulfilled" = 0
```

Fulfillment reconciliation is **aggregate-only** by `(invoice_id, variant_id)`. Return movements are not netted until linked reversals exist. A draft line with a matching sale movement remains invalid; draft/void fulfillment and free-text fulfillment must stay zero.

## Environment

Never commit values. Use `apps/ops/.env.local` locally and hPanel environment variables in production.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled runtime PostgreSQL URL |
| `DATABASE_URL_DIRECT` | Direct migration/admin URL |
| `TEST_DATABASE_URL` | Disposable loopback integration database |
| `BETTER_AUTH_SECRET` | Auth signing secret |
| `BETTER_AUTH_URL` | Canonical app origin |
| `BUSINESS_TIMEZONE` | Defaults to `Asia/Karachi` |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | Explicit owner seed only |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP transport |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | SMTP credentials/sender |
| `NODE_ENV`, `PORT` | Runtime settings |

Storefront-only hPanel keys are documented in `apps/storefront/.env.example`.
They include isolated customer auth, Google/Apple, customer SMTP, Cashfree, and
three independent release switches. Secrets never use `NEXT_PUBLIC_*`.

Local example:

```bash
cp apps/ops/.env.example apps/ops/.env.local
# Fill local values; never commit file.
```

## Local development

Prerequisites: exact Node from `.nvmrc`, pnpm from `packageManager`, PostgreSQL.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev:ops
pnpm dev:storefront
```

Prepare local database:

```bash
export DATABASE_URL='postgresql://...@127.0.0.1:5432/perfume_aura'
export DATABASE_URL_DIRECT="$DATABASE_URL"
pnpm db:migrate
pnpm --filter @perfume-aura/db seed

DATABASE_URL="$DATABASE_URL" \
BETTER_AUTH_SECRET='local-secret-at-least-32-chars' \
BETTER_AUTH_URL='http://localhost:3000' \
OWNER_EMAIL='owner@example.com' OWNER_PASSWORD='replace-with-12-plus-chars' \
pnpm --filter @perfume-aura/ops seed:owner
```

## Commands

```bash
pnpm dev:ops
pnpm build:ops
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm check
pnpm marketing:sync
pnpm marketing:check
pnpm ops:pack
pnpm storefront:pack
pnpm currency:audit
pnpm ops:verify-deploy-tree self-test
pnpm ops:publish-branch self-test
pnpm ops:verify-production-deploy self-test
```

`pnpm check` runs marketing drift, lint, typechecks, unit tests, optimized build, and production audit. It does not run integration tests.

## Disposable integration database

All three URLs must point to same disposable loopback database. Guard fails closed on missing or non-loopback URLs.

```bash
export TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/perfume_aura_phase06_local'
export DATABASE_URL="$TEST_DATABASE_URL"
export DATABASE_URL_DIRECT="$TEST_DATABASE_URL"
pnpm db:migrate
pnpm test:integration
```

Coverage includes inventory concurrency/idempotency, checkout reservation
normalization and exactly-once settlement contracts, explicit idempotent
order-to-invoice linking at approved paid/COD-reconciled transitions,
invoice/payment/finance
workflows, migration boundaries, constraints, isolated auth, Cashfree money/
signature/status/refund behavior, health, security headers, and lifecycle races.

## CI and release automation

`.github/workflows/ops-pack.yml` uses exact Node `24.18.0`, npm `11.16.0`, pnpm `11.1.3`, PostgreSQL 16, SHA-pinned actions, and least permissions.

- `quality`: repository checks, audits, and deploy-script self-tests.
- `integration`: disposable PostgreSQL tests; missing URL cannot skip.
- `dependency-review`: PR-only; currently blocked if GitHub Dependency Graph is disabled.
- `package`: depends on quality + integration, runs deploy-shaped ZIP smoke.
- Artifact upload: only `main` push or manual `main` run; 14-day retention.
- Workflow concurrency on `main` is non-cancelling: a started release completes; later pushes queue/follow. GitHub may replace older pending runs; newest remaining run still deploys.
- `publish-hostinger-ops`: `main` push only; job-scoped `contents: write`; downloads the exact artifact; re-verifies checksum/manifest; fail-closed ZIP preflight/extract (safe relative pnpm symlinks allowed; absolute/escape/prefix-write rejected); verifies deploy tree (critical paths materialized); publishes orphan branch `hostinger-ops-production` with force-with-lease. Does not CAS against current `main` tip. Rejects deploy-source regression when previous branch `artifact-manifest.json` `source.commit` is not an ancestor of the candidate source commit.
- `verify-hostinger-ops`: runs only when repository variable `HOSTINGER_OPS_AUTO_DEPLOY_ENABLED=true`; polls `/api/health/version` for the exact SHA, then smokes ops/marketing surfaces.

Build identity: Next embeds validated full source SHA as `PERFUME_AURA_BUILD_COMMIT` for `GET /api/health/version` (`{ status, commit }` only).

Production database migrations are **not** applied by this workflow. Schema-changing push-only release remains blocked until separate production migration automation is implemented and proven.

Production Hostinger now watches `hostinger-ops-production`; two consecutive generated-branch deployments were verified 2026-07-31. Green package/publish jobs alone still do not prove a specific release is live: require the enabled `verify-hostinger-ops` exact-SHA poll or an equivalent `/api/health/version` check. Path Z remains emergency rollback/fallback only.

## Auth and security

- Better Auth email/password with Drizzle adapter.
- Sign-up disabled; owner-only authorization enforced server-side.
- Login/reset responses do not reveal account existence.
- Sessions revoked after password change/reset as configured.
- Durable rate limit uses `rate_limit` table.
- Trusted origin must match environment; production is `https://app.perfumeaura.com`.
- Security headers, CSRF/origin checks, safe redirect normalization, and sensitive-log redaction are tested.
- Root `.htaccess` denies monorepo source exposure on marketing deployment.

## Change rules

1. Schema change: migration + Drizzle schema + tests + this file.
2. New env key: `.env.example` + this file + packaging/runtime handling.
3. New route/workflow: [PRODUCT.md](./PRODUCT.md) + tests.
4. Deployment change: [OPERATIONS.md](./OPERATIONS.md).
5. UI primitive: official shadcn CLI; see [STACK.md](./STACK.md).
