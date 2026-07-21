# Phase 3 design — Payments

| Field | Value |
|-------|--------|
| Status | **Implemented** (manual payments; Stripe deferred) |
| Depends on | Phase 2 invoices (issued / paid status) |
| Complements | [PHASE2_INVOICING.md](./PHASE2_INVOICING.md), [PRD.md](./PRD.md), [DATA_MODEL.md](./DATA_MODEL.md) |
| Updated | 2026-07-22 |

## 1. Goals

Owner can:

1. Record **manual payments** against issued invoices (cash, bank transfer, card offline)  
2. Support **partial payments** and track remaining balance  
3. List payment history per invoice and globally  
4. Keep invoice status in sync: `issued` → `paid` when balance reaches zero  
5. (Optional later) Integrate **Stripe Invoicing API** without redesigning the ledger  

### Non-goals

- Full bank reconciliation product  
- Multi-currency  
- Changing inventory on payment (**never**)  
- Customer self-serve payment portal (optional Stripe later)  

## 2. Domain model

```text
payments
  id, number? UNIQUE,           -- optional PAY-YYYY-####
  customer_id?                  -- denormalized from invoice for list filters
  invoice_id                    -- required in v1 (payment always against invoice)
  method: cash | bank_transfer | card | other
  amount_cents                  -- integer PKR paisa, > 0
  paid_at                       -- when money received
  reference?                    -- bank ref / cheque no
  note?, created_by, created_at

-- If one payment can split across invoices later:
payment_allocations
  id, payment_id, invoice_id, amount_cents
```

**v1 recommendation:** one payment row **per invoice** (simplest). Add allocations only if multi-invoice receipts appear in real ops.

### Invoice balance (derived)

```text
balance_cents = total_cents − sum(payments.amount_cents for invoice)
              = total_cents − amount_paid_cents   -- if cached on invoice
```

On each payment:

1. Insert `payments`  
2. Update `invoices.amount_paid_cents`  
3. If `amount_paid_cents >= total_cents` → status `paid`, set `paid_at`  
4. If was `paid` and reverse payment → re-open to `issued` (rare; Phase 3.1)

Phase 2 may already set `amount_paid_cents` and status `paid` via **mark paid** without a payment row. Phase 3 should:

- Prefer creating a payment row when marking paid  
- Migrate or treat legacy mark-paid as a single synthetic payment  

## 3. Invariants

1. **Payment never calls `applyMovement`.** Stock only on fulfill (Phase 2).  
2. Payment `amount_cents > 0` and integer.  
3. Sum of payments for an invoice ≤ `total_cents` (reject overpay unless credit note phase later).  
4. Payments only allowed when invoice status is `issued` or `paid` (for residual? usually issued only).  
5. Void invoice: no new payments; existing payments require explicit reverse flow.  

## 4. Screens

| Route | Purpose |
|-------|---------|
| `/invoices/[id]` | “Record payment” action + payment history table |
| `/payments` | Global list: date, customer, invoice #, method, amount |
| `/invoices/ar` | Remaining balance uses payment sums |
| Dashboard | Cash received this month (sum payments) |

### UI notes

- Amount in rupees major units → `rupeesToCents`  
- Confirm dialog when payment closes the invoice  
- Methods as native select / enum  

## 5. Server actions (sketch)

```text
recordPayment({ invoiceId, amount, method, paidAt, reference?, note? })
listPayments({ invoiceId? , from?, to? })
// later:
voidPayment(paymentId)   -- compensating negative or status=voided
```

All: `requireSession` + Zod + `revalidatePath`.

## 6. Optional Stripe path (Phase 3.1)

| Approach | Use when |
|----------|----------|
| Manual only | Default — Pakistan cash/bank first |
| Stripe Invoicing API | Online card / hosted invoice for some customers |

If Stripe:

- Store `stripe_invoice_id` / `stripe_payment_intent_id` on `payments` or `invoices`  
- Webhook marks payment + invoice status  
- Still **no stock** on webhook  

Official: https://docs.stripe.com/invoicing  

Do not add Stripe keys until this sub-phase is scheduled.

## 7. Implementation PR sequence

| PR | Scope |
|----|--------|
| **P3-1** | `payments` schema + migration |
| **P3-2** | Record payment action + invoice balance update |
| **P3-3** | Payment history on invoice + `/payments` list |
| **P3-4** | AR / dashboard metrics use real payments |
| **P3-5** | (Optional) Stripe Invoicing + webhook |

## 8. Acceptance

- [x] Record cash payment reduces invoice balance  
- [x] Full payment sets status `paid`  
- [x] Partial payment leaves status `issued` with remaining AR  
- [x] Payment never changes `quantity_on_hand`  
- [x] Overpayment rejected  
- [x] Existing concurrent stock tests still pass  
- [x] Global `/payments` list + dashboard Cash MTD  
- [x] Mark paid creates cash payment for remaining balance  
- [ ] Stripe Invoicing (optional 3.1)

## 9. Related

- [PHASE2_INVOICING.md](./PHASE2_INVOICING.md)  
- [PHASE4_FINANCE.md](./PHASE4_FINANCE.md)  
- [SECURITY.md](./SECURITY.md)  
