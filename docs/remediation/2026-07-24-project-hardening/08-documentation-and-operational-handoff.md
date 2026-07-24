# Phase 08 — Documentation and operational handoff

## Objective

Reconcile every current-state document with the verified code, migrations, CI, deployment, security, and production evidence, leaving one executable handoff without stale claims.

## Dependencies

Phases 01–07 complete. Provider-dependent statements require Phase 07 evidence; otherwise they remain explicitly pending.

## In scope

- Repository documentation index, architecture/data model, PRD/TRD/roadmap/status, testing/security/environment/deployment runbooks, AGENTS instructions, this plan, and execution evidence.

## Out of scope

- New code or provider changes disguised as documentation cleanup.
- Historical narrative not needed for current operation.

## Confirmed evidence and root causes

- Root and docs indexes still describe ops as planned/scaffolded despite implemented product, stock, customer, invoice, payment, and finance routes.
- Architecture and test documents omit current routes/actions and integration behavior.
- Some docs say protected source returns `404`; current whole-repo Path M correctly returns `403`.
- Path G/source-build recipes remain more prominent than the current official Path Z artifact path.
- CI, Node, artifact size, auth recovery, and product “full CRUD” claims drift from the baseline.
- Broad `git add .` guidance risks capturing local agent folders.

## Exact implementation decisions

1. Update `README.md`, `AGENTS.md`, `docs/README.md`, `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md`, phase status docs, `TESTING.md`, `SECURITY.md`, `ENV.md`, `LOCAL_DEV.md`, `DEPLOY.md`, and `OPS_DEPLOY_CHECKLIST.md`.
2. Describe only verified current state:
   - implemented routes and exact product lifecycle;
   - transactional/counter/idempotency/cost-basis behavior;
   - Better Auth owner/reset security;
   - Node `24.18.0` local/CI/archive and Hostinger `24.x`;
   - actual CI gates;
   - manual official Path Z and Path G still blocked unless later proven;
   - production status from Phase 07 with date.
3. State current whole-repo marketing protection as `403`; describe `404` only as the expected future static-only artifact result.
4. Replace fixed archive-size folklore with the 50 MB cap and per-build manifest/checksum evidence.
5. Remove unsupported auto-deploy/token instructions and broad staging commands.
6. Keep secrets as names/placeholders only. Include SMTP keys and separate pooled runtime/direct migration database roles.
7. Reconcile success criteria and check boxes only from evidence. Never mark owner login, reset email, or Path G complete speculatively.
8. Add troubleshooting in the actual debug order: public endpoint → auth health/session → deployment/logs → env-key presence → database migration/role → owner/reset.
9. Complete `EXECUTION_LOG.md` with phase agents, reviewers, commands, results, provider evidence, accepted risks, and rollback artifacts.
10. Run a stale-term/link/file-path sweep and have an independent reviewer compare docs directly to code and live evidence.

## Affected subsystems

All root/project documentation, onboarding, operations, deployment, security, testing, and future agent behavior.

## Official documentation

- Next.js documentation: https://nextjs.org/docs
- Better Auth documentation: https://www.better-auth.com/docs
- Drizzle documentation: https://orm.drizzle.team/docs
- Neon documentation index: https://neon.com/docs/llms.txt
- shadcn documentation: https://ui.shadcn.com/docs
- pnpm documentation: https://pnpm.io
- GitHub Actions: https://docs.github.com/en/actions
- Hostinger Node Web App: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- Hostinger classic Git: https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/

## Required project skills

Use the relevant project skill only when validating its corresponding documentation. No deployment skill.

## Commands and test cases

```bash
rg -n "planned|scaffold|design ready|Node 20|Node 22|40MB|404|git add \\.|HOSTINGER_API_TOKEN|deploy-ops-hostinger|full CRUD|Path G" README.md AGENTS.md docs
rg -n "DATABASE_URL=postgresql://[^.<]" README.md AGENTS.md docs || true
pnpm marketing:check
pnpm check
git diff --check
git status --short
```

Manually verify every local link, command, env-key name, route, table, workflow name, and checked success criterion.

## Rollback

Documentation changes are one bounded phase and can be reverted without code rollback. Do not restore a stale operational statement merely because it was previously documented; preserve verified Phase 07 evidence separately.

## Completion evidence

- Documentation agrees with code/schema/workflows and dated live evidence.
- No stale unsupported deploy, Node, route, status, or 404 claim remains.
- All commands and links are valid.
- Execution log contains implementer/reviewer and gate evidence for every phase.

## Prohibited shortcuts

- No speculative “live,” “secure,” “full CRUD,” “automatic deploy,” or “green” claim.
- No secrets, historical clutter, copied provider IDs beyond what operations require, or docs-only masking of an unresolved code defect.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md`, this complete Phase 08 file, all prior phase completion evidence, and the current code. Reconcile current-state docs only. Remove stale claims, preserve official Hostinger/Neon/shadcn/Better Auth boundaries, update `EXECUTION_LOG.md`, and run link/stale-term/command checks. Do not change application code or provider state, expose secrets, stage, or commit. Return a document-to-evidence matrix and unresolved claims.
