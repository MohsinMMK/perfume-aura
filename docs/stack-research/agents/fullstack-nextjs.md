# Agent brief — Next.js

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked) |
| Score | 5/5 |
| Docs | https://nextjs.org/docs |
| As-built | Next.js **16.2.11** in `apps/ops` |

## Fit

Full-stack App Router: Server Components for inventory lists; Server Actions for
stock mutations; build the standalone artifact on Node 24.18.0 and manually
upload it to the Hostinger Node 24.x Web App.

## Required config

- No `output: 'export'`  
- No `cacheComponents` in v1  
- Dynamic inventory pages (`force-dynamic` where needed)  
- Auth inside every Server Action (`requireSession`)  
- Next 16.2.11 **`proxy.ts`** (cookie gate only)
- `serverActions.allowedOrigins` includes `app.perfumeaura.com`  
- `output: 'standalone'` for the supported Path Z artifact

## Patterns in this repo

| Pattern | Where |
|---------|--------|
| RSC list pages | `app/(dashboard)/products`, `stock` |
| Server Actions | `lib/products.ts`, `lib/stock.ts` |
| Parallel fetch | stock page variants + movements |
| Composition shell | `components/app-shell.tsx` |

## Risks

- Stale cache if stock wrapped in cache APIs  
- Race conditions need DB locks (not Next-level)  
- Monorepo transpile: `transpilePackages` for workspace packages  

## Related

- [../RECOMMENDATION.md](../RECOMMENDATION.md)  
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)  
