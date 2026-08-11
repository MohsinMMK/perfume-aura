# Roadmap

This file tracks pending work. Current production evidence and exact SHAs belong
in [CURRENT_STATE.md](CURRENT_STATE.md).

## Completed locally

- Documentation and Git cleanup, including removal of tracked Graphify output.
- Compatible dependency remediation, full-workspace audits, pinned CodeQL, and
  the Markdown-only deployment guard.
- Staff and observability branches restacked on the prepared local `main`.
- One warning-free consolidated verification pass on the combined code commit
  recorded in `CURRENT_STATE.md`.
- Hostinger runtime alignment, storefront CSP/HSTS, GSAP lifecycle hardening,
  and target-only Linux Sharp packaging completed and verified in the local
  working tree on 2026-08-11.

The verified tree is published only as draft PR #9. It has not been merged,
deployed, migrated, or enabled in production.

## Implementation phases

Complete one phase at a time. A phase is complete only after its listed evidence
passes; do not combine a code change with an implied production mutation.

### Phase 1 — Match the Hostinger managed runtime locally

Status: **completed and verified locally on 2026-08-11; not published or
deployed**.

- Adopt the observed production compatibility baseline: Hostinger Node `24.x`,
  currently Node `24.6.0` and pnpm `10.32.1`.
- Update `.nvmrc`, `.node-version`, root and application engines,
  `packageManager`, CI setup/assertions, both packers, generated-package
  manifests, the isolated ops runtime package, and affected lockfiles.
- Replace exact-newer-patch rejection with a tested Node `24.x` compatibility
  contract while keeping CI reproducible against the observed production patch.
- Run one consolidated local gate: frozen install, dependency audits, `pnpm
  check`, disposable PostgreSQL integration tests, both verified packages,
  extracted-server smoke, and `git diff --check`.
- Do not push, deploy, migrate, change DNS, or enable flags in this phase.

### Phase 2 — Reconcile security and CI

Status: **local code and browser verification complete; draft PR #9 remote
analysis and repository-setting changes remain gated**.

- Confirm the runtime-aligned lockfiles retain every compatible security
  override and resolve all 14 current Dependabot alerts.
- Make CodeQL produce a current JavaScript/TypeScript analysis and keep the
  dependency, packaging, and Markdown-only publication guards fail closed.
- Add an enforced storefront CSP and HSTS policy compatible with Hostinger HCDN,
  remove the current GSAP missing-target warnings, and verify both in a real
  browser.
- Restack staff and observability on the runtime-aligned base and require fresh
  local verification before publishing either branch.
- Prepare `main` protection with one human approval, stale-review dismissal,
  conversation resolution, up-to-date branches, required checks, and no force
  pushes or deletion.

### Phase 3 — Prove and release the managed-hosting foundation

Status: **blocked on scoped provider evidence and explicit publication/deploy
authorization**.

- Obtain Linux user/domain/path/PID attribution, supervisor restart and HCDN
  routing causes, a durable scoped repair, a case ID, and fresh resource evidence
  for the prior shared NPROC incident.
- After explicit authorization, publish prepared `main` and require current CI,
  CodeQL, dependency, package, publication, and live checks.
- Verify the exact deployed SHA, storefront locks, ops live/ready/version/session,
  a real static asset, `www` redirect, DNS, TLS, and rollback evidence.
- Keep all commerce, staff invitation, and mandatory-2FA flags false.

### Phase 4 — Release staff operations

Status: **local implementation prepared; production migration, publication,
and activation require their listed approvals and evidence**.

- Review the staff implementation within consolidated draft PR #9; require
  current CI, CodeQL, CodeRabbit, and one human approval.
- Test migration `0010_curved_puma` on an isolated Neon branch.
- Only after separate authorization, apply the production migration and
  restricted grants, merge with both staff flags false, and complete the ordered
  [staff release checklist](STAFF_OPERATIONS_RELEASE_SMOKE.md).
- Prove SMTP, owner TOTP, recovery-code login, invitations, append-only auditing,
  and the owner-versus-staff denial matrix before enabling the flags in order.

### Phase 5 — Release observability

Status: **local implementation prepared; secrets, publication, and production
verification remain external release gates**.

- Review the observability implementation within consolidated draft PR #9 and
  obtain fresh checks and approvals.
- Configure the existing PostHog and Sentry variables without committing
  secrets, then merge only after authorization.
- Verify exact-SHA deployments, Sentry events/source maps/logs, PostHog
  application separation and IP discard, and the absence of sensitive fields or
  session replay.

### Phase 6 — Protect and clean the repository

Status: **prepared only; GitHub protection and branch mutations are not local
implementation work**.

- Verify zero unresolved Dependabot, CodeQL, and secret-scanning alerts and
  enable the prepared `main` protection rules.
- After draft PR #9 passes fresh checks, close superseded PRs #7/#8 and delete
  their local and remote branches.
- After a separately authorized PR #9 merge, delete its local and remote branch,
  retain generated `hostinger-ops-production`, return to local `main`, and
  verify one clean worktree aligned with `origin/main`.

### Phase 7 — Prepare storefront commerce separately

Status: **foundation prepared and release-locked; business, catalog, policy,
provider, and lifecycle approvals remain mandatory**.

- Keep catalog, checkout, customer auth, inquiries, and every commerce flag
  disabled until catalog, legal, media, pricing, stock, shipping, tax, policy,
  support, Cashfree, SMTP, and prepaid/COD lifecycle gates pass.
- Use a separate authorized release decision for every public commerce flag.

### Phase 8 — Measure production performance

Status: **blocked until the hosting repair and representative approved release
fixture exist**.

- After hosting repair and an approved representative release fixture, collect
  privacy-safe Core Web Vitals and repeat storefront performance checks.

Production migrations, deployments, provider changes, and release-flag changes
require explicit authorization. A code push never implies any of them.
