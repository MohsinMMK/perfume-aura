# Security — Perfume Aura Ops

| Field | Value |
|-------|--------|
| Updated | 2026-07-23 |
| Scope | Phase 1 owner-only ops |
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
| Cookies | Better Auth + `nextCookies()` plugin |
| Trusted origins | `baseURL` + optional `BETTER_AUTH_TRUSTED_ORIGINS` |
| Rate limit | Global + stricter `/sign-in/email` (5/min) |
| Role field | `user.role` default `owner`, `input: false` |
| Owner seed | CLI `seed:owner` only |

File: `apps/ops/lib/auth.ts`.

---

## Request security layers

```text
1. proxy.ts — cookie presence gate (optimistic only)
2. Dashboard layout — getSession() or redirect /login
3. Server Actions / loaders — requireSession() / getSession()
4. Zod — all mutations validated
5. Drizzle parameterized SQL — no string SQL concat for user input
```

**Never** treat middleware/proxy alone as authorization.

---

## SEC checklist (TRD §6)

| ID | Requirement | Status |
|----|-------------|--------|
| SEC-1 | Session required for ops routes | ✅ layout + proxy |
| SEC-2 | Cookie gate optimistic; full session in actions | ✅ |
| SEC-3 | Zod on mutations | ✅ validators package |
| SEC-4 | Parameterized SQL only | ✅ Drizzle |
| SEC-5 | No secrets in client / marketing | ✅ |
| SEC-6 | `serverActions.allowedOrigins` includes prod host | ✅ next.config |
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
| HSTS | Prefer Hostinger/panel defaults |
| Cookies | Better Auth secure defaults on HTTPS |

---

## Future (not Phase 1)

| Topic | When |
|-------|------|
| Staff role enforcement | Later persona |
| Audit log UI | Phase 2+ |
| 2FA | Optional hardening |
| Email verification flow | If multi-user |

---

## Related

- [ENV.md](./ENV.md)  
- [TRD.md](./TRD.md)  
- [PHASE1_STATUS.md](./PHASE1_STATUS.md)  
