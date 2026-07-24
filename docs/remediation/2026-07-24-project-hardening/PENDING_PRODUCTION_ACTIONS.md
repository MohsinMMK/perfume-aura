# Pending production actions

Updated: 2026-07-25

This file is the active handoff for the remaining work. It distinguishes
production-release blockers from intentional post-release backlog. Recheck all
provider state immediately before acting; no secret belongs in this file.

## Current position

- Phases 00–06 are implemented, committed, and locally verified.
- Phase 07 pre-production validation is green: restore point, isolated Neon
  branch, migrations through `0008`, restricted SQL-defined runtime role,
  owner recovery, packaged-server checks, and protected-route browser checks.
- Production has **not** been migrated or redeployed. Its previous deployment
  remains active, so the known production auth/database `500` remains unresolved.
- The active Phase 07 evidence is in
  [`EXECUTION_LOG.md`](EXECUTION_LOG.md#phase-07--production-recovery-and-verification).

## Required authority and access

These are decisions or credentials that cannot be safely inferred.

- [ ] Authenticate to Hostinger hPanel. Either sign in to the existing browser
  tab or explicitly approve launching Chrome to use the existing Hostinger
  session.
- [ ] Choose the SMTP mailbox for password-reset messages. Provide its address
  and `from` format through hPanel, or explicitly authorize creating/resetting
  a dedicated mailbox. Do not send mailbox passwords in chat or commit them.
- [ ] Authorize GitHub source-of-truth publication: push
  `codex/project-hardening`, open a PR, and state whether merge to `main` is
  authorized after the required CI checks pass. The alternative is an explicit,
  recorded exception to deploy the locally verified Path Z ZIP before `main`
  artifact custody exists.
- [ ] Be available with a second public network (for example mobile data) for
  the short rate-limit test. Two independent client buckets are required.

## Production cutover checklist

Root-controlled only. Do these in the listed order during a short no-write
maintenance window.

1. [ ] Recheck public marketing/ops status, Hostinger Node settings and logs,
   exact Neon production branch/database, and current migration journal.
2. [ ] Confirm the named Neon restore snapshot is still available and retain
   the previous Hostinger ZIP for rollback.
3. [ ] Observe Hostinger's forwarding boundary using redacted diagnostics.
   Better Auth must use a provider-controlled single IP header or an exact,
   proven trusted-proxy chain. Do not accept a client-controlled
   `X-Forwarded-For` value.
4. [ ] If proxy evidence changes the Better Auth configuration, make the
   bounded source change, repeat review/Phase 06 packaging, and produce a new
   clean checksum-recorded artifact before deployment.
5. [ ] Create the production runtime login directly in PostgreSQL, not through
   the Neon role API. Prove it has no inherited `neon_superuser` membership,
   no DDL/temp/sequence access, and only the reviewed table privileges.
6. [ ] Apply the bounded expansion migrator through `0007`; prove the exact
   eight-row journal hash and run reconciliation with every result at zero.
7. [ ] Configure Hostinger Node Web App through hPanel:
   - Node `24.x`
   - root `./`
   - build command `echo prebuilt-standalone`
   - empty output directory
   - entry `apps/ops/server.js`
   - pooled restricted `DATABASE_URL`, Better Auth values, timezone, port, and
     the approved SMTP values
8. [ ] Manually upload the checksum-verified Path Z ZIP through the official
   Node Web App workflow, inspect build/runtime logs, and restart the process.
9. [ ] Prove the expansion-state deployment before the contract migration:
   `/login`, `/api/health/live`, `/api/health/ready`, and
   `/api/auth/get-session` must be non-`500` (readiness must be `200`).
10. [ ] Re-run reconciliation, then apply the sole remaining `0008` contract
    migration. Prove the exact nine-row journal hash and post-contract
    constraint/trigger catalog.
11. [ ] Seed MAIN and recover/seed the owner only against the exact production
    database. Never use the local loopback database by mistake.
12. [ ] Send one controlled Hostinger SMTP reset email, confirm its link, and
    verify password-reset session revocation plus authenticated password change.
13. [ ] From client A, submit five invalid sign-ins in one minute; the sixth
    must be `429` with a positive `X-Retry-After`. Confirm the durable database
    rate-limit entry without recording IP addresses. Prove client B retains a
    separate bucket, forged forwarding headers do not bypass the limit, and
    the limit survives a Node restart.
14. [ ] Verify owner login, dashboard/products/stock/customers/invoices/payments/
    finance/security, headers/CSP, static asset freshness, and browser console.
15. [ ] Recheck marketing `200` and protected monorepo paths `403`. Do not
    change nameservers or GoDaddy records while this remains healthy.
16. [ ] Have a different read-only normal sub-agent review the redacted
    evidence before declaring Phase 07 complete.

## Documentation and repository closeout

Phase 08 begins only after a successful production cutover.

- [ ] Reconcile README, AGENTS, deploy/environment/testing/data-model/roadmap
  documentation with verified production behavior.
- [ ] Record the final runtime role, migration journal, artifact checksum,
  deployment timestamp, browser/SMTP/rate-limit evidence, and rollback result
  in `EXECUTION_LOG.md` without secrets.
- [ ] Commit the completed Phase 07 and Phase 08 documentation with a clean
  worktree.
- [ ] Record unresolved backlog separately from completed production claims.

## Intentional deferred backlog

These do not block the current hardening release.

- Payment append-only trigger and a valid correction path: deferred until a
  linked credit-note/reversal model exists; runtime payment privileges remain
  insert/select only.
- GitHub source-build deployment (Path G): still blocked until Hostinger can
  build this monorepo successfully. Continue using the official manual Path Z
  ZIP workflow.
- Artifact-only marketing deployment: the current whole-repository classic Git
  surface is protected by `403` deny rules; move to static-only artifacts in a
  later dedicated migration.
- Credit notes, paid/fulfilled invoice reversal, Stripe, public storefront,
  double-entry accounting, and multi-staff RBAC: excluded from this remediation.
- The remaining moderate development-server audit advisory: tracked as a
  non-production dependency risk; production high/critical audit gate is green.

## Rollback boundary

- Before any new production writes: restore the named Neon snapshot and
  redeploy the previous Hostinger ZIP if the compatible expansion deployment
  fails.
- After contract migration but before new writes: restore only while the
  no-write window is intact.
- After any new production write: do not restore an older database; redeploy
  compatible code or roll forward so ledgers remain intact.
