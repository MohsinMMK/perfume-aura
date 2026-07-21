# TRD — Perfume Aura Ops Platform

| Field | Value |
|-------|--------|
| Version | 1.1 |
| Updated | 2026-07-22 |
| Complements | [PRD.md](./PRD.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md) |
| Research | [stack-research/RECOMMENDATION.md](./stack-research/RECOMMENDATION.md) |

## 1. Locked stack

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Marketing | Static HTML/CSS `apps/marketing` (+ root mirror interim) |
| Ops | Next.js **16.2.x** App Router + TypeScript `apps/ops` |
| Ops host | Hostinger Node.js Web App → `app.perfumeaura.com` |
| Marketing host | Hostinger classic Git → `perfumeaura.com` |
| Base UI | **shadcn/ui** official CLI only (base-luma / preset **`b23PPibQOI`**, Tailwind v4) in `packages/ui` |
| Forms | Zod on Server Actions; Phase 1 simple forms + Field/Input. RHF when forms get complex (Phase 2+) |
| Tables | shadcn Table (Phase 1); TanStack Table v8 when grid features needed |
| Icons / toasts | hugeicons / sonner |
| Auth | Better Auth **1.6.x**, `disableSignUp: true`, Drizzle adapter |
| ORM | Drizzle **0.45.x** |
| DB | Neon PostgreSQL |
| Stock driver | **node-postgres (`pg`) Pool** — interactive transactions |
| Currency | PKR, integer minor units (paisa) |
| Tests | `node:test` + `tsx --test` |

### Explicitly not used

Vercel production, classic Git for Next, `output: 'export'`, Clerk, Prisma, Hostinger MySQL as primary, Zoho as SoR, neon-http for stock txs, Neon Managed Better Auth (Beta).

## 2. Official references

| Area | URL |
|------|-----|
| Next.js | https://nextjs.org/docs |
| Deploying / self-host | https://nextjs.org/docs/app/getting-started/deploying |
| Hostinger Node | https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/ |
| Hostinger classic Git | https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/ |
| shadcn monorepo | https://ui.shadcn.com/docs/monorepo |
| Drizzle + Neon | https://orm.drizzle.team/docs/connect-neon |
| Better Auth Next | https://better-auth.com/docs/integrations/next |
| Stripe Invoicing (later) | https://docs.stripe.com/invoicing |

## 3. Version / config pins

| Item | Rule |
|------|------|
| Next.js | 16.x (as-built 16.2.10) |
| Node (Hostinger) | 20.x or 22.x |
| Drizzle | 0.45.x (Better Auth peer) |
| Better Auth | 1.6.x |
| TanStack Table | v8 (when added) |
| Tailwind | v4 via shadcn |
| `cacheComponents` | **off** in v1 |
| Auth edge file | Next 16 `proxy.ts` |
| Signup | `disableSignUp: true` |
| shadcn preset | `b23PPibQOI` (no fallbacks on `preset resolve`) |

## 4. Data model (Phase 1)

Full detail: [DATA_MODEL.md](./DATA_MODEL.md).

```text
users / auth tables (Better Auth + role)
products              id, name, slug, brand, category, description, status, timestamps
product_variants      id, product_id, sku UNIQUE, barcode?, size_ml,
                      cost_cents, retail_cents, quantity_on_hand, qty_reserved,
                      reorder_level, version, status
locations             id, code (MAIN), name
stock_movements       id, variant_id, location_id, type, quantity_delta,
                      quantity_after, ref_type?, ref_id?, note?,
                      idempotency_key UNIQUE?, created_by, created_at
```

### Invariants

1. Every balance change has a ledger row in the **same transaction**.  
2. `quantity_on_hand >= 0`; outbound ≤ available (`on_hand - reserved`).  
3. Append-only movements; reverse via compensating movement.  
4. SKU grain = product × size_ml; qty in **whole bottles** (integer).  
5. Single write path: `applyMovement()` only.  
6. `SELECT … FOR UPDATE` (+ version check) on stock update.  

### Phase 2–4 hooks

