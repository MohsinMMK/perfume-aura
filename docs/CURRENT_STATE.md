# Current state

Fresh repository, provider, database, and endpoint evidence outranks this file.
Never record secrets, connection strings, credentials, or customer data here.

Last refreshed: **2026-08-13 IST**.

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

Fresh public verification on 2026-08-13 passed for merged source commit
`a58e1252c745450113a237e4a9c53d4d0360003f`. Main workflow run
`31714977191` built and checksum-verified both standalone artifacts, published
the generated ops branch, verified the exact ops SHA live, and supplied the
storefront archive `perfume-aura-storefront_a58e1252c745.zip`. The archive was
checksum-verified locally, deployed through the existing Hostinger Web App,
and completed with Node `24`, no build command or output directory, and entry
`apps/storefront/server.js`. The production verifier passed ops live, ready,
version, unauthenticated session, login, and static-asset checks together with
the storefront release locks and a real Next static asset. The exact `www`
path-and-query redirect also returned `308`.

## Release state

All storefront release flags remain closed:

- public catalog;
- preview catalog;
- checkout approval;
- customer authentication;
- inquiries.

`robots.txt` disallows indexing. Green runtime health does not authorize opening
any release flag.

PR #13 was squash-merged to `main` as
`a58e1252c745450113a237e4a9c53d4d0360003f`. Main workflow run `31714977191`
passed quality, all 62 integration tests, verified packaging, generated-branch
ops publication, and exact-SHA live verification. Separate CodeQL run
`31714977365` also passed. The storefront audit remediation is deployed; no
release flag changed.
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
hardening changes passed the consolidated local gate again on 2026-08-13, and
the exact release source is merged PR #13.
The evidence includes the frozen install, deployment self-tests, commerce
verification, lint, type checks, 142 unit tests, both builds and client budgets,
zero-vulnerability pnpm/npm audits, all 62 disposable-PostgreSQL integration
tests, and both checksum-verified packages with extracted-server smoke. Remote
`main`, live ops, and the public storefront now run source commit
`a58e1252c745450113a237e4a9c53d4d0360003f`.

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
perform another deployment, stop plan-wide processes, migrate production, or
enable flags without explicit authorization and fresh owning-gate evidence.

The automated 2026-08-13 ops publication, the authorized storefront archive
deployment, and exact-SHA live verification passed, but these successful
deployments are runtime health evidence rather than the missing provider
root-cause and durable-repair evidence.

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
authorized or performed during that investigation.

### Storefront browser hardening

The deployed audit remediation now provides pathname-aware top navigation and
history restoration, one detail link per product card, corrected cart hierarchy
and customer-facing language, WCAG AA muted-text tokens, surface-appropriate
focus indicators, and current Next Image loading hints. Preview fixtures remain
unpublished and all commerce locks remain closed.

Immediately after the 2026-08-13 archive deployment, HCDN served stale HTML
that referenced removed chunks and produced browser MIME/404 errors. One
authorized cache flush restored the current document and assets. Fresh
1440x900 and 390x844 sessions then produced zero console errors or warnings.
The browser gate also passed 720px and 360px reflow without horizontal overflow,
reduced-motion behavior, top-of-page forward navigation, Back scroll
restoration, menu and cart focus trapping, Escape focus restoration, and the
48px empty-cart action. Future storefront archive releases must include a fresh
edge-cache browser pass before acceptance.

### Managed Hostinger deployment boundary

Both production applications remain on their existing Hostinger managed
Node.js Web Apps. Neon remains independent and shared. No alternate hosting
implementation or DNS topology change is planned. The authorized PR #13
release passed exact-SHA verification, but the unresolved Hostinger process
incident remains an infrastructure risk: the green deployment does not supply
the missing scoped process attribution, restart cause, or durable-repair proof.

## Repository

- One primary worktree.
- PR #13 is merged and its remote source branch is deleted.
- `main` includes this documentation-only state record after the deployed source
  commit above; the live applications remain at that deployed source commit.
- `hostinger-ops-production` remains generated deployment state and must not be
  treated as a source branch.

## Next action

1. Obtain scoped managed-Hostinger process attribution, restart-cause evidence,
   and durable-repair proof before treating the historical incident as closed.
2. Keep all storefront commerce and staff security flags closed.
3. Include an HCDN cache and clean-browser check in every future storefront
   archive release.
