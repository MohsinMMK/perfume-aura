# Phase 02 — Database integrity and migrations

## Objective

Make invalid financial and inventory states unrepresentable, add atomic numbering and auditable cost basis, protect ledgers from mutation, and prepare a least-privilege production database contract through forward-only Drizzle migrations.

## Dependencies

Phases 00–01. Phase 01's final dependency graph and Node runtime must be stable.

## In scope

- Drizzle schema, expansion migration, contract-migration design, constraints, indexes, counters, payment idempotency storage, cost snapshots, append-only triggers, migration tests, and runtime/migration role grants.
- A redacted role and migration runbook.

## Out of scope

- Production migration or role creation; root-only in Phase 07.
- Workflow transaction refactors; Phase 03 consumes this schema.
- Replacing Better Auth with Neon Auth or another auth system.

## Confirmed evidence and root causes

- Existing tables rely mostly on Zod/application validation. Negative money, impossible fulfillment counts, and inconsistent cached balances remain writable directly.
- Document numbers use `max(number) + 1`, which races.
- Payments lack an idempotency key.
- Finance computes COGS using the variant's current cost, so historical margin changes when a product cost changes.
- `stock_movements` and `payments` are intended as ledgers but PostgreSQL permits update/delete.
- Foreign-key/filter columns lack a complete indexing strategy.
- Runtime and migration operations currently share connection-string assumptions.
- Existing migration files `0000`–`0002` are committed history and must not be edited.

## Exact implementation decisions

