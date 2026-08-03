# Perfume Aura agent instructions

## Mandatory bootstrap

Read `docs/CURRENT_STATE.md` before acting. Then read the task-owning document:

- `docs/PRODUCT.md` — user behavior and release locks
- `docs/ENGINEERING.md` — code, data, local work, tests
- `docs/OPERATIONS.md` — Hostinger, DNS, Neon, deployment, recovery
- `docs/ROADMAP.md` — remaining work
- `docs/STACK.md` — locked tooling
- `docs/OPTIMIZATION.md` — ops/storefront performance plan, measurement protocol, and official references

Fresh provider, repository, and database evidence outranks dated notes. Update
`CURRENT_STATE.md` in the same change when a production state, deployment route,
active risk, or next action changes. Never record secrets there.

## Topology and ownership

| Domain | Role | Hostinger product |
|---|---|---|
| `perfumeaura.com` | Animated public storefront | Node.js Web App, `apps/storefront/server.js` |
| `www.perfumeaura.com` | Permanent apex redirect | Storefront middleware |
| `app.perfumeaura.com` | Private owner/staff operations | Node.js Web App, `apps/ops/server.js` |

`shop.perfumeaura.com` and the static marketing application are deleted. Do not
recreate either without an explicit decision. Storefront and ops share Neon;
never delete Neon as part of a web deployment.

GoDaddy owns domain registration. Hostinger nameservers manage DNS. Do not edit
GoDaddy DNS while Hostinger nameservers are authoritative. Do not modify
unrelated Hostinger websites, mailboxes, DNS records, or databases.

## Official tooling only

| Area | Required method |
|---|---|
| shadcn/ui | Official CLI only; shared primitives in `packages/ui` |
| Next.js | Official App Router patterns |
| Better Auth | Official Next.js + Drizzle integrations and plugins |
| Drizzle and Neon | Official schema, migration, pooling, and grants paths |
| Hostinger | Official Node.js Web App deployment/custom-domain workflow |
| pnpm | Root workspaces and `workspace:*` dependencies |

Do not hand-copy shadcn primitives. `apps/ops/components.json` and
`apps/storefront/components.json` must resolve shared UI from
`@perfume-aura/ui`. The locked preset is `b23PPibQOI`; resolve it without a
fallback before altering UI primitives.

## Code and security

- Inspect existing types and code before adding functions.
- Use strict TypeScript. No implicit `any`, hardcoded secrets, browser-owned
  money totals, or floating-point persisted money.
- Store secrets only in ignored local env files or Hostinger settings.
- Keep storefront customer auth independent from operations auth: tables,
  secrets, cookies, trusted origins, and recovery flows are separate.
- When customer auth is disabled, `/api/customer-auth/*` must return `404`
  without initializing Better Auth or Neon.
- Public catalog projection excludes costs, raw stock, internal notes, and
  archived records. All commerce flags stay false unless their acceptance gate
  is explicitly proven.
- Preserve accessible controls, focus restoration, inert closed drawers,
  persistent labels, 44px targets, and reduced-motion behavior.

## Database and migrations

- Use pooled `pg` + Drizzle interactive transactions for runtime writes.
- Use the direct Neon owner connection for migrations and runtime grants.
- Test migrations on an isolated Neon branch before production application.
- Reapply and verify restricted runtime grants after schema changes.
- Use disposable loopback PostgreSQL for integration tests; never point tests at
  production.

## Deployment

### Storefront

```bash
pnpm storefront:pack
```

Deploy the clean verified ZIP to `perfumeaura.com` with Node 24.x, Framework
Other, root `./`, no build/output, and entry `apps/storefront/server.js`.
Configure secrets only in Hostinger. Set `STOREFRONT_URL` and
`CUSTOMER_AUTH_URL` to `https://perfumeaura.com`.

### Operations

Routine deployment is:

```text
main → CI verified package → hostinger-ops-production → Hostinger Node Web App
```

The ops ZIP is emergency fallback only. Do not use the blocked monorepo source
build. Do not set a fixed `PORT`.

### Production verification

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 180000
```

Also verify `www` returns a path-preserving `308`, storefront release locks,
and ops live/ready/version/auth/static endpoints. Do not claim readiness from
`/login` alone.

## Hostinger incident control

The hosting plan has a recurrent shared NPROC risk. Capture plan resources and
endpoint evidence before provider actions. The hPanel process-stop control is
plan-wide; use it only after explicit authorization and re-smoke both apps
immediately afterward.

## Pending work

Treat `docs/CURRENT_STATE.md` and `docs/ROADMAP.md` as source of truth. Ordered
next work as of **2026-08-03 IST**:

1. Obtain scoped Hostinger repair for the intermittent ops HCDN `503`/NPROC
   incident. Identify process owner and restart cause before any deployment or
   plan-wide process action.
2. Complete staff-operations release gate: test `0010_curved_puma` on an
   isolated Neon branch, apply it and restricted runtime grants in production,
   deploy with both security flags false, then prove health, SMTP, owner TOTP,
   recovery-code, invitation, and staff-denial gates in order.
3. Keep storefront commerce closed until catalog/legal/media/price/stock,
   shipping/tax/policy/support, Cashfree, SMTP/customer-auth, and authorized
   prepaid/COD lifecycle approvals all pass.
4. After hosting repair, collect privacy-safe production Core Web Vitals and
   repeat storefront performance checks with an approved release-enabled
   catalog/cart/checkout fixture.

Ops optimization commit `46ad43a…` and storefront optimization commit
`3dbbad6…` are pushed and CI-verified. Do not repeat broad optimization or
cleanup without a measured regression or new representative release data.
Neither optimization authorizes production deployment or opens a release flag.

## Quality and handoff

Run the relevant checks before completion:

```bash
pnpm check
pnpm test:integration
git diff --check
```

Use conventional commits. Keep changes scoped, preserve unrelated work, and
state exact verification commands and any newly required environment variable
names in the handoff.
