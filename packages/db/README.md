# `@perfume-aura/db`

Drizzle ORM schema, Neon Postgres client, and ledger-first inventory helpers for Perfume Aura ops.

## Stack

| Piece | Choice |
|-------|--------|
| ORM | **drizzle-orm 0.45.x** |
| Driver | **node-postgres (`pg`) Pool** — interactive transactions + `FOR UPDATE` |
| Database | **Neon Postgres** |
| Money | **PKR integer cents** (`cost_cents`, `retail_cents`) |
| Inventory | **Ledger-first** via `applyMovement()` |

Do **not** use `neon-http` for stock writes (no multi-step transactions).

## Environment

```bash
# App / pooled Neon connection (ops runtime)
DATABASE_URL=postgresql://...

# Direct (non-pooled) URL for drizzle-kit migrate (preferred)
DATABASE_URL_DIRECT=postgresql://...
```

`drizzle.config.ts` uses `DATABASE_URL_DIRECT || DATABASE_URL`.

## Scripts

From monorepo root:

```bash
# Install (already in workspace)
pnpm install

# Generate SQL migrations from schema
pnpm db:generate
# or: pnpm --filter @perfume-aura/db generate

# Apply migrations
pnpm db:migrate
# or: pnpm --filter @perfume-aura/db migrate

# Seed MAIN location (after migrate)
pnpm --filter @perfume-aura/db seed
```

Package scripts:

| Script | Command |
|--------|---------|
| `generate` | `drizzle-kit generate` |
| `migrate` | `drizzle-kit migrate` |
| `seed` | `tsx src/seed.ts` (or node with loader) |
| `typecheck` | `tsc --noEmit` |

## Schema overview

| Table | Purpose |
|-------|---------|
| `user`, `session`, `account`, `verification` | Better Auth (`user.role` defaults to non-privileged `user`) |
| `rate_limit` | Better Auth durable rate-limit counters |
| `products` | Perfume catalog |
| `product_variants` | SKU × size; `quantity_on_hand`, `version` |
| `locations` | Warehouses (`MAIN` seeded) |
| `stock_movements` | Append-only ledger |
| `document_number_counters` | Atomic `(kind, year)` invoice/payment numbering |

Phase 02 expansion added nullable `payments.idempotency_key` and nullable sale
`stock_movements.unit_cost_cents` / `cost_basis`; existing rows were
deterministically backfilled. Migration `0007_phase04_auth_expansion` adds the
official Better Auth `rate_limit` model, changes the role default to `user`,
and adds the generated verification lookup index.

Migration `0008_phase03_contract` is the separately ordered contract:
validated financial/inventory/lifecycle checks, required payment number and
idempotency key, and the `stock_movements` update/delete trigger. Historical
stock rows are append-only; corrections use compensating movements. Payment
immutability remains deliberately deferred until a linked reversal model
exists.
Invoice line ordering is protected by the named unique index
`invoice_lines_invoice_id_position_unique` on `(invoice_id, position)`;
preflight and reconciliation block duplicate legacy positions before it is
created. The following migration similarly protects product-variant grain with
`product_variants_product_id_size_ml_unique` and adds the reviewed
`session.user_id`, `account.user_id`, and unfiltered `invoices.created_at`
indexes.

The same rollout checks require clean invoice subtotal caches, at least one line
on every non-draft invoice, zero fulfillment on free-text lines and draft/void
invoices, and aggregate fulfillment equality at `(invoice_id, variant_id)`. A
matching nonzero line/sale aggregate does not make draft or void fulfillment
valid. The aggregate comparison uses only invoice-referenced `sale` movements;
returns are not netted until a linked reversal model exists. It cannot
attribute multiple same-variant lines individually because movements have no
`invoice_line_id`.

## Phase 02 migration safety

Only use an explicitly disposable loopback PostgreSQL URL for repository tests:

```bash
TEST_DATABASE_URL='postgresql://...@127.0.0.1:55432/perfume_aura_phase02_admin' \
  pnpm --filter @perfume-aura/db test:phase02-migrations
```

The guard rejects missing, remote/provider, ambiguous, and production-like
targets. It never loads `apps/ops/.env.local`. The shared guard accepts only
lowercase names matching `perfume_aura_phaseNN_<purpose>` on loopback, so the
Phase 02 tooling above remains compatible while later phase suites can use
explicit names such as `perfume_aura_phase03_root_admin`.

| Script | Purpose |
|--------|---------|
| `test:phase02-safety` | URL refusal tests |
| `test:phase02-migrations` | Fresh and exact-`0002` migration/catalog tests |
| `migrate:phase02-test` | Guarded Drizzle Kit migrate against local PostgreSQL |
| `preflight:phase02` | Exact-`0002` rollout blocker |
| `reconcile:phase02` | Post-expansion cleanup/contract readiness |

Operator role separation and the ordered auth-expansion/contract boundary are documented in
[`docs/DATABASE_MIGRATION_AND_ROLE_RUNBOOK.md`](../../docs/DATABASE_MIGRATION_AND_ROLE_RUNBOOK.md)
and
[`docs/PHASE02_FUTURE_DATABASE_CONTRACT.md`](../../docs/PHASE02_FUTURE_DATABASE_CONTRACT.md).

Phase 04 migration proof:

```bash
TEST_DATABASE_URL='postgresql://...@127.0.0.1:55432/perfume_aura_phase04_root_admin' \
  pnpm --filter @perfume-aura/db test:phase04-migrations
```

This covers a fresh database and a clean exact-`0006` upgrade. The full
business integration suite expects migrations through `0008`.

## Inventory API

```ts
import { applyMovement, seedMainLocation } from "@perfume-aura/db";

await seedMainLocation();

// Receive 10 bottles
await applyMovement({
  variantId,
  type: "receive",
  quantity: 10,
  userId,
  idempotencyKey: "recv-po-123",
});

// Sale 1
await applyMovement({
  variantId,
  type: "sale",
  quantity: 1,
  userId,
});

// Adjust (+3 or -2) — note required, signed quantityDelta
await applyMovement({
  variantId,
  type: "adjust",
  quantityDelta: -2,
  note: "Cycle count correction",
  userId,
});
```

### Rules

1. Single write path: **`applyMovement()` only** for balance changes.
2. One transaction: manual receive/adjust locks product then variant; other
   movements lock the variant; ledger insert and cached balance update commit
   together.
3. Never go negative on-hand.
4. Sales also respect available = `on_hand - qty_reserved`.
5. `idempotencyKey` returns the prior result without double-applying.
6. Manual receive/adjust requires both product and variant to be active.
   Fulfillment is the deliberate exception: an already-issued invoice may
   finish against an archived SKU, preserving the in-flight sales contract.

## Package exports

```ts
import {
  db,
  pool,
  applyMovement,
  seedMainLocation,
  products,
  productVariants,
  stockMovements,
  locations,
  user,
  session,
  account,
  verification,
  // Drizzle operators — always from this package in apps (never "drizzle-orm" directly)
  and,
  count,
  desc,
  eq,
  inArray,
  like,
  lte,
  sql,
} from "@perfume-aura/db";
```

`package.json` exports `"."` → `./src/index.ts` for monorepo TypeScript consumption.

**Official monorepo rule:** apps import operators only from `@perfume-aura/db` so there is one drizzle-orm instance under pnpm. Only operators that are used are re-exported; extend the list in `src/index.ts` when a new query needs another operator.
