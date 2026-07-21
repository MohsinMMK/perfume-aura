# Architecture — Perfume Aura

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Complements | [PRD.md](./PRD.md), [TRD.md](./TRD.md), [DATA_MODEL.md](./DATA_MODEL.md) |

## Overview

Two surfaces, one monorepo, one Hostinger Business plan, one Neon Postgres:

```text
GitHub monorepo (MohsinMMK/perfume-aura)
        │
        ├── apps/marketing  → Hostinger classic Git → perfumeaura.com
        │                      (static HTML/CSS; root index.html mirror interim)
        │
        └── apps/ops        → Hostinger Node.js Web App → app.perfumeaura.com
                                    │
                                    ▼
                              Neon PostgreSQL
                              (pg Pool + Drizzle)
```

**Non-negotiable:** ops never deploys via classic Git into marketing `public_html`.  
**Non-negotiable:** production is Hostinger-only (no Vercel).

---

## Ownership & DNS (Path A)

```text
GoDaddy (registration + renewal only)
   └── Nameservers → lunar.dns-parking.com / solar.dns-parking.com
            └── Hostinger DNS zone (authoritative)
                     ├── apex marketing (ALIAS/CDN or A — see DEPLOY / live zone)
                     ├── www → Hostinger CDN / apex
                     └── app → Node Web App target (when ops site exists)
```

| Concern | Where |
|---------|--------|
| Domain registration | GoDaddy |
| Nameservers | Set at GoDaddy → Hostinger values |
| DNS A/CNAME/MX/TXT | **Hostinger only** while Path A active |
| Marketing files | Hostinger classic Git |
| Ops Node | Hostinger Node Web App |
| Source | GitHub `main` |

Details: [DEPLOY.md](./DEPLOY.md), [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md).

---

## Packages

| Package | Name | Role |
|---------|------|------|
| `apps/ops` | `@perfume-aura/ops` | Next.js 16 admin (App Router) |
| `apps/marketing` | static | Brand coming soon |
| `packages/ui` | `@perfume-aura/ui` | shadcn base-luma components + tokens |
| `packages/db` | `@perfume-aura/db` | Schema, pool, `applyMovement`, migrations |
| `packages/validators` | `@perfume-aura/validators` | Shared Zod schemas |

### UI monorepo rules

- CLI only: `pnpm dlx shadcn@latest add … -c apps/ops -y`  
- Preset lock: **`b23PPibQOI`**  
- Tokens: `packages/ui/src/globals.css`  
- App compositions: `apps/ops/components/*` import from `@perfume-aura/ui`  

See [AGENTS.md](../AGENTS.md) STRICT and [stack-research/agents/ui-shadcn-stack.md](./stack-research/agents/ui-shadcn-stack.md).

---

## Request path (ops)

```text
Browser
  → Hostinger TLS + Node reverse proxy
  → Next.js 16
       ├─ proxy.ts          cookie presence gate (optimistic)
       ├─ RSC pages         getSession / requireSession
       ├─ Server Actions    auth + Zod + revalidatePath
       ├─ /api/auth/[...all] Better Auth
       └─ @perfume-aura/db  pg Pool → Neon
  → HTML / redirect / JSON result
```

### Caching

- Inventory routes: **dynamic** (`force-dynamic` where set).  
- Never cache live stock with `'use cache'` / `unstable_cache`.  
- After mutation: `revalidatePath` for affected routes.

---

## Inventory write path

Single write API — **`applyMovement`** in `packages/db/src/inventory.ts`:

```text
UI form
  → Server Action (requireSession + Zod)
  → applyMovement({ type, quantity | quantityDelta, … })
  → BEGIN
       optional idempotency short-circuit
       resolve MAIN location
       SELECT product_variants FOR UPDATE
       resolve delta (inventory-math)
       reject if on_hand + delta < 0
       reject sale if qty > available (on_hand − reserved)
       INSERT stock_movements
       UPDATE quantity_on_hand, version WHERE version = expected
       (conflict → InventoryError CONFLICT)
  → COMMIT
```

Pure math (unit-tested): `packages/db/src/inventory-math.ts`.

---

## Auth architecture

| Piece | Location |
|-------|----------|
| Server | `apps/ops/lib/auth.ts` |
| Client | `apps/ops/lib/auth-client.ts` |
| Session helpers | `apps/ops/lib/session.ts` |
| Route handler | `apps/ops/app/api/auth/[...all]` |
| Edge gate | `apps/ops/proxy.ts` |
| Seed owner | `apps/ops/scripts/seed-owner.ts` |

Owner-only v1: `disableSignUp: true`, seed CLI, rate limits.  
Full checklist: [SECURITY.md](./SECURITY.md).

---

## App structure (ops as-built)

```text
apps/ops/
  app/
    (auth)/login/
    (dashboard)/
      layout.tsx          # session + lowStockCount → AppShell
      dashboard/
      products/           # list, new, [id]
      stock/              # receive/adjust, low/
    api/auth/[...all]/
    page.tsx              # redirect dashboard|login
  components/             # app-shell, forms, dialogs
  lib/                    # auth, stock, products, money, session
  proxy.ts
packages/db/src/
  client.ts               # pg Pool
  inventory.ts            # applyMovement
  inventory-math.ts
  schema/
  seed.ts
```

---

## Forms & tables (Phase 1 as-built)

| Concern | Choice |
|---------|--------|
| Forms | Simple controlled forms + Server Actions + Zod (`@perfume-aura/validators`) |
| RHF | Deferred until complex multi-step forms (Phase 2 invoices) |
| Tables | shadcn `Table` (no TanStack yet) |
| Feedback | sonner available; field errors via action result |

---

## Phase extension model

Stock ledger remains system of truth:

```text
Phase 2 invoices ──fulfill──► stock_movements (sale, ref_type=invoice)
Phase 3 payments ──allocate──► invoice balances only (no stock)
Phase 4 finance   ──read────► aggregates over stock + invoices + payments
```

Design docs:

- [PHASE2_INVOICING.md](./PHASE2_INVOICING.md)  
- [PHASE3_PAYMENTS.md](./PHASE3_PAYMENTS.md)  
- [PHASE4_FINANCE.md](./PHASE4_FINANCE.md)  

---

## Deploy safety

| Site | Artifact | Must not include |
|------|----------|------------------|
| Marketing | Static only | `apps/ops`, `.env`, `packages/db` secrets |
| Ops | Node build + env in hPanel | Marketing static requirement |

Checklist: [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md).

---

## Related

- [DATA_MODEL.md](./DATA_MODEL.md)  
- [ENV.md](./ENV.md)  
- [TESTING.md](./TESTING.md)  
- [stack-research/RECOMMENDATION.md](./stack-research/RECOMMENDATION.md)  
