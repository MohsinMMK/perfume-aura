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
- Fresh checks at 14:53 IST found ops `/login`, live, ready, auth-session, a
  real static asset, and `/api/health/version` healthy. The version endpoint
  reports source `cc38326dcf46651e10cb618727e4c03ef1fdc948`.
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

The application recovered but the duplicate-process/NPROC incident is not
resolved. The last-day runtime log still showed unexplained paired or repeated
Next.js starts without application errors. A scoped Hostinger support
escalation is assigned to a specialist and requests Linux user/domain/path/PID
attribution, supervisor or restart-policy analysis, HCDN routing verification,
and the relevant LVE snapshot. Hostinger has not yet supplied a case identifier
or durable repair. Do not change Hostinger variables, redeploy, or use the
plan-wide process-stop control until that evidence is received.

## Current repository work

`main` is at `cc38326dcf46651e10cb618727e4c03ef1fdc948`. The obsolete static
marketing surface is removed. The separate draft staff-operations release and
its database migration are not part of this observability branch.

The observability foundation is prepared for both applications. PostHog US
Cloud project `Perfume Aura Web` (ID `541869`) has client IP storage disabled
and separates traffic with `application=storefront|operations`. Sentry
organization `khanect` contains `perfume-aura-storefront` and
`perfume-aura-ops`, each with high-priority email alerts. GitHub repository
variables contain the public client identifiers, and the limited `org:ci`
source-map credential is stored only as `SENTRY_AUTH_TOKEN`. Controlled
non-production events reached both providers, but no enabled artifact or
runtime variables have been deployed and production sends no new telemetry.
See `docs/OBSERVABILITY.md` for the activation gate.

Next action is to publish this change as a separate draft PR and wait for the
scoped Hostinger repair before merging or activating production telemetry.
