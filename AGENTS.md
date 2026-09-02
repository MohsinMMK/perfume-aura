# Perfume Aura agent instructions

## Read order and owners

Read `docs/CURRENT_STATE.md` first. Fresh repository, provider, database, DNS,
endpoint, and browser evidence outranks documentation. Open only the owner
needed for the task:

| Need | Owner |
|---|---|
| Live topology, exact releases, blockers, next actions | `docs/CURRENT_STATE.md` |
| Commerce launch blockers B01–B07 | `docs/BLOCKERS.md` |
| Users, routes, behavior, release locks | `docs/PRODUCT.md` |
| Code, stack, data, tests, CI, performance, telemetry privacy | `docs/ENGINEERING.md` |
| Hostinger, VPS, DNS, Neon, deployment, recovery, staff release | `docs/OPERATIONS.md` |
| Commerce requirements, ADRs, verification, checklist | `docs/COMMERCE.md` |
| Catalog mappings, legal research, design/QA evidence | `docs/REFERENCE.md` |

Update `CURRENT_STATE.md` when production, routing, risk, or next action
changes. Never record secrets, credentials, connection strings, or customer
data there.

## Surface boundaries

| Domain | Role | Entry |
|---|---|---|
| `perfumeaura.com` | Public storefront | `apps/storefront/server.js` (pack-time standalone) |
| `www.perfumeaura.com` | Permanent apex redirect | `apps/storefront/next.config.ts` `redirects()` |
| `app.perfumeaura.com` | Private operations | `apps/ops/server.js` (pack-time standalone) |

`shop.perfumeaura.com`, `www.app.perfumeaura.com`, and the static marketing app
must remain absent. Storefront and ops share Neon; never delete or recreate it
during web work. GoDaddy owns registration; Hostinger nameservers own DNS. Do
not touch unrelated sites, mail, DNS, databases, or processes.

## Invariants

- Inspect existing types/signatures, keep changes minimal, and use strict
  TypeScript without implicit `any`.
- Persist money as server-authoritative integer INR paise. Public catalog data
  excludes cost, raw stock, internal notes, and archives.
- Keep operations and customer auth separate. Disabled `/api/customer-auth/*`
  returns `404` without initializing Better Auth or Neon. Other gated APIs may
  still 404 after a static import; do not “fix” that without review.
- Preserve labels, visible focus, inert closed drawers, focus restoration, 44px
  targets, and reduced-motion behavior.
- Use official App Router, shadcn, Better Auth, Drizzle, Neon, Hostinger, pnpm,
  PostHog, and Sentry paths. Shared UI belongs in `packages/ui`; preset
  `b23PPibQOI` must resolve.
- Keep secrets only in ignored local env files or the owning platform's secret
  store: Hostinger settings for storefront and root-owned VPS configuration for
  ops.
- Runtime writes use pooled `pg` and Drizzle transactions. Direct Neon owner
  connections own migrations/grants; test first on an isolated Neon branch and
  reapply restricted runtime grants after schema changes.
- Integration tests use disposable loopback PostgreSQL only.
- Remove files only after proving they are generated, duplicated, retired, or
  unreachable. Preserve `dist/` recovery artifacts, migrations, ignored secret
  state, provider branches, and agent/session state unless explicit cleanup
  authority and owning evidence permit removal.

## Authorization and release

Read `docs/CURRENT_STATE.md` and `docs/OPERATIONS.md` before any provider,
database, DNS, secret, or release-flag work. Never infer live SHAs, rollback
deadlines, or incident status from this file. Live SHAs come from
`/api/health/version` on both surfaces, not from `git HEAD`.

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target ops --public-surface storefront \
  --public-base https://perfumeaura.com --timeout-ms 1200000
```

Also verify the exact `www` redirect, storefront locks, ops live/ready/version,
unauthenticated session, and a real static asset; `/login` alone is insufficient.

Solo-maintainer review approval is not required, while strict checks,
conversation resolution, linear history, administrator enforcement, and
force-push/deletion denial remain protected.

Publication language is outcome-oriented: when the user asks to `commit and
push`, complete the normal protected flow through commit, push, required checks,
conversation resolution, and merge. For a production-facing runtime change,
continue through its owning deployment automation and exact live acceptance;
Markdown-only changes must remain deployment-free.

Do not infer authority for unrelated recovery or provider actions. Stopping
plan-wide processes, writing DNS, migrating production, changing secrets, or
opening release flags still requires explicit authorization and owning-gate
evidence. Keep storefront commerce and staff security flags closed.

Repo `main` currently contains unapplied migration `0017`. Do not deploy that
commit until the documented owner migration gate passes.

## Finish

Run only relevant final checks; the complete gate is:

```bash
pnpm check
pnpm test:integration
git diff --check
```

Use conventional commits, preserve unrelated work, and report exact verification
commands plus new environment-variable names.
