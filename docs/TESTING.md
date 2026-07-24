# Testing — Perfume Aura

| Field | Value |
|-------|--------|
| Updated | 2026-07-24 |
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

---

## Manual smoke (local or prod)

1. Local disposable DB: `pnpm db:migrate` · DB seed · `seed:owner`.
   Production uses the staged `0007`/deploy/reconcile/`0008` runbook.
2. `pnpm dev:ops` → login  
3. New product + variant  
4. Receive stock → on-hand up  
5. Adjust −1 with note → movement log  
6. Set reorder above on-hand → appears on `/stock/low`  
7. Dashboard numbers update  
8. Product search `?q=` finds by name/SKU  

Production smoke: [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md).

---

## Not yet automated locally

| Test | When |
|------|------|
| E2E login → product → receive → low stock | Later (Playwright optional) |
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
