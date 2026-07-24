# Environment variables

| Field | Value |
|-------|--------|
| Updated | 2026-07-24 |
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
| `BETTER_AUTH_URL` | Exact app origin: `http://localhost:3000` locally; `https://app.perfumeaura.com` in production |
| `NODE_ENV` | `production` on Hostinger Node app |
| `PORT` | `3000` on Hostinger Node app (panel/process) |
| `SMTP_HOST` | Must be `smtp.hostinger.com` |
| `SMTP_PORT` / `SMTP_SECURE` | Primary `465` / `true`; `587` / `false` only after provider verification |
| `SMTP_USER` / `SMTP_PASSWORD` | Hostinger mailbox credentials |
| `SMTP_FROM` | Sender identity for password-reset mail |

### Required (migrations / CLI)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL_DIRECT` | Neon **direct** (non-pooler) for `drizzle-kit migrate` |

If `DATABASE_URL_DIRECT` is unset, migrate falls back to `DATABASE_URL` (prefer direct for kit).

### Maintenance-only

| Variable | Purpose |
|----------|---------|
| `OWNER_EMAIL` | Owner seed/recovery target; do not leave in hPanel runtime unless an operator needs it |
| `OWNER_PASSWORD` | Owner seed/recovery password (**12–256 chars**); do not leave in hPanel runtime |
| `CONFIRM_OWNER_RECOVERY` | Must equal `REVOKE_ALL_OWNER_SESSIONS` for break-glass recovery |

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
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_FROM=Perfume Aura Ops <…>
OWNER_EMAIL=owner@perfumeaura.com
OWNER_PASSWORD=…
```

### Example production (hPanel Node)

```text
DATABASE_URL=…
BETTER_AUTH_SECRET=…
BETTER_AUTH_URL=https://app.perfumeaura.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_FROM=Perfume Aura Ops <…>
NODE_ENV=production
PORT=3000
```

`DATABASE_URL_DIRECT` is for **local/CI migrate** against prod, not required inside the Node process.

Local secret files (`apps/ops/.env.local`, etc.): prefer mode **600** on multi-user machines (`chmod 600 apps/ops/.env.local`).

---

## packages/db

Uses `DATABASE_URL` (client/pool) and `DATABASE_URL_DIRECT` for drizzle-kit (`drizzle.config.ts`).
Guarded integration tests accept only an explicit loopback `TEST_DATABASE_URL`
and never load `apps/ops/.env.local`.

---

## Marketing

No server secrets. Static HTML/CSS only. Do not embed Neon or auth keys in `apps/marketing` or root `index.html`.

---

## Build-time behavior

`apps/ops/lib/auth-secret.ts` creates one **ephemeral random** secret per
process, and the auth policy forces the exact production origin, only during
Next production build
(`NEXT_PHASE=phase-production-build`) so `next build` can compile without
runtime secrets. The long-running production process still refuses to start
without a real `BETTER_AUTH_SECRET` and exact HTTPS `BETTER_AUTH_URL`.

The browser auth client uses same-origin inference; there is deliberately no
`NEXT_PUBLIC_BETTER_AUTH_URL`. Production accepts only
`https://app.perfumeaura.com`. Development and test accept only the exact
`http://localhost:3000` and `http://127.0.0.1:3000` origins. The production
origin is not trusted in development/test, and no preview or wildcard origin is
enabled. Password-reset URL validation uses the same environment-specific set.

Password reset is the normal recovery path. Port `465` starts TLS immediately.
Port `587` requires `SMTP_SECURE=false` and enforced STARTTLS, and remains a
fallback only after Phase 07 provider verification. Mail failures are redacted;
never log a reset URL or token.

---

## Related

- [SECURITY.md](./SECURITY.md)  
- [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)  
- [TRD.md](./TRD.md) §8  
