# Perfume Aura agent instructions

## Read and scope

Read `docs/CURRENT_STATE.md`, then only the task owner: `PRODUCT.md` (behavior
and locks), `ENGINEERING.md` (code/data/tests), `OPERATIONS.md` (Hostinger/DNS/
Neon/recovery), `ROADMAP.md` (pending work), or the relevant `STACK.md`,
`OPTIMIZATION.md`, or `OBSERVABILITY.md`. Fresh live evidence outranks docs;
update `CURRENT_STATE.md` when production, routing, risk, or next action changes.
Never record secrets, credentials, connection strings, or customer data there.

| Domain | Role | Entry |
|---|---|---|
| `perfumeaura.com` | Public storefront | `apps/storefront/server.js` |
| `www.perfumeaura.com` | Permanent apex redirect | Storefront middleware |
| `app.perfumeaura.com` | Private operations | `apps/ops/server.js` |

`shop.perfumeaura.com`, `www.app.perfumeaura.com`, and the static marketing app
must remain absent. Storefront and ops share Neon; never delete or recreate it
during web work. GoDaddy owns registration; Hostinger nameservers own DNS. Do
not touch unrelated sites, mail, DNS, databases, or processes.

## Invariants

- Inspect existing types/signatures, keep changes minimal, and use strict
  TypeScript without implicit `any`.
- Persist money as server-authoritative integer INR paise. Public catalog data
  excludes cost, raw stock, internal notes, and archives.
- Keep operations and customer auth separate. Disabled customer-auth routes
  return `404` without initializing Better Auth or Neon.
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

## Release gates

Storefront currently uses a verified prebuilt ZIP at
`apps/storefront/server.js`; `hostinger-storefront-production` is prepared but
is not connected to the live Hostinger app. Routine ops flow is
`main -> CI -> immutable GHCR image -> Tailscale forced SSH -> VPS Caddy`.
The ops ZIP is a recovery artifact and `hostinger-ops-production` is frozen
rollback state, not an active deployment target. Never set a fixed Hostinger
`PORT`; the VPS container owns its internal port through Compose.

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target ops --public-surface storefront \
  --public-base https://perfumeaura.com --timeout-ms 1200000
```

Also verify the exact `www` redirect, storefront locks, ops live/ready/version,
unauthenticated session, and a real static asset; `/login` alone is insufficient.

Current blockers:

- **Hostinger:** the shared plan previously reached its 120-process limit and
  still lacks scoped attribution, supervisor/HCDN root cause, a case ID, or
  durable-repair proof. Public ops no longer uses that plan; the unresolved
  incident remains relevant to the managed storefront and any frozen rollback
  app only. Current health is not incident closure.

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

## Finish

Run only relevant final checks; the complete gate is:

```bash
pnpm check
pnpm test:integration
git diff --check
```

Use conventional commits, preserve unrelated work, and report exact verification
commands plus new environment-variable names.
