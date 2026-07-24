# Phase 06 — CI and standalone packaging

## Objective

Make CI a release gate and produce a reproducible, inspectable Node `24.18.0` standalone artifact while removing the unsupported automated Hostinger deploy path.

## Implementation status

Implemented, independently reviewed, corrected, and validated locally on
2026-07-25 by `/root/ui_ci_deploy_research`, independently approved by
`/root/security_auth_research`, and root-approved after a separate full quality,
PostgreSQL, package, checksum, server/static, and Linux-native gate. Real GitHub
PR/`main` run URLs remain pending. No provider, secret, deployment, staging, or
push action was performed.

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
2. Add package-level `typecheck` scripts for ops, UI, DB, and validators, plus root `typecheck`, `security:audit`, and deterministic `check`; `check` itself includes the optimized ops build and production audit after unit tests.
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
12. Resolve Node from the committed `.nvmrc` in every workflow job, then assert the exact runtime; reject unsafe smoke database URLs with the shared repository guard before starting the extracted server, reject unsafe artifact stamps before path construction, and include untracked source files in the manifest's dirty-worktree signal.
13. Run package/native/server/static-asset smoke on pull requests too. Keep only the upload step conditional: `refs/heads/main` plus `push` or `workflow_dispatch`, so branch-selectable manual runs cannot expose deploy-shaped artifacts.
14. Use quoted Node 24 discovery globs and a deterministic repository inventory check. Every `*.test.ts` must match exactly one suite based on supported root plus `.integration.test.ts` naming; unsupported roots fail.
15. Generate and commit the narrow Sharp runtime lock under `scripts/ops-runtime-deps` with official npm. Install it only with exact npm `11.16.0` and `npm ci --omit=dev --ignore-scripts --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc`; audit the lock and record/verify its SHA-256 in manifest schema 2.
16. Create and validate the ZIP/checksum/manifest inside a unique hidden same-filesystem workspace. Refuse existing final names, clean every failed candidate, then atomically rename the validated manifest/checksum and ZIP last. Clean defaults use the short commit; dirty defaults use a unique UTC/PID suffix.

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
- Node 24 test discovery globs: https://nodejs.org/download/release/latest-v24.x/docs/api/test.html#running-tests-from-the-command-line
- npm clean installs: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- GitHub manual workflow branch selection: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow

### Official-source verification completed 2026-07-25

| Source | Verified decision used here |
|---|---|
| GitHub workflow syntax | `needs` is the same-workflow release boundary; PostgreSQL uses a job service with an explicit health check; workflow and job permissions are explicit |
| GitHub secure use | A full-length action commit is the only immutable action reference; release-tag comments remain on the same line so update tooling can understand the intended release |
| GitHub artifact guidance | `upload-artifact` accepts multiple files and per-artifact `retention-days`; the inspected ZIP, checksum, and manifest are one 14-day artifact |
| GitHub manual workflow guidance | Manual runs can target a non-default branch; package proof therefore runs everywhere but the upload step requires `refs/heads/main` and an approved event |
| GitHub Dependency Review Action | Official v5 requires Node 24 runner support and `contents: read`; it runs only for pull requests and fails newly introduced high/critical runtime vulnerabilities |
| pnpm CI/filtering | CI lockfiles are frozen and pnpm 11 rejects incompatible newer-major lockfiles; the workflow pins the repository's exact pnpm `11.1.3` and uses workspace scripts instead of ad-hoc package traversal |
| Node 24 test runner | Final positional arguments accept glob patterns and official guidance requires quoting them for portable shell behavior; package suites use non-overlapping unit/integration globs |
| npm `ci` | Requires a matching committed package lock, refuses lock/package drift, and performs a clean whole-project install; the narrow Sharp tree uses this official frozen path |
| Next.js standalone output | `output: "standalone"` emits the minimal `server.js` but does not copy `public` or `.next/static`; the packer explicitly adds both and runs the generated server |
| Next.js self-hosting | The generated Node server is validated as a self-hosted runtime and receives runtime-only server environment variables; no Vercel deployment workflow is introduced |
| Hostinger Node Web App | Current official guide lists Node `24.x`, Next.js, and compressed ZIP upload as a supported source; `Other` deployments may require an explicit entry file, which remains `apps/ops/server.js` |
| Neon Postgres skill/current guidance | Long-running Node/Hostinger code keeps the existing module-scope `pg` Pool; CI uses disposable local PostgreSQL 16 and never a Neon/provider branch or credential |

