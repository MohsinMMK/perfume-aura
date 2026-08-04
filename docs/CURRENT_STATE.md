# Perfume Aura current state

Read this file and the task-specific document before repository or provider
work. Fresh live evidence outranks this snapshot; never place credentials,
tokens, connection strings, or customer data here.

Last refreshed: **2026-08-04 IST**.

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

Fresh checks at **2026-08-04 14:53 IST** found the incident recovered but not
resolved. Ops `/login`, live, ready, version, unauthenticated session, and a real
Next static asset all returned `200`; the version endpoint reported
`cc38326dcf46651e10cb618727e4c03ef1fdc948`. The apex, shop, search, cart,
customer-auth lock, robots lock, and path/query-preserving `www` redirect also
passed. hPanel showed 41/120 live Max Processes and a 26/120 24-hour average.

The last-day runtime log still showed unexplained duplicate Next.js starts:
six starts between **2026-08-03 16:09:09 and 16:09:13 IST**, paired starts at
18:39:34, 19:01:53, and 22:09:40, and another pair at **2026-08-04 05:14:17
IST**, without application errors. At **14:56 IST**, a scoped Hostinger support
escalation was submitted with these timestamps and the prior HCDN `503`/104 of
120 NPROC evidence. A specialist is assigned and reviewing the conversation;
no case identifier has been supplied yet. The escalation explicitly forbids a
plan-wide process stop or redeployment and requests Linux user/domain/path/PID
attribution, supervisor/restart-policy analysis, HCDN routing verification, and
the relevant LVE snapshot or equivalent evidence. Do not deploy the staff
release until Hostinger supplies a durable scoped repair and both applications
are re-smoked.

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
all commerce flags remain false. No Hostinger configuration or production
application change occurred. Next action remains the assigned specialist's
scoped Hostinger repair before any deployment. Observability is isolated in
draft PR #8 and must not be merged until that repair is proven.
