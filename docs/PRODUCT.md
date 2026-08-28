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
| Ops | `/dashboard`, `/products`, `/stock`, `/stock/oil`, `/sales/new`, `/customers`, `/invoices`, `/payments`, `/finance`, `/commerce/*` |
| Storefront | `/`, `/shop`, `/collections/[slug]`, `/products/[slug]`, `/search`, `/find-your-scent`, `/cart`, `/checkout`, `/account`, `/account/delivery`, `/account/orders`, `/account/orders/[orderNumber]`, legacy `/order/[token]` |
| Store content | `/about`, `/fragrance-guide`, `/faq`, `/guides/perfume-for-hyderabad-weather`, `/guides/fragrance-families`, `/guides/perfume-for-occasions`, `/contact`, `/wholesale`, `/shipping`, `/returns`, `/privacy`, `/terms` |
| Customer boundary | `/account/*`, `/api/customer-auth/*`, `/api/account/*` |

## Commerce release locks

The storefront is public as a visual brand and product-discovery surface, but
commerce is fail-closed:

- no product or collection is public without identity, legal, content, media,
  SKU, stock, cost, and INR-price approval;
- checkout, Cashfree prepaid UPI, customer authentication, contact and
  wholesale inquiries, reviews, and product/catalog indexing are disabled;
- when inquiry release is eventually approved, contact and wholesale require
  explicit versioned privacy consent, use generic accepted responses and a
  honeypot, apply HMAC-only email/IP throttles, and deliver asynchronously into
  the audited support inbox;
- disabled customer-auth routes return `404` without loading Better Auth or
  Neon;
- cart totals are zero and checkout is blocked while public release is closed;
- Search discovery is intentionally separate from commerce release. `/`,
  `/fragrance-guide`, `/about`, `/faq`, and the three approved `/guides/*`
  editorial routes are indexable; preview shop,
  product, collection, search, finder, inquiry, and incomplete-policy pages
  remain `noindex`. `robots.txt` allows public crawling while blocking private
  account, API, cart, checkout, and order paths.
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
- Storefront listing titles for the 48 mapped inspired rows use
  `Inspired by <brand> <reference>` (COM-ADR-029). That is listing identity,
  not legal clearance or sale approval. The 34 incomplete inspired rows stay
  unlistable.
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
  verification. Checkout is prepaid-only through approved Cashfree UPI flows;
  cash on delivery is not offered.
- Visitors may browse and create a cart anonymously. Checkout requires a
  verified customer session, derives email and user identity on the server,
  and preserves the cart through the sign-in callback.
- Customers can explicitly save one delivery profile; the checkout opt-in is
  unchecked by default and historical order snapshots never change.
- A verified customer may submit one pending review for each delivered,
  fully fulfilled order item. Only staff-approved reviews enter the public
  product projection.
- A verified customer may request one full-order return only after every item
  is fulfilled and within seven calendar days of the recorded delivery.
  Staff controls the audited requested → approved → received → refunded path;
  refunded status requires the order payment state to be fully refunded.
- The scent finder considers only published structured scent profiles, explains
  every matching answer axis, and returns no recommendation when fewer than two
  axes match.

## Staff capability contract

Ops implements Better Auth Admin and 2FA plugins, strict `owner`/`staff`/`user`
roles, server-side capabilities, immutable staff invitation/audit records,
TOTP, recovery codes, trusted private devices, staff deactivation, and
owner-only financial/publication/payment controls. Staff can update shipment
state but cannot manage refunds or other owner-only payment operations.

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
