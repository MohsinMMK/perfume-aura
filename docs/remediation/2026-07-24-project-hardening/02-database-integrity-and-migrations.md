# Phase 02 — Database integrity and migrations

## Objective

Make invalid financial and inventory states unrepresentable, add atomic numbering and auditable cost basis, protect ledgers from mutation, and prepare a least-privilege production database contract through forward-only Drizzle migrations.

## Dependencies

Phases 00–01. Phase 01's final dependency graph and Node runtime must be stable.

## In scope

- Drizzle schema, expansion migration, contract-migration design, constraints, indexes, counters, payment idempotency storage, cost snapshots, the future stock-ledger trigger, migration tests, and runtime/migration role grants.
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
- `stock_movements` is a reversible quantity ledger and PostgreSQL permits update/delete.
- Payments have no reversal/credit-note representation. A positive-only immutable payment table would make correction impossible and must not receive an append-only trigger yet.
- Foreign-key/filter columns lack a complete indexing strategy.
- Runtime and migration operations currently share connection-string assumptions.
- Existing migration files `0000`–`0002` are committed history and must not be edited.

## Exact implementation decisions

1. Add a `document_number_counters` table keyed by `(kind, year)`, limit `kind` to `invoice` or `payment`, require nonnegative `last_value`, and retain an updated timestamp. Allocate numbers atomically with one PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING`.
2. Add nullable `payments.idempotency_key`, backfill every existing row as `legacy:<payment-id>`, and create a unique constraint. It remains nullable only for pre-Phase-03 code compatibility during expansion; the later post-Phase-04 contract migration makes it required.
3. Add sale cost snapshots to `stock_movements`:
   - nullable `unit_cost_cents`;
   - nullable `cost_basis` constrained to `snapshot` or `legacy_current`;
   - backfill existing sale rows from current variant cost and label them `legacy_current`;
   - new sale movements write the locked variant cost and label it `snapshot`;
   - finance reports must disclose that `legacy_current` values are estimates.
4. Add explicit database checks:
   - `product_variants`: one row per `(product_id, size_ml)`, positive size; nonnegative cost, retail, on-hand, reserved, reorder level, and version; reserved cannot exceed on-hand;
   - `stock_movements`: nonzero delta, nonnegative resulting quantity, receive/return positive, sale/damage negative, adjust requires a nonblank note, reference type/id are both null or both present, and cost/cost-basis are mutually consistent;
   - `invoice_lines`: one row per `(invoice_id, position)`, positive quantity, nonnegative unit/line totals, `line_total_cents = quantity * unit_price_cents`, fulfilled quantity between zero and ordered quantity, and zero fulfillment for free-text lines;
   - `invoices`: nonnegative subtotal/tax/total/paid, `total_cents = subtotal_cents + tax_cents`, paid not above total, and draft/issued/paid/void number/timestamp/amount lifecycle consistency; void invoices require `amount_paid_cents = 0` and reconciliation must prove an authoritative payment sum of zero;
   - `payments`: positive amount, valid number format, and a nonblank idempotency key.
5. Add indexes for every operational foreign key and frequent status/date/list predicate, including auth `session.user_id` / `account.user_id`, invoice/customer/status/created dates, a named unique index on invoice line `(invoice_id, position)`, payment invoice/paid date, a named unique product-variant index on `(product_id, size_ml)`, variant status, and movement variant/ref/created date. Avoid speculative duplicate indexes; verify ordered columns, uniqueness, and coverage with PostgreSQL catalog queries.
6. Design an append-only `BEFORE UPDATE OR DELETE` trigger for `stock_movements`, but do not activate it in the expansion migrations. The later post-Phase-04 contract migration adds it only after compatible code and cleanup paths are live; stock corrections use compensating movements.
7. **Intentional safety deviation:** do not design or activate a payments append-only trigger and do not claim that another positive payment can compensate for an error. Payment immutability is deferred until a linked reversal/credit-note representation, authorization rules, and authoritative net-sum semantics exist. Runtime still receives only `SELECT, INSERT` on payments; exceptional correction remains an audited administrator procedure until the reversal model is implemented.
8. Define two role contracts:
   - migration/admin role via `DATABASE_URL_DIRECT`, allowed DDL/migrations;
   - pooled runtime role via `DATABASE_URL`, no DDL, no stock-ledger update/delete, `SELECT, INSERT` only on payments, and only table privileges required by actual application and Better Auth operations. Sequence grants are deferred until the Phase 04 inventory proves one is required.
9. Use an expand/code/contract sequence:
   - Phase 02 commits an ordered Drizzle expansion set containing additive nullable fields/tables/indexes, deterministic backfills, the invoice-line position uniqueness correction, and the remaining product/auth/invoice index correction;
   - Phase 03 implements and proves compatible transaction code and prepares the tightening SQL, but deliberately does not place its contract migration ahead of Phase 04's required additive Better Auth schema;
   - Phase 04 commits its additive Better Auth/rate-limit expansion migration first, then finalizes the subsequent contract migration containing Phase 03's `NOT NULL`/validated checks and the stock-movement append-only trigger;
   - record the expansion and contract migration identifiers and commit SHAs so Phase 07 can apply every expansion migration, including the Phase 04 auth expansion, before deploying code and apply only the later contract migration after the compatible ZIP is live.
10. Express expansion-safe fields, the new-table checks, and indexes in Drizzle schema and generate them with `drizzle-kit generate`. Use Drizzle's official custom-migration command for deterministic legacy backfills. Preserve every generated journal entry as the ordered Phase 02 expansion set; never rewrite committed entries. Triggers, grants, `NOT NULL`, and legacy-table checks are exact design inputs for the later post-Phase-04 contract migration, not Phase 02 DDL.
11. Test the Phase 02 expansion from both the exact `0002` baseline and a fresh empty disposable PostgreSQL database. Record future test expectations for domain plus Phase 04 auth expansion and the final contract, but do not create or number those migrations in Phase 02. Isolated Neon-branch validation is root-only in Phase 07.
12. Keep two reconciliation stages distinct:
   - `packages/db/sql/phase02-preflight-0002.sql` runs before expansion and references only the exact `0002` schema; any nonzero or ambiguous result halts rollout;
   - `packages/db/sql/phase02-reconciliation.sql` runs after every Phase 02 expansion entry and must be clean before compatible code or the later contract is activated.
13. Reconcile invoice caches and fulfillment before rollout: invoice subtotal must equal the sum of line totals; each non-draft invoice must have at least one line; free-text fulfillment must be zero; draft and void invoices must have zero line and authoritative sale fulfillment even when the two aggregates match; and summed line fulfillment must equal the negative sum of invoice-referenced sale deltas at `(invoice_id, variant_id)`. Returns are not netted. This is an aggregate rollout/application invariant—not a cross-row `CHECK`—because stock movements do not identify an invoice line, so multiple same-variant lines cannot be attributed individually.

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
pnpm --filter @perfume-aura/db exec drizzle-kit generate --custom --name phase02_legacy_backfill
pnpm --filter @perfume-aura/db typecheck
pnpm test:unit
TEST_DATABASE_URL=postgresql://... pnpm --filter @perfume-aura/db preflight:phase02
DATABASE_URL_DIRECT=postgresql://... pnpm db:migrate
TEST_DATABASE_URL=postgresql://... pnpm --filter @perfume-aura/db reconcile:phase02
DATABASE_URL=postgresql://... pnpm test:integration
```

