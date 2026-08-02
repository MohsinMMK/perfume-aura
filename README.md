# Perfume Aura

Monorepo for static marketing at **perfumeaura.com**, owner-only operations at
**app.perfumeaura.com**, and the release-gated ecommerce storefront targeted at
**shop.perfumeaura.com**.

## Documentation

| Topic | Document |
|---|---|
| Mandatory current-state handoff | [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) |
| Index and current status | [docs/README.md](docs/README.md) |
| Product behavior | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Architecture, data, auth, development, tests | [docs/ENGINEERING.md](docs/ENGINEERING.md) |
| DNS, Hostinger, Neon, deploy/recovery | [docs/OPERATIONS.md](docs/OPERATIONS.md) |
| Remaining work | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Locked stack/tooling | [docs/STACK.md](docs/STACK.md) |
| Agent constraints | [AGENTS.md](AGENTS.md) |

## Layout

```text
apps/marketing/   static marketing source of truth
apps/ops/         Next.js internal operations
apps/storefront/  Next.js public ecommerce storefront (not deployed)
packages/ui/      shared shadcn components
packages/db/      schema, migrations, workflows, tests
packages/validators/
scripts/          marketing sync, ops/storefront packs, verification
docs/             current state and detailed project/runbook documents
```

Root `index.html`, `styles.css`, and `.htaccess` are generated from `apps/marketing` by `pnpm marketing:sync`; do not hand-edit them.

## Quick start

Requires Node `24.18.0`, pnpm `11.1.3`, and PostgreSQL.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp apps/ops/.env.example apps/ops/.env.local
# Fill .env.local for Next, then export command-required values explicitly.
export DATABASE_URL='postgresql://...@127.0.0.1:5432/perfume_aura'
export DATABASE_URL_DIRECT="$DATABASE_URL"
export BETTER_AUTH_SECRET='local-secret-at-least-32-chars'
export BETTER_AUTH_URL='http://localhost:3000'
export OWNER_EMAIL='owner@example.com'
export OWNER_PASSWORD='replace-with-12-plus-chars'
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner
pnpm dev:ops
pnpm dev:storefront
```

Open <http://localhost:3000/login>.

## Main commands

```bash
pnpm dev:ops
pnpm build:ops
pnpm check
pnpm test:unit
pnpm test:integration   # guarded disposable loopback PostgreSQL required
pnpm marketing:sync
pnpm marketing:check
pnpm ops:pack           # verified standalone ZIP / deploy tree source
pnpm storefront:pack    # verified storefront standalone ZIP
pnpm currency:audit     # read-only INR migration report; requires DB
pnpm ops:verify-deploy-tree self-test
pnpm ops:publish-branch self-test
pnpm ops:verify-production-deploy self-test
```

Integration database:

```bash
export TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/perfume_aura_phase06_local'
export DATABASE_URL="$TEST_DATABASE_URL"
export DATABASE_URL_DIRECT="$TEST_DATABASE_URL"
pnpm db:migrate
pnpm test:integration
```

## Production summary

| Site | Supported deployment |
|---|---|
| Marketing | Hostinger classic Git Path M (`main`) |
| Ops routine | GitHub Actions prebuilt tree → branch `hostinger-ops-production` → Hostinger Node GitHub App; recovered from plan-wide NPROC exhaustion and exact-SHA verified 2026-08-01 |
| Ops emergency fallback | Manual prebuilt ZIP Path Z |
| Storefront staging | Separate Hostinger Node Web App + verified prebuilt ZIP; not created/deployed yet |

Pure Hostinger monorepo source build remains blocked (esbuild EACCES).
Production DB migrations are not auto-applied by CI. Storefront code and
migration `0009` exist locally, but catalog, currency, legal, policy, provider,
DNS, and release gates remain closed. Follow
[docs/OPERATIONS.md](docs/OPERATIONS.md); never infer production readiness from
`/login` alone.

## shadcn

Official CLI only; components install into `packages/ui`:

```bash
pnpm dlx shadcn@latest add <component> -c apps/ops -y
pnpm dlx shadcn@latest preset resolve -c apps/ops
pnpm dlx shadcn@latest preset resolve -c apps/storefront
```

Expected preset: `b23PPibQOI`, no fallback.
