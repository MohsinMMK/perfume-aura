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

The complete verified implementation is published for review in ready PR #9 on
`codex/managed-hosting-release`. Commit
`49836b4dc7d5fcd4f2e21b84f04fc86b98fd3f91` passed fresh quality, integration,
dependency-review, CodeQL, CodeRabbit, and verified-package checks. Superseded
PRs #7 and #8 are closed and their local and remote branches are deleted;
nothing is merged or deployed.
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
hardening changes passed the consolidated local gate on 2026-08-11. The exact
verified code tree was consolidated without content drift as
`41d8018ab6d401689c9c4b0d9c5fb53496bc9f93` in draft PR #9.
The evidence includes the frozen install, deployment self-tests, commerce
verification, lint, type checks, 142 unit tests, both builds and client budgets,
zero-vulnerability pnpm/npm audits, all 62 disposable-PostgreSQL integration
tests, and both checksum-verified packages with extracted-server smoke. Remote
`main` and production remain on
`cc38326dcf46651e10cb618727e4c03ef1fdc948`.

Superseded drafts #7/#8 are not release sources. Ready PR #9 passed fresh CI,
CodeQL, dependency, package, and review automation on its documentation-cleanup
head. GitHub's default branch continues to report 14 Dependabot alerts,
including four high severity alerts, until the reviewed remediation reaches
`main`. `main` is protected with strict required checks, one approval, stale-
review dismissal, last-push approval, conversation resolution, linear history,
administrator enforcement, and force-push/deletion denial. No independent
human reviewer is currently a repository collaborator, so approval remains
blocked.

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

Fresh read-only Hostinger API evidence on 2026-08-11 confirms both managed
websites are enabled, select Node `24`, use `apps/storefront/server.js` and
`apps/ops/server.js`, and have completed recorded deployments. The API does not
expose the missing process attribution, supervisor, routing, resource, repair,
or support-case evidence and therefore does not clear the blocker.

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
- Ready PR #9 is the only intended review source for the combined verified tree.
- Superseded PRs #7/#8 are closed and their local and remote branches are
  deleted.
- One primary worktree is present.
- Local `main` exactly matches `origin/main`.
- `hostinger-ops-production` remains generated deployment state and must not be
  treated as a source branch.

## Next action

1. Keep ready PR #9 green and add an independent repository collaborator to
   provide the required human approval.
2. Obtain the scoped managed-Hostinger process repair before separately
   authorizing any PR #9 merge or production release.
3. Keep all storefront commerce and staff security flags closed.
