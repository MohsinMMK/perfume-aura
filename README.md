# Perfume Aura

Perfume Aura is a pnpm monorepo with two production applications:

- `https://perfumeaura.com` — animated, release-gated public storefront.
- `https://app.perfumeaura.com` — private owner and staff operations.

`www.perfumeaura.com` permanently redirects to the apex. The former
`shop.perfumeaura.com` staging app and the obsolete static marketing source are
deleted. Both applications share Neon PostgreSQL while keeping their auth and
public-data boundaries separate.

## Documentation

| Topic | Document |
|---|---|
| Current production handoff | [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) |
| Product behavior and release locks | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Architecture, data, local work, tests | [docs/ENGINEERING.md](docs/ENGINEERING.md) |
| Hostinger, DNS, Neon, deploy and recovery | [docs/OPERATIONS.md](docs/OPERATIONS.md) |
| Remaining work | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Locked tooling | [docs/STACK.md](docs/STACK.md) |
| Agent rules | [AGENTS.md](AGENTS.md) |

## Layout

```text
apps/storefront/  public Next.js storefront
apps/ops/         internal Next.js operations
packages/ui/      shared shadcn components
packages/db/      Drizzle schema, migrations, workflows, tests
packages/validators/
scripts/          verified packs and deployment verification
docs/             current-state and operating documentation
```

## Quick start

Requires Node `24.18.0`, pnpm `11.1.3`, and disposable local PostgreSQL for
integration tests.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm test:integration
```

Use `apps/ops/.env.example` and `apps/storefront/.env.example` for local
environment setup. Never commit credentials or connection strings.

## Main commands

```bash
pnpm dev:storefront
pnpm dev:ops
pnpm check
pnpm test:unit
pnpm test:integration
pnpm storefront:pack
pnpm ops:pack
pnpm currency:audit
node scripts/verify-production-deploy.mjs <40-character-sha> --public-surface storefront
```

## Production

| Surface | Routine |
|---|---|
| Storefront | Hostinger Node.js Web App at `perfumeaura.com`, using a checksum-verified prebuilt ZIP with entry `apps/storefront/server.js` |
| Ops | GitHub Actions prebuilt tree → `hostinger-ops-production` → Hostinger Node.js Web App at `app.perfumeaura.com` |
| Ops fallback | Verified manual ZIP with entry `apps/ops/server.js` |

Commerce is intentionally closed: no catalog publication, checkout, customer
authentication, inquiries, payments, or indexing is enabled until the separate
catalog, legal, provider, policy, and operations gates pass.
