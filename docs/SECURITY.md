# Security — Perfume Aura Ops

| Field | Value |
|-------|--------|
| Updated | 2026-07-24 |
| Scope | Owner-only ops through local Phase 04 hardening |
| Skills | better-auth-best-practices, better-auth-security-best-practices, email-and-password-best-practices |

---

## Threat model (v1)

| Asset | Risk if lost |
|-------|----------------|
| Stock balances | Wrong inventory / oversell |
| Owner session | Full admin access |
| DATABASE_URL / BETTER_AUTH_SECRET | Full DB / session forge |
| Marketing static | Low (no secrets) |

v1 assumes a **single trusted owner**. Staff RBAC is deferred.

---

## Auth configuration (as-built)

| Control | Implementation |
|---------|----------------|
| No public sign-up | `emailAndPassword.disableSignUp: true` |
| Min password | 12 characters |
| Max password | 256 |
| Secret | `BETTER_AUTH_SECRET` ≥ 32 chars at runtime |
| Sessions | 7d expire, 1d updateAge |
| Cookies | Secure in production; no cross-subdomain cookies; `nextCookies()` plugin |
| CSRF/origin | Both checks enabled; production trusts only `https://app.perfumeaura.com`; development/test trust only exact `localhost:3000` and `127.0.0.1:3000` origins |
| Rate limit | Durable `rate_limit` table; sign-in 5/min, reset request 3/min, reset/change 5/min |
| Role field | `user.role` defaults to `user`; server-owned; owner is explicit |
| Authorization | Every protected page/loader/action requires a verified `owner` session |
| Recovery | Single-use 30-minute Better Auth reset token; all sessions revoked on reset |
| Owner maintenance | Atomic idempotent seed/repair; confirmed break-glass recovery revokes all sessions |

File: `apps/ops/lib/auth.ts`.

---

## Request security layers

```text
1. proxy.ts — cookie presence gate (optimistic only)
2. Dashboard pages/layout — requireOwnerSession() or redirect /login
3. Server Actions / loaders — requireOwnerSession() before all business work
4. Zod — all mutations validated
5. Drizzle parameterized SQL — no string SQL concat for user input
```

**Never** treat middleware/proxy alone as authorization.

---

## SEC checklist (TRD §6)

| ID | Requirement | Status |
|----|-------------|--------|
| SEC-1 | Owner session required for ops routes | ✅ pages/layout/actions + proxy hint |
| SEC-2 | Cookie gate optimistic; full owner session in actions | ✅ |
| SEC-3 | Zod on mutations | ✅ validators package |
| SEC-4 | Parameterized SQL only | ✅ Drizzle |
| SEC-5 | No secrets in client / marketing | ✅ |
| SEC-6 | Better Auth exact-origin/CSRF checks and same-origin client | ✅ |
| SEC-7 | Marketing must not expose ops source | ✅ root `.htaccess` deny `/apps` `/packages` `/docs` / lockfiles / `*.md` / `.git` / `.env` / `.gitignore` (**403** via `[F,L]` + FilesMatch); prefer artifact-only CI later |

---

## Secrets handling

1. Store only in `.env.local` / hPanel env — never git.  
2. Prefer `openssl rand -base64 32` for auth secret.  
3. Rotate if leaked (including Hostinger API tokens left in `/tmp`).  
4. Production `BETTER_AUTH_URL` must be HTTPS origin.  
5. Use Neon pooled URL for app; do not expose DB to the public internet beyond Neon controls.  
6. **Never** bake `.env` into `pnpm ops:pack` zip. Pack smoke rejects `.env*`, keys, and `entry.cjs` in artifact. Verify marketing with **403** (not “must be 404”).  
7. Classic Git still places monorepo files on marketing disk; `.htaccess` blocks HTTP access until artifact-only deploy.
8. SMTP credentials and sender remain environment-only. Port `465` uses
   implicit TLS; `587` is an explicit STARTTLS fallback only.
9. Login distinguishes an unavailable auth/database service from invalid
   credentials without revealing backend details.

---

## Inventory integrity (security-relevant)

Concurrent sales of the last unit must not oversell:

- `SELECT … FOR UPDATE` on variant  
- Negative on-hand rejected  
- Version bump / conflict retry path  
- Integration test: concurrent last-unit sale  

See [TESTING.md](./TESTING.md) and `packages/db/src/inventory.ts`.

---

## Headers / transport

| Item | Expectation |
|------|-------------|
| Production | HTTPS only (Hostinger SSL) |
| HSTS | App emits one-year HSTS in production |
| CSP | Enforced app-wide; no objects or framing |
| Headers | nosniff, DENY framing, strict referrer, restrictive permissions |
| Cookies | Better Auth secure production cookies, no cross-subdomain scope |

`/api/health/live` proves only process liveness. `/api/health/ready` performs a
generic database `SELECT 1` and returns only `ready` or `unavailable`; neither
endpoint exposes configuration or dependency details.

---

## Future (not Phase 1)

| Topic | When |
|-------|------|
| Staff roles/RBAC | Later persona; non-owner sessions are denied today |
| Audit log UI | Phase 2+ |
| 2FA | Optional hardening |
| Email verification flow | If a future multi-user workflow is approved |

---

## Related

- [ENV.md](./ENV.md)  
- [TRD.md](./TRD.md)  
- [PHASE1_STATUS.md](./PHASE1_STATUS.md)  
