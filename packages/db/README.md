# Database package

`@perfume-aura/db` owns the Drizzle schema, migrations, transactional workflows,
runtime grants, and database tests for ops and storefront.

## Connections

- `DATABASE_URL` — restricted pooled runtime connection.
- `DATABASE_URL_DIRECT` — direct owner connection for migrations and grants.
- `TEST_DATABASE_URL` — disposable loopback PostgreSQL used only by tests.

Never use the runtime role for DDL and never point tests at Neon or another
remote provider.

## Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/db test:unit
TEST_DATABASE_URL='<disposable-loopback-url>' \
  pnpm --filter @perfume-aura/db test:integration
```

Full integration tests expect all migrations through `0010_curved_puma`.
Production migration order is isolated Neon branch, reviewed production direct
connection, then `packages/db/sql/ops-runtime-grants.sql`.

## Safety contracts

- Runtime writes use pooled `pg` and Drizzle interactive transactions.
- Retried transactions rerun the complete callback only for serialization and
  deadlock errors.
- Product and variant edits use version guards.
- Stock movements are append-only and idempotent.
- Invoice/payment, fulfillment, reservations, orders, and provider events are
  server-authoritative and retry-safe.
- Money persists as integer INR paise.
- Public catalog queries use a controlled projection that excludes private
  operational data.

The disposable database guard accepts only loopback hosts and lowercase names
matching `perfume_aura_phaseNN_<purpose>`. It rejects missing URLs, query
parameters, provider hosts, and production-like names. Tests never fall back to
`DATABASE_URL`.

## Main modules

| Module | Responsibility |
|---|---|
| `schema/` | Drizzle tables, indexes, constraints, and relations |
| `transactions.ts` | Interactive transaction and retry boundary |
| `inventory.ts` | Stock writes, idempotency, and deterministic locks |
| `invoice-workflows.ts` | Invoice issue, lines, fulfillment, and voiding |
| `payment-workflows.ts` | Payment allocation and replay protection |
| `commerce-workflows.ts` | Cart, reservation, order, payment, and shipment state |
| `public-catalog.ts` | Release-gated public projection |
| `sql/ops-runtime-grants.sql` | Explicit least-privilege production grants |

Schema and retained financial contracts are summarized in
[`docs/ENGINEERING.md`](../../docs/ENGINEERING.md). Production procedures are in
[`docs/OPERATIONS.md`](../../docs/OPERATIONS.md).
