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
| `user`, `session`, `account`, `verification` | Better Auth (+ `user.role` default `owner`) |
| `products` | Perfume catalog |
| `product_variants` | SKU × size; `quantity_on_hand`, `version` |
| `locations` | Warehouses (`MAIN` seeded) |
| `stock_movements` | Append-only ledger |

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
2. One transaction: lock variant → insert movement → update `quantity_on_hand` + `version`.
3. Never go negative on-hand.
4. Sales also respect available = `on_hand - qty_reserved`.
5. `idempotencyKey` returns the prior result without double-applying.

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
  lte,
  sql,
} from "@perfume-aura/db";
```

`package.json` exports `"."` → `./src/index.ts` for monorepo TypeScript consumption.

**Official monorepo rule:** apps import operators only from `@perfume-aura/db` so there is one drizzle-orm instance under pnpm. Only operators that are used are re-exported; extend the list in `src/index.ts` when a new query needs another operator.
