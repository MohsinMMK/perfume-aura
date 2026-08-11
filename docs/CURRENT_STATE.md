# Current state

Fresh repository, provider, database, and endpoint evidence outranks this file.
Never record secrets, connection strings, credentials, or customer data here.

Last refreshed: **2026-08-11 IST**.

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

Fresh public verification on 2026-08-11 passed for production source commit
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

The staff and observability implementations are reconciled locally on the
combined `codex/observability` branch. Remote draft PRs #7 and #8 are unchanged;
nothing is deployed.
`OPS_TWO_FACTOR_REQUIRED` and `OPS_STAFF_INVITES_ENABLED` stay false until the
complete staff release checklist passes. Observability remains fail-closed
without its environment values.

## Active blockers

### Runtime, dependency, and CI gate

The combined local implementation contains compatible transitive overrides for
all advisories known on 2026-08-10, a full-workspace low-severity audit gate,
pinned JavaScript and TypeScript CodeQL analysis, and a fail-closed
Markdown-only deployment guard. The final lockfile and packaging assertions
include staff and observability. Repository tooling, CI, lockfiles, and both
packers are now aligned to the observed Hostinger baseline of Node `24.6.0`, npm
`11.5.1`, and pnpm `10.32.1`, with application engines accepting compatible
Node `24.x` patches from `24.6.0` onward. The current alignment and browser
hardening changes passed the consolidated local gate on 2026-08-11 in the
uncommitted working tree based on `4b7450476dc13760969b032133e219089121c796`.
The evidence includes the frozen install, deployment self-tests, commerce
verification, lint, type checks, 142 unit tests, both builds and client budgets,
zero-vulnerability pnpm/npm audits, all 62 disposable-PostgreSQL integration
tests, and both checksum-verified packages with extracted-server smoke. Remote
`main` and production remain on
`cc38326dcf46651e10cb618727e4c03ef1fdc948`.

The remote staff PR currently fails its dependency audit on the old `nanoid`
resolution; the observability PR's last checks predate the reconciled local
work. GitHub currently reports 14 open Dependabot alerts, including four high
severity alerts, no available CodeQL analysis, and no `main` branch protection.
The locally remediated dependency and CI changes must be republished and pass
fresh remote checks before release.

### Hostinger runtime alignment and process incident

Hostinger officially exposes Node by supported major version and both managed
applications select Node `24.x`. Their live deployment logs currently show Node
`24.6.0` and pnpm `10.32.1`. This is the accepted managed-production
compatibility baseline. Hostinger supports pnpm but controls the installed
version.

The repository mismatch is corrected locally. Future provider runtime changes
must be read from fresh deployment logs and revalidated before release; the
Node major selector in hPanel is not proof of an unchanged patch or pnpm
version.

The prior ops HCDN `503`/shared NPROC incident is recovered but unresolved.
Hostinger closed the support conversation without Linux user/domain/path/PID
attribution, supervisor restart cause, HCDN routing evidence, a durable scoped
repair, or a case ID. Current public health does not close this blocker. Do not
redeploy, stop plan-wide processes, migrate production, or enable flags until a
scoped repair is proven and both applications are re-smoked.

### Storefront browser hardening

The 2026-08-11 production browser pass rendered the storefront and release
locks, but logged two non-fatal GSAP missing-target warnings. Local Phase 2
changes now snapshot animation targets before the asynchronous GSAP import and
add an enforced storefront CSP/HSTS boundary. The CSP includes only the current
first-party, Cashfree, PostHog, and Sentry requirements. Production remains on
the prior headers and animation code until an authorized release. The local
production build returned the enforced CSP and one-year HSTS header, rendered
the release-gated home in Chromium, and produced zero browser warnings or
errors after the animation effects settled.

### Managed Hostinger deployment boundary

Both production applications remain on their existing Hostinger managed
Node.js Web Apps. Neon remains independent and shared. No alternate hosting
implementation or DNS topology change is planned. The unresolved Hostinger
process incident remains the infrastructure gate for publishing or releasing
the prepared work.

## Repository

- One primary worktree.
- Local `main` contains unpublished cleanup and CI-security commits.
- The existing staff and observability branches are rebased locally; their
  remote draft PR heads are not changed.
- One worktree and three local branches are present during reconciliation.
- Required remote branches: `main`, both open PR branches, and generated
  `hostinger-ops-production`.

## Next action

1. Obtain the scoped managed-Hostinger process repair, then publish prepared
   `main` only after authorization and exact-SHA acceptance.
2. Require fresh remote CI, CodeQL, dependency-alert, approval, and protection
   evidence before any merge or release.
3. Release staff operations and observability in their ordered phases.
4. Keep all storefront commerce and staff security flags closed.
