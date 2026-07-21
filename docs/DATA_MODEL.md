# Data model — Perfume Aura

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| ORM | Drizzle 0.45 · Neon PostgreSQL |
| Package | `packages/db` |
| Migrations | `packages/db/drizzle/` |

Source of truth for columns is the Drizzle schema under `packages/db/src/schema/`.  
This document is the human-readable contract.

---

## Phase 1 tables (implemented)

### Auth (Better Auth)

| Table | Purpose |
|-------|---------|
| `user` | Owner account; `role` text default `owner` (server-owned) |
| `session` | Session tokens |
| `account` | Credential provider linkage |
| `verification` | Email verification tokens (unused for public sign-up) |

### Catalog

#### `products`

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `name`, `slug` | slug unique |
| `brand`, `category`, `description` | optional |
| `status` | `active` \| `archived` |
| `created_at`, `updated_at` | timestamptz |

#### `product_variants`

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `product_id` | FK → products CASCADE |
| `sku` | UNIQUE business key |
| `barcode` | optional |
| `size_ml` | integer ml |
| `cost_cents`, `retail_cents` | PKR integer paisa |
| `quantity_on_hand` | balance cache (integer bottles) |
| `qty_reserved` | reserved bottles |
| `reorder_level` | low-stock threshold |
| `version` | optimistic concurrency for stock updates |
| `status` | `active` \| `archived` |
| timestamps | |

### Locations

#### `locations`

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `code` | UNIQUE; seed **`MAIN`** |
| `name` | e.g. Main warehouse |
| timestamps | |

### Ledger

#### `stock_movements`

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `variant_id` | FK restrict |
| `location_id` | FK restrict |
| `type` | `receive` \| `sale` \| `adjust` \| `damage` \| `return` |
| `quantity_delta` | signed integer |
| `quantity_after` | on-hand after this row |
| `ref_type`, `ref_id` | Phase 2+ links (invoice, etc.) |
| `note` | required for adjust |
| `idempotency_key` | UNIQUE optional |
| `created_by` | user id text |
| `created_at` | |

---

## Invariants (must hold)

1. Every on-hand change has a ledger row in the **same transaction**.  
2. `quantity_on_hand >= 0` after apply.  
3. Sale cannot exceed **available** = `on_hand − reserved`.  
4. Movements are **append-only**; reverse via compensating movement.  
5. SKU grain = product × size_ml; qty = whole bottles.  
6. **Only** `applyMovement()` mutates on-hand + ledger.  
7. Outbound/stock updates use `SELECT … FOR UPDATE` + version check.  

Pure helpers (unit-tested): `availableQuantity`, `resolveQuantityDelta` in `packages/db/src/inventory-math.ts`.

---

## Money

| Layer | Unit |
|-------|------|
| Database | integer `*_cents` (paisa) |
| Forms | major PKR (rupees), may be fractional |
| Conversion | `rupeesToCents` / `formatPkr` in `apps/ops/lib/money.ts` |

No multi-currency in v1–4 plans.

---

## Phase 2 tables (implemented — migration `0001_magical_starfox`)

See [PHASE2_INVOICING.md](./PHASE2_INVOICING.md).

```text
customers       id, name, email?, phone?, address_line?, city?, notes?, status, timestamps
invoices        id, number?, customer_id, status, issue/due dates, money fields,
                amount_paid_cents, notes, issued/voided/paid_at, created_by, timestamps
invoice_lines   id, invoice_id, position, variant_id?, description, quantity,
                unit_price_cents, line_total_cents, quantity_fulfilled
```

Ledger hooks: `stock_movements.ref_type = 'invoice'`, `ref_id = invoices.id` on **fulfill**.

---

## Phase 3 tables (design)

See [PHASE3_PAYMENTS.md](./PHASE3_PAYMENTS.md).

```text
payments
payment_allocations   -- optional if partials
```

---

## Phase 4

No new core SoR tables required initially — **read models / SQL aggregates** over invoices, payments, stock, and variant costs. Optional materialized views later.

---

## ER sketch (Phase 1 + hooks)

```text
user ──< session
  │
  └── (created_by) ── stock_movements ──> product_variants ──> products
                              │
                              └──> locations

Phase 2:
  customers ──< invoices ──< invoice_lines ──> product_variants?
  invoices.id ── stock_movements.ref_id (fulfill)
```

---

## Migrations

```bash
pnpm db:generate    # after schema edit
pnpm db:migrate     # needs DATABASE_URL_DIRECT or DATABASE_URL
pnpm --filter @perfume-aura/db seed   # MAIN location
```

Never edit applied SQL by hand in production; generate new migrations.
