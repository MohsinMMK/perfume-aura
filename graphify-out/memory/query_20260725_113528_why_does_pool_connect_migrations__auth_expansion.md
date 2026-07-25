---
type: "query"
date: "2026-07-25T11:35:28.129950+00:00"
question: "Why does pool connect migrations, auth expansion, products, transactions, and reconciliation?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["pool", "migrateThroughAuthExpansion", "runPhase02Reconciliation", "db/src/index.ts", "transactions.ts", "updateVariantAction", "issueInvoice", "DomainError"]
---

# Q: Why does pool connect migrations, auth expansion, products, transactions, and reconciliation?

## Answer

Expanded from original query via graph vocab: [pool, migrations, integration, phase, auth, expansion, product, workflows, variant, transactions, domain, reconciliation]. `pool` is the shared PostgreSQL Pool exported from packages/db/src/client.ts:L19. Direct EXTRACTED reference edges connect it to migrateThroughAuthExpansion at migrate-through-auth-expansion.ts:L204, runPhase02Preflight at phase02-preflight.ts:L42, runPhase02Reconciliation at phase02-reconcile.ts:L43, and migration integration helpers at phase02-migrations.integration.test.ts:L178-L201/L637/L788 and phase04-migrations.integration.test.ts:L49-L66. Indirect EXTRACTED paths cross communities through two hubs: packages/db/src/index.ts:L1 re-exports pool, DomainError, and issueInvoice; packages/db/src/client.ts contains pool and is imported by transactions.ts. Product flow reaches pool through db/src/index.ts -> apps/ops/lib/products.ts -> updateVariantAction at apps/ops/lib/products.ts:L439. Therefore pool is infrastructure bridge, not domain orchestrator: migration, reconciliation, transactions, invoice, and product modules converge on same DB boundary.

## Outcome

- Signal: useful

## Source Nodes

- pool
- migrateThroughAuthExpansion
- runPhase02Reconciliation
- db/src/index.ts
- transactions.ts
- updateVariantAction
- issueInvoice
- DomainError