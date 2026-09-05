# Perfume Aura agent instructions

## Read only the owner you need

Start with `docs/CURRENT_STATE.md`: actual topology, releases, locks and next work.
Fresh source/provider/DNS/endpoint evidence outranks documentation.

| Task | Owner |
|---|---|
| Code, tests, architecture, UI/data/auth invariants | `docs/ENGINEERING.md` |
| Hosting, deployment, DNS, secrets, migrations, recovery | `docs/OPERATIONS.md` |

Engineering routes product/commerce questions to `docs/COMMERCE.md` and exact
catalog/legal/design evidence to `docs/REFERENCE.md`. Do not load all docs.

Use the Graphify skill for code relationships. Read its current lessons, expand
against actual graph vocabulary, then query with a small budget. Confirm the
returned source paths in this checkout. Missing graph coverage is not proof of
absence: use the owning doc and targeted `rg`. Live infrastructure is not graph
truth. Do not rebuild the whole graph for a routine question.

## Scope and invariants

- Public storefront: `perfumeaura.com`; www permanently redirects preserving
  path/query. Private Ops: `app.perfumeaura.com`. No shop or www.app domain.
- Storefront and Ops share Neon and currently share one runtime database role.
  Keep app auth tables, cookies and auth secrets separate; never copy Ops auth
  credentials into storefront or delete/recreate Neon. Role separation needs review.
- Preserve unrelated sites, mail, DNS, databases, VPS stacks and processes.
  GoDaddy owns registration; Hostinger nameservers own DNS.
- Inspect existing signatures; keep changes minimal and strictly typed.
- Money is server-authoritative integer INR paise. Public data excludes cost,
  raw stock, internal notes and archives.
- Disabled `/api/customer-auth/*` returns 404 before initializing auth/Neon.
  Other gated routes may statically import auth before 404; do not change casually.
- Preserve persistent labels, visible focus, inert closed drawers, focus
  restoration, 44px targets and reduced motion. Shared UI is `packages/ui`;
  official shadcn preset `b23PPibQOI` must resolve.
- Runtime writes use pooled pg/Drizzle transactions; manual direct-owner
  migrations require isolated proof and restricted grants. Tests use only
  disposable loopback PostgreSQL, never Neon.
- Secrets stay in ignored local env or owning platform/root-owned runtime stores.
  No secret values, connection strings or customer data in docs/artifacts/logs.
- Prove cleanup targets retired/duplicated/generated first. Preserve `dist/`,
  credentials, source evidence, migrations, recovery artifacts and session state.
  Never globally prune Docker or stop a shared hosting plan.

## Release and verification

Read Current state + Operations before any provider action. Prefer Hostinger MCP,
GitHub CLI and private SSH; use hPanel only for missing API capabilities.
Do not infer authority for unrelated writes, production migrations, secrets,
DNS, recovery or release flags. Commerce and staff flags stay closed.

Live SHAs come from each surface's `/api/health/version`, never Git HEAD.
Verify exact SHA, real static asset, www redirect, storefront locks, and Ops
live/ready/unauthenticated session. Follow Operations for full acceptance.

Ops deployment is blocked until its pending migration/grant owner gate passes.
Storefront-only releases may proceed only with Ops/database work excluded.
Markdown-only changes must not publish or deploy.

For publication use conventional commits, scoped staging, protected PR checks,
conversation resolution and merge, then owning deployment and public acceptance.
Preserve strict checks, linear history, admin enforcement and force-push denial.

## Finish

Run relevant checks; full gate is `pnpm check`, `pnpm test:integration` with all
three database URL variables set to the same disposable loopback database, and
`git diff --check`. Report exact commands, release status and new env names.

Update Current state when topology, risk or next work changes. Keep docs concise
and current-only: no session narratives or completed incident/release ledgers.
Preserve active requirements and approval evidence; do not confuse them with logs.
