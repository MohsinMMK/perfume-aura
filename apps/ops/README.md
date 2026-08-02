# @perfume-aura/ops

Internal ops app (inventory → invoicing → payments → finance).

Product behavior and user journeys are defined in
[`docs/PRODUCT.md`](../../docs/PRODUCT.md).

## Dev

From monorepo root:

```bash
cp apps/ops/.env.example apps/ops/.env.local
# configure DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_*, SMTP_*, OWNER_*
# Export command-required values explicitly; do not source .env.local because
# display-name values such as SMTP_FROM may not be shell syntax.
export DATABASE_URL='postgresql://...@127.0.0.1:5432/perfume_aura'
export DATABASE_URL_DIRECT="$DATABASE_URL"
export BETTER_AUTH_SECRET='local-secret-at-least-32-chars'
export BETTER_AUTH_URL='http://localhost:3000'
export OWNER_EMAIL='owner@example.com'
export OWNER_PASSWORD='replace-with-12-plus-chars'

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

## Staff operations and mandatory 2FA

The Admin and 2FA plugins are installed through Better Auth's official
Drizzle schema path. Ops accepts only one exact role: `owner`, `staff`, or
`user`; unknown and comma-separated roles are denied. Only the owner can
manage commercial catalog fields, financial actions, COD reconciliation,
release gates, staff, or audit history. Staff may fulfill shipments but cannot
settle COD.

Both security flags remain `false` by default. Do not enable either until the
reviewed `0010_curved_puma` migration and `packages/db/sql/ops-runtime-grants.sql`
are applied through the direct owner connection, Hostinger SMTP delivery is
proven, and the owner has enrolled TOTP and verified one recovery code.

```bash
# Separate break-glass path for a lost owner authenticator. It removes the
# TOTP/recovery-code record and revokes all owner sessions.
CONFIRM_OWNER_TWO_FACTOR_RESET=RESET_OWNER_TWO_FACTOR_AND_REVOKE_SESSIONS \
  pnpm --filter @perfume-aura/ops reset:owner-two-factor
```

Public sign-up remains disabled. Owner-only invitations create a pending staff
identity with a random undisclosed bootstrap credential, deliver Better Auth's
password-setup link, and append immutable invitation/audit events. Never put
setup links, credentials, TOTP secrets, recovery codes, or raw request bodies
in logs or audit metadata.

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

Deploy as **Node.js Web App** (not classic Git). See [`docs/OPERATIONS.md`](../../docs/OPERATIONS.md).
