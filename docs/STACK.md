# Locked stack

Change stack only through an explicit reviewed decision. Production hosting remains Hostinger-only.

## Versions and choices

| Area | Choice |
|---|---|
| Workspace | pnpm `11.1.3` monorepo |
| Runtime | Node `24.18.0` local/CI/package; Hostinger Node `24.x` target |
| Ops + storefront | Next.js `16.2.11`, App Router, React 19, TypeScript `7.0.2` native CLI |
| TypeScript compatibility | `@typescript/native` aliases TypeScript `7.0.2`; `typescript` aliases `@typescript/typescript6` for Next.js and ESLint compiler-API consumers |
| UI | shadcn/ui, Base UI, Tailwind CSS 4, Hugeicons |
| Auth | Two isolated Better Auth boundaries: owner ops and storefront customer, each with separate tables, secrets, cookies, origins, and Drizzle adapter |
| Database | Neon PostgreSQL + Drizzle ORM/Kit + `pg` Pool |
| Validation | Zod |
| Production | Hostinger Business hosting |
| Ops deploy automation | GitHub Actions prebuilt standalone → generated branch `hostinger-ops-production` → Hostinger Node GitHub App start (`apps/ops/server.js`) |
| Ops source build on Hostinger | Blocked (esbuild EACCES); not used |
| Storefront deployment | Hostinger Node.js Web App at `perfumeaura.com`; checksum-verified prebuilt ZIP, entry `apps/storefront/server.js` |
| Payments | Cashfree Payment Gateway (server-created INR orders, signed raw-body webhooks, server status verification, refunds) plus separately reconciled COD |
| Registrar | GoDaddy; registration/renewal only |

## Official tooling only

| Tool | Required path |
|---|---|
| shadcn/ui | Official CLI and monorepo docs |
| Next.js | Current App Router docs |
| TypeScript | Official TypeScript 7 side-by-side TypeScript 6 compatibility setup; `tsc` resolves to `7.0.2`, `tsc6` provides the compatibility CLI, and the aliased `typescript` package provides the temporary JavaScript API |
| Better Auth | Official Next.js, Drizzle, email/password, security docs |
| Drizzle | Official schema, Kit, migration, and PostgreSQL guides |
| Neon | Official connection, branch, pooling, and role guidance |
| Hostinger | Official Node.js Web App deployment and custom-domain docs for storefront and ops |
| pnpm | Official workspace configuration |

No hand-rolled substitutes for official install/setup paths. No Vercel production deployment.

## Temporary transitive security compatibility

`pnpm-workspace.yaml` pins patched `brace-expansion`, `@hono/node-server`, and `esbuild` releases while upstream parent ranges lag current advisories. `patches/minimatch@3.1.5.patch`, created through official `pnpm patch`, adapts minimatch 3 to brace-expansion 5's named CommonJS export. Remove overrides and patch when ESLint, MCP SDK/shadcn, and Drizzle Kit publish compatible dependency ranges; keep `pnpm audit`, lint, shadcn preset resolution, migrations, and packaging green when changing them.

## shadcn monorepo contract

- Base UI package: `packages/ui` (`@perfume-aura/ui`).
- App composition: `apps/ops/components/` and `apps/storefront/components/`
  import `@perfume-aura/ui/components/*`.
- Preset: `b23PPibQOI` — luma, taupe, Hugeicons, IBM Plex Sans + Raleway, small radius.
- Tokens: `packages/ui/src/globals.css` only.
- `apps/ops/components.json` must point `tailwind.css` to `../../packages/ui/src/globals.css`.
- Add only used components through CLI:

```bash
pnpm dlx shadcn@latest preset resolve -c apps/ops
pnpm dlx shadcn@latest add button -c apps/ops -y
pnpm dlx shadcn@latest add button -c apps/ops --dry-run
pnpm dlx shadcn@latest preset resolve -c apps/storefront
```

Preset resolve must return `b23PPibQOI` without fallback. Never copy registry components manually as primary install path or place base UI under `apps/ops/components/ui`.

## Database connection contract

- Runtime transactional work: pooled Neon URL through `pg` Pool.
- Migrations and administrative SQL: direct Neon URL.
- Tests: disposable loopback PostgreSQL only.
- Ledger writes require interactive transactions; do not switch to `neon-http`.
- Runtime role owns no schema, DDL, role membership, or sequence privilege.

## Auth contract

- Owner public sign-up disabled. Customer sign-up is a distinct verified-email
  flow and defaults off until `STOREFRONT_CUSTOMER_AUTH_ENABLED=true` plus all
  secret, SMTP, and callback-domain gates are proven.
- Owner seeded explicitly.
- Password length: 12–256 characters.
- Generic reset responses prevent account enumeration.
- SMTP reset tokens, sessions, trusted origins, and rate limits follow Better Auth official guidance.
- Hostinger proxy/IP header trust stays disabled/unassumed until provider chain is proven non-forgeable through production gate in `OPERATIONS.md`.
- Never expose `BETTER_AUTH_SECRET`, owner credentials, SMTP password, or database URLs.

## Installed project skills

Skills live under `.agents/skills/` and are locked by `skills-lock.json`:

- shadcn: `shadcn`, `migrate-radix-to-base`
- Better Auth: best-practice, email/password, security skills
- Neon: platform, Postgres, branches
- Vercel: React/composition patterns only; never deploy skills

Restore with:

```bash
pnpm dlx skills experimental_install
```
