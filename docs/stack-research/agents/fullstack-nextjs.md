# Agent brief — Next.js

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked) |
| Score | 5/5 |
| Docs | https://nextjs.org/docs (16.2.x as of research) |
| As-built | Next.js **16.2.10** in `apps/ops` |

## Fit

Full-stack App Router: Server Components for inventory lists; Server Actions for stock mutations; self-host via `next build` + `next start` on Hostinger Node.

## Required config

- No `output: 'export'`  
- No `cacheComponents` in v1  
- Dynamic inventory pages (`force-dynamic` where needed)  
- Auth inside every Server Action (`requireSession`)  
- Next 16 **`proxy.ts`** (cookie gate only)  
- `serverActions.allowedOrigins` includes `app.perfumeaura.com`  
- Optional `output: 'standalone'` if Hostinger requires it  

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
