# Proposed commerce architecture

Status: design proposal. No public storefront or commerce domain described here is implemented merely because it appears in this document.

## Existing verified foundation

```text
apps/marketing   static cinematic public experience
apps/ops         private owner operations on Next.js
packages/db      PostgreSQL/Drizzle schema and transactional inventory
packages/ui      shared shadcn/ui package for application UI
packages/validators shared validation contracts
```

Existing ops product model already supports:

- Product identity: name, slug, brand, category, description, active/archive status
- Sellable size variant: SKU, barcode, size ml, and cost/retail values stored as integer paisa despite legacy `costCents`/`retailCents` field names
- Inventory cache: on hand, reserved, reorder level, optimistic version
- Auditable stock movements and transaction boundaries
- Customers, invoices, fulfillment, payments, and finance

It does not yet support a public catalog contract, cart, checkout, order, shipping-address, payment-gateway, promotion, review, return, or customer-account workflow.

## Recommended target boundary

```text
apps/marketing       retained until storefront cutover
apps/storefront      proposed public Next.js commerce application
apps/ops             private owner catalog, inventory, order, invoice, and finance operations
packages/db          shared data model and migrations
packages/validators  shared server/client input contracts
packages/ui          reusable primitives; brand compositions remain app-specific
```

Recommended deployment sequence:

1. Develop and test `apps/storefront` without changing live apex behavior.
2. Stage as a separate Hostinger Node.js Web App, preferably `shop.perfumeaura.com`.
3. Use a prebuilt standalone artifact path until a Hostinger source-build path is independently proven.
4. Validate catalog, cart, inventory reservation, payment sandbox if selected, order handoff, assets, accessibility, and owner operations.
5. Cut apex only through an approved operations plan with rollback.

## Route proposal

```text
/                         cinematic commerce home
/shop                     approved product catalog
/collections/[slug]       non-empty approved collection
/products/[slug]          product detail and real size variants
/search                    full approved search results
/find-your-scent           rule-based finder after metadata completion
/cart                      server-authoritative cart
/checkout                  guest checkout
/order/[public-token]      non-enumerable customer confirmation/status
/policies/shipping
/policies/returns
/policies/privacy
/policies/terms
```

Search, finder, account, review, and promotion routes must not ship as empty shells.

## Public catalog projection

Public storefront should not query unrestricted internal rows. A controlled server projection should return only publication-approved fields:

- Public identity and slug
- Approved description and media
- Signature/reference classification and legally approved reference wording
- Family, notes, audience, occasion, season, intensity, concentration, usage, and ingredients
- Active variants with public size, current price, and permitted availability state
- Collection membership, sort order, and SEO fields

Cost, supplier details, raw stock balances, internal notes, archived variants, and owner-only identifiers remain private.

`data/catalog/perfumes.csv` intentionally records source-level product identity only. It does not encode sizes, prices, SKU, or stock. Any future variant import must use one row per product × size with explicit `size_ml`, `cost_paisa`, `retail_paisa`, SKU, and stock fields; parallel size/price lists are forbidden.

## Proposed domain additions

Exact names remain subject to schema design and migration review.

| Domain | Records needed |
|---|---|
| Merchandising | Product media, scent metadata, collections, collection products, publication and SEO fields |
| Cart | Carts, cart items, expiry, currency, pricing-version metadata |
| Checkout | Checkout sessions, addresses, delivery selection, reservation expiry |
| Orders | Orders, order-item snapshots, status history, customer-visible token |
| Payments | Payment attempts/events, provider references, idempotency keys, verification state |
| Fulfillment | Shipments, tracking events, delivery state |
| Promotions | Promotion rules, redemptions, order discounts |
| Reviews | Verified-order eligibility, moderation, rating, text |
| Returns | Return requests, items, reasons, disposition, refund linkage |

## Inventory boundary

Available-to-sell quantity is derived from approved active variant state and transactional inventory facts, not browser state.

```text
available_to_sell = quantity_on_hand - qty_reserved
```

Proposed reservation flow:

1. Revalidate active product, active variant, current price, and requested quantity.
2. Begin database transaction and lock variant rows in deterministic order.
3. Refuse quantity beyond available-to-sell.
4. Create checkout reservation and increment reserved quantity atomically.
5. On confirmed order, consume reservation through auditable sale movement.
6. On expiry/cancellation/failure, release reservation exactly once.

Retries, idempotency, reconciliation, and invariant tests are required before sale traffic.

## Order and invoice boundary

Customer order and financial invoice are related but distinct:

- Order owns customer intent, address snapshot, item snapshots, delivery, promotion, payment, and fulfillment state.
- Invoice owns existing financial and ledger contracts.
- Controlled service creates or links an invoice only at the approved order transition.
- Editing a product later cannot rewrite historical order or invoice item facts.

## Payment boundary

No provider is selected.

Any future integration must include:

- PKR and supported-method confirmation
- Server-created payment attempt
- Signed callback/webhook verification
- Provider-event idempotency and replay handling
- Server-side amount/currency/order matching
- Explicit pending, authorized, paid, failed, cancelled, refunded, and disputed states as supported
- Reconciliation and refund procedures
- No secret in browser bundles, documentation, logs, or deploy artifacts

COD, bank transfer, or gateway behavior requires separate accepted decisions.

## Authentication boundary

- Existing Better Auth configuration remains owner-only with public sign-up disabled.
- Guest checkout is proposed first.
- Customer identity, if later added, must use separate routes, authorization rules, session assumptions, and threat review.
- Customer access must never grant or reuse owner privileges.

## Media and content

Current local bottle assets may support approved common packaging. Product publication still requires explicit image assignment and accessible alternative text. If every formula shares bottle geometry, labeling or controlled visual differentiation must prevent product confusion.

External media storage/CDN and upload workflow remain pending decisions. No foreign reference-site image may be copied.

## Verification architecture

- Requirements use stable IDs in `REQUIREMENTS.md`.
- Tests name requirement IDs where practical.
- `VERIFICATION.md` links each completed requirement to implementation and evidence.
- `pnpm commerce:verify` validates current documentation/catalog foundation.
- Future storefront CI extends that command with lint, typecheck, unit, integration, build, E2E, accessibility, security, and catalog checks.
- Graphify maps relationships after changes; tests and live evidence prove behavior.
