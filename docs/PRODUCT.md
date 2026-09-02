# Product

Perfume Aura is an India-first fragrance house with a public discovery website
and a private operations app. Persisted money is integer INR paise. Public
money uses `{ currency: "INR", amountMinor: number }` and is always
server-authoritative.

Live SHAs, flags, and next actions belong in
[`CURRENT_STATE.md`](CURRENT_STATE.md). Commerce ADRs belong in
[`COMMERCE.md`](COMMERCE.md).

## Who uses what

| Surface | Audience | Auth |
|---|---|---|
| `perfumeaura.com` | Visitors | None required. Customer auth is a separate storefront boundary and is off. |
| `www.perfumeaura.com` | Same visitors | Permanent `308` to the matching apex path and query (`apps/storefront/next.config.ts` `redirects()`, not middleware). |
| `app.perfumeaura.com` | Owner and invited staff | Independent Better Auth. Public sign-up is disabled. |

Customer accounts and operations accounts never share tables, secrets, cookies,
origins, or recovery.

## Live public routes

Indexable (`index, follow`, in sitemap, `en-IN`): `/`, `/fragrance-guide`,
`/about`, `/faq`, `/guides/perfume-for-hyderabad-weather`,
`/guides/fragrance-families`, `/guides/perfume-for-occasions`. Home JSON-LD is
Organization + WebSite + WebPage. About is AboutPage. FAQ is FAQPage. Guides
are Article. `/llms.txt` is public.

Reachable, `noindex`, not in sitemap: `/shop`, `/products/[slug]`,
`/collections/[slug]`, `/search`, `/find-your-scent`, `/cart`, `/contact`,
`/wholesale`, `/shipping`, `/returns`, `/privacy`, `/terms`, `/account`,
`/account/sign-in`, `/account/orders`, `/account/settings`, `/account/delivery`.

HTML `404` while flags are closed: `/checkout`, `/account/register`,
`/account/recover`.

`robots.txt` allows `/` and disallows `/account`, `/api/`, `/cart`,
`/checkout`, `/order/`. Product and collection URLs enter the sitemap only
after Neon publication and `STOREFRONT_PUBLIC_RELEASE=true`.

Header: Shop, Scent guide, About, FAQ, Account, cart popover, WhatsApp “Get
scent”. Mobile menu also has Search, Instagram `@perfume.aura.hyd`, and
WhatsApp `+91 95495 49060`. `/find-your-scent` exists and is not in
header/footer. There is no location page and no Store schema; do not invent
NAP, hours, or an open online store.

## Locked vs visible

Discovery listing does **not** require `STOREFRONT_PREVIEW_CATALOG` or
`STOREFRONT_PUBLIC_RELEASE`. Those flags gate preview carts and Neon-published
sellable products.

| Flag | Visitor/staff effect while false |
|---|---|
| `STOREFRONT_PUBLIC_RELEASE` | Workbook listing, not Neon projection. Shop/product stay `noindex`. No Product/Offer JSON-LD. |
| `STOREFRONT_PREVIEW_CATALOG` | Add to cart disabled. Cart lines empty, subtotal zero, checkout unavailable. Also true automatically in local `development`. |
| `STOREFRONT_CUSTOMER_AUTH_ENABLED` | `/api/customer-auth/*` returns `404` before Better Auth or Neon. `/account` and `/account/sign-in` still render “not open yet”. Register/recover are `404`. |
| `STOREFRONT_CHECKOUT_RELEASE_APPROVED` and DB `checkout_enabled` | `/checkout` is `404`. Either plane false keeps checkout locked. |
| `STOREFRONT_INQUIRIES_ENABLED` | Contact/wholesale forms disabled. Posted inquiries return `503`. |
| `OPS_TWO_FACTOR_REQUIRED` / `OPS_STAFF_INVITES_ENABLED` | Ops login works; mandatory 2FA and staff invites stay off. |

WhatsApp is the live order/contact path while checkout is closed. Product pages
can still build a prefilled WhatsApp message with selected size and quantity.

## Catalog presentation

