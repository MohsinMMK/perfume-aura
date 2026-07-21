# Phase 4 design — Finance dashboards

| Field | Value |
|-------|--------|
| Status | **Core implemented** (`/finance` aggregates; AR aging buckets optional later) |
| Depends on | Phase 1 stock · Phase 2 invoices · Phase 3 payments (partial OK) |
| Complements | [PRD.md](./PRD.md), [DATA_MODEL.md](./DATA_MODEL.md) |
| Updated | 2026-07-22 |

## 1. Goals

Owner sees **actionable financial signals** from the same SoR—without becoming QuickBooks:

1. **Revenue** — issued/paid invoice totals over a period  
2. **AR** — open issued balance (unpaid)  
3. **Inventory value** — sum `qty × cost_cents` (already on Phase 1 dashboard)  
4. **Simple margin / COGS** — approximate cost of goods sold from fulfilled sales  

### Non-goals

- Full double-entry general ledger  
- Tax engine / FBR filing product  
- Multi-entity consolidation  
- Replacing a professional accountant’s books  

## 2. Metrics definitions

| Metric | Definition (v1) |
|--------|------------------|
| **Inventory cost value** | `Σ quantity_on_hand × cost_cents` for active variants |
| **Inventory retail value** | `Σ quantity_on_hand × retail_cents` (optional card) |
| **Revenue (period)** | Sum `invoices.total_cents` where status in (`issued`,`paid`) and `issue_date` in range — **or** sum payments in range (cash basis). **Default: invoice issue basis** with toggle later. |
| **Cash collected (period)** | Sum `payments.amount_cents` where `paid_at` in range |
| **Open AR** | Sum (`total_cents − amount_paid_cents`) for status `issued` |
| **COGS (period)** | For sale movements with `ref_type=invoice` (or all sales) in period: `Σ abs(quantity_delta) × cost_cents_at_time` |
| **Gross margin** | Revenue − COGS (same period basis) |

### Cost snapshot problem

Variant `cost_cents` changes over time. v1 COGS uses **current** cost if no historical cost on movement. Phase 4.1 optional: store `unit_cost_cents` on `stock_movements` at write time for accurate COGS.

**Recommendation:** when implementing Phase 2 fulfill, already pass-through or snapshot cost onto movement note/metadata or new column `unit_cost_cents` nullable.

## 3. Screens

| Route | Purpose |
|-------|---------|
| `/finance` | Period selector (MTD, last 30d, custom) + metric cards |
| `/finance/ar` | Deep link / same as invoices AR with aging buckets (0–30, 31–60, 60+) |
| `/dashboard` | Keep inventory cards; add “Open AR” + “MTD revenue” summary links |

### UI

- shadcn Cards + simple tables  
- Charts optional (later): only if shadcn chart / lightweight lib needed — do not add chart library until required  
- All amounts via `formatPkr`  

## 4. Data access

Prefer **SQL aggregates** in `packages/db` or ops server loaders—no separate warehouse.

```text
getFinanceSummary({ from, to })
getArAging()
getCogsSummary({ from, to })
```

Auth: `requireSession` only (owner).

## 5. Implementation PR sequence

| PR | Scope | Depends |
|----|--------|---------|
| **P4-1** | Finance summary page: inventory + AR + revenue cards | Phase 2 invoices |
| **P4-2** | Cash collected (needs Phase 3 payments) | Phase 3 |
| **P4-3** | COGS / margin from sale movements | Phase 1 sales + Phase 2 fulfill |
| **P4-4** | Optional unit_cost snapshot on movements | accuracy |
| **P4-5** | AR aging buckets | Phase 2 |

Phase 4 can start with **P4-1** as soon as invoices exist, even before payments.

## 6. Acceptance

- [x] Finance page shows inventory cost / retail (live)  
- [x] Open AR on finance page  
- [x] Period revenue (issued invoices with issued_at in range)  
- [x] Cash collected from payments table  
- [x] COGS approx from sale movements × current cost  
- [x] Period toggle 7d / 30d / 90d  
- [x] No stock mutation from finance screens  
- [ ] AR aging buckets (0–30 / 31–60 / 60+)  
- [ ] unit_cost snapshot on movements for accurate COGS

## 7. Related

- [PHASE2_INVOICING.md](./PHASE2_INVOICING.md)  
- [PHASE3_PAYMENTS.md](./PHASE3_PAYMENTS.md)  
- [PHASE1_STATUS.md](./PHASE1_STATUS.md)  
