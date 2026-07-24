# Phase 04 — Authentication security and recovery

## Objective

Upgrade and harden owner-only Better Auth, enforce authorization beyond cookie presence, and provide a real self-service password-reset flow through Hostinger SMTP.

## Dependencies

Phases 01–03. Database-backed rate limiting and any Better Auth schema delta must use the Phase 02 migration method.

## In scope

- Better Auth `1.6.25`, official schema diff, owner authorization, rate limiting, cookie/origin settings, password policy, safe redirects, password reset pages/API/email, session revocation, auth tests, and redacted environment documentation.

## Out of scope

- Public sign-up, social login, Neon Auth, multi-tenant roles, or provider writes.
- Entering SMTP/database/auth secrets or sending production email; root-only in Phase 07.

## Confirmed evidence and root causes

- Better Auth is pinned at `1.6.23`; the approved target is `1.6.25`.
- Public sign-up is disabled, but application authorization checks only for any valid session; it does not consistently require the owner role.
- the database user role defaults to `owner`, which is unsafe if another creation path appears.
- Login client `minLength={8}` conflicts with the server's 12-character minimum.
- `next` accepts any string beginning with `/`; protocol-relative `//host` must not be accepted as an internal return target.
- Rate limiting is enabled but does not explicitly use durable database storage.
- There is no forgot/reset-password route or mail transport.
- Owner seeding uses internal adapter operations in separate steps and cannot repair a partial user/account state.
- The production auth endpoint currently returns `500`, consistent with missing/wrong runtime environment or database state; this must be diagnosed, not translated to “invalid password.”

## Exact implementation decisions

1. Pin Better Auth to `1.6.25`, inspect its release notes, run the official Better Auth CLI schema generator to a temporary location, and convert the reviewed additive diff into a forward Drizzle expansion migration. This auth expansion must be ordered before the Phase 03 contract migration and include runtime-role grants required by new auth tables.
2. Keep `disableSignUp: true`. Change the database/application default away from automatic owner elevation and seed the owner role explicitly.
3. Add `requireOwner()` and use it in every protected page loader and Server Action. The proxy remains an optimistic cookie-presence redirect only.
4. Keep CSRF and origin checks enabled. Use explicit local and `https://app.perfumeaura.com` origins, HTTPS secure cookies in production, and no cross-subdomain cookies.
5. Use database-backed rate limiting and stricter sign-in/reset endpoints; generate its required table through the official schema workflow. Prove the application against the domain-plus-auth expansion state before finalizing the later contract migration.
6. Align password limits to 12–256 in server, client, reset, seed, and documentation.
7. Add a return-path parser that accepts a single-leading-slash application path, rejects `//`, schemes, backslashes, and unknown external origins, and defaults to `/dashboard`.
8. Add Hostinger SMTP mail transport with environment-only configuration:
   - primary: `smtp.hostinger.com`, SSL port `465`, secure transport;
   - fallback only after verified provider need: port `587` with STARTTLS;
   - credentials and sender never committed.
9. Implement Better Auth's official `sendResetPassword`, `/forgot-password`, and `/reset-password` flow. Responses remain generic, reset URLs are absolute, reset tokens use the official expiry, and `revokeSessionsOnPasswordReset` is enabled.
10. Use both text and minimal escaped HTML email bodies; never log tokens or complete reset URLs.
11. Harden owner seed/recovery so user plus credential creation is atomic and idempotent. SMTP reset is the normal recovery path; an offline maintenance command is break-glass only, auditable, and revokes sessions.
12. Add `/api/health/live` for process liveness and `/api/health/ready` for a generic `SELECT 1` database-readiness result. Neither endpoint exposes configuration or database details.
13. After the auth expansion migration is committed and tested, finalize the subsequent contract migration prepared in Phase 03. Record both ordered migration identifiers separately so Phase 07 can stop after all expansions, deploy compatible code, and then apply only the contract.

## Affected subsystems

Auth schema/config/client, session helpers, proxy/login/reset pages, owner seed, mail module, validators, tests, env templates, Hostinger SMTP/environment, and operational docs.

## Official documentation

- Better Auth installation: https://www.better-auth.com/docs/installation
- Better Auth email/password: https://www.better-auth.com/docs/authentication/email-password
- Better Auth options: https://www.better-auth.com/docs/reference/options
- Better Auth security: https://www.better-auth.com/docs/reference/security
- Better Auth rate limits: https://www.better-auth.com/docs/concepts/rate-limit
- Better Auth database: https://www.better-auth.com/docs/concepts/database
- Better Auth Next.js: https://www.better-auth.com/docs/integrations/next
- Hostinger email client/SMTP settings: https://www.hostinger.com/support/4305847-set-up-hostinger-email-on-your-applications-and-devices/
- Nodemailer SMTP: https://nodemailer.com/smtp

## Required project skills

`better-auth-best-practices`, `better-auth-security-best-practices`, and `email-and-password-best-practices`.

## Commands and test cases

```bash
pnpm --filter @perfume-aura/ops add better-auth@1.6.25 nodemailer
pnpm --filter @perfume-aura/ops add -D @types/nodemailer
tmp_dir="$(mktemp -d)"
pnpm dlx auth@1.6.25 generate --config apps/ops/lib/auth.ts --output "$tmp_dir/auth-schema.ts" --yes
pnpm db:generate
pnpm typecheck
pnpm test:unit
DATABASE_URL=postgresql://... pnpm test:integration
```

Test invalid credentials, non-owner denial, public-sign-up denial, malicious `next`, rate limits, generic reset request, expired/used token, password policy, session revocation, SMTP failure without token leakage, seed partial-state repair, liveness `200`, and readiness `200`/`503`. Production mailbox delivery is Phase 07 root-only.

## Rollback

Retain the previous auth package/lockfile and pre-migration Neon restore point. If SMTP fails, disable only the reset UI while preserving secure sign-in; use documented break-glass recovery. Rotating `BETTER_AUTH_SECRET` invalidates sessions and requires an explicit incident decision.

## Completion evidence

- Better Auth `1.6.25` and official schema diff are recorded.
- Auth/type/integration/browser tests pass.
- No public sign-up or non-owner access exists.
- Reset tokens and secrets never appear in logs.
- SMTP provider verification is still explicitly pending until Phase 07.

## Prohibited shortcuts

- No CLI-only recovery as the normal user experience.
- No custom reset-token table when Better Auth provides the flow.
- No disabled CSRF/origin checks, wildcard production origins, or plaintext SMTP.
- No default owner elevation and no secret in source.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 04 file. Use the three installed Better Auth skills. Implement Better Auth `1.6.25`, official schema diff/migration, owner authorization, durable rate limits, safe redirects, Hostinger SMTP configuration, self-service forgot/reset pages, session revocation, seed hardening, and tests. Use placeholder env names only. Do not access mailboxes, set provider secrets, send production mail, migrate Neon, stage, or commit. Return test evidence and any official-API uncertainty.
