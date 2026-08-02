# Product

Perfume Aura is an owner-operated perfume inventory, commerce, invoicing, payment, and finance system for India. Currency is INR; persisted money uses integer paise. The source migration from PKR-labelled records must pass the audited currency gate before production application.

## Users and scope

- One seeded owner account; public sign-up disabled.
- Internal ops app at `app.perfumeaura.com`.
- Marketing site at `perfumeaura.com`.
- A public storefront is implemented locally for staged release at
  `shop.perfumeaura.com`; it is not deployed. Multi-tenant staff roles, purchase
  orders, and a general tax engine remain outside scope. Every public product,
  account, checkout, payment, policy, and indexing capability defaults closed
  until its release gate passes.

## Routes

| Area | Routes |
|---|---|
| Auth | `/login`, `/forgot-password`, `/reset-password`, `/settings/security` |
| Dashboard | `/dashboard` |
| Products | `/products`, `/products/new`, `/products/[id]` |
| Stock | `/stock`, `/stock/low` |
| Customers | `/customers`, `/customers/new`, `/customers/[id]` |
| Invoices | `/invoices`, `/invoices/new`, `/invoices/[id]`, `/invoices/[id]/print`, `/invoices/ar` |
| Payments | `/payments` and invoice detail payment actions |
| Finance | `/finance` |
| Health/API | `/api/health/live`, `/api/health/ready`, `/api/auth/[...all]` |
| Owner commerce | `/commerce`, `/commerce/catalog`, `/commerce/orders`, `/commerce/promotions`, `/commerce/reviews`, `/commerce/support`, `/commerce/settings` |
| Storefront | `/`, `/shop`, `/collections/[slug]`, `/products/[slug]`, `/search`, `/find-your-scent`, `/cart`, `/checkout`, `/order/[token]` |
| Customer account | `/account/*`, `/api/customer-auth/[...all]` |
| Store content | `/about`, `/faq`, `/contact`, `/wholesale`, `/shipping`, `/returns`, `/privacy`, `/terms` |

## Product lifecycle

### Products and variants

- Product creation includes initial variant.
- Product and variant edits use transactional timestamp/version guards.
- Product-first archive preserves stock and ledger history.
- Product reactivation does not silently reactivate variants; each variant restore is explicit.
- Archived catalog entries remain discoverable but are excluded from new stock and invoice selectors.

### Inventory

- Stock is tracked per product variant and location.
- Receive and adjustment require stable client UUID idempotency keys.
- Sell/fulfill operations lock rows and reject oversell.
- Manual receive/adjust requires active product and variant.
- Fulfillment of an already-issued invoice line remains allowed for an archived SKU.
- Every change appends a stock movement and updates cached quantity in one transaction.
- After migration `0008`, stock movement mutation is blocked by database trigger.

### Customers and invoices

- Customer create/list/detail supports invoice preselection.
- Draft invoices support line add/remove.
- Issue allocates atomic `INV-YYYY-####` number.
- Fulfillment records invoice-linked sale movements and cannot exceed ordered quantity.
- Void requires issued status, zero authoritative payments, zero fulfilled lines, and zero linked sale rows.
- Print route renders invoice output.
- Invoice status and cached paid amount are maintained transactionally.

### Payments

- Payment numbers use atomic `PAY-YYYY-####` counters.
- Final schema requires unique, non-blank `number` and `idempotency_key`.
- Exact idempotent replay validates invoice, amount, method, and effective time.
- Concurrent payments cannot overpay remaining balance.
- Payment rows are insert/read only for runtime role. Reversal/credit-note model remains future work.

Workflow shape:

```text
recordPayment({
  invoiceId,
  amountCents,
  method,
  paidAt,
  reference?,
  note?,
  idempotencyKey
})
```

### Finance

`getFinanceSnapshot(days, { now?, timeZone? })` returns:

- inventory cost and retail value;
- accounts receivable;
- invoiced revenue;
- cash collected;
- cash and accrual COGS/gross profit.

Inventory valuation includes all variants with on-hand balances, including archived variants. Business dates use `Asia/Karachi` by default.

## Business invariants

- Money: integer paisa; no floating-point persistence.
- Quantities: non-negative integers.
- SKU: unique, trimmed, normalized.
- Variant size: positive and unique within product.
- Invoice line position: unique within invoice.
- Counters: atomic by document kind and business year.
- Owner-only access: every protected action checks server session/role.
- Mutations: database transaction + deterministic lock order + cache revalidation after commit.
- Store money: `{ currency: "INR", amountMinor: number }`; the browser never
  authorizes totals.
- Store variants: standard 30/50/100 ml at ₹600/₹800/₹1,400; Signature 50/105
  ml with exact owner-approved price required. No public 10 ml.
- Public catalog: active + published + legal/content/media approved + approved
  INR price + approved media; costs, internal notes, and raw stock never project.
- Stock: cart mutations revalidate price/publication/availability; checkout
  reservations lock deterministically and release/consume exactly once.
- Payments: a browser callback never marks paid. Cashfree success requires raw
  signature verification plus server-fetched PAID/exact-amount state. COD is
  settled only after owner-recorded collection and reconciliation.

## Terms

| Term | Meaning |
|---|---|
| SKU | Unique stock-keeping unit for one variant |
| Variant | Product size/configuration carrying stock and prices |
| Paise | 1/100 INR; storage unit for money |
| Movement | Append-only stock ledger event |
| Fulfillment | Issued invoice quantity converted into sale movements |
| AR | Accounts receivable: issued invoice value not yet paid |
| Path M | Marketing classic Git deployment |
| Path Z | Manual prebuilt ops ZIP upload to Hostinger Node Web App |
| Path G | Hostinger GitHub source build; blocked until proven |
