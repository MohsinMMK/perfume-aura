# Perfume Aura agent instructions

## Read first

Always read `docs/CURRENT_STATE.md`, then the one task-owning document:

- `docs/PRODUCT.md` — behavior and release locks;
- `docs/ENGINEERING.md` — code, data, local work, tests;
- `docs/OPERATIONS.md` — Hostinger, DNS, Neon, deploy, recovery;
- `docs/ROADMAP.md` — remaining work;
- `docs/STACK.md` — locked tooling;
- `docs/OPTIMIZATION.md` — performance measurement.

Fresh live evidence outranks documentation. Update `CURRENT_STATE.md` when a
production state, deployment route, active risk, or next action changes. Never
record secrets there.

## Boundaries

| Domain | Role | Entry |
|---|---|---|
| `perfumeaura.com` | Public storefront | `apps/storefront/server.js` |
| `www.perfumeaura.com` | Permanent apex redirect | Storefront middleware |
| `app.perfumeaura.com` | Private operations | `apps/ops/server.js` |

`shop.perfumeaura.com` and the static marketing app are deleted. Storefront and
ops share Neon; never delete Neon during a web deployment. GoDaddy owns the
registration, while Hostinger nameservers own DNS. Do not modify unrelated
sites, mail, DNS records, databases, or processes.

## Implementation rules

- Inspect existing types and signatures before editing.
- Use strict TypeScript; no implicit `any`.
- Keep money server-authoritative and persisted as integer INR paise.
- Keep operations auth and customer auth fully separate.
- Disabled customer-auth routes return `404` without initializing Better Auth
  or Neon.
- Public catalog data excludes cost, raw stock, internal notes, and archives.
- Preserve labels, visible focus, inert closed drawers, focus restoration,
  44px targets, and reduced-motion behavior.
- Use official shadcn CLI/App Router/Better Auth/Drizzle/Neon/Hostinger/pnpm
  paths. Shared UI belongs in `packages/ui`; preset `b23PPibQOI` must resolve.
- Store secrets only in ignored local env files or Hostinger settings.

## Database

- Runtime writes use pooled `pg` and Drizzle interactive transactions.
- Migrations and grants use the direct Neon owner connection.
- Test migrations on an isolated Neon branch before production.
- Reapply and verify restricted runtime grants after schema changes.
- Integration tests use disposable loopback PostgreSQL only.

## Deployment gates

Storefront uses a verified prebuilt ZIP with entry
`apps/storefront/server.js`. Ops routine deployment is:

```text
main → CI package → hostinger-ops-production → Hostinger Node Web App
```

The ops ZIP is emergency fallback only. Never set a fixed `PORT`.

Production verification:

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 180000
```

Also verify the exact `www` redirect, storefront locks, ops live/ready/version,
unauthenticated session, and a real static asset. `/login` alone is not proof.

Hostinger has a recurrent shared NPROC risk. Capture evidence before provider
actions. Plan-wide process stop, deploy/redeploy, DNS writes, production
migrations, and flag changes require explicit authorization.

## Completion

Run the relevant checks:

```bash
pnpm check
pnpm test:integration
git diff --check
```

Use conventional commits. Keep scope minimal, preserve unrelated work, and
report exact verification commands and new environment-variable names.
