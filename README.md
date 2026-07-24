# Perfume Aura

Monorepo for **perfumeaura.com** (marketing) and the internal **ops** app (inventory → invoicing → payments → finance).

## Stack (locked)

| Piece | Choice |
|-------|--------|
| Marketing | Static HTML/CSS → Hostinger classic Git |
| Ops | Next.js **16.2.11** App Router → Hostinger Node.js Web App |
| Runtime | Node.js **24.18.0** locally/in CI; Hostinger Node **24.x** |
| UI | shadcn/ui **base-luma** (preset `b23PPibQOI`, Hugeicons) + Tailwind v4 → `packages/ui` |
| Auth | Better Auth |
| DB | Neon Postgres + Drizzle + `pg` |
| Domain ops | `app.perfumeaura.com` (planned) |

**Docs index:** [docs/README.md](docs/README.md)  

Key specs: [PRD](docs/PRD.md) · [TRD](docs/TRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Phase 1 status](docs/PHASE1_STATUS.md) · [Ops deploy](docs/OPS_DEPLOY_CHECKLIST.md) · [Stack lock](docs/stack-research/RECOMMENDATION.md).

## Layout (monorepo ownership)

```text
apps/marketing   # SOURCE OF TRUTH — brand static site (edit here)
apps/ops         # Next.js internal admin
packages/ui      # shadcn shared components
packages/db      # Drizzle schema + migrations
packages/validators
scripts/         # marketing sync + ops pack (see scripts/README.md)
docs/            # PRD / TRD / deploy runbooks

# Path M publish surface (generated — do not hand-edit):
index.html  styles.css  .htaccess   ← pnpm marketing:sync from apps/marketing
```

## Local development

```bash
pnpm install
pnpm dev:ops
# http://localhost:3000

# Marketing preview
npx serve apps/marketing
# or open apps/marketing/index.html
```

Copy `apps/ops/.env.example` → `apps/ops/.env.local` when wiring Neon + auth.

### First-time ops setup (with Neon)

```bash
cp apps/ops/.env.example apps/ops/.env.local
# Set DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
# OWNER_EMAIL, OWNER_PASSWORD

pnpm db:generate          # if migrations not yet generated
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner
pnpm dev:ops
# http://localhost:3000/login → dashboard → products → stock
```

Phase 1 routes: `/login`, `/dashboard`, `/products`, `/products/new`, `/products/[id]`, `/stock`, `/stock/low`.

### Tests

```bash
pnpm check                # marketing + lint + typechecks + unit tests + ops build + production audit
pnpm test:inventory       # every *.test.ts assigned exactly once
pnpm test:unit            # no DB required

# Integration is fail-closed and accepts only a guarded disposable loopback DB.
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/perfume_aura_phase06_local \
DATABASE_URL_DIRECT=postgresql://postgres:postgres@127.0.0.1:5432/perfume_aura_phase06_local \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/perfume_aura_phase06_local \
  pnpm db:migrate
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/perfume_aura_phase06_local \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/perfume_aura_phase06_local \
  pnpm test:integration
```

CI supplies PostgreSQL 16 and runs every integration suite with no missing-URL
skip. Package suites use quoted Node 24 discovery globs; the inventory guard
rejects unassigned, multiply assigned, or unsupported-root `*.test.ts` files.
`pnpm test` means the complete unit plus integration contract and therefore also
requires that guarded database environment.

## Production (Hostinger)

| Site | Method | Domain |
|------|--------|--------|
| Marketing | Classic Git (**Path M**) → `public_html` + root `.htaccess` SEC-7 | perfumeaura.com |
| Ops | **Node.js Web App** — **Path Z** prebuilt zip today (not classic Git) | app.perfumeaura.com |

### Ops Path Z (current)

```bash
pnpm ops:pack
# clean tree → dist/perfume-aura-standalone_<12-character-commit>.zip
# dirty tree → unique <commit>-dirty-<UTC>-<pid> suffix
# hPanel Node Web App: Node 24.x · entry apps/ops/server.js · build echo prebuilt-standalone
# Then Neon migrate + db seed + seed:owner + hPanel env (see docs)
```

**Path B:** GitHub Actions runs package/native/server smoke on pull requests too.
Only `main` push or `main`-targeted manual runs upload the retained ZIP artifact.
Download it and use the same manual hPanel Path Z upload; the workflow never
deploys.

**Path G** (GitHub source build on Node) stays blocked on shared Node (esbuild EACCES) — do not force it.

Full rules: [docs/DEPLOY.md](docs/DEPLOY.md) · [docs/OPS_DEPLOY_CHECKLIST.md](docs/OPS_DEPLOY_CHECKLIST.md) · [AGENTS.md](AGENTS.md).

## Scripts

```bash
pnpm dev:ops
pnpm build:ops
pnpm start:ops
pnpm ops:pack          # Path Z Hostinger zip (materialize + smoke)
pnpm db:generate
pnpm db:migrate
pnpm typecheck
pnpm test:unit
pnpm test:integration   # guarded disposable PostgreSQL required
pnpm security:audit

# Marketing: edit apps/marketing/* then publish root surface for Hostinger Path M
pnpm marketing:sync
pnpm marketing:check   # also runs in GitHub Actions CI
pnpm check             # marketing + lint + typechecks + unit tests + ops build + production audit
```

## Add a shadcn component (official only — when needed)

```bash
# Always via CLI; files land in packages/ui. Only add what you will import/use.
pnpm dlx shadcn@latest add <component> -c apps/ops -y

# Preview destination
pnpm dlx shadcn@latest add <component> -c apps/ops --dry-run -y
```

Do not keep unused registry files as inventory. See **AGENTS.md** → “official tooling only (STRICT)”.