The current Hostinger manual-upload guide does not publish a numeric ZIP limit.
The `50,000,000`-byte hard stop is retained as this phase's conservative,
previously established Hostinger/API portability contract; it is not presented
as a newly verified hPanel limit.

### Reviewed immutable action revisions

| Action | Full commit | Intended release |
|---|---|---|
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` |
| `pnpm/action-setup` | `0ebf47130e4866e96fce0953f49152a61190b271` | `v6.0.9` |
| `actions/setup-node` | `820762786026740c76f36085b0efc47a31fe5020` | `v7.0.0` |
| `actions/dependency-review-action` | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | `v5.0.0` |
| `actions/upload-artifact` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | `v7.0.1` |

## Required project skills

`vercel-react-best-practices`; `neon-postgres` only for connection/runtime correctness. No Vercel deployment skill.

The React skill influenced the decision to retain an optimized production build
as a gate and avoid adding client-side packaging workarounds. The Neon skill
kept interactive/transactional runtime access on `pg` Pool and provider
credentials out of tests and artifacts.

## Commands and test cases

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:inventory
DATABASE_URL=postgresql://... DATABASE_URL_DIRECT=postgresql://... pnpm db:migrate
DATABASE_URL=postgresql://... pnpm test:integration
pnpm ops:pack
unzip -l dist/perfume-aura-standalone_*.zip
shasum -a 256 -c dist/perfume-aura-standalone_*.zip.sha256
```

## Local implementation evidence

