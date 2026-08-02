# Perfume Aura current state

Read this file and the task-specific document before repository or provider
work. Fresh live evidence outranks this snapshot; never place credentials,
tokens, connection strings, or customer data here.

Last refreshed: **2026-08-02 IST**.

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
- Ops `/login`, live, ready, auth-session, a real static asset, and
  `/api/health/version` pass. The version endpoint reports source
  `89b79d8575687978f3c0b5eee09ea43bb9d1268a`.
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

## Current repository work

`main` is at `89b79d8575687978f3c0b5eee09ea43bb9d1268a`. The active cleanup
work removes the obsolete static marketing deployment surface and changes CI,
docs, and verification to apex-storefront checks. The next product phase is the
separate Better Auth Admin/2FA staff-operations migration; keep both flags off
until SMTP and owner TOTP recovery are proven.
