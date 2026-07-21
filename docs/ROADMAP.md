# Roadmap — Perfume Aura Ops

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Source of truth | This file + phase docs |

## Phase overview

```text
Phase 0  Docs + monorepo scaffold              ✅ Done
Phase 1  Inventory MVP                         ✅ Code + tests; ⬜ Hostinger Node
Phase 2  Customers + invoicing                 ✅ Core implemented (see PHASE2_INVOICING.md)
Phase 3  Payments (manual → optional Stripe)   ✅ Manual payments; Stripe optional later
Phase 4  Finance dashboards                    ✅ Core /finance page; aging optional
```

## Phase 0 — Scaffold ✅

- Monorepo: `apps/*`, `packages/*`
- Marketing coming soon + root Hostinger mirror
- PRD / TRD / ARCHITECTURE / stack research
- shadcn monorepo preset `b23PPibQOI`

## Phase 1 — Inventory MVP

**Product goal:** Daily stock without spreadsheets.

| Area | Status |
|------|--------|
| Better Auth owner-only login | ✅ |
| Products + variants CRUD | ✅ |
| Stock movements (`applyMovement`) | ✅ |
| Low stock + dashboard | ✅ |
| Product search/filter | ✅ |
| Low-stock nav alert | ✅ |
| Unit + concurrent oversell tests | ✅ |
| Hostinger Node `app.perfumeaura.com` | ⬜ Checklist ready |
| Marketing isolation curl 404 | ⬜ Verify post-deploy |

Detail: [PHASE1_STATUS.md](./PHASE1_STATUS.md) · deploy: [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)

## Phase 2 — Invoicing ✅ core

**Product goal:** Customers, invoices, AR, fulfill → stock.

| Milestone | Status |
|-----------|--------|
| Schema customers / invoices / lines | ✅ migration `0001` |
| Customer CRUD UI | ✅ `/customers` |
| Draft → issue → void / paid | ✅ `/invoices` |
| AR list + dashboard Open AR | ✅ |
| Fulfill → `applyMovement` + `ref_*` | ✅ |
| Print / PDF (browser print) | ✅ `/invoices/[id]/print` |

**Stock rule:** Decrement on **fulfill**, never on issue or payment.

Detail: [PHASE2_INVOICING.md](./PHASE2_INVOICING.md)

## Phase 3 — Payments

**Product goal:** Record money against invoices without double-entry ERP.

| Milestone | Doc |
|-----------|-----|
| Manual payment ledger | [PHASE3_PAYMENTS.md](./PHASE3_PAYMENTS.md) |
| Partial payments / allocation | same |
| Optional Stripe Invoicing | later optional |

**Stock rule:** Payment never changes inventory.

## Phase 4 — Finance

**Product goal:** Signals from the same SoR (not a full accounting suite).

| Milestone | Doc |
|-----------|-----|
| Revenue / AR / inventory value | [PHASE4_FINANCE.md](./PHASE4_FINANCE.md) |
| Simple COGS / margin | same |

## Dependency graph

```text
Phase 1 inventory ledger
        │
        ├──► Phase 2 invoices (ref stock on fulfill)
        │         │
        │         └──► Phase 3 payments (invoice balance)
        │                   │
        └──► Phase 4 finance (aggregates all of the above)
```

## Explicitly deferred (all phases unless noted)

- Public e-commerce storefront  
- Multi-warehouse / multi-company  
- Full double-entry GL  
- Staff RBAC (schema `role` ready; enforce later)  
- Vercel production  
- Domain transfer off GoDaddy  

## Next concrete actions

1. Complete [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md) in hPanel (Node + DNS `app`).  
2. Production smoke: login → stock → customer → invoice → payment → fulfill → finance.  
3. Optional: AR aging buckets, unit_cost on movements, Stripe Invoicing.
