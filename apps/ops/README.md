# @perfume-aura/ops

Internal ops app (inventory → invoicing → payments → finance).

Product intent, user journeys, and design principles are defined in
[`PRODUCT.md`](./PRODUCT.md).

## Dev

From monorepo root:

```bash
cp apps/ops/.env.example apps/ops/.env.local
# configure DATABASE_URL, BETTER_AUTH_*, SMTP_*, OWNER_*

pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner
pnpm dev:ops
```

Open http://localhost:3000/login

Public sign-up is disabled. The owner seed is atomic and idempotent: rerunning
it repairs a partial owner/credential state but does not replace an existing
password. Use `/forgot-password` for normal recovery.

Break glass only:

```bash
CONFIRM_OWNER_RECOVERY=REVOKE_ALL_OWNER_SESSIONS \
  pnpm --filter @perfume-aura/ops recover:owner
```

This replaces the owner password and revokes every owner session in one
transaction. Never print or commit the supplied password.

Health endpoints:

- `/api/health/live` — process only
- `/api/health/ready` — generic database readiness

## Catalog and operations behavior

- Products and variants support create, edit, archive, and explicit
  reactivation. Records are never hard-deleted.
- Product archive is atomic across its active variants and preserves stock
  balances and movement history. Reactivating a product does not silently
  reactivate its variants; each SKU must be reviewed and restored explicitly.
- Archived products and variants remain visible in catalog detail/history but
  are excluded from new stock and invoice selectors.
- Manual receive/adjust also rechecks active product and variant state inside
  the database transaction. Exact retries remain replayable after archival;
  already-issued invoice lines may still fulfill as the explicit in-flight
  exception.
- Products, customers, invoices, payments, and stock movements use bounded
  server pagination with URL-backed filters and stable ordering.
- Invoice detail paginates its own payment history with `paymentsPage`, total
  metadata, and canonical URL recovery instead of presenting a truncated list.
- Sale movements label captured fulfillment-time COGS separately from
  migration-time legacy estimates.
- Protected layouts use the cached request session and only the low-stock count;
  full dashboard metrics are loaded on `/dashboard`.

## shadcn (official only)

```bash
pnpm dlx shadcn@latest add <component> -c apps/ops -y
pnpm dlx shadcn@latest preset resolve -c apps/ops   # expect b23PPibQOI
```

Components install into `packages/ui`. CSS tokens: `packages/ui/src/globals.css`. See root **AGENTS.md**.

## Hostinger

Deploy as **Node.js Web App** (not classic Git). See `docs/DEPLOY.md`.
