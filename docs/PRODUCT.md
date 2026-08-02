# Product

Perfume Aura is an India-first perfume operations and future ecommerce system.
Persisted money is integer INR paise; public money uses
`{ currency: "INR", amountMinor: number }` and is always server-authoritative.

## Applications and users

- `perfumeaura.com` is the animated public storefront.
- `app.perfumeaura.com` is the internal operations application.
- Owner public sign-up is disabled. Customer authentication is a separate
  storefront boundary and is currently disabled.
- Owner and staff operations remain separate from customer accounts and orders.

## Routes

| Area | Routes |
|---|---|
| Ops auth | `/login`, `/forgot-password`, `/reset-password`, `/settings/security` |
| Ops | `/dashboard`, `/products`, `/stock`, `/customers`, `/invoices`, `/payments`, `/finance`, `/commerce/*` |
| Storefront | `/`, `/shop`, `/collections/[slug]`, `/products/[slug]`, `/search`, `/find-your-scent`, `/cart`, `/checkout`, `/order/[token]` |
| Store content | `/about`, `/faq`, `/contact`, `/wholesale`, `/shipping`, `/returns`, `/privacy`, `/terms` |
| Customer boundary | `/account/*`, `/api/customer-auth/*` |

## Release state

The storefront is public as a visual brand and product-discovery surface, but
commerce is fail-closed:

- no product or collection is public without identity, legal, content, media,
  SKU, stock, cost, and INR-price approval;
- checkout, Cashfree, COD settlement, customer authentication, contact and
  wholesale inquiries, reviews, and indexing are disabled;
- disabled customer-auth routes return `404` without loading Better Auth or
  Neon;
- cart totals are zero and checkout is blocked while public release is closed;
- `robots.txt` disallows indexing until release approval.

## Core operations invariants

- Product/variant updates use transaction and version guards.
- Stock receive, adjustment, and fulfillment append immutable movements and
  use deterministic row locks and idempotency keys.
- Invoices and payments are distinct financial records; payment replay cannot
  overpay an invoice.
- Storefront orders use immutable item snapshots. Reservation expiry,
  cancellation, failed payment, and abandonment release stock exactly once.
- Catalog projection never exposes cost, raw stock, internal notes, or archived
  records.
- Cashfree success requires raw webhook verification and server-side status
  verification. COD is settled only by fulfillment and confirmed collection.

## Catalog policy

- Standard scents: 30 ml ₹600, 50 ml ₹800, 100 ml ₹1,400.
- Signature scents: 50 ml and 105 ml only, with explicit owner-approved INR
  prices required per product.
- 10 ml and discovery sets are excluded from public commerce until a separate
  sample format is approved.

## Staff phase

The next release adds Better Auth Admin and 2FA plugins, typed owner/staff
capabilities, mandatory TOTP, audited staff invitations, staff deactivation,
and owner-only financial and publication controls. Feature flags remain off
until SMTP delivery and owner TOTP recovery are demonstrated.
