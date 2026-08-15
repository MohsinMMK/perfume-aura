# Commerce architecture

```text
perfumeaura.com                 app.perfumeaura.com
Next.js storefront              Next.js owner/staff operations
        │                                  │
        ├── controlled catalog projection ─┤
        ├── HttpOnly cart token             ├── private owner/staff actions
        ├── separate customer-auth boundary ├── independent Better Auth boundary
        └────────────── Neon PostgreSQL ────┘
```

This document owns commerce data, authentication, and release boundaries only.
Live topology belongs in [`../CURRENT_STATE.md`](../CURRENT_STATE.md); provider,
deployment, migration, and recovery procedures belong in
[`../OPERATIONS.md`](../OPERATIONS.md).

## Data boundaries

- Public projection exposes only approved product identity, approved media,
  approved retail price, and calculated availability.
- Costs, raw stock, internal notes, archived records, audit records, finance,
  and operations auth records never cross the storefront projection.
- Storefront carts, checkout sessions, reservations, orders, payment events,
  shipments, reviews, returns, and inquiries are server-authoritative.
- Customer auth and owner/staff auth have separate tables, secrets, cookies,
  origins, and recovery paths.

## Release behavior

All public commerce flags are closed. Disabled customer-auth routes return 404
without initializing Better Auth or Neon. Catalog publication, checkout,
payments, accounts, inquiries, reviews, and indexing open only through their
separate owner-approved gates.
