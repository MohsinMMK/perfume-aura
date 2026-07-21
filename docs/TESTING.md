# Testing — Perfume Aura

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Runner | Node.js built-in `node:test` via `tsx --test` |
| TRD ref | §9 |

---

## Commands

From monorepo root:

```bash
# Everything: unit + integration (integration skips if no DATABASE_URL)
pnpm test

# Unit only (no DB)
pnpm test:unit

# Integration only (requires Neon DATABASE_URL)
pnpm test:integration

# Package-level
pnpm --filter @perfume-aura/db test
pnpm --filter @perfume-aura/db test:unit
pnpm --filter @perfume-aura/db test:integration
pnpm --filter @perfume-aura/ops test
```

Integration loads `apps/ops/.env.local` automatically when present.

---

## Coverage map (Phase 1)

### Unit — `packages/db/src/inventory-math.test.ts`

| Case | Asserts |
|------|---------|
| availableQuantity | on_hand − reserved; never negative |
| canSell | available bounds; reserved blocks sale |
| quantityAfterDelta | signed math |
| resolveQuantityDelta | receive/return +, sale/damage −, adjust rules |

### Unit — `apps/ops/lib/money.test.ts`

| Case | Asserts |
|------|---------|
| rupeesToCents | major → paisa integers |
| formatPkr | `Rs` prefix, decimals |
| formatQty | integer display |

### Integration — `packages/db/src/inventory.integration.test.ts`

| Case | Asserts |
|------|---------|
| Concurrent sell last unit | Exactly one success; on_hand = 0; one sale row |
| Failed outbound | No orphan movement; qty unchanged (TX rollback) |
| Idempotency key | Second call returns same movement; no double receive |

Creates and cleans temporary product/variant rows.

---

## Manual smoke (local or prod)

1. `pnpm db:migrate` · `pnpm --filter @perfume-aura/db seed` · `seed:owner`  
2. `pnpm dev:ops` → login  
3. New product + variant  
4. Receive stock → on-hand up  
5. Adjust −1 with note → movement log  
6. Set reorder above on-hand → appears on `/stock/low`  
7. Dashboard numbers update  
8. Product search `?q=` finds by name/SKU  

Production smoke: [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md).

---

## Not yet automated

| Test | When |
|------|------|
| E2E login → product → receive → low stock | Later (Playwright optional) |
| Server Action auth rejection | Optional unit with mocks |
| Invoice fulfill stock (Phase 2) | With Phase 2 code |

---

## CI recommendations (when GitHub Actions added)

```yaml
# sketch only — not committed yet
- pnpm install
- pnpm test:unit
- pnpm --filter @perfume-aura/ops lint
- pnpm build:ops
# integration: only if Neon branch secret present
```

Do not run destructive integration against production Neon without isolation.

---

## Related

- [PHASE1_STATUS.md](./PHASE1_STATUS.md)  
- [DATA_MODEL.md](./DATA_MODEL.md)  
- [TRD.md](./TRD.md) §9  