Required tests:

- expansion-safe new-table checks reject invalid counter kinds and negative values;
- counter backfill starts after every valid legacy document number;
- payment idempotency key is unique and legacy rows are labeled;
- legacy rows are `legacy_current`;
- pre-Phase-03 inserts that omit the new nullable fields remain valid;
- reconciliation reports every row that must be clean before contract activation;
- migration succeeds from the exact `0002` baseline and a fresh empty database;
- duplicate invoice-line positions block exact-`0002` preflight and post-expansion reconciliation, the unique-index migration refuses unresolved duplicates, and the final catalog reports the named index as unique;
- duplicate product-variant sizes likewise block preflight/reconciliation and make their unique-index migration refuse until cleaned;
- the fixture matrix independently makes every required reconciliation category nonzero, including counters, number format/range/collision defects, invalid product/stock/payment rows, customer/idempotency/cost defects, inventory/payment/subtotal cache mismatches, missing non-draft lines, aggregate fulfillment mismatches, free-text fulfillment, and draft/void fulfillment;
- the catalog test proves every reviewed index's exact ordered columns and uniqueness, including auth user foreign keys and unfiltered invoice creation date;
- future contract tests specify that invalid direct SQL, stock-ledger mutation, missing payment idempotency, and missing sale snapshots must fail after the post-Phase-04 contract is activated, while confirming no payment trigger exists before the reversal model;
- the redacted role design specifies that runtime cannot DDL or mutate ledger history while migration/admin can apply forward migrations, and verifies effective table privileges with `has_table_privilege` so inherited/`PUBLIC` access cannot be missed.

## Rollback

Phase 07 captures the Neon restore point and row counts. Before contract activation, the previous ZIP may be used only if it was explicitly proven compatible with the expansion schema. After contract activation, the old ZIP is not a valid rollback. A database restore is allowed only while the cutover write freeze is still intact and no post-cutover write exists; otherwise preserve ledger history and roll forward.

## Completion evidence

- Generated migration SQL is reviewed and matches schema decisions.
- Fresh and baseline-upgrade migrations pass.
- Expansion constraints, counter initialization, deterministic backfills, indexes, and compatibility tests pass.
- The ordered Phase 02 expansion migration journals/hashes and the unnumbered future contract design are recorded for later comparison.
- No production mutation occurred before Phase 07.

## Prohibited shortcuts

- No `drizzle-kit push` against production.
- No editing `0000`–`0002`.
- No floating-point money.
- No application-only constraint in place of a database constraint.
- No privileged runtime connection and no trigger bypass flag hidden in application code.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 02 file. Implement the additive expansion migration, complete contract design, migration/constraint tests valid at the expansion stage, and redacted least-privilege role runbook. Record the expansion commit boundary for Phase 07. Use official Drizzle generation and custom migration paths. Do not connect to or mutate Neon or production; use a disposable local/CI PostgreSQL database. Do not edit migrations `0000`–`0002`, expose credentials, stage, or commit. Return generated SQL, test evidence, catalog/index evidence, and rollback notes to the root agent.
