# Current state

Fresh repository, provider, database, and endpoint evidence outranks this file.
Never record secrets, connection strings, credentials, or customer data here.

Last refreshed: **2026-08-12 IST**.

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

Fresh public verification on 2026-08-12 passed for ops source commit
`6bbf82b5a553f97ea97389ebf6fa84466c5aecfc`. Ops live, ready, version,
unauthenticated session, login, and a real Next static asset passed. Storefront
home, shop, search, cart lock, customer-auth lock, robots lock, static assets,
and the `www` redirect also passed, but the storefront still renders the prior
pre-refinement content from its separately deployed prebuilt artifact.

## Release state

All storefront release flags remain closed:

- public catalog;
- preview catalog;
- checkout approval;
- customer authentication;
- inquiries.

`robots.txt` disallows indexing. Green runtime health does not authorize opening
any release flag.

PR #9 was squash-merged to `main` as
`6bbf82b5a553f97ea97389ebf6fa84466c5aecfc`. Its main run passed quality,
integration, CodeQL, verified-package, generated-branch publication, and exact-
SHA live ops verification. The merged feature branch and superseded PR #7/#8
branches are deleted. The generated ops deployment branch is
`1219f1432f857f915febe2b6df32cc528f635f52`; the separately packaged storefront
refinement is not yet deployed.
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
`main` and live ops now run
`6bbf82b5a553f97ea97389ebf6fa84466c5aecfc`; the public storefront remains on
its prior artifact.

Superseded drafts #7/#8 are not release sources. Merged PR #9 passed fresh CI,
CodeQL, dependency, package, and review-status automation. `main` remains
protected with strict required checks, conversation resolution, linear history,
administrator enforcement, and force-push/deletion denial. On 2026-08-12 the
owner changed only the required approval count from one to zero and disabled
last-pusher approval so the policy matches the repository's solo-maintainer
ownership.

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

The automated 2026-08-12 ops publication and exact-SHA live verification passed,
but this successful deployment is runtime health evidence rather than the
missing provider root-cause and durable-repair evidence.

Fresh read-only Hostinger API evidence on 2026-08-11 confirms both managed
websites are enabled, select Node `24`, use `apps/storefront/server.js` and
`apps/ops/server.js`, and have completed recorded deployments. The API does not
expose the missing process attribution, supervisor, routing, resource, repair,
or support-case evidence and therefore does not clear the blocker.

Fresh authenticated hPanel evidence on 2026-08-11 shows the ops application
running its completed `hostinger-ops-production` deployment and current plan
usage within limits: 0% CPU, about 205 MB memory, and 30 of 120 maximum
processes. The 30-day view averages 3% CPU, 255 MB memory, and 33 of 120 maximum
processes, while the runtime log reports no errors. The same monthly runtime log
contains repeated paired Next.js startup banners as recently as 2026-08-10, so
healthy current usage does not prove the supervisor or NPROC cause was repaired.
The support conversation still provides no case ID, scoped process attribution,
restart-policy cause, HCDN routing evidence, or durable repair. Support said it
generated an LVE snapshot in File Manager, but the visible account root and
filename searches for `LVE`, `LVE_snapshot`, `snapshot`, and `.logs` did not
locate that evidence. On 2026-08-11 the existing human-support thread was
reopened with the fresh resource and paired-start evidence and an explicit
request for the missing provider evidence and durable scoped repair. No provider
reply has arrived yet, and no customer-side process or configuration action was
authorized or performed.

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
- PR #9 is merged; its feature branch and the superseded PR #7/#8 branches are
  deleted locally and remotely.
- Local `main` exactly matches `origin/main`.
- `hostinger-ops-production` remains generated deployment state and must not be
  treated as a source branch.

## Next action

1. Obtain the scoped managed-Hostinger process repair before another production
   publication.
2. After that gate clears, deploy the verified storefront prebuilt artifact and
   prove its refined content at the public apex.
3. Keep all storefront commerce and staff security flags closed.
