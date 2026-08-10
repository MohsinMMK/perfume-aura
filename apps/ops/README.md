# Operations application

Private owner/staff application for catalog, stock, customers, invoices,
payments, finance, and commerce operations.

Product rules live in [`docs/PRODUCT.md`](../../docs/PRODUCT.md). Deployment and
release gates live in [`docs/OPERATIONS.md`](../../docs/OPERATIONS.md).

## Local setup

Copy `apps/ops/.env.example` to the ignored `.env.local`, then configure the
documented local-only values. Export command-required values explicitly; do not
source `.env.local` because display-name values may not be valid shell syntax.

```bash
pnpm db:migrate
pnpm --filter @perfume-aura/db seed
pnpm --filter @perfume-aura/ops seed:owner
pnpm dev:ops
```

Open `http://localhost:3000/login`. Public sign-up is disabled. Normal password
recovery uses `/forgot-password`.

## Access model

- Roles are exactly `owner`, `staff`, or `user`; unknown or combined roles fail
  closed.
- Owner-only capabilities include commercial fields, finance, payment and COD
  reconciliation, release gates, staff management, and audit history.
- Staff may perform approved operations such as shipment updates but cannot
  settle COD or escalate privileges.
- Invitations and mandatory 2FA remain disabled until the production release
  checklist passes.

Owner recovery and TOTP reset are break-glass commands defined in
`.env.example`. Both require exact confirmation strings and revoke owner
sessions. Never log passwords, setup links, TOTP secrets, or recovery codes.

## Health and UI

- `/api/health/live` checks the process.
- `/api/health/ready` checks database readiness without exposing details.
- `/api/health/version` returns the trusted source commit.

Add shared UI only through the official CLI:

```bash
pnpm dlx shadcn@latest add <component> -c apps/ops -y
pnpm dlx shadcn@latest preset resolve -c apps/ops
```

The preset must resolve to `b23PPibQOI`; shared components and tokens belong in
`packages/ui`.
