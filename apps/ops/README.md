# @perfume-aura/ops

Internal ops app (inventory → invoicing → payments → finance).

## Dev

From monorepo root:

```bash
cp apps/ops/.env.example apps/ops/.env.local
# configure DATABASE_URL, BETTER_AUTH_*, SMTP_*, OWNER_*

pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner
pnpm dev:ops
```

Open http://localhost:3000/login

Public sign-up is disabled. The owner seed is atomic and idempotent: rerunning
it repairs a partial owner/credential state but does not replace an existing
password. Use `/forgot-password` for normal recovery.

Break glass only:

```bash
CONFIRM_OWNER_RECOVERY=REVOKE_ALL_OWNER_SESSIONS \
  pnpm --filter @perfume-aura/ops recover:owner
```

This replaces the owner password and revokes every owner session in one
transaction. Never print or commit the supplied password.

Health endpoints:

- `/api/health/live` — process only
- `/api/health/ready` — generic database readiness

## shadcn (official only)

```bash
pnpm dlx shadcn@latest add <component> -c apps/ops -y
pnpm dlx shadcn@latest preset resolve -c apps/ops   # expect b23PPibQOI
```

Components install into `packages/ui`. CSS tokens: `packages/ui/src/globals.css`. See root **AGENTS.md**.

## Hostinger

Deploy as **Node.js Web App** (not classic Git). See `docs/DEPLOY.md`.
