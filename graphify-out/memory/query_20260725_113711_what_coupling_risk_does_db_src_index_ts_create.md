---
type: "query"
date: "2026-07-25T11:37:11.228407+00:00"
question: "What coupling risk does db/src/index.ts create?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["db/src/index.ts", "lib/auth.ts", "lib/products.ts", "lib/invoices.ts", "transactions.ts", "DomainError", "pool", "issueInvoice"]
---

# Q: What coupling risk does db/src/index.ts create?

## Answer

Expanded via graph vocab: [database, index, exports, client, transactions, domain, error, invoice, product, workflow, pool, schema]. Graph shows packages/db/src/index.ts:L1 has degree 97: 87 outgoing EXTRACTED re_exports and 10 incoming EXTRACTED imports_from edges. Importers span auth, business date, customers, finance, health, invoices, owner maintenance, payments, products, and stock. Export surface spans client/pool/db at L1, inventory at L5, DomainError at L14, transactions at L20, business time at L31, product workflows at L45, invoice workflows at L61, payment workflows at L71, finance workflows at L79, inventory math at L84, and invoice math at L94. Coupling risk is moderate-high compile-time/API coupling: one facade is shared by ten app domains and exposes infrastructure, domain errors, schemas, math, and workflows through one boundary. Graph proves fan-in/fan-out, but does not prove runtime coupling, circular dependencies, or bundle impact. Best mitigation: retain facade for stable shared primitives, add domain subpath exports, migrate app modules to narrow domain entry points, and enforce allowed imports.

## Outcome

- Signal: useful

## Source Nodes

- db/src/index.ts
- lib/auth.ts
- lib/products.ts
- lib/invoices.ts
- transactions.ts
- DomainError
- pool
- issueInvoice