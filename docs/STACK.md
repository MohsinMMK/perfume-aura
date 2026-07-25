# Locked stack

Change stack only through an explicit reviewed decision. Production hosting remains Hostinger-only.

## Versions and choices

| Area | Choice |
|---|---|
| Workspace | pnpm `11.1.3` monorepo |
| Runtime | Node `24.18.0` local/CI/package; Hostinger Node `24.x` target |
| Ops | Next.js `16.2.11`, App Router, React 19, TypeScript `7.0.2` native CLI |
| TypeScript compatibility | `@typescript/native` aliases TypeScript `7.0.2`; `typescript` aliases `@typescript/typescript6` for Next.js and ESLint compiler-API consumers |
| UI | shadcn/ui, Base UI, Tailwind CSS 4, Hugeicons |
| Auth | Better Auth email/password + Drizzle adapter |
| Database | Neon PostgreSQL + Drizzle ORM/Kit + `pg` Pool |
| Validation | Zod |
| Marketing | Static HTML/CSS |
| Production | Hostinger Business hosting |
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
| Hostinger | Classic Git docs for marketing; Node.js Web App docs for ops |
| pnpm | Official workspace configuration |

No hand-rolled substitutes for official install/setup paths. No Vercel production deployment.

## shadcn monorepo contract

- Base UI package: `packages/ui` (`@perfume-aura/ui`).
- App composition: `apps/ops/components/` imports `@perfume-aura/ui/components/*`.
- Preset: `b23PPibQOI` — luma, taupe, Hugeicons, IBM Plex Sans + Raleway, small radius.
- Tokens: `packages/ui/src/globals.css` only.
- `apps/ops/components.json` must point `tailwind.css` to `../../packages/ui/src/globals.css`.
- Add only used components through CLI:

```bash
pnpm dlx shadcn@latest preset resolve -c apps/ops
pnpm dlx shadcn@latest add button -c apps/ops -y
pnpm dlx shadcn@latest add button -c apps/ops --dry-run
```

Preset resolve must return `b23PPibQOI` without fallback. Never copy registry components manually as primary install path or place base UI under `apps/ops/components/ui`.

## Database connection contract

- Runtime transactional work: pooled Neon URL through `pg` Pool.
- Migrations and administrative SQL: direct Neon URL.
- Tests: disposable loopback PostgreSQL only.
- Ledger writes require interactive transactions; do not switch to `neon-http`.
- Runtime role owns no schema, DDL, role membership, or sequence privilege.

## Auth contract

- Public sign-up disabled.
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
