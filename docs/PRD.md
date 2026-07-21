# PRD — Perfume Aura Ops Platform

| Field | Value |
|-------|--------|
| Product | Perfume Aura Ops Platform |
| Brand | Perfume Aura (`perfumeaura.com`) |
| Version | 1.1 |
| Status | Approved (locked stack) · Phase 1 code complete |
| Audience | Owner / internal staff (not public customers in v1) |
| Updated | 2026-07-22 |
| Related | [TRD.md](./TRD.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [ROADMAP.md](./ROADMAP.md), [PHASE1_STATUS.md](./PHASE1_STATUS.md) |

## 1. Problem

Perfume Aura needs a **single owned system of record** for stock, then invoices, payments, and simple finance—without Zoho/QuickBooks as the core product, and without breaking Hostinger marketing deploy.

## 2. Vision

A private, brand-aligned admin app where the owner can:

1. Know exact stock by perfume SKU (size/ml)  
2. Later issue invoices and record payments  
3. See financial signals from the same data  

## 3. Goals and non-goals

### Goals

- Fully custom codebase and database  
- Inventory-first MVP that is trustworthy day-to-day  
- Architecture extends to invoicing, payments, finance without rewrite  
- All production on **Hostinger** (marketing classic Git + ops Node.js Web App)  
- **Monorepo** delivery  

### Non-goals (v1 / Phase 1)

- Public e-commerce storefront  
- Multi-warehouse / multi-company  
- Full double-entry accounting package  
- Domain transfer off GoDaddy  
- Vercel as production host  

## 4. Users

| Persona | Needs | Phase |
|---------|--------|-------|
| **Owner** | Full access: products, stock; later invoices, payments, finance | 1+ |
| **Staff** | Receive stock, record sales; limited adjust | Later |

## 5. Phase 1 user journeys

1. Login → private dashboard  
2. Add product → variants (e.g. 50ml, 100ml) with SKU, cost, retail, reorder  
3. Receive stock → qty up; movement logged  
4. Record sale/out → qty down; movement logged  
5. Low stock list (+ nav attention)  
6. Dashboard: products, units, inventory cost value  
7. Search/filter products by name, brand, category, SKU  

Status: [PHASE1_STATUS.md](./PHASE1_STATUS.md).

## 6. Functional requirements

### Auth

| ID | Requirement | Priority | Phase 1 |
|----|-------------|----------|---------|
| FR-AUTH-1 | Authenticated only; no public registration | P0 | ✅ |
| FR-AUTH-2 | Secure session; logout | P0 | ✅ |
| FR-AUTH-3 | Role field ready (`owner` \| `staff`); enforce owner-only v1 | P1 | 🟡 field ready |

### Inventory (Phase 1)

| ID | Requirement | Priority | Phase 1 |
|----|-------------|----------|---------|
| FR-INV-1 | CRUD products | P0 | ✅ |
| FR-INV-2 | CRUD variants/SKUs (size_ml, unique SKU, cost, retail, reorder) | P0 | ✅ |
| FR-INV-3 | Qty changes **only** via stock movements | P0 | ✅ |
| FR-INV-4 | Movement types: receive, sale, adjust, damage, return | P0 | ✅ core; UI receive/adjust |
| FR-INV-5 | Movement: delta, qty after, note, user, timestamp | P0 | ✅ |
| FR-INV-6 | Atomic updates; no concurrent oversell | P0 | ✅ tested |
| FR-INV-7 | Low-stock list | P0 | ✅ |
| FR-INV-8 | Dashboard metrics | P0 | ✅ |
| FR-INV-9 | Search/filter | P1 | ✅ |
| FR-INV-10 | CSV export | P2 | ⬜ |

### Later phases (summary)

| Phase | Capabilities | Design doc |
|-------|----------------|------------|
| **2** | Customers, invoices (draft→issued→paid/void), lines, AR, PDF, fulfill→stock | [PHASE2_INVOICING.md](./PHASE2_INVOICING.md) |
| **3** | Manual payments first; optional Stripe Invoicing API | [PHASE3_PAYMENTS.md](./PHASE3_PAYMENTS.md) |
| **4** | Revenue, AR, inventory value, simple COGS/margin | [PHASE4_FINANCE.md](./PHASE4_FINANCE.md) |

## 7. Non-functional

| ID | Requirement | Notes |
|----|-------------|--------|
| NFR-1 | Mobile-usable admin | Responsive shell + sidebar |
| NFR-2 | HTTPS production | Hostinger SSL |
| NFR-3 | Secrets only in env | [ENV.md](./ENV.md) |
| NFR-4 | Fresh stock data | force-dynamic; no stock cache |
| NFR-5 | English UI v1 | |
| NFR-6 | Currency **PKR** (integer minor units) | paisa in DB |
| NFR-7 | shadcn/ui as base UI + Tailwind | preset `b23PPibQOI` |

## 8. Success metrics (Phase 1)

| Metric | How we know |
|--------|-------------|
| Daily stock without spreadsheets | Owner uses ops for receive/adjust |
| Movement history answers “why is stock X?” | `/stock` ledger |
| Concurrent sale cannot oversell | Integration test green |
| Marketing unaffected / no ops leak | curl `/apps/ops/package.json` → 404 |

## 9. Roadmap

See [ROADMAP.md](./ROADMAP.md).

```text
Phase 0  Docs + monorepo scaffold              ✅
Phase 1  Inventory MVP                         ✅ code + tests; deploy pending
Phase 2  Invoicing                             ✅ core implemented
Phase 3  Payments                              ✅ manual payments
Phase 4  Finance dashboards                    ✅ core /finance
```
