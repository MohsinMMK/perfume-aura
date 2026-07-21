# Agent brief — Better Auth

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked) |
| Score | 5/5 |
| Docs | https://better-auth.com/docs · Drizzle adapter · Next.js integration |
| As-built | Better Auth **1.6.x** · `apps/ops/lib/auth.ts` |

## Config

- Self-hosted Better Auth 1.6.x  
- Drizzle adapter + Postgres (`@perfume-aura/db` tables)  
- `emailAndPassword.disableSignUp: true`  
- Route: `app/api/auth/[...all]`  
- Plugin: `nextCookies()`  
- Min password length: **12**  
- Rate limit: enabled; stricter sign-in  
- `trustedOrigins`: baseURL + optional env list  
- `user.role` additional field (`input: false`, default `owner`)  

## Security

- Cookie middleware / `proxy.ts` is **optimistic only**  
- Always `auth.api.getSession` / `getSession` / `requireSession` in pages and Server Actions  
- Secret ≥ 32 chars at runtime  

Full checklist: [../../SECURITY.md](../../SECURITY.md).

## Owner bootstrap

```bash
pnpm --filter @perfume-aura/ops seed:owner
# needs DATABASE_URL, BETTER_AUTH_SECRET, OWNER_EMAIL, OWNER_PASSWORD
```

## Reject

| Option | Why |
|--------|-----|
| Neon Managed Better Auth (Beta) | Older pin / less control for v1 |
| Clerk | External user store vs custom SoR |

## Related

- [../RECOMMENDATION.md](../RECOMMENDATION.md)  
- [../../ENV.md](../../ENV.md)  
