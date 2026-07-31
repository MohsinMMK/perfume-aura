# Perfume Aura

Monorepo for static marketing at **perfumeaura.com** and owner-only operations at **app.perfumeaura.com**.

## Documentation

| Topic | Document |
|---|---|
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
packages/ui/      shared shadcn components
packages/db/      schema, migrations, workflows, tests
packages/validators/
scripts/          marketing sync and ops pack
docs/             six current documents
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
| Ops target | GitHub Actions prebuilt tree → branch `hostinger-ops-production` → Hostinger Node GitHub App |
| Ops fallback | Manual prebuilt ZIP Path Z until branch webhook proven twice |

Pure Hostinger monorepo source build remains blocked (esbuild EACCES). Production DB migrations are not auto-applied by CI. No public ecommerce storefront yet. Follow [docs/OPERATIONS.md](docs/OPERATIONS.md); never infer production readiness from `/login` alone.

## shadcn

Official CLI only; components install into `packages/ui`:

```bash
pnpm dlx shadcn@latest add <component> -c apps/ops -y
pnpm dlx shadcn@latest preset resolve -c apps/ops
```

Expected preset: `b23PPibQOI`, no fallback.
