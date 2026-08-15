# Perfume Aura

Perfume Aura is a pnpm monorepo with two web applications backed by one Neon
PostgreSQL database:

- `perfumeaura.com` — public, release-gated storefront on a Hostinger managed
  Node.js Web App.
- `app.perfumeaura.com` — private owner/staff operations in a hardened container
  on a Hostinger VPS behind Caddy.

Storefront customer auth and operations auth are separate. Public catalog,
checkout, customer auth, inquiries, and indexing remain disabled until their
release gates pass.

## Start here

1. Read [the current state](docs/CURRENT_STATE.md).
2. Use [the documentation index](docs/README.md) for the task-owning runbook.
3. Follow [the repository rules](AGENTS.md) before changing code or production.

## Local setup

Storefront production selects Hostinger-managed Node `24.x`; repository tooling,
CI, ops image, and both packers use the pinned Node 24 compatibility baseline.
Use disposable loopback PostgreSQL for integration tests.

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
  --target ops \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 1200000
```

See [engineering](docs/ENGINEERING.md) for repository structure and tests,
[operations](docs/OPERATIONS.md) for deployment and recovery, and
[design QA](design-qa.md) for the historical storefront acceptance record.
