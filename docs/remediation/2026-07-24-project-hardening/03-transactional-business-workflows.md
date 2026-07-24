# Phase 03 — Transactional business workflows

## Objective

Make product creation, stock movements, invoice issue/void, payments, and fulfillment atomic, idempotent, race-safe, and deterministic under the approved business timezone.

## Dependencies

Phase 02 schema and migration tests complete. Phase 04 may proceed only after workflow interfaces stabilize.

## In scope

- Drizzle/`pg` transactions, row locks, fixed lock order, atomic counters, idempotency, whole-request fulfillment, business-time calculations, cache reconciliation, and concurrency/integration tests.

## Out of scope

- New payment gateways, tax engines, multi-currency, multi-location balance redesign, or accounting general ledger.
- Production database execution.

## Confirmed evidence and root causes

- Product plus first variant uses manual delete-on-error instead of one transaction.
- Invoice line insertion and invoice total recalculation are separate transactions.
- Invoice/payment numbers use racing `max + 1` queries.
- Payment insert and invoice paid-cache update are separate; concurrent payments can overpay or lose an update.
- Fulfillment loops through lines, calling one stock transaction per line and updating fulfillment separately. A later failure can leave a partially fulfilled request.
- Several state updates check status before writing but do not lock the row or include the expected state in the write condition.
- Stock idempotency is checked before the variant lock; concurrent identical requests can still collide at insertion.
- Server-local dates use the host timezone. The approved business timezone is `Asia/Karachi`.

## Exact implementation decisions

1. Add and validate `BUSINESS_TIMEZONE=Asia/Karachi`; use it for invoice/payment numbering year, invoice issue date, finance period boundaries, and user-facing business dates. Store instants in UTC.
2. Run every domain transaction at explicit PostgreSQL `READ COMMITTED`, read-write. Retry the complete transaction at most three times with jitter only for SQLSTATE `40001` or `40P01`.
3. Create transaction-scoped helpers rather than starting nested transactions:
   - `allocateDocumentNumberTx`;
   - `applyMovementTx`, with `applyMovement` as a public wrapper;
   - `recalculateInvoiceTotalsTx`;
   - payment and fulfillment helpers accepting the active Drizzle transaction.
4. Use this fixed lock order whenever applicable:
   1. aggregate row (`invoice` or `product`);
   2. child rows ordered by primary key;
   3. related variant rows ordered by primary key;
   4. the `(document_type, business_year)` counter;
   5. append-only ledger insert;
   6. cached aggregate update.
   No path may acquire the same resources in reverse order.
5. Product and optional first variant insert in one transaction; remove compensating delete logic.
6. Adding/removing invoice lines locks the draft invoice, changes lines, and recalculates totals in the same transaction.
7. Invoice issue locks the invoice, proves it is still draft and has lines, allocates its counter, and performs a conditional state update in one transaction. Repeated submission returns the already-issued document rather than allocating another number.
8. Payment input requires a stable UUID idempotency key. In one transaction, lock the invoice, verify a reused key matches the original invoice, amount, method, and effective date, validate the invoice is `issued` and the authoritative remaining balance, allocate the payment counter, insert a positive payment, recompute paid total, and update invoice status/cache. A mismatched reused key is a conflict.
9. Whole-request fulfillment is all-or-nothing:
   - lock invoice and selected lines;
   - determine remaining quantities;
   - lock all unique variants in sorted order;
   - validate all stock before any mutation;
   - insert every sale movement with captured cost and deterministic idempotency keys;
   - update every variant and line;
   - commit once.
   Any error rolls back every line in the request.
10. Move stock idempotency lookup after the deterministic variant lock and verify an existing key matches its original operation.
11. Void locks and revalidates the invoice, returns success only for an already-void invoice, and otherwise permits voiding only an `issued` invoice with zero authoritative payment sum and zero fulfilled quantity. Any payment or fulfillment blocks void.
12. Archive operations lock and revalidate aggregate state. Product archive must preserve discoverability of on-hand/reserved inventory.
13. Recompute financial caches from ledger sums inside the lock rather than trusting stale client/read values.
14. After compatible code and tests pass, prepare the contract SQL with required payment/cost fields, validated checks, and a stock-movement append-only trigger. Do not add a payment trigger until the schema includes a linked reversal/credit representation and authoritative net-sum reconciliation; a second positive payment is not compensation. Phase 04 must first commit its additive Better Auth/rate-limit expansion migration; only then may this SQL be finalized as the next ordered Drizzle migration. All provider application remains deferred to Phase 07.

## Affected subsystems

DB client types, inventory service, product/customer/invoice/payment actions, finance aggregation, validators, forms that carry idempotency keys, and integration tests.

## Official documentation

- Drizzle transactions: https://orm.drizzle.team/docs/transactions
- Drizzle update/select: https://orm.drizzle.team/docs/update
- PostgreSQL row locks: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL `INSERT ... ON CONFLICT`: https://www.postgresql.org/docs/current/sql-insert.html
- Neon connection selection: https://neon.com/docs/connect/choose-connection
- Neon pooling: https://neon.com/docs/connect/connection-pooling
- Next.js Server Action security: https://nextjs.org/docs/app/guides/data-security

## Required project skills

`neon-postgres` and `vercel-react-best-practices` (`server-auth-actions`).

## Commands and test cases

```bash
pnpm --filter @perfume-aura/db typecheck
pnpm --filter @perfume-aura/ops typecheck
pnpm test:unit
DATABASE_URL=postgresql://... BUSINESS_TIMEZONE=Asia/Karachi pnpm test:integration
```

Concurrency cases:

- 20 parallel invoice issues yield one invoice number.
- 20 parallel payment-number allocations yield unique numbers.
- two payments competing for the same remaining balance cannot overpay.
- the same payment idempotency key creates one row and one balance change.
- fulfillment of multiple lines rolls back all changes if one variant is short.
- two fulfill requests cannot double-decrement stock or exceed ordered quantity.
- product plus initial variant rolls back together on duplicate SKU.
- business year/date around UTC midnight follows `Asia/Karachi`.
- failed operations leave no orphan ledger row or stale cache.

## Rollback

Keep schema-compatible wrappers while refactoring. If a workflow fails review, revert the workflow commit before deployment and retain the additive Phase 02 schema unused. Never repair a partial production ledger with deletes. A pre-deploy restore is allowed only before post-cutover writes; otherwise use approved compensating entries or roll forward.

## Completion evidence

- Transaction boundaries and lock order are documented in code and tests.
- All race/idempotency/rollback cases pass repeatedly on PostgreSQL.
- No workflow uses `max(number) + 1`.
- No whole-request fulfillment can partially commit.
- Every mutation authenticates inside the server action.

## Prohibited shortcuts

- No `neon-http` ledger writes.
- No nested independent transaction inside fulfillment/payment.
- No process-local mutex or timestamp/random document numbering.
- No client-generated total or status trusted as authoritative.
- No swallowing unique/deadlock errors as generic success.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 03 file. Implement the bounded transaction/idempotency/timezone refactor and its PostgreSQL integration tests. Use `pg` Pool, Drizzle interactive transactions, the stated fixed lock order, counter upserts, stable payment idempotency, captured cost, and whole-request fulfillment. Do not touch auth UI, CI, documentation outside directly affected contracts, Neon, Hostinger, or production. Do not stage or commit. Return exact race-test evidence and any remaining deadlock or rollback risk.