1. Add a `document_counters` table keyed by `(document_type, business_year)` with nonnegative `last_value`. Allocate numbers atomically with one PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING`.
2. Add `payments.idempotency_key`, backfill legacy rows as `legacy:payment:<payment-id>`, set it `NOT NULL`, and create a unique constraint.
3. Add sale cost snapshots to `stock_movements`:
   - nullable `unit_cost_cents`;
   - nullable `cost_basis` constrained to `captured` or `legacy_current`;
   - backfill existing sale rows from current variant cost and label them `legacy_current`;
   - new sale movements write the locked variant cost and label it `captured`;
   - finance reports must disclose that `legacy_current` values are estimates.
4. Add explicit database checks:
   - `product_variants`: positive size; nonnegative cost, retail, on-hand, reserved, reorder level, and version; reserved cannot exceed on-hand;
   - `stock_movements`: nonzero delta, nonnegative resulting quantity, receive/return positive, sale/damage negative, adjust requires a nonblank note, reference type/id are both null or both present, and cost/cost-basis are mutually consistent;
   - `invoice_lines`: positive quantity, nonnegative unit/line totals, `line_total_cents = quantity * unit_price_cents`, and fulfilled quantity between zero and ordered quantity;
   - `invoices`: nonnegative subtotal/tax/total/paid, `total_cents = subtotal_cents + tax_cents`, paid not above total, and draft/issued/paid/void number/timestamp/amount lifecycle consistency;
   - `payments`: positive amount, valid number format, and a nonblank idempotency key.
5. Add indexes for every operational foreign key and frequent status/date/list predicate, including invoice/customer/status/created dates, line invoice/position, payment invoice/paid date, variant product/status, and movement variant/ref/created date. Avoid speculative duplicate indexes; verify with PostgreSQL catalog queries.
6. Add append-only `BEFORE UPDATE OR DELETE` triggers for `stock_movements` and `payments`. Corrections must be compensating entries; a future reversal UI is separate work and must not mutate ledger rows.
7. Refactor integration-test cleanup to transaction rollback or disposable databases because ledger delete triggers intentionally block row cleanup.
8. Define two role contracts:
   - migration/admin role via `DATABASE_URL_DIRECT`, allowed DDL/migrations;
   - pooled runtime role via `DATABASE_URL`, no DDL, no direct ledger update/delete, and only table/sequence privileges required by the application and Better Auth.
9. Use an expand/code/contract sequence:
   - Phase 02 commits one normal Drizzle expansion migration containing additive nullable fields/tables/indexes and deterministic backfills;
   - Phase 03 implements and proves compatible transaction code and prepares the tightening SQL, but deliberately does not place its contract migration ahead of Phase 04's required additive Better Auth schema;
   - Phase 04 commits its additive Better Auth/rate-limit expansion migration first, then finalizes the subsequent contract migration containing Phase 03's `NOT NULL`/validated checks and append-only triggers;
   - record the expansion and contract migration identifiers and commit SHAs so Phase 07 can apply every expansion migration, including the Phase 04 auth expansion, before deploying code and apply only the later contract migration after the compatible ZIP is live.
10. Express normal constraints/indexes in Drizzle schema and generate them with `drizzle-kit generate`. Use Drizzle's official custom-migration command for backfills, triggers, and grants that cannot be represented by the schema DSL.
11. Test three explicit states on disposable PostgreSQL: Phase 02 domain expansion, domain plus Phase 04 auth expansion, and the final contract. Isolated Neon-branch validation is root-only in Phase 07.

## Affected subsystems

`packages/db/src/schema`, Drizzle journal/migrations, inventory, invoices, payments, finance, seeds, integration tests, environment documentation, Neon roles, and production migration procedures.

## Official documentation

- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- Drizzle Kit generate: https://orm.drizzle.team/docs/drizzle-kit-generate
- Drizzle custom migrations: https://orm.drizzle.team/docs/kit-custom-migrations
- Drizzle indexes/constraints: https://orm.drizzle.team/docs/indexes-constraints
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL indexes: https://www.postgresql.org/docs/current/indexes.html
- PostgreSQL privileges: https://www.postgresql.org/docs/current/ddl-priv.html
- PostgreSQL trigger functions: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- Neon branching: https://neon.com/docs/introduction/branching
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon Drizzle guide: https://neon.com/docs/guides/drizzle

## Required project skills

`neon`, `neon-postgres`, and `neon-postgres-branches`.

## Commands and test cases

```bash
pnpm db:generate
pnpm --filter @perfume-aura/db exec drizzle-kit generate --custom --name append-only-ledgers
pnpm --filter @perfume-aura/db typecheck
pnpm test:unit
DATABASE_URL_DIRECT=postgresql://... pnpm db:migrate
DATABASE_URL=postgresql://... pnpm test:integration
```

Required tests:

- every check constraint rejects invalid direct SQL;
- counter upsert returns unique contiguous values under concurrency;
- payment idempotency key is unique and legacy rows are labeled;
- sale snapshots remain unchanged after variant cost changes;
- legacy rows are `legacy_current`;
- update/delete on both ledger tables fails;
- runtime role cannot DDL or mutate ledger history but can run supported application/auth flows;
- migration succeeds from the exact `0002` baseline and a fresh empty database;
- expansion-only and expansion-plus-contract upgrade paths both pass from the exact `0002` baseline.

## Rollback

Phase 07 captures the Neon restore point and row counts. Before contract activation, the previous ZIP may be used only if it was explicitly proven compatible with the expansion schema. After contract activation, the old ZIP is not a valid rollback. A database restore is allowed only while the cutover write freeze is still intact and no post-cutover write exists; otherwise preserve ledger history and roll forward.

## Completion evidence

- Generated migration SQL is reviewed and matches schema decisions.
- Fresh and baseline-upgrade migrations pass.
- Constraint, counter, cost snapshot, trigger, and role tests pass.
- Expansion-only and final migration journals/hashes are recorded for later Neon comparison.
- No production mutation occurred before Phase 07.

## Prohibited shortcuts

- No `drizzle-kit push` against production.
- No editing `0000`–`0002`.
- No floating-point money.
- No application-only constraint in place of a database constraint.
- No privileged runtime connection and no trigger bypass flag hidden in application code.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 02 file. Implement the additive expansion migration, complete contract design, migration/constraint tests valid at the expansion stage, and redacted least-privilege role runbook. Record the expansion commit boundary for Phase 07. Use official Drizzle generation and custom migration paths. Do not connect to or mutate Neon or production; use a disposable local/CI PostgreSQL database. Do not edit migrations `0000`–`0002`, expose credentials, stage, or commit. Return generated SQL, test evidence, catalog/index evidence, and rollback notes to the root agent.
