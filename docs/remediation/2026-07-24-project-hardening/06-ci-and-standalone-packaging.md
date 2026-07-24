# Phase 06 — CI and standalone packaging

## Objective

Make CI a release gate and produce a reproducible, inspectable Node `24.18.0` standalone artifact while removing the unsupported automated Hostinger deploy path.

## Dependencies

Phases 01–05 green locally, including a zero-high audit and PostgreSQL integration suite.

## In scope

- Workspace scripts, typechecks, GitHub Actions, PostgreSQL service tests, action pinning, audit/build gates, standalone packaging, archive content/smoke validation, checksum, retention, and removal of unsupported auto-deploy code.

## Out of scope

- Uploading/deploying an artifact, provider secrets, GitHub environment creation, or Path G enablement.

## Confirmed evidence and root causes

- Current CI runs only marketing drift and unit tests on Node 22.
- Ops packaging also runs Node 22 and does not depend on lint, typecheck, audit, build, or DB integration.
- There is no root typecheck; UI/validators lack complete package typecheck contracts.
- Integration tests skip when `DATABASE_URL` is absent.
- Action references float on tags.
- The deploy job can be green after skipping deployment or returning success for an oversized archive.
- `scripts/deploy-ops-hostinger.sh` uses an unproven request shape that conflicts with the published current OpenAPI.
- Packaging hardcodes Sharp `0.34.5` and validates a heuristic minimum size rather than a full manifest.

## Exact implementation decisions

1. Run local and all workflow jobs on exact Node `24.18.0`; production is Hostinger Node `24.x`.
2. Add package-level `typecheck` scripts for ops, UI, DB, and validators, plus root `typecheck`, deterministic `check`, and `security:audit`.
3. CI quality gate: frozen install, marketing check, lint, typecheck, unit tests, patched dependency audit, and ops build.
4. CI integration gate: PostgreSQL 16 service with health check, forward migrations, complete integration tests, and no skip-on-missing-URL behavior.
5. Pin third-party actions to full commit SHAs and annotate the intended release tag. Set least permissions (`contents: read`) unless an optional attestation job explicitly needs more.
6. Make the packaging workflow artifact-only. Delete the deploy job, `ops:deploy` package script, and unsupported `scripts/deploy-ops-hostinger.sh`; remove token guidance that implies it is supported.
7. Packaging depends on quality and integration gates within the same workflow or invokes a reusable gated workflow. No cross-workflow success assumption.
8. Derive Sharp's version from the reviewed dependency graph/lockfile; install exactly Sharp `0.35.3` for Linux x64 glibc under Node 24 and verify native loading. Assert PostCSS `8.5.22` and Next.js `16.2.11` in the same package smoke.
9. Replace minimum-size heuristics with an explicit archive manifest:
   - `package.json`;
   - `apps/ops/server.js`;
   - `apps/ops/.next/static`;
   - `next` package;
   - Linux Sharp package/native;
   - no `.env`, source map containing secrets, absolute home path, or local-agent folder.
10. Extract to `mktemp -d`, run `require("next")`, `require("sharp")`, start the server under Node 24 against CI PostgreSQL, and smoke `/login` plus auth health.
11. Enforce Hostinger's 50 MB archive ceiling, generate SHA-256, upload ZIP and checksum as one 14-day Actions artifact, and record source commit/runtime in a small manifest.

## Affected subsystems

Root/package scripts, TypeScript configs, `.github/workflows`, pack script, dependency lockfile, integration tests, deployment script/docs, and release artifact.

## Official documentation

- GitHub workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- PostgreSQL service containers: https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers
- Secure action use/SHA pins: https://docs.github.com/en/actions/reference/security/secure-use
- Artifact sharing: https://docs.github.com/en/actions/tutorials/store-and-share-data
- pnpm CI: https://pnpm.io/continuous-integration
- pnpm filtering: https://pnpm.io/filtering
- Next.js standalone output: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Next.js self-hosting: https://nextjs.org/docs/app/guides/self-hosting
- Hostinger Node Web App ZIP method: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

## Required project skills

`vercel-react-best-practices`; `neon-postgres` only for connection/runtime correctness. No Vercel deployment skill.

## Commands and test cases

```bash
pnpm install --frozen-lockfile
pnpm marketing:check
pnpm lint
pnpm typecheck
pnpm test:unit
DATABASE_URL=postgresql://... DATABASE_URL_DIRECT=postgresql://... pnpm db:migrate
DATABASE_URL=postgresql://... pnpm test:integration
pnpm audit --prod --audit-level=high
pnpm build:ops
pnpm ops:pack
unzip -l dist/perfume-aura-standalone_*.zip
shasum -a 256 dist/perfume-aura-standalone_*.zip
```

## Rollback

Keep the last known-good artifact and workflow revision. Revert workflow/package/pack changes together if packaging regresses. Never restore the unsupported auto-deploy path as a rollback; deployment remains manual Path Z.

## Completion evidence

- Required checks are green on a PR and `main`.
- No integration test is skipped.
- Artifact was built and smoke-tested on Node `24.18.0`, is under 50 MB, and has a matching checksum/manifest.
- Repository contains no active Hostinger auto-deploy script/job/secret contract.

## Prohibited shortcuts

- No floating action tag, Node drift, `continue-on-error`, audit ignore, size-only validation, bundled secret, fake green deploy job, or classic Git ops runtime.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 06 file. Implement exact Node `24.18.0` CI gates, PostgreSQL integration, SHA-pinned actions, artifact-only standalone packaging, manifest/checksum/smoke tests, and removal of the unsupported automated Hostinger deploy path. Do not add or inspect provider secrets, upload/deploy, stage, or commit. Return workflow validation, full gate results, artifact contents/size/checksum, and rollback evidence.