| Item | Result |
|---|---|
| Pre-edit commit | `c5e775ec7238538ea872c4b9193cf325686daab7` |
| Runtime | Node `24.18.0`; npm `11.16.0`; pnpm `11.1.3`; PostgreSQL `16.14` |
| Static/quality | Frozen install, marketing check, lint, DB/UI/validators/ops typechecks, official `actionlint v1.7.9`, and Next `16.2.11` optimized build passed |
| Unit/audit | 95/95 unit tests, 0 skipped; pnpm production audit 0 critical/0 high/1 moderate and narrow npm runtime-lock audit 0 vulnerabilities; the database-guard ordering regression remains green |
| Integration | 49/49 DB/auth tests, 0 skipped; includes inventory, Phase 02 migrations, Phase 03 workflows, Phase 04 migrations, and Better Auth |
| Test discovery | Quoted Node 24 globs execute 43 DB + 52 ops unit tests and 40 DB + 9 auth integration tests; inventory assigns all 25 files exactly once (20 unit, 5 integration), rejecting unsupported roots |
| Phase 06 ZIP | Ignored local evidence `dist/perfume-aura-standalone_20260725-phase06-local.zip`; 26,267,078 bytes; 3,639 archive paths |
| Phase 06 SHA-256 | `381d1c1267e6e2906232d118a3009975416aa0076cd67757107da352ea91f2ca` |
| Sidecars | 117-byte checksum and 1,133-byte external manifest; checksum verification passed |
| Manifest honesty | Source commit recorded; `dirty: true` because this was an uncommitted local validation artifact. Normal Git porcelain includes tracked and untracked source changes while ignored artifact/agent paths remain excluded; CI requires `dirty: false`. |
| Fail-closed pack inputs | A safe loopback phase database was accepted; a remote URL was rejected by the shared repository guard before server smoke; `STANDALONE_STAMP=../unsafe` was rejected before archive path construction |
| Structural proof | Required package/entry/static/Next/Linux Sharp paths present; `.env`, credentials, source maps, absolute repository path, local-agent folders, and flat `entry.cjs` absent |
| Linux native proof | Linux/amd64 Node `24.18.0` loaded Next `16.2.11`, Sharp `0.35.3`, libvips `8.18.3`, and PostCSS `8.5.22` |
| Extracted server proof | Linux archive server against disposable PostgreSQL returned `200` for `/login`, `/api/health/ready`, and `/api/auth/get-session` |
| Unsupported deploy scan | No active `HOSTINGER_API_TOKEN`, `ops:deploy`, `deploy-ops-hostinger`, provider action, or floating action reference in workflow/package/scripts |
| Provider state | Untouched; artifact was not uploaded or deployed |
| Current-tree correction artifact | Ignored `dist/perfume-aura-standalone_20260725-phase06-duplicate-audit.zip`; 26,270,957 bytes; 3,640 paths; SHA-256 `8e09cb8483b0f1aa80125c6279844d649f9e3c89d8b3b092a8fb51ee7540d659`; 127-byte checksum; 1,428-byte schema-2 manifest; local `dirty: true`, so not promotable |
| Patched-block duplicate audit | Current source contains one build-only `BETTER_AUTH_SECRET` assignment, one optional-root fallback comment, and one `$VERIFY` verifier argument before the candidate manifest. An adjacent exact-line scan found no duplicate. A fresh uniquely stamped pack from that current tree passed syntax, candidate checksum/manifest validation, guarded PostgreSQL server smoke, and static-asset smoke. |
| Locked runtime proof | Committed 20,214-byte npm lock SHA-256 `59ec5b45083851bd3c6015af04ed5e67dc2feef93a0145e4d8ecc66427cbaebb`; official `npm ci --ignore-scripts` installed the Linux x64 glibc tree; Linux loaded Sharp `0.35.3` / libvips `8.18.3`; both source lock and in-archive lock hash matched the manifest |
| Server/static proof | macOS pack smoke and Linux/amd64 exact-artifact smoke returned `200` for `/login`, `/api/health/ready`, `/api/auth/get-session`, and `/_next/static/chunks/00rw83z5k5co3.js`; local curl calls are bounded |
| Atomic publication regressions | Same-name rerun failed before build and preserved SHA-256; a deliberate late unsafe-database failure published no ZIP/sidecars and left no hidden workspace; existing Phase 05 and earlier Phase 06 ignored evidence remained untouched |
| Upload boundary regression | Package job has no PR exclusion; the only upload step requires `refs/heads/main` and `push` or `workflow_dispatch`; non-main manual and PR contexts cannot upload |

## Rollback custody evidence

Before the original Phase 06 pack, the date-stamped Phase 05 artifact required
manual custody at the distinct ignored local path
`dist/perfume-aura-standalone_20260725-phase05-known-good.zip`. It remains
26,465,028 bytes with SHA-256
`ec2f6d8cb74769b80d860be87519faf7c11b43eb7fbb70eed9bcc3552ca49c2f`
and is not tracked. This is a root-validated local regression artifact, not
proof of the currently deployed production bytes.

The corrected packer no longer overwrites a same-name artifact. It refuses any
existing final trio and publishes only after all candidate gates pass.

The operator runbook now requires retaining the actual production-known-good
ZIP, checksum, manifest, workflow run URL, source commit, and runtime settings
before Phase 07 upload. The Actions copy expires after 14 days and cannot be the
only rollback custody location.

## Pending external evidence and residual risk

- A real pull request and `main` run are still required to prove GitHub-hosted
  action execution, service-container behavior, artifact upload, and final
  branch-protection contexts.
- Dependency Review Action works for public repositories and organization-owned
  private repositories with GitHub Advanced Security. Repository eligibility
  must be confirmed by the first PR run; the production `pnpm audit` gate still
  runs independently.
- The local artifact intentionally records a dirty worktree and must never be
  promoted. Only a clean CI artifact with the reviewed commit and matching
  sidecars is a Phase 07 candidate.
- The 14-day workflow retention requires explicit operator custody before
  expiration or workflow-run deletion.
- Hostinger upload/start/proxy behavior remains Phase 07 provider evidence.

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
