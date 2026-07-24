# Testing — Perfume Aura

| Field | Value |
|-------|--------|
| Updated | 2026-07-25 |
| Runner | Node.js built-in `node:test` via `tsx --test` |
| TRD ref | §9 |

---

## Commands

From monorepo root:

```bash
# Everything (guarded DB integration skips if TEST_DATABASE_URL is absent)
pnpm test

# Unit only (no DB)
pnpm test:unit

# Integration only (requires a disposable loopback PostgreSQL database)
TEST_DATABASE_URL='postgresql://...@127.0.0.1:55432/perfume_aura_phase04_root_admin' \
  pnpm test:integration

# Package-level
pnpm --filter @perfume-aura/db test
pnpm --filter @perfume-aura/db test:unit
pnpm --filter @perfume-aura/db test:integration
pnpm --filter @perfume-aura/db test:phase04-migrations
pnpm --filter @perfume-aura/ops test
```

Integration never loads `apps/ops/.env.local`. The shared guard rejects
missing, remote/provider, query-parameter, ambiguous, and production-like
targets; use only a disposable loopback database named
`perfume_aura_phaseNN_<purpose>`.

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
| Archived manual mutation | Receive/adjust reject archived product or variant without a ledger row |
| Archived retry | Exact receive/adjust replay remains idempotent after archive; conflicting key reuse fails |
| Archive race | Concurrent receive/adjust versus product archive has only serially valid outcomes |

Test-owner cleanup uses transaction-local trigger bypass only after assertions;
runtime append-only behavior is independently proven as SQLSTATE `55000`.

### Phase 04 security and migration coverage

| File | Coverage |
|------|----------|
| `apps/ops/lib/auth.integration.test.ts` | disabled sign-up; owner/non-owner real sessions; deleted/expired stale-cookie denial; page versus action authorization decisions; password/reset policy; single-use/expired token; revocation; generic known/unknown reset response; durable rate limit; atomic seed/repair/break-glass |
| `apps/ops/lib/auth-policy.test.ts` | exact origins and malicious return-path rejection |
| `apps/ops/lib/mail.test.ts` | Hostinger TLS/STARTTLS mapping, escaped mail, origin validation, redacted failure |
| `apps/ops/lib/auth-source-contract.test.ts` | protected-page owner checks, static login, reset success and unavailable-session ordering |
| `packages/db/src/phase04-migrations.integration.test.ts` | fresh and exact-`0006` bounded paths, pre/post journal count/hash verification, exact `0007` stop boundary, already-`0008` refusal without success output, final `0008` checks/nullability/trigger |
| `packages/db/src/phase03-workflows.integration.test.ts` | product/variant edits preserve balances, version/timestamp stale-write rejection, atomic archive, product-only reactivation, explicit per-variant restore, add-line/archive serialization, and the explicit archived-SKU fulfillment exception |
| `apps/ops/lib/pagination.test.ts` | positive-page parsing, bounded page size, stable offsets/totals, custom page parameters, and preserved query state |
| `apps/ops/lib/phase05-ui-contract.test.ts` | no native confirm/alert, Radix `asChild`, Base Button-rendered links, `space-y-*`, or pending spinners without `data-icon`; pending Base Buttons preserve focus; all growing lists stay bounded and stable; invoice payment history is paginated; simultaneous stock labels have unique targets; layout uses cached session plus low-stock-only query |

---

## Manual smoke (local or prod)

1. Local disposable DB: `pnpm db:migrate` · DB seed · `seed:owner`.
   Production uses the staged `0007`/deploy/reconcile/`0008` runbook.
2. `pnpm dev:ops` → login  
3. New product + variant; edit both
4. Receive stock → on-hand up  
5. Adjust −1 with note → movement log  
6. Set reorder above on-hand → appears on `/stock/low`  
7. Dashboard numbers update  
8. Product search/status filter preserves terms across paginated URLs
9. Archive product → balances/history stay visible → reactivate product →
   explicitly reactivate the reviewed variant
10. Keyboard-open and cancel/confirm each consequential Alert Dialog; verify
    focus returns to its trigger and errors stay announced

Production smoke: [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md).

---

## Not yet automated locally

| Test | When |
|------|------|
| Full browser lifecycle regression suite | Phase 05 uses Playwright CLI against a disposable local PostgreSQL app; keep production/provider browser proof for Phase 07 |
| Real browser owner/non-owner routes | Phase 07 against isolated deployed state |
| Hostinger mailbox receipt/reset link | Phase 07 root-only provider verification |

---

## CI recommendations (when GitHub Actions added)

```yaml
# sketch only — not committed yet
- pnpm install
- pnpm test:unit
- pnpm --filter @perfume-aura/ops lint
- pnpm build:ops
# integration: only against an isolated disposable PostgreSQL service
```

Never run repository integration tests against Neon or any provider database.

---

## Related

- [PHASE1_STATUS.md](./PHASE1_STATUS.md)  
- [DATA_MODEL.md](./DATA_MODEL.md)  
- [TRD.md](./TRD.md) §9  
