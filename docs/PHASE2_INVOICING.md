# Phase 2 design — Customers & invoicing

| Field | Value |
|-------|--------|
| Status | **Implemented** (core P2-1…P2-6 lite); harden in production |
| Updated | 2026-07-22 |
| Depends on | Phase 1 inventory acceptance + ops deploy preferred |
| Complements | [PRD.md](./PRD.md) · [TRD.md](./TRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA_MODEL.md](./DATA_MODEL.md) · [ROADMAP.md](./ROADMAP.md) |

## 1. Goals

Owner can:

1. Maintain a simple **customer** list (B2B / walk-in / retail)  
2. Create **invoices** with line items (product variants or free text)  
3. Move invoice status: **draft → issued → paid / void**  
4. See **AR list** (unpaid issued invoices)  
5. Download / print a simple **PDF**  

Non-goals for Phase 2:

- Full double-entry accounting  
- Online customer portal  
- Stripe (Phase 3)  
- Multi-currency (PKR integer cents only)  
- Auto stock decrement on invoice issue (stock moves on **fulfill** — see §5)

## 2. Domain model

```text
customers
  id, name, email?, phone?, address_line?, city?, notes?
  status (active|archived), created_at, updated_at

invoices
  id, number UNIQUE, customer_id
  status: draft | issued | paid | void
  issue_date, due_date?
  currency: PKR (fixed)
  subtotal_cents, tax_cents (0 v1), total_cents
  amount_paid_cents (0 until Phase 3 payments; paid status may set = total)
  notes?, created_by, created_at, updated_at
  issued_at?, voided_at?, paid_at?

invoice_lines
  id, invoice_id, position
  variant_id?          -- null for free-text lines
  description          -- snapshot text (name · size · SKU)
  quantity             -- integer bottles / units
  unit_price_cents     -- retail snapshot at line time
  line_total_cents     -- quantity * unit_price_cents
  -- optional Phase 2.1: fulfill_qty for partial ship
```

### Stock ledger hooks (already on `stock_movements`)

| Field | Use in Phase 2 |
|-------|----------------|
| `ref_type` | `'invoice'` |
| `ref_id` | `invoices.id` |

**Invariant:** issuing an invoice does **not** change stock.  
**Fulfill** action (button on issued invoice) calls `applyMovement({ type: 'sale', …, refType: 'invoice', refId })` per shipped line.  
Payment (Phase 3) never touches stock.

## 3. Status machine

```text
        ┌──────────┐
        │  draft   │◄── edit lines freely
        └────┬─────┘
             │ issue (assign number, lock lines)
             ▼
        ┌──────────┐     void
        │  issued  │─────────────► void
        └────┬─────┘
             │ mark paid (manual Phase 2; payments ledger Phase 3)
             ▼
        ┌──────────┐
        │   paid   │
        └──────────┘
```

Rules:

- Only **draft** is editable  
- **issue** requires ≥1 line, customer, and generates next `INV-YYYY-####`  
- **void** only from issued (not paid); no stock reverse unless prior fulfill exists (then compensating receive/return)  
- **paid** from issued when owner confirms cash/bank received (Phase 2 manual)

## 4. Screens (ops app)

| Route | Purpose |
|-------|---------|
| `/customers` | List + search |
| `/customers/new` · `/customers/[id]` | Create / edit |
| `/invoices` | List; filters status, customer, date |
| `/invoices/new` | Draft: pick customer, add lines (SKU search or free text) |
| `/invoices/[id]` | Detail, status actions, fulfill, PDF |
| `/invoices/ar` | Issued & unpaid AR aging (simple: all open) |
| Dashboard | Cards: open AR total, invoices this month (add later) |

### Navigation (sidebar)

Add group **Sales**: Customers · Invoices · AR  

Keep Inventory group unchanged.

### UI building blocks (add via shadcn CLI when building)

Likely: `dropdown-menu`, `select` (or keep native-select), `tabs`, `alert-dialog` for void/issue confirm.  
Install only when a screen needs them:

```bash
pnpm dlx shadcn@latest add <name> -c apps/ops -y
```

## 5. Server actions (sketch)

```text
createCustomer / updateCustomer / archiveCustomer
createInvoiceDraft(customerId)
addInvoiceLine / updateInvoiceLine / removeInvoiceLine
issueInvoice(invoiceId)       -- number + status + issued_at
voidInvoice(invoiceId)
markInvoicePaid(invoiceId)    -- Phase 2 manual
fulfillInvoiceLines(...)      -- applyMovement sale per line qty
renderInvoicePdf(invoiceId)   -- Phase 2.1 if time-boxed
```

All mutations: `requireSession` + Zod + `revalidatePath`.

## 6. Validators (`packages/validators`)

```text
customerFormSchema
invoiceLineSchema (variantId optional, description, qty, unitPrice rupees)
issueInvoiceSchema
```

Money: same pattern as inventory — form major PKR → `rupeesToCents` server-side.

## 7. Implementation PR sequence

| PR | Scope |
|----|--------|
| **P2-1** | Schema + migration: `customers`, `invoices`, `invoice_lines` |
| **P2-2** | Customer CRUD UI |
| **P2-3** | Invoice draft + lines + issue/void |
| **P2-4** | AR list + dashboard AR metric |
| **P2-5** | Fulfill → stock sale movements with `ref_*` |
| **P2-6** | PDF (react-pdf or print CSS) — can slip to 2.1 |

## 8. Acceptance (Phase 2)

- [x] Owner creates customer and draft invoice with SKU lines  
- [x] Issue assigns unique number; lines locked  
- [x] AR list shows issued unpaid  
- [x] Fulfill decrements stock via `applyMovement` with invoice ref  
- [x] Concurrent sell still cannot oversell (existing test still passes)  
- [x] Void blocked if any line already fulfilled  
- [x] Print / Save as PDF (`/invoices/[id]/print`)

## 9. Out of scope reminders

| Topic | Phase |
|-------|--------|
| Payment ledger / partial payments | 3 |
| Stripe Invoicing API | 3 optional |
| COGS / margin dashboards | 4 |
| Staff roles | later |

## 10. Ready when

Prefer before coding Phase 2:

1. Phase 1 tests green ✅ (`pnpm test`)  
2. Ops usable for daily stock (local or prod)  
3. Deploy checklist in progress ([OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md))  

## 11. Related phase docs

- [PHASE1_STATUS.md](./PHASE1_STATUS.md)  
- [PHASE3_PAYMENTS.md](./PHASE3_PAYMENTS.md) — payments after invoices  
- [PHASE4_FINANCE.md](./PHASE4_FINANCE.md) — AR / revenue dashboards  
- [TESTING.md](./TESTING.md) — extend with fulfill oversell cases  

