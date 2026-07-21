# Perfume Aura

Monorepo for **perfumeaura.com** (marketing) and the internal **ops** app (inventory → invoicing → payments → finance).

## Stack (locked)

| Piece | Choice |
|-------|--------|
| Marketing | Static HTML/CSS → Hostinger classic Git |
| Ops | Next.js 16 App Router → Hostinger Node.js Web App |
| UI | shadcn/ui **base-luma** (preset `b23PPibQOI`, Hugeicons) + Tailwind v4 → `packages/ui` |
| Auth | Better Auth |
| DB | Neon Postgres + Drizzle + `pg` |
| Domain ops | `app.perfumeaura.com` (planned) |

**Docs index:** [docs/README.md](docs/README.md)  

Key specs: [PRD](docs/PRD.md) · [TRD](docs/TRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Phase 1 status](docs/PHASE1_STATUS.md) · [Ops deploy](docs/OPS_DEPLOY_CHECKLIST.md) · [Stack lock](docs/stack-research/RECOMMENDATION.md).

## Layout

```text
apps/marketing   # public coming soon (also mirrored at repo root for Hostinger)
apps/ops         # Next.js internal admin
packages/ui      # shadcn shared components
packages/db      # Drizzle schema + migrations
packages/validators
docs/
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
pnpm test                 # unit (qty math, money) + Neon integration (if DATABASE_URL set)
pnpm test:unit            # no DB required
pnpm test:integration     # concurrent oversell + TX rollback (needs Neon)
```

## Production (Hostinger)

| Site | Method | Domain |
|------|--------|--------|
| Marketing | Classic Git / marketing artifact → `public_html` | perfumeaura.com |
| Ops | **Node.js Web App** (not classic Git) | app.perfumeaura.com |

Full rules: [docs/DEPLOY.md](docs/DEPLOY.md), [AGENTS.md](AGENTS.md).

## Scripts

```bash
pnpm dev:ops
pnpm build:ops
pnpm start:ops
pnpm db:generate
pnpm db:migrate
pnpm test

# Marketing source of truth is apps/marketing — sync root mirror for Hostinger classic Git
pnpm marketing:sync
pnpm marketing:check
```

## Add a shadcn component (official only — when needed)

```bash
# Always via CLI; files land in packages/ui. Only add what you will import/use.
pnpm dlx shadcn@latest add <component> -c apps/ops -y

# Preview destination
pnpm dlx shadcn@latest add <component> -c apps/ops --dry-run -y
```

Do not keep unused registry files as inventory. See **AGENTS.md** → “official tooling only (STRICT)”.
