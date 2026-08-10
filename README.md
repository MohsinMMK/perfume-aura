# Perfume Aura

Perfume Aura is a pnpm monorepo with two Hostinger applications backed by one
Neon PostgreSQL database:

- `perfumeaura.com` — public, release-gated storefront.
- `app.perfumeaura.com` — private owner and staff operations.

Storefront customer auth and operations auth are separate. Public catalog,
checkout, customer auth, inquiries, and indexing remain disabled until their
release gates pass.

## Start here

1. Read [the current state](docs/CURRENT_STATE.md).
2. Use [the documentation index](docs/README.md) for the task-owning runbook.
3. Follow [the repository rules](AGENTS.md) before changing code or production.

## Local setup

Requires Node `24.18.0`, pnpm `11.1.3`, and disposable loopback PostgreSQL for
integration tests.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

Environment templates live in each application. Never commit credentials or
connection strings.

## Commands

```bash
pnpm dev:storefront
pnpm dev:ops
pnpm check
pnpm test:integration
pnpm storefront:pack
pnpm ops:pack
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --public-surface storefront \
  --public-base https://perfumeaura.com
```

See [engineering](docs/ENGINEERING.md) for repository structure and tests and
[operations](docs/OPERATIONS.md) for deployment and recovery.
