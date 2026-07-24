# Phase 00 — Baseline and official sources

## Objective

Freeze the starting evidence, inventory the implemented system, establish official sources and agent boundaries, and prevent later phases from rewriting history or treating assumptions as verified state.

## Dependencies

None. This phase must complete before any implementation phase.

## In scope

- Git, route, schema, test, workflow, packaging, hosting, and live HTTP inventory.
- Official documentation map.
- Phase ordering, implementation/reviewer protocol, and provider boundary.
- Preservation of pre-existing untracked files.

## Out of scope

- Application, configuration, dependency, environment, database, GitHub, Neon, Hostinger, GoDaddy, or DNS changes.
- Staging, committing, pushing, or deploying.

## Confirmed evidence and root causes

- Starting branch: `codex/project-hardening`.
- `HEAD`, local `main`, and `origin/main` all resolved to `cd5b02dd7eb542c50a74292eb16de6f7749364b0`.
- Pre-existing untracked paths were `.claude/`, `.pi/`, and `.pi-subagents/`; they are user/tool state and must be preserved.
- Implemented routes:

| Area | Effective routes |
|---|---|
| Entry/auth | `/`, `/login`, `/api/auth/[...all]` |
| Dashboard | `/dashboard` |
| Products | `/products`, `/products/new`, `/products/[id]` |
| Stock | `/stock`, `/stock/low` |
| Customers | `/customers`, `/customers/new`, `/customers/[id]` |
| Invoices | `/invoices`, `/invoices/new`, `/invoices/ar`, `/invoices/[id]`, `/invoices/[id]/print` |
| Payments/finance | `/payments`, `/finance` |

- Database migrations `0000`, `0001`, and `0002` currently create `user`, `session`, `account`, `verification`, `products`, `product_variants`, `locations`, `stock_movements`, `customers`, `invoices`, `invoice_lines`, and `payments`.
- Current tests cover inventory/invoice/payment arithmetic, money formatting, and one real PostgreSQL inventory concurrency suite. Invoice issue, payment races, multi-line fulfillment rollback, auth recovery, product aggregate rollback, and browser workflows are not covered.
- `.github/workflows/ci.yml` only runs marketing drift and unit tests on Node 22.
- `.github/workflows/ops-pack.yml` packages on Node 22 and contains an optional automated Hostinger deploy path that can report success after skipping deployment.
- `scripts/deploy-ops-hostinger.sh` uses an unproven multipart request that does not match the current published JSON OpenAPI contract; it must not be enabled.
- Live HTTP was re-verified on 2026-07-24:

| URL | Status |
|---|---|
| `https://perfumeaura.com/` | `200` |
| `https://perfumeaura.com/apps/ops/package.json` | `403` |
| `https://app.perfumeaura.com/login` | `200` |
| `https://app.perfumeaura.com/` | `500` |
| `https://app.perfumeaura.com/api/auth/get-session` | `500` |

This is a point-in-time baseline, not a permanent truth. Phase 07 must re-verify every endpoint and the owner login.

## Exact implementation decisions

- Treat this commit as the immutable comparison baseline.
- Store all execution evidence in `EXECUTION_LOG.md`; do not rewrite baseline facts after remediation.
- Use official project skills and primary documentation.
- Keep all provider writes root-only.
- Require a normal implementation agent followed by a separate independent-review agent for Phases 01–06 and 08. Phase 07 uses separate read-only preparation and evidence-review agents while the root operator performs provider mutations.

## Affected subsystems

Documentation and execution governance only.

## Official documentation

- pnpm workspaces: https://pnpm.io/workspaces
- Next.js App Router: https://nextjs.org/docs/app
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- Better Auth Next.js: https://www.better-auth.com/docs/integrations/next
- Neon architecture: https://neon.com/docs/introduction/architecture-overview
- Hostinger Node.js deployment: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- Hostinger classic Git: https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Required project skills

`better-auth-best-practices`, `better-auth-security-best-practices`, `email-and-password-best-practices`, `neon`, `neon-postgres`, `neon-postgres-branches`, `shadcn`, `vercel-react-best-practices`, and `vercel-composition-patterns` as routed by the later phase.

## Commands and test cases

```bash
git branch --show-current
git rev-parse HEAD
git rev-parse main
git rev-parse origin/main
git status --short --branch
rg --files apps/ops/app packages/db/src/schema packages/db/drizzle .github/workflows scripts
curl -sS -o /dev/null -w '%{http_code}\n' https://perfumeaura.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://perfumeaura.com/apps/ops/package.json
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/login
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/api/auth/get-session
```

## Rollback

This phase creates documentation only. Remove this remediation directory if the plan is rejected; do not touch the preserved untracked paths.

## Completion evidence

- All eleven specified files exist in this directory.
- The baseline SHA, untracked paths, inventories, live-state snapshot, source map, and agent protocol are present.
- `git status` shows no changes outside this directory and the initial untracked paths.

## Prohibited shortcuts

- Do not infer provider health from repository code.
- Do not reveal `.env.local` values.
- Do not “clean” the pre-existing untracked agent folders.
- Do not change provider state while collecting baseline evidence.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 00 file. Work read-only except for appending factual, redacted evidence to `EXECUTION_LOG.md` if the root authorizes it. Reconfirm branch, SHA relationships, untracked paths, route/schema/workflow inventory, and public HTTP statuses. Do not read secret values, edit application files, stage, commit, push, or change any provider. Return discrepancies and exact commands to the root agent.
