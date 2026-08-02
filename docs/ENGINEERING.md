# Engineering

## Repository layout

```text
apps/storefront/  public Next.js application
apps/ops/         internal Next.js application
packages/db/      Drizzle schema, SQL migrations, runtime grants, tests
packages/ui/      shadcn/Base UI shared primitives
packages/validators/
scripts/          packages, deployment verification, commerce checks
```

No static marketing application or generated root publish surface remains.

## Application boundaries

- Storefront uses a controlled public catalog projection and a secure HttpOnly
  cart token. It never returns costs, raw stock, internal notes, or archived
  records.
- Ops uses independent Better Auth owner sessions and private server actions.
- Storefront customer auth has separate tables, secrets, cookies, and trusted
  origins. It is disabled and must not import auth/database code on disabled
  routes.
- `proxy.ts` preserves apex canonicalization and redirects `www` to the exact
  apex path and query.

## Database

- Runtime writes use a restricted pooled Neon role through `pg` and Drizzle
  interactive transactions.
- Migrations and administrative grants use a direct owner connection.
- Integration tests use disposable loopback PostgreSQL only.
- Money persists as integer INR paise; no browser float is authoritative.
- Inventory, invoice/payment, and commerce reservation/order lifecycles are
  transactionally locked and idempotent where a client or provider may retry.

### Retained financial and inventory contracts

The following database contracts remain operational safeguards; they are not
legacy deployment behavior:

```sql
CREATE TRIGGER "stock_movements_append_only"
BEFORE UPDATE OR DELETE ON "stock_movements"
FOR EACH ROW EXECUTE FUNCTION "prevent_stock_movement_mutation"();

CHECK ("status" = 'void' AND "amount_paid_cents" = 0);
CHECK ("variant_id" IS NOT NULL OR "quantity_fulfilled" = 0);
```

Intentional payment-trigger deferral remains in force: payment mutation is not
database-trigger-blocked until a linked reversal/credit-note model can preserve
the authoritative net-sum. Fulfillment is aggregate-only for free-text invoice
lines. Return movements are not netted into invoice fulfillment, and a draft line with a matching sale movement is rejected by preflight and reconciliation.

## Local commands

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build:storefront
pnpm build:ops
pnpm storefront:pack
pnpm ops:pack
node scripts/verify-production-deploy.mjs self-test
git diff --check
```

`pnpm check` runs commerce verification, lint, typecheck, unit tests, both
production builds, and production dependency audit. Run integration tests
separately with explicitly supplied disposable database URLs.

## CI and packages

`.github/workflows/ops-pack.yml` validates both production builds and both
clean standalone artifacts. It uploads an inspected artifact set on `main`;
only the ops package is published automatically to
`hostinger-ops-production`. The storefront artifact remains a deliberate
Hostinger ZIP deployment with exact checksum verification.

The production verifier always checks the apex storefront plus ops exact SHA,
health, auth-session response, and static assets:

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --public-surface storefront \
  --public-base https://perfumeaura.com
```

## Quality and security

- Use the official shadcn CLI; shared primitives belong in `packages/ui`.
- Keep secrets only in local ignored env files or Hostinger settings.
- Use persistent labels, semantic buttons, 44px minimum targets, inert closed
  drawers, focus restoration, and reduced-motion-safe animation.
- Every public release flag remains false unless its owning acceptance evidence
  is recorded.