Source: `data/catalog/launch-products.csv` + `launch-variants.csv` →
`apps/storefront/lib/listing-workbook-data.ts`. This is listing identity, not
legal clearance, import approval, or sale approval.

| Collection | Count | Sizes | Titles |
|---|---:|---|---|
| Inspired | 79 | 30 / 50 / 100 ml | `Inspired by <brand> <reference>` |
| Unknown | 15 | 30 / 50 / 100 ml | Exact supplied names; no invented brand |
| Signature | 20 | 50 / 105 ml | In-house names, no “Inspired by” prefix |

114 products, 322 variants, 39 Inspired brands. Shop query: `q`, `collection`,
`brand`, `size`, `sort`.

Prices (owner-supplied, complete):

- Main-list rows 1–16 (includes Unknown Heaven Rose and Rose Elegance):
  ₹600 / ₹800 / ₹1,400
- Main-list rows 17–94: ₹450 / ₹650 / ₹1,200
- Signature: ₹1,200 / ₹2,200 except Oud of Dubai and Visionnaire at
  ₹1,800 / ₹3,000

SKU, cost, opening stock, media, and structured scent copy are incomplete.
Composition shows “Details coming soon”. 10 ml and discovery sets stay out of
public commerce until a separate sample format is approved. COD is not offered.

When `STOREFRONT_PUBLIC_RELEASE=true`, the storefront switches to the Neon
projection and unpublished products must `404`. Until then the homepage does
not feature the 114 workbook products; the hero is Inspired + Signature bottle
slides plus editorial studies.

## Shop and product UX invariants

- Signature cards use the clear-glass bottle; Inspired and Unknown share the
  matte-black bottle. Desktop hover reveal; touch layouts use viewport
  activation. Reduced motion keeps transforms static.
- “Inspired by” uses Londrina Outline; the reference name stays solid.
- Filters expose labeled dropdowns. Horizontal carousels must not steal
  vertical page scrolling. Closed menus restore focus.
- Persistent labels, visible focus, inert closed drawers, 44px targets.
- Cart cookie `pa_storefront_cart`. Quantity 0–10. Browser mutations require
  the exact storefront `Origin`; cross-site Fetch Metadata is `403`.
- Policy pages are unpublished shells. Hardcoded ₹99/₹999 shipping values
  must not render until flags and DB approvals match
  [`COMMERCE_OPERATING_POLICIES.md`](COMMERCE_OPERATING_POLICIES.md). Those
  numbers are locked implementation inputs, not professional approval.

Implemented flags-off, not live visitor behavior: verified checkout, Google
One Tap, Cashfree UPI, one saved delivery profile, reviews, and 7-day
returns. See [`COMMERCE.md`](COMMERCE.md).

## Operations screens

Auth: `/login`, `/forgot-password`, `/reset-password`, `/two-factor`.

Inventory: `/dashboard`, `/products`, `/stock`, `/stock/oil`, `/stock/low`,
`/finance`, `/reports`. Sales: `/sales/new`, `/customers`, `/invoices`,
`/invoices/ar`, `/payments`. Commerce: `/commerce`, `/commerce/catalog`,
`/commerce/orders`, `/commerce/promotions`, `/commerce/reviews`,
`/commerce/support`, `/commerce/settings`. Settings: `/settings/security`,
`/settings/staff`.

Roles are exact `owner`, `staff`, or `user`. Staff can update shipment state
and cannot manage refunds, costs, finance, promotions, publication, or staff.
Cookie proxy covers dashboard routes; `/reports` and `/sales` still
authenticate in the dashboard layout.

Staff 2FA/invites stay false until SMTP delivery, owner TOTP/recovery, and the
staff denial journey in
[`OPERATIONS.md`](OPERATIONS.md#staff-operations-release-procedure).
Migrations and grants for that schema are already on production; the remaining
gate is owner/provider acceptance, not “apply `0010`”.

## Pending outcome

Keep catalog publication, checkout, customer authentication, inquiries, and
every commerce flag disabled until the owning gates in
[`BLOCKERS.md`](BLOCKERS.md) and [`CURRENT_STATE.md`](CURRENT_STATE.md) pass.
Use a separate authorized release decision for each public capability.
