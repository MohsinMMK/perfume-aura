# Environment variables

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Template | `apps/ops/.env.example` |
| Local | `apps/ops/.env.local` (gitignored) |

**Never commit secrets.** Rotate any secret that appeared in chat or logs.

---

## Ops app (`apps/ops`)

### Required (runtime)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon **pooled** connection for app + `pg` Pool |
| `BETTER_AUTH_SECRET` | Session crypto; **≥ 32 chars**, high entropy |
| `BETTER_AUTH_URL` | App origin, e.g. `http://localhost:3000` or `https://app.perfumeaura.com` |

### Required (migrations / CLI)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL_DIRECT` | Neon **direct** (non-pooler) for `drizzle-kit migrate` |

If `DATABASE_URL_DIRECT` is unset, migrate falls back to `DATABASE_URL` (prefer direct for kit).

### Optional

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Browser client base URL if it differs from server |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated extra origins (baseURL always trusted) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Multi-instance Server Actions encryption (prod recommended) |
| `OWNER_EMAIL` | Seed owner email (`seed:owner`) |
| `OWNER_PASSWORD` | Seed owner password (min 12 chars per auth config) |

### Example local

```bash
cp apps/ops/.env.example apps/ops/.env.local
# edit values
```

```text
DATABASE_URL=postgresql://…@ep-…-pooler.…/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://…@ep-….…/neondb?sslmode=require
BETTER_AUTH_SECRET=…   # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
OWNER_EMAIL=owner@perfumeaura.com
OWNER_PASSWORD=…
```

### Example production (hPanel Node)

```text
DATABASE_URL=…
DATABASE_URL_DIRECT=…
BETTER_AUTH_SECRET=…
BETTER_AUTH_URL=https://app.perfumeaura.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.perfumeaura.com
```

---

## packages/db

Uses `DATABASE_URL` (client/pool) and `DATABASE_URL_DIRECT` for drizzle-kit (`drizzle.config.ts`).  
Loads dotenv when present; integration tests also load `apps/ops/.env.local`.

---

## Marketing

No server secrets. Static HTML/CSS only. Do not embed Neon or auth keys in `apps/marketing` or root `index.html`.

---

## Build-time behavior

`apps/ops/lib/auth.ts` allows a **placeholder** secret only during Next production build (`NEXT_PHASE=phase-production-build`) so `next build` can typecheck without secrets. **Never** rely on that value at runtime — set a real `BETTER_AUTH_SECRET` in hPanel.

---

## Server Actions origins

Configured in `apps/ops/next.config.ts`:

- `localhost:3000`
- `app.perfumeaura.com`
- `www.app.perfumeaura.com` (if used)

Add extra hosts there if Hostinger preview domains are needed.

---

## Related

- [SECURITY.md](./SECURITY.md)  
- [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)  
- [TRD.md](./TRD.md) §8  
