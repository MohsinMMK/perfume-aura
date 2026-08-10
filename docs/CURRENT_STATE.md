# Current state

Fresh repository, provider, database, and endpoint evidence outranks this file.
Never record secrets, connection strings, credentials, or customer data here.

Last refreshed: **2026-08-10 IST**.

## Production

| Surface | State |
|---|---|
| `perfumeaura.com` | Hostinger Node.js Web App running the release-gated storefront |
| `www.perfumeaura.com` | Path- and query-preserving `308` to the apex |
| `app.perfumeaura.com` | Hostinger Node.js Web App running private operations |
| `www.app.perfumeaura.com` | Absent from Hostinger DNS and public DNS |
| `shop.perfumeaura.com` | Deleted; do not recreate without an explicit decision |

Storefront and ops share Neon PostgreSQL. Their auth tables, secrets, cookies,
origins, and recovery flows remain separate.

Fresh public verification on 2026-08-10 passed for production source commit
`cc38326dcf46651e10cb618727e4c03ef1fdc948`. Ops live, ready, version,
unauthenticated session, login, and a real Next static asset passed. Storefront
home, shop, search, cart lock, customer-auth lock, robots lock, static assets,
and the `www` redirect passed. Cloudflare and Google DNS returned NXDOMAIN for
`www.app.perfumeaura.com`.

## Release state

All storefront release flags remain closed:

- public catalog;
- preview catalog;
- checkout approval;
- customer authentication;
- inquiries.

`robots.txt` disallows indexing. Green runtime health does not authorize opening
any release flag.

The staff-operations implementation is on draft PR #7 at
`7773b220aab4edf6e07fad43baebe97caefcae3a`. It is not deployed.
`OPS_TWO_FACTOR_REQUIRED` and `OPS_STAFF_INVITES_ENABLED` stay false until the
complete staff release checklist passes. Observability remains isolated on
draft PR #8 and is also not deployed.

## Active blockers

### Dependency gate

`pnpm check` currently fails at the production audit:

- `postcss@8.5.22` — moderate; patched in `8.5.23`;
- `nanoid@3.3.16` — high; patched in `3.3.17`.

Unit tests, typecheck, both production builds, client budgets, and 62 disposable
PostgreSQL integration tests passed on 2026-08-10. Do not release until the
security audit is green and the affected packages are reverified.

### Hostinger runtime and process incident

Hostinger deployment logs still show Node `24.6.0` and pnpm `10.32.1`; the
repository requires Node `24.18.0` and pnpm `11.1.3`. Do not weaken repository
constraints to match the provider.

The prior ops HCDN `503`/shared NPROC incident is recovered but unresolved.
Hostinger closed the support conversation without Linux user/domain/path/PID
attribution, supervisor restart cause, HCDN routing evidence, a durable scoped
repair, or a case ID. Current public health does not close this blocker. Do not
redeploy, stop plan-wide processes, migrate production, or enable flags until a
scoped repair is proven and both applications are re-smoked.

## Repository

- One primary worktree.
- Current branch: `codex/staff-operations`; verify upstream divergence live
  before publication.
- Local branches: `main` and `codex/staff-operations` only.
- Required remote branches: `main`, both open PR branches, and generated
  `hostinger-ops-production`.

## Next action

1. Remediate the dependency gate without changing the locked stack broadly.
2. Obtain the scoped Hostinger repair and compliant runtime.
3. Run [the staff release checklist](STAFF_OPERATIONS_RELEASE_SMOKE.md) in order.
4. Keep all storefront commerce flags closed.
