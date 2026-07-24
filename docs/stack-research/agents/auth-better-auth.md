# Agent brief — Better Auth

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked) |
| Score | 5/5 |
| Docs | https://better-auth.com/docs · Drizzle adapter · Next.js integration |
| As-built | Better Auth **1.6.25** · `apps/ops/lib/auth.ts` |

## Config

- Self-hosted Better Auth 1.6.25
- Drizzle adapter + Postgres (`@perfume-aura/db` tables)
- `emailAndPassword.disableSignUp: true`
- Route: `app/api/auth/[...all]`
- Plugin: `nextCookies()`
- Min password length: **12**
- Durable database rate limit; stricter sign-in/reset endpoints
- `trustedOrigins`: production only `https://app.perfumeaura.com`; development/test only the exact localhost pair
- `user.role` additional field (`input: false`, default `user`)
- Hostinger SMTP forgot/reset flow; 30-minute single-use token
- Password reset revokes existing sessions

## Security

- Cookie middleware / `proxy.ts` is **optimistic only**
- Always `getOwnerSession` / `requireOwnerSession` in protected pages, loaders, and Server Actions
- Secret ≥ 32 chars at runtime

Full checklist: [../../SECURITY.md](../../SECURITY.md).

## Owner bootstrap

```bash
pnpm --filter @perfume-aura/ops seed:owner
# needs DATABASE_URL, BETTER_AUTH_SECRET, OWNER_EMAIL, OWNER_PASSWORD
```

Normal recovery uses `/forgot-password`. `recover:owner` is confirmed
break-glass maintenance and revokes every owner session.

## Reject

| Option | Why |
|--------|-----|
| Neon Managed Better Auth (Beta) | Older pin / less control for v1 |
| Clerk | External user store vs custom SoR |

## Related

- [../RECOMMENDATION.md](../RECOMMENDATION.md)  
- [../../ENV.md](../../ENV.md)  
