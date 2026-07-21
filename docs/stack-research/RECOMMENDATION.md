# Stack recommendation — locked

| Field | Value |
|-------|--------|
| Date | 2026-07-21 |
| Docs refresh | 2026-07-22 |
| Status | **Final** — do not re-open during Phase 1–2 without written ADR |

## Decision

| Layer | Selection |
|-------|-----------|
| Hosting marketing | Hostinger classic Git → `public_html` |
| Hosting ops | Hostinger Node.js Web App → `app.perfumeaura.com` |
| Framework | Next.js 16 App Router + TypeScript |
| Base UI | shadcn/ui base-luma (preset `b23PPibQOI`, Hugeicons, Tailwind v4) |
| Forms / tables | Zod + Server Actions (+ Field); TanStack Table v8 when needed |
| Auth | Better Auth 1.6 + Drizzle adapter |
| ORM / DB | Drizzle 0.45 + Neon Postgres + **pg Pool** |
| Repo | pnpm monorepo |
| Domain registration | GoDaddy (no transfer) |
| DNS | Path A Hostinger nameservers |

## Why (one line each)

- **Hostinger Node:** Official Next.js Web App path on Business plan; keeps billing/DNS unified.  
- **Next.js:** Server Actions + RSC fit inventory mutations and private admin.  
- **shadcn:** Owned components, official monorepo CLI, admin patterns.  
- **Drizzle + pg:** Interactive transactions for stock `FOR UPDATE`.  
- **Neon:** Managed Postgres; not Hostinger MySQL.  
- **Better Auth:** Users in our DB; `disableSignUp` for owner-only.  
- **Monorepo:** Shared UI/schema; dual Hostinger deploys from one GitHub repo.  

## Rejected with reason

| Option | Why rejected |
|--------|----------------|
| Vercel | Hostinger-only production policy |
| Prisma | Drizzle preferred for SQL-transparent stock txs |
| Clerk | Vendor user store vs fully custom |
| neon-http for stock | No interactive multi-step transactions |
| Zoho core | Fully custom product goal |
| Domain transfer to Hostinger | Unnecessary re-pay / complexity |

## Hostinger monorepo risk

Official docs do not fully specify workspace installs.  

**Primary:** install from monorepo root with `pnpm --filter @perfume-aura/ops build`.  
**Fallback:** root directory `apps/ops` if panel supports workspace; else root-only build scripts.  

See [../OPS_DEPLOY_CHECKLIST.md](../OPS_DEPLOY_CHECKLIST.md).

## As-built confirmation (Phase 1)

| Decision | Implemented |
|----------|-------------|
| Next 16 App Router | ✅ 16.2.x |
| shadcn preset `b23PPibQOI` | ✅ `preset resolve` |
| Better Auth disableSignUp | ✅ |
| pg Pool stock | ✅ |
| pnpm monorepo | ✅ |
| Hostinger Node live | ⬜ checklist |

## See also

- [agents/](./agents/) briefs  
- [../TRD.md](../TRD.md)  
- [../ARCHITECTURE.md](../ARCHITECTURE.md)  
