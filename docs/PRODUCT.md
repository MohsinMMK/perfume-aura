# Product

Perfume Aura is an owner-operated perfume inventory, invoicing, payment, and finance system for Pakistan. Currency is PKR; persisted money uses integer paisa.

## Users and scope

- One seeded owner account; public sign-up disabled.
- Internal ops app at `app.perfumeaura.com`.
- Marketing site at `perfumeaura.com`.
- No public storefront, multi-tenant roles, purchase orders, returns, tax engine, or payment gateway yet.

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

## Terms

| Term | Meaning |
|---|---|
| SKU | Unique stock-keeping unit for one variant |
| Variant | Product size/configuration carrying stock and prices |
| Paisa | 1/100 PKR; storage unit for money |
| Movement | Append-only stock ledger event |
| Fulfillment | Issued invoice quantity converted into sale movements |
| AR | Accounts receivable: issued invoice value not yet paid |
| Path M | Marketing classic Git deployment |
| Path Z | Manual prebuilt ops ZIP upload to Hostinger Node Web App |
| Path G | Hostinger GitHub source build; blocked until proven |