- `ref_type` / `ref_id` for invoice / payment / po  
- Money tables separate; stock on **fulfill**, not payment  

## 5. App structure

```text
apps/ops/
  app/(auth)/login
  app/(dashboard)/dashboard|products|stock
  app/api/auth/[...all]
  proxy.ts
  components/   # app compositions
  lib/          # auth, stock, products, money, session
packages/ui/    # shadcn
packages/db/    # drizzle schema + client + migrations + inventory
packages/validators/
```

## 6. Security

| ID | Requirement | Doc |
|----|-------------|-----|
| SEC-1 | Session required for ops routes | [SECURITY.md](./SECURITY.md) |
| SEC-2 | Cookie gate optimistic; **getSession in every Server Action** | same |
| SEC-3 | Zod validate all mutations | same |
| SEC-4 | Parameterized SQL only | same |
| SEC-5 | No secrets in client / marketing static | [ENV.md](./ENV.md) |
| SEC-6 | `serverActions.allowedOrigins` includes production host | next.config |
| SEC-7 | Marketing deploy must not expose `apps/ops` source | [DEPLOY.md](./DEPLOY.md) |

## 7. Caching / rendering

- Inventory pages: dynamic (`force-dynamic` or auth cookies + no stock cache)  
- Never `unstable_cache` / `'use cache'` on live stock  
- After mutation: `revalidatePath` before redirect  

## 8. Hostinger deploy

### Marketing

- Prefer CI that publishes **only** `apps/marketing/**` to `public_html`  
- Interim: root `index.html` + `styles.css` mirrors for classic Git  
- Post-deploy: curl expect 404 on `/apps/ops/package.json`  

### Ops

| Setting | Value |
|---------|--------|
| Website | Node.js Web App |
| Domain | `app.perfumeaura.com` |
| Framework | Next.js |
| Root | monorepo or `apps/ops` (see checklist) |
| Build | `pnpm --filter @perfume-aura/ops build` |
| Start | `next start` (port 3000) |
| Env | See [ENV.md](./ENV.md) |

Full steps: [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md) · overview: [DEPLOY.md](./DEPLOY.md).

### Env (summary)

```text
DATABASE_URL=                 # pooled Neon for app
DATABASE_URL_DIRECT=          # direct for drizzle-kit migrate
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://app.perfumeaura.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.perfumeaura.com
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=   # recommended multi-instance
```

## 9. Testing (Phase 1)

| Test | Requirement | Status |
|------|-------------|--------|
| Unit | available qty math, money format | ✅ |
| Integration | concurrent sell last unit → exactly one success | ✅ |
| Integration | TX rollback leaves no orphan movement | ✅ |
| Integration | idempotency key no double-apply | ✅ |
| E2E (later) | login → product → receive → low stock | ⬜ |

Commands and file map: [TESTING.md](./TESTING.md).

```bash
pnpm test
pnpm test:unit
pnpm test:integration
```

## 10. Implementation sequence

| Step | Work | Status |
|------|------|--------|
| 0 | Docs | ✅ living set |
| 1 | Monorepo + marketing | ✅ |
| 2 | Next + shadcn + packages/ui | ✅ |
| 3 | Drizzle + Neon + Better Auth | ✅ |
| 4 | Products/variants CRUD | ✅ |
| 5 | Stock movements + dashboard | ✅ |
| 6 | Hostinger Node deploy + marketing harden | ⬜ checklist |
| 7 | Polish (search, low-stock badge, tests) | ✅ |
| 8 | Phase 2+ | design docs ready |

## 11. Acceptance (Phase 1 technical)

- [x] Auth-gated ops local complete + deploy ready ([OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md); Hostinger Node still pending)  
- [x] Neon holds products, variants, movements  
- [x] Concurrent oversell test passes (`pnpm test`)  
- [ ] Marketing free of ops source leak (verify post-deploy: `/apps/ops/package.json` → 404)  
- [x] Docs match dual Hostinger reality  
- [x] Unit tests for qty math + money  
- [x] Product search/filter (FR-INV-9)  

Product journey matrix: [PHASE1_STATUS.md](./PHASE1_STATUS.md).
