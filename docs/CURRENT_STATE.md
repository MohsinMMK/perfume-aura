# Perfume Aura current state

Read this file and the task-specific document before repository or provider
work. Fresh live evidence outranks this snapshot; never place credentials,
tokens, connection strings, or customer data here.

Last refreshed: **2026-08-03 IST**.

## Live topology

| Surface | Current state |
|---|---|
| `https://perfumeaura.com` | Hostinger Node.js Web App serving the animated Next.js storefront from clean artifact `perfume-aura-storefront_89b79d857568.zip` |
| `https://www.perfumeaura.com` | Path- and query-preserving `308` redirect to the apex |
| `https://app.perfumeaura.com` | Hostinger Node.js Web App for private owner operations |
| `shop.perfumeaura.com` | Deleted from hPanel and absent from public DNS |

The storefront artifact deployed to the apex has SHA-256
`6c2c20f62f2f681100797f29ba2f8498ace2e4cca4ea2a3b1d66697feb2c00ed`.
The downloaded static-site rollback backup is retained outside the repository;
Git history and that backup are the only static rollback path.

## Fresh acceptance evidence

- Apex homepage, `/shop`, `/search`, cart drawer, branded 404, Next static
  assets, controlled bottle imagery, and `robots.txt` pass over TLS.
- `www` returns `308` to the same apex path and query.
- Storefront customer-auth returns `404` while disabled; unpublished products
  return `404`; `/api/cart` remains zero-value and checkout-locked.
- `node scripts/verify-production-deploy.mjs
  89b79d8575687978f3c0b5eee09ea43bb9d1268a --public-surface storefront
  --public-base https://perfumeaura.com --timeout-ms 180000` passed.
- Read-only Neon reconciliation found zero storefront users, sessions, cart
  items, checkouts, orders, payment records, inquiries, published products,
  published collections, invoices, payments, stock movements, inventory,
  reservations, and finance amounts. Four empty anonymous test carts remain.

## Release locks

All storefront release flags remain `false`: public catalog, checkout,
customer authentication, inquiries, and preview catalog. `robots.txt`
disallows indexing. Do not open a lock merely because runtime health is green.

## Hosting and database safety

- Domain registration remains at GoDaddy; Hostinger nameservers are
  authoritative. Do not edit GoDaddy DNS while those nameservers are active.
- Do not delete Neon: it is shared by storefront and ops.
- Only `perfumeaura.com` and `app.perfumeaura.com` are Perfume Aura websites in
  hPanel. Do not touch `perfumeaurastores.com`, `khanect.com`, mail, or other
  account resources.
- Hostinger shared hosting has a recurring plan-wide NPROC risk. Capture fresh
  resource evidence before provider changes, re-smoke both applications after
  every deployment, and never use the plan-wide process-stop control without
  explicit authorization and confirmed scope.

## Active ops incident

As of **2026-08-02 IST**, `https://perfumeaura.com/` still returns `200`, and
`www` redirects to the equivalent apex path with `308`. However,
`app.perfumeaura.com` remains intermittent: `/login` returns `200` while
`/api/health/live`, `/ready`, `/version`, and `/api/auth/get-session` return
Hostinger HCDN `503` “server temporarily busy.” At **23:24 IST**, hPanel
showed a 24-hour average of 104/120 Max Processes. Its runtime log showed
repeated Next.js server starts roughly every two seconds without application
errors.
The `hostinger-ops-production` deployment completed for source `cc38326d…`,
but completion does not prove readiness. Do not deploy the staff release or
use the plan-wide process stop. Obtain a scoped Hostinger repair identifying
the process owner and restart cause. Before any deployment, re-smoke ops
live/ready/version/auth/static/authenticated owner page and the healthy apex.

## Current repository work

`main` is at `cc38326dcf46651e10cb618727e4c03ef1fdc948`. The apex cleanup is
merged. The active `codex/staff-operations` branch implements the separate
Better Auth Admin/2FA migration, strict owner/staff capability matrix,
append-only invitation/audit records, and owner break-glass recovery. It is
not deployed and both security flags stay false until the isolated-Neon,
production-grant, SMTP, owner-TOTP, recovery-code, and staff-denial gates pass.

The branch also contains CI-verified ops optimization at `46ad43a…` and
CI-verified storefront optimization at `3dbbad6…` (GitHub Actions run
`30841501283`). Storefront entry now limits low-intent prefetch, skips
release-locked cart hydration, and defers disabled customer-auth client code;
all commerce flags remain false. No provider or production change occurred.
Next action remains scoped Hostinger incident repair before any deployment.
