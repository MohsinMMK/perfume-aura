# Product

Perfume Aura is an India-first perfume operations and future ecommerce system.
Persisted money is integer INR paise; public money uses
`{ currency: "INR", amountMinor: number }` and is always server-authoritative.

## Users and applications

- `perfumeaura.com` is the animated public storefront.
- `app.perfumeaura.com` is the internal operations application.
- Owner public sign-up is disabled. Customer authentication is a separate
  storefront boundary and is currently disabled.
- Owner and staff operations remain separate from customer accounts and orders.

## Route contract

| Area | Routes |
|---|---|
| Ops auth | `/login`, `/forgot-password`, `/reset-password`, `/settings/security` |
| Ops | `/dashboard`, `/products`, `/stock`, `/customers`, `/invoices`, `/payments`, `/finance`, `/commerce/*` |
| Storefront | `/`, `/shop`, `/collections/[slug]`, `/products/[slug]`, `/search`, `/find-your-scent`, `/cart`, `/checkout`, `/order/[token]` |
| Store content | `/about`, `/faq`, `/contact`, `/wholesale`, `/shipping`, `/returns`, `/privacy`, `/terms` |
| Customer boundary | `/account/*`, `/api/customer-auth/*` |

## Commerce release locks

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
- Observability is fail-closed until configured. PostHog uses page activity
  without DOM autocapture or session replay; Sentry excludes direct PII and
  sensitive request material. Monitoring never changes a commerce release lock.

Active flag values and next production actions belong in
[`CURRENT_STATE.md`](CURRENT_STATE.md). Commerce requirement IDs and ADRs belong
in [`COMMERCE.md`](COMMERCE.md).

## Pending outcome

Keep catalog, checkout, customer authentication,
inquiries, and every commerce flag disabled until business, catalog, policy,
media, pricing, stock, shipping, tax, support, Cashfree, SMTP, and lifecycle
gates pass. Use a separate authorized release decision for each public
capability.

## Catalog and money policy

- Standard scents: 30 ml ₹600, 50 ml ₹800, 100 ml ₹1,400.
- Signature scents: 50 ml and 105 ml only, with explicit owner-approved INR
  prices required per product.
- 10 ml and discovery sets are excluded from public commerce until a separate
  sample format is approved.

## Operations and financial invariants

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

## Staff capability contract

Ops implements Better Auth Admin and 2FA plugins, strict `owner`/`staff`/`user`
roles, server-side capabilities, immutable staff invitation/audit records,
TOTP, recovery codes, trusted private devices, staff deactivation, and
owner-only financial/publication/payment controls. Staff can update shipment
state but cannot settle COD; that owner-only reconciliation is a separate
server action.

`OPS_TWO_FACTOR_REQUIRED` and `OPS_STAFF_INVITES_ENABLED` remain false until
the migration and restricted grants are applied, SMTP delivery is proven, the
owner completes TOTP and recovery-code proof, and an authorized staff journey
proves direct action denials. The function-mapped production smoke order is
the [staff operations release procedure](OPERATIONS.md#staff-operations-release-procedure).

## Customer privacy limits

Monitoring cannot change a commerce release lock or become a source of truth
for commerce, authentication, inventory, or finance. Capture, filtering, and
PII restrictions are owned by
[`ENGINEERING.md`](ENGINEERING.md#observability-code-and-privacy).
