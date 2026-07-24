# Phase 1 status — Inventory MVP

| Field | Value |
|-------|--------|
| Updated | 2026-07-25 |
| Verdict | **Code + tests PASS**; production Node deploy **pending** |
| Deploy | [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md) |

## User journeys (PRD §5)

| # | Journey | Status |
|---|---------|--------|
| 1 | Login → private dashboard | ✅ |
| 2 | Add product → variants (SKU, cost, retail, reorder) | ✅ |
| 3 | Receive stock → qty up; movement logged | ✅ |
| 4 | Sale/out/adjust → qty down; movement logged | ✅ (receive + adjust UI; sale via `applyMovement`) |
| 5 | Low stock list | ✅ + nav badge |
| 6 | Dashboard: products, units, cost, low stock | ✅ |

## Functional requirements

### Auth

| ID | Requirement | Status |
|----|-------------|--------|
| FR-AUTH-1 | Authenticated only; no public registration | ✅ `disableSignUp: true` |
| FR-AUTH-2 | Secure session; logout | ✅ Better Auth + sign-out |
| FR-AUTH-3 | Enforce owner-only v1 | ✅ explicit owner role required in protected pages/loaders/actions; default is `user` |

### Inventory

| ID | Requirement | Status |
|----|-------------|--------|
| FR-INV-1 | Product lifecycle | ✅ create, list/detail, edit, archive, explicit reactivate; no hard-delete |
| FR-INV-2 | Variant/SKU lifecycle | ✅ create, edit, archive, explicit reactivate; balances preserved |
| FR-INV-3 | Qty only via movements | ✅ `applyMovement` only |
| FR-INV-4 | Types: receive, sale, adjust, damage, return | ✅ in enum + math; UI: receive + adjust |
| FR-INV-5 | delta, after, note, user, timestamp | ✅ |
| FR-INV-6 | Atomic; no concurrent oversell or archived manual mutation | ✅ product→variant locking + race/integration tests |
| FR-INV-7 | Low-stock list | ✅ `/stock/low` + badge |
| FR-INV-8 | Dashboard metrics | ✅ |
| FR-INV-9 | Search/filter | ✅ products `?q=` / `?status=` |
| FR-INV-10 | CSV export | ⬜ P2 later |

## Technical acceptance (TRD §11)

| Item | Status |
|------|--------|
| Auth-gated ops local + deploy ready | ✅ local; checklist ready |
| Neon products, variants, movements | ✅ |
| Concurrent oversell test | ✅ `pnpm test` |
| Marketing free of ops source leak | ⬜ verify post-deploy |
| Docs match dual Hostinger | ✅ |

## Routes (as-built)

| Route | Purpose |
|-------|---------|
| `/login` | Owner sign-in |
| `/dashboard` | Metrics + quick actions |
| `/products` | Paginated catalog + search + active/archived filters |
| `/products/new` | Create product (+ first variant) |
| `/products/[id]` | Product/variant edit, archive/reactivate, preserved archived stock, stock dialogs |
| `/stock` | Receive / adjust + paginated movements with captured/legacy cost basis |
| `/stock/low` | Reorder alerts |
| `/api/auth/[...all]` | Better Auth handler |

## Packages involved

| Package | Role in Phase 1 |
|---------|-----------------|
| `apps/ops` | UI, Server Actions, auth |
| `packages/db` | Schema, `applyMovement`, migrations, integration tests |
| `packages/ui` | shadcn primitives |
| `packages/validators` | Zod for product/stock forms |

## Test commands

```bash
pnpm test
pnpm test:unit
pnpm test:integration   # needs DATABASE_URL
pnpm build:ops
```

See [TESTING.md](./TESTING.md).

## Remaining to call Phase 1 “production complete”

1. Neon production + migrate + seed MAIN + seed owner  
2. Hostinger **Node.js Web App** on `app.perfumeaura.com`  
3. DNS `app` record + SSL  
4. Smoke login → stock on prod  
5. Confirm marketing does not serve monorepo source  

Until then: Phase 1 is **feature-complete for local / Neon-backed ops**.
