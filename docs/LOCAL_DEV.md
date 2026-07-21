# Local development

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Complements | [../README.md](../README.md), [ENV.md](./ENV.md) |

## Prerequisites

- Node **20+** (22 OK)  
- **pnpm** 11.x (`packageManager` in root `package.json`)  
- Neon project (or local Postgres with same schema)  

## First-time setup

```bash
pnpm install

cp apps/ops/.env.example apps/ops/.env.local
# Set DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
# OWNER_EMAIL, OWNER_PASSWORD

pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner

pnpm dev:ops
# http://localhost:3000/login
```

Generate secret:

```bash
openssl rand -base64 32
```

## Day-to-day

| Task | Command |
|------|---------|
| Ops dev server | `pnpm dev:ops` |
| Ops production build | `pnpm build:ops` |
| Lint ops | `pnpm --filter @perfume-aura/ops lint` |
| Tests | `pnpm test` |
| DB migrate | `pnpm db:migrate` |
| Generate migration | `pnpm db:generate` |
| Marketing preview | `npx serve apps/marketing` |
| Sync marketing root mirror | `pnpm marketing:sync` |
| Check mirror matches | `pnpm marketing:check` |

## shadcn

```bash
pnpm dlx shadcn@latest preset resolve -c apps/ops
# must print b23PPibQOI, no fallbacks

pnpm dlx shadcn@latest add <component> -c apps/ops -y
pnpm dlx shadcn@latest add <component> -c apps/ops --dry-run -y
```

## Routes to click through

See [PHASE1_STATUS.md](./PHASE1_STATUS.md) routes table.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Auth secret error | `BETTER_AUTH_SECRET` length ≥ 32 |
| DB connect fail | `DATABASE_URL` pooled Neon + SSL |
| MAIN location missing | `pnpm --filter @perfume-aura/db seed` |
| Login but empty catalog | Seed products manually via UI |
| Integration tests skip | Set `DATABASE_URL` in `.env.local` |

## Related

- [TESTING.md](./TESTING.md)  
- [SECURITY.md](./SECURITY.md)  
- [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)  
