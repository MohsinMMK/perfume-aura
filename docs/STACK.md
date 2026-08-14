# Locked stack

Change stack only through an explicit reviewed decision. Production is split
between Hostinger managed hosting for storefront and a hardened Hostinger VPS
container for ops; Neon remains the shared managed database.

## Versions and choices

| Area | Choice |
|---|---|
| Workspace | pnpm `10.32.1` monorepo, aligned to the observed Hostinger deployment baseline |
| Runtime | Node `24.x`; repository, CI, and ops image baseline `24.6.0`, engines `>=24.6.0 <25` |
| Ops + storefront | Next.js `16.2.11`, App Router, React 19, TypeScript `7.0.2` native CLI |
| TypeScript compatibility | `@typescript/native` aliases TypeScript `7.0.2`; `typescript` aliases `@typescript/typescript6` for Next.js and ESLint compiler-API consumers |
| UI | shadcn/ui, Base UI, Tailwind CSS 4, Hugeicons |
| Auth | Two isolated Better Auth boundaries: owner ops and storefront customer, each with separate tables, secrets, cookies, origins, and Drizzle adapter |
| Database | Neon PostgreSQL + Drizzle ORM/Kit + `pg` Pool |
| Validation | Zod |
| Analytics | Privacy-filtered PostHog JavaScript SDK; shared project separated by mandatory `application` property |
| Errors and traces | Official Sentry Next.js SDK with separate storefront and ops projects |
| Production | Hostinger Business Web App/HCDN for storefront; Hostinger VPS/Caddy for ops; Neon PostgreSQL shared |
| Ops deploy automation | GitHub Actions verified standalone → immutable GHCR image → Tailscale forced SSH → hardened VPS container (`apps/ops/server.js`) |
| Ops Hostinger Web App | Frozen rollback state only; direct source build remains blocked and is not used |
| Storefront deployment | Hostinger Node.js Web App at `perfumeaura.com`; checksum-verified prebuilt ZIP, entry `apps/storefront/server.js` |
| Future storefront automation | Generated `hostinger-storefront-production` branch; enable live verification only after provider Git connectivity exists |
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
| Hostinger | Official Node.js Web App docs for storefront and official VPS/network controls for ops |
| PostHog | Official JavaScript SDK and privacy configuration |
| Sentry | Official Next.js SDK, Logs, releases, and source-map workflow |
| pnpm | Official workspace configuration |

No hand-rolled substitutes for official install/setup paths. No Vercel production deployment.

## Runtime contract

Hostinger Business Web Hosting exposes Node.js by major-version selector. The
supported managed choices currently include `18.x`, `20.x`, `22.x`, and `24.x`;
the storefront selects `24.x`. Hostinger supports pnpm but owns the installed
patch. Storefront deployment logs are therefore the authority for managed
runtime compatibility.

The ops image, CI, and package generation pin Node `24.6.0`; CI also pins npm
`11.5.1` and pnpm `10.32.1`. Application engines accept compatible Node `24.x`
patches from `24.6.0` onward. A future managed-runtime, image, or package-manager
change is not accepted silently: inspect the owning platform evidence, update
the compatibility lane, run the complete gate, and verify the exact deployed
SHA before release.

## Temporary transitive compatibility

`pnpm-workspace.yaml` contains reviewed overrides for parent ranges that lag
security or runtime fixes. `patches/minimatch@3.1.5.patch`, created with
`pnpm patch`, adapts minimatch 3 to brace-expansion 5's CommonJS export.

The reviewed security overrides currently pin `postcss@8.5.23`,
`nanoid@3.3.18`, `brace-expansion@5.0.9`, `fast-uri@3.1.5`,
`ip-address@10.3.1`, `undici@7.29.0`, `js-yaml@4.3.1`, and `hono@4.12.34`.
Change an override only with dependency-path evidence, then verify the audit,
lint, shadcn preset resolution, migrations, both builds, and both packages.
Remove overrides when upstream ranges make them unnecessary.

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

- Owner/staff public sign-up disabled. Customer sign-up is a distinct verified-email
  flow and defaults off until `STOREFRONT_CUSTOMER_AUTH_ENABLED=true` plus all
  secret, SMTP, and callback-domain gates are proven.
- Owner seeded explicitly.
- Password length: 12–256 characters.
- Ops roles are exact `owner`, `staff`, or `user`; roles and capability checks
  fail closed. The official Admin + 2FA plugins use TOTP, encrypted recovery
  codes, a 30-day trusted-device window, and feature flags that default off.
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
