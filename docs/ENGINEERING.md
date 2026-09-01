# Engineering

- [Repository and boundaries](#repository-layout-and-boundaries)
- [Runtime and tooling](#locked-runtime-and-tooling)
- [Shared UI](#shared-ui-contract)
- [Data, database, and auth](#data-database-and-auth-contracts)
- [Local validation and CI](#local-development-and-validation)
- [Performance engineering](#performance-engineering)
- [Observability code and privacy](#observability-code-and-privacy)
- [Pending outcome](#pending-outcome)

## Repository layout and boundaries

```text
apps/storefront/  public Next.js application
apps/ops/         internal Next.js application
packages/db/      Drizzle schema, SQL migrations, runtime grants, tests
packages/ui/      shadcn/Base UI shared primitives
packages/validators/
scripts/          packages, deployment verification, commerce checks
```

No static marketing application or generated root publish surface remains.

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

## Locked runtime and tooling

Change stack only through an explicit reviewed decision. Production is split
between Hostinger-managed hosting for storefront and a hardened Hostinger VPS
container for ops; Neon remains the shared managed database.

| Area | Choice |
|---|---|
| Workspace | pnpm `10.32.1` monorepo, aligned to the observed Hostinger deployment baseline |
| Runtime | Node `24.x`; repository, CI, and ops image baseline `24.6.0`, engines `>=24.6.0 <25` |
| Ops + storefront | Next.js `16.3.4`, App Router, React `19.2.8`, standard TypeScript `6.0.2` compiler |
| TypeScript compatibility | `typescript@6.0.2` is the shared Next.js/ESLint compiler; `@typescript/native` retains the TypeScript `7.0.2` native CLI compatibility lane |
| UI | shadcn/ui, Base UI, Tailwind CSS 4, Hugeicons |
| Auth | Two isolated Better Auth boundaries: owner ops and storefront customer, each with separate tables, secrets, cookies, origins, and Drizzle adapter |
| Database | Neon PostgreSQL + Drizzle ORM/Kit + `pg` Pool |
| Validation | Zod |
| Analytics | Privacy-filtered PostHog JavaScript SDK; shared project separated by mandatory `application` property |
| Errors and traces | Official Sentry Next.js SDK with separate storefront and ops projects |
| Production | Hostinger Business Web App/HCDN for storefront; Hostinger VPS/Caddy for ops; Neon PostgreSQL shared |
| Ops deploy mechanism | GitHub Actions verified standalone → immutable GHCR image → Tailscale forced SSH → hardened VPS container (`apps/ops/server.js`) |
| Storefront deploy mechanism | Checksum-verified Hostinger Node.js archive with `apps/storefront/server.js`, uploaded and deployed directly by GitHub Actions through the Hostinger API |
| Active deploy and rollback state | [`CURRENT_STATE.md`](CURRENT_STATE.md) owns current provider paths, releases, and rollback eligibility |
| Payments | Cashfree Payment Gateway for prepaid INR UPI (server-created orders, signed raw-body webhooks, server status verification, and refunds); no COD checkout |
| Registrar | GoDaddy; registration/renewal only |

Official tooling only: shadcn CLI, current App Router docs, standard TypeScript
6 with the separate TypeScript 7 native CLI lane, Better Auth, Drizzle, Neon,
Hostinger, PostHog, Sentry, and pnpm. No hand-rolled substitutes. No Vercel
production deployment.

Hostinger Business Web Hosting exposes Node.js by major-version selector. The
supported managed choices currently include `18.x`, `20.x`, `22.x`, and `24.x`;
the storefront selects `24.x`. Hostinger supports pnpm but owns the installed
patch. Storefront deployment logs are therefore the authority for managed
runtime compatibility.

The ops image, CI, and package generation pin Node `24.6.0`; CI also pins npm
`11.5.1` and pnpm `10.32.1`. Application engines accept compatible Node `24.x`
patches from `24.6.0` onward. A future managed-runtime, image, or
package-manager change is not accepted silently: inspect the owning platform
evidence, update the compatibility lane, run the complete gate, and verify the
exact deployed SHA before release.

`pnpm-workspace.yaml` contains reviewed overrides for parent ranges that lag
security or runtime fixes. `patches/minimatch@3.1.5.patch`, created with
`pnpm patch`, adapts minimatch 3 to brace-expansion 5's CommonJS export. The
reviewed security overrides currently pin `postcss@8.5.23`, `nanoid@3.3.18`,
`brace-expansion@5.0.9`, `fast-uri@3.1.5`, `ip-address@10.3.1`,
`undici@7.29.0`, `js-yaml@4.3.1`, and `hono@4.12.34`. Change an override only
with dependency-path evidence, then verify the audit, lint, shadcn preset
resolution, migrations, both builds, and both packages. Remove overrides when
upstream ranges make them unnecessary.

## Shared UI contract

- Base UI package: `packages/ui` (`@perfume-aura/ui`).
- App composition: `apps/ops/components/` and `apps/storefront/components/`
  import `@perfume-aura/ui/components/*`.
- Preset: `b23PPibQOI` — luma, taupe, Hugeicons, IBM Plex Sans + Raleway, small radius.
- Tokens: `packages/ui/src/globals.css` only.
- `apps/ops/components.json` must point `tailwind.css` to `../../packages/ui/src/globals.css`.
- Add only used components through CLI:

```bash
pnpm dlx shadcn@latest preset resolve -c apps/ops
pnpm dlx shadcn@latest add button -c apps/ops -y
pnpm dlx shadcn@latest add button -c apps/ops --dry-run
pnpm dlx shadcn@latest preset resolve -c apps/storefront
```

Preset resolve must return `b23PPibQOI` without fallback. Never copy registry
components manually as primary install path or place base UI under
`apps/ops/components/ui`.

Skills live under `.agents/skills/` and are locked by `skills-lock.json`:
shadcn, Better Auth, Neon, and Vercel React/composition patterns only. Never
use Vercel deploy skills. Restore with `pnpm dlx skills experimental_install`.

## Data, database, and auth contracts

- Runtime transactional work: pooled Neon URL through `pg` Pool.
- Migrations and administrative SQL: direct Neon URL.
- Tests: disposable loopback PostgreSQL only.
- Ledger writes require interactive transactions; do not switch to `neon-http`.
- Runtime role owns no schema, DDL, role membership, or sequence privilege.
- Money persists as integer INR paise; no browser float is authoritative.
- Inventory, invoice/payment, and commerce reservation/order lifecycles are
  transactionally locked and idempotent where a client or provider may retry.
- The Admin/2FA schema uses immutable invitation/audit tables and a database
  owner invariant: a blank database may have zero owners until seeded, then it
  permits one owner only and prevents removal/demotion of the final owner.

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

Legacy COD enum values and reconciliation columns remain in the database for
migration compatibility only. Active storefront and ops flows must not create,
advertise, or expose COD controls; a later schema-removal migration requires
separate production-data proof and authorization.

Storefront checkout accepts only a stable request UUID and validated Indian
delivery fields. The verified customer ID/email come from the server session;
request/payload digests make exact retries reusable and conflicting reuse
fail closed. Cashfree order expiry is 15 minutes, the dashboard transaction TTL
must be exactly 20 minutes, and stock release waits a further 5-minute safety
allowance before a server provider-state check.

Migration `0012_amused_cloak` adds one-shot customer reconciliation leases,
per-record payment/refund retry state, unique provider-payment binding,
evidence references for catalog/price/media approval, fixed 3–7-day PIN-code
serviceability, and separate order/inquiry notification outboxes. Maintenance
returns aggregate processed/succeeded/retried/mismatched/failed counts; one
provider failure cannot starve the remainder of its batch.

Customer review and return writes are server-authoritative. Review eligibility
requires the verified session to own a delivered, fully fulfilled order item;
the database uniqueness boundary permits one pending moderation record per
item. Return creation locks the owned delivered order, requires a non-null
delivered shipment timestamp inside seven calendar days, creates one complete
order request and item set transactionally, and rejects concurrent duplicates.
Staff review/return transitions use capability checks, expected-state guards,
row locks, and audit events. A return cannot become `refunded` until the linked
order payment state is already fully refunded.

Browser mutations for cart, checkout, delivery profile, order claim, review,
and return require the exact storefront `Origin`; a cross-site Fetch Metadata
value is rejected. Disabled customer-auth routes return `404` before importing
Better Auth or querying Neon.

Checkout compares the complete stored cart set with the complete eligible join
inside the locked cart transaction. Any missing, duplicated, unpublished,
unapproved, unstocked, or changed line produces `409 CART_CHANGED`, removes only
the invalid line, and creates no checkout, reservation, payment, or order.

- Owner/staff public sign-up disabled. Customer sign-up is a distinct
  verified-email flow and defaults off until
  `STOREFRONT_CUSTOMER_AUTH_ENABLED=true` plus all secret, SMTP, and
  callback-domain gates are proven.
- Owner seeded explicitly.
- Password length: 12–256 characters.
- Ops roles are exact `owner`, `staff`, or `user`; roles and capability checks
  fail closed. The official Admin + 2FA plugins use TOTP, encrypted recovery
  codes, a 30-day trusted-device window, and feature flags that default off.
- Generic reset responses prevent account enumeration.
- SMTP reset tokens, sessions, trusted origins, and rate limits follow Better
  Auth official guidance.
- Hostinger proxy/IP header trust stays disabled/unassumed until the provider
  chain is proven non-forgeable through the production gate in
  [`OPERATIONS.md`](OPERATIONS.md).
- Never expose `BETTER_AUTH_SECRET`, owner credentials, SMTP password, or
  database URLs.

### Database package workflow

`packages/db` owns Drizzle schema, migrations, the pooled `pg` client, and the
ledger-first inventory API. `drizzle.config.ts` requires
`DATABASE_URL_DIRECT` and fails closed when it is absent; runtime code uses only
`DATABASE_URL` through the pooled client.

| Domain | Main records |
|---|---|
| Better Auth | `user`, `session`, `account`, `verification`, `rate_limit`, `two_factor` |
| Staff security | append-only `staff_invitation_events`, `ops_audit_events` |
| Catalog and inventory | `products`, `product_variants`, approval-gated publications/prices/media, `shipping_serviceability`, `locations`, append-only `stock_movements`, concentrate `oil_lots` / append-only `oil_movements`, offline `ops_sales` |
| Storefront commerce delivery | payment/refund reconciliation state, typed order events, review moderation, return lifecycle, separate order/inquiry notification outboxes |
| Finance | invoices, payments, atomic `document_number_counters` |

```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
```

Migration and inventory rules:

1. `applyMovement()` owns non-commerce receive, return, sale, damage, and
   adjustment movements. Commerce checkout uses the separate atomic
   `reserveCheckoutStock`, `releaseCheckoutReservations`,
   `consumeCheckoutReservations`, and `expireAbandonedCheckouts` path; direct
   callers may not bypass either contract.
2. Ledger insertion and cached balance updates commit together. Stock never
   goes negative; sales also respect `available = on_hand - qty_reserved`.
   Exact idempotency-key retries return the prior result without applying twice.
   Finished-bottle sales also consume concentrate from `oil_lots` at 50%
   of bottle millilitres, treating one 1 kg lot as 1000 ml. Non-whole results ceil so Signature 105 ml consumes 53 ml. Insufficient oil
   fails the same transaction. `0014_oil_lots` owns that ledger. Migration
   `0016_even_silk_fever` adds optional supplier, purchase reference, total
   INR-paise cost, and received-date provenance to each oil lot without
   changing FIFO consumption. The storefront runtime receives only the
   column-level oil-lot grants required for FIFO settlement; it cannot select
   procurement provenance, costs, or internal notes.
3. Manual receive/adjust requires active product and variant. Fulfillment of an
   already-issued invoice is the deliberate archived-SKU exception. An
   owner-authorized local invoice-line return writes an idempotent positive
   finished-stock movement against the fulfilled line, never restores consumed
   oil, and never implies that a provider or accounting refund occurred.
4. Migration `0008_phase03_contract` owns validated financial/inventory checks;
   `0010_curved_puma` owns Admin/2FA roles, final-owner protection, and immutable
   staff records. `0013_silly_vanisher` gives Better Auth 1.7 operations
   accounts a non-null issuer, rewrites credential identities to the stable
   user ID, rejects unmapped providers, and enforces issuer/account uniqueness.
   Production migration order and grant reapplication belong in
   [`OPERATIONS.md`](OPERATIONS.md#migrations-and-runtime-grants).
5. Migration tests require lowercase loopback database names matching
   `perfume_aura_phaseNN_<purpose>` and never load application env files.

Applications import schema, helpers, and Drizzle operators through
`@perfume-aura/db` only so pnpm resolves one `drizzle-orm` instance. Extend
`packages/db/src/index.ts` when a query needs another exported operator.

## Local development and validation

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
PERFUME_AURA_TEST_DB_URL='<migrated-disposable-loopback-url>'
TEST_DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL="$PERFUME_AURA_TEST_DB_URL" \
  DATABASE_URL_DIRECT="$PERFUME_AURA_TEST_DB_URL" \
  pnpm test:integration
pnpm build:storefront
pnpm build:ops
pnpm storefront:pack
pnpm ops:pack
node scripts/verify-production-deploy.mjs self-test
git diff --check
```

`pnpm check` runs deployment self-tests, commerce verification, lint,
typecheck, unit tests, both production builds, both route client-JavaScript
budget checks, and the full workspace dependency audit. The audit fails on any
known severity and also checks the separate ops runtime lock. Run integration
tests separately with explicitly supplied disposable database URLs.

## Search discovery

`apps/storefront/lib/seo.ts` owns the canonical site identity, discovery
sitemap entries, private crawler paths, and JSON-LD serialization. Keep the
release-locked sitemap limited to `/`, `/fragrance-guide`, `/about`, `/faq`,
`/guides/perfume-for-hyderabad-weather`, `/guides/fragrance-families`, and
`/guides/perfume-for-occasions`; published product and collection URLs enter it
only through the existing public-catalog gate. Placeholder, preview, account,
transactional, search, and incomplete-policy pages must remain `noindex`.

`apps/storefront/lib/editorial-guides.ts` owns the typed initial guide registry.
`apps/storefront/lib/public-business.ts` defines the complete owner-verified
NAP, geo, hours, images, and official-profile contract. Do not instantiate or
publish its Store schema or location route until every required fact is
confirmed.

The sitemap route is explicitly request-time dynamic. Public mode never falls
back to workbook/listing products or collections: an empty approved projection
means no `/shop` or catalog sitemap URLs, and missing or empty collections
resolve to `404`. Catalog-import dry runs emit a deterministic
`approvedPublicUrlManifest` beside the signed digest. The production verifier
supports `discovery` and `public-catalog` SEO modes; public-catalog mode requires
that reviewed manifest and crawls every sitemap URL.

The homepage publishes one Organization/WebSite/WebPage graph. `/about` publishes
AboutPage data and `/faq` publishes FAQPage data only from the same visible,
reviewed answers. The fragrance guides publish visible Article and
BreadcrumbList data that matches their rendered content. Discovery sitemap
entries include `lastmod`. Published product pages may emit Product and
BreadcrumbList data, but must not emit Offer until online checkout is genuinely
available. Do not invent AggregateRating, address, contact, hours, or extra FAQ
facts, and do not create scaled keyword pages. Root social
metadata uses the verified bottle still life; self-hosted fonts are preloaded
through `next/font/local` with adjusted fallbacks to protect layout stability.

Ops local bootstrap uses `apps/ops/.env.local` copied from `.env.example`.
Export command-required values explicitly rather than sourcing the file, then
run migrations, seed `MAIN`, seed the owner, and start ops:

```bash
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner
pnpm dev:ops
```

Public sign-up remains disabled. Owner seeding is atomic and idempotent: it
repairs partial owner/credential state without replacing an existing password.
Normal recovery uses `/forgot-password`; destructive recovery commands are
owned by [`OPERATIONS.md`](OPERATIONS.md#owner-recovery-and-break-glass).

## CI, packaging, and impact classification

`.github/workflows/ops-pack.yml` validates both production builds and both
clean standalone artifacts. Runtime-affecting `main` changes publish only the
surfaces selected by the fail-closed impact classifier. Ops is built as an
immutable GHCR image from the verified package and deployed through Tailscale
forced SSH to the VPS. Storefront publication uploads the same verified ZIP
through the Hostinger API, applies the reviewed Node.js settings, polls the
exact provider build, and then verifies the public release. Provider
connectivity, active release path, and live-verification eligibility belong only in
[`CURRENT_STATE.md`](CURRENT_STATE.md).

Markdown-only main changes still run CI and packaging but do not publish or
deploy either surface. Database migration or runtime-grant changes block the
automatic ops deployment until the manual migration gate is satisfied. Missing
or unclassifiable change evidence rebuilds both surfaces so uncertainty cannot
silently suppress verification. CodeQL scans JavaScript and TypeScript on pull
requests, main pushes, and the weekly schedule.

| Script | Command | Contract |
|---|---|---|
| `pack-storefront-standalone.sh` | `pnpm storefront:pack` | Build, extract-smoke, checksum, and manifest storefront ZIP |
| `pack-ops-standalone.sh` | `pnpm ops:pack` | Build, extract-smoke, checksum, and manifest ops runtime |
| `deploy-hostinger-storefront-archive.mjs` | `pnpm storefront:deploy-archive` | Re-verify, upload, configure, deploy, and poll the exact storefront ZIP without a generated Git branch |
| `verify-production-deploy.mjs` | `pnpm ops:verify-production-deploy` | Verify exact SHA, runtime surfaces, and storefront locks |
| `verify-commerce-foundation.mjs` | `pnpm commerce:verify`, `pnpm commerce:verify:self-test` | Check catalog/document invariants and negative mutations |

Packers require Node `24.6.0`, npm `11.5.1`, and pnpm `10.32.1`; reject
secret-shaped files; verify Linux x64 Sharp inputs; start extracted servers;
and publish checksum sidecars only after smoke passes.

The production verifier always checks the apex storefront plus ops exact SHA,
health, auth-session response, and static assets:

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target ops \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 1200000
```

## Performance engineering

Performance work is measurement-led. Preserve authentication, authorization,
money, database, release-lock, accessibility, and deployment contracts. Do not
deploy while `CURRENT_STATE.md` contains an active deployment blocker.

Current repository baseline, not a field-performance claim:

- Next.js `16.3.4`, React `19.2.8`, App Router, and standalone output.
- Fonts are self-hosted with `next/font`.
- Storefront skips locked-cart hydration, limits low-intent prefetch, and
  defers disabled customer-auth code.
- Ops keeps dashboard-only tooltip/toast providers out of auth routes.
- Both applications make reduced-motion transitions effectively immediate.
- Client JavaScript budgets run after each production build. `pnpm check`
  enforces both `storefront:verify-client-budget` and
  `ops:verify-client-budget` on `main`.

Do not repeat broad optimization without a measured regression or
representative new release data. Use the same source SHA, Node/pnpm versions,
build mode, fixture, route, viewport, and throttling before and after a change.

```bash
pnpm build:storefront
pnpm storefront:measure-client
pnpm storefront:pack
pnpm build:ops
pnpm ops:measure-client
pnpm ops:pack
```

For browser journeys, record LCP, INP, and CLS; transferred JavaScript and
CSS; request waterfalls and long tasks; interaction commit time or dropped
frames when relevant; and functional, accessibility, and reduced-motion
results. Field targets at the 75th percentile are LCP ≤ 2.5 seconds,
INP ≤ 200 ms, and CLS ≤ 0.1. Lab TBT is only a proxy for INP.

Change order:

1. Trace route modules before changing imports or Client Component boundaries.
2. Remove duplicate or unnecessary work without weakening capability or data
   boundaries.
3. Fix proven slow interactions before adding memoization or concurrency APIs.
4. Animate only `transform` and `opacity` where behavior remains equivalent;
   preserve reduced motion.
5. Change fonts, icons, dependencies, or experimental Next.js options only
   through the reviewed stack process.

Generated analyzers, traces, and screenshots stay untracked. Compact dated
attestations live in
[`REFERENCE.md`](REFERENCE.md#historical-evidence). They never override this
policy or `CURRENT_STATE.md`.

For an implemented optimization, record:

```text
source SHA; route/journey; bottleneck; before; change; after;
functional checks; accessibility checks; security checks; commands; decision
```

## Pending outcome

Capture privacy-safe Core Web Vitals and repeat
desktop/mobile performance checks after representative approved catalog
content is live. Optimize from measured bottlenecks only.

Official references:

- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Next.js package bundling](https://nextjs.org/docs/app/guides/package-bundling)
- [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [Next.js prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [React Profiler](https://react.dev/reference/react/Profiler)
- [Web Vitals](https://web.dev/articles/vitals)
- [Reduced motion](https://web.dev/articles/prefers-reduced-motion)
- [Knip workspaces](https://knip.dev/features/monorepos-and-workspaces)

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
`action`; referral values are reduced to their origin domain. Broad DOM autocapture,
surveys, experiments, feature flags, exception capture, and session replay
remain disabled. Sentry captures unhandled failures, sampled traces, and typed
structured logs. Console capture is intentionally not enabled.

Privacy sanitizers remove direct-identifier property keys, request bodies,
headers, cookies, query strings, fragments, and opaque URL tokens before an
event can leave either app. Authenticated identification uses only the stable
internal user ID. Operations logout and customer logout reset provider
identity. Tests for those filters run in each application's unit suite. Do not
add console capture, DOM autocapture, session replay, or customer/staff email
identification without a separate privacy review.

Provider names, environment placement, source-map CI settings, and activation
procedure belong in [`OPERATIONS.md`](OPERATIONS.md#observability-configuration-and-activation).

## Quality and accessibility

- Use the official shadcn CLI; shared primitives belong in `packages/ui`.
- Keep secrets only in ignored local env files or the owning platform's secret
  store: Hostinger settings for storefront and root-owned VPS configuration for
  ops.
- Use persistent labels, semantic buttons, 44px minimum targets, inert closed
  drawers, focus restoration, and reduced-motion-safe animation.
- Every public release flag remains false unless its owning acceptance evidence
  is recorded.
