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

The public storefront is served from the apex through a Hostinger Node.js Web
App with `apps/storefront/server.js`. `www` redirects to the apex. The former
staging host `shop.perfumeaura.com` is deleted.

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

## Deployment

- Storefront: clean prebuilt ZIP, Node 24.x, Framework Other, root `./`, empty
  output, entry `apps/storefront/server.js`.
- Ops: generated prebuilt `hostinger-ops-production` branch, Node 24.x,
  entry `apps/ops/server.js`.
- Neon migrations are reviewed direct-owner operations; production runtime uses
  least-privilege pooled credentials.
