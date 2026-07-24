# Project-hardening execution log

This is an append-oriented evidence log. Never record passwords, tokens, full connection strings, reset URLs, private email contents, or unredacted provider responses.

## Phase 00 baseline

| Item | Evidence |
|---|---|
| Date | 2026-07-24 |
| Working branch | `codex/project-hardening` |
| Baseline commit | `cd5b02dd7eb542c50a74292eb16de6f7749364b0` |
| Local `main` | `cd5b02dd7eb542c50a74292eb16de6f7749364b0` |
| `origin/main` | `cd5b02dd7eb542c50a74292eb16de6f7749364b0` |
| Initial untracked state | `.claude/`, `.pi/`, `.pi-subagents/` — preserved |
| Marketing root | `200` re-verified 2026-07-24 |
| Protected marketing source | `/apps/ops/package.json` → `403` re-verified 2026-07-24 |
| Ops login | `/login` → `200` re-verified 2026-07-24 |
| Ops root | `/` → `500` re-verified 2026-07-24 |
| Ops auth session | `/api/auth/get-session` → `500` re-verified 2026-07-24 |
| Audit | 6 high, 8 moderate, 0 critical from `pnpm audit --json`; must be rerun in Phase 01 |

The live-state rows are a baseline snapshot and require Phase 07 re-verification.

## Phase 00 — Plan materialization and baseline

| Item | Evidence |
|---|---|
| Status | Completed and root-approved |
| Started | 2026-07-24 |
| Completed | 2026-07-24 17:42 IST |
| Root agent | `/root` |
| Implementation agent | `/root/ui_ci_deploy_research` — plan documents and baseline evidence only |
| Independent reviewer | `/root/db_integrity_research` — review only, no edits or provider access |
| Files changed | The 11 files in this remediation folder only |
| Application/provider changes | None |
| Baseline gates | Marketing check, lint, unit tests, DB typecheck, ops build, and `ops:pack` passed |
| Package baseline | Next `16.2.10`; Sharp `0.34.5`; production audit 6 high, 8 moderate, 0 critical |
| Package artifact | `dist/perfume-aura-standalone_20260724.zip`, 24,471,638 bytes; baseline only, not approved for production |
| Review disposition | Initial migration-order, provider-boundary, exact-pin, CLI, invariant, SMTP-link, and formatting findings corrected |
| Final review | Approved; all 11 files and required sections verified; no-index formatting checks passed |
| Rollback | Delete only this uncommitted remediation folder before the phase commit; no product/provider state exists to roll back |
| Commit | The scoped commit containing this log and Phase 00 plan files |

## Execution protocol fields

For each phase, append:

- start/end timestamp;
- root agent;
- implementation-agent identity and bounded scope;
- pre-edit commit/status;
- files changed;
- official documentation/skills used;
- commands and exit codes;
- tests and evidence;
- independent-review-agent identity;
- review findings and disposition;
- accepted residual risk;
- rollback artifact/location;
- root approval and next-phase gate.

## Phase 01 — Toolchain, dependency, and repository safety

| Item | Evidence |
|---|---|
| Status | Completed and root-approved |
| Started from | Phase 00 commit `1007993` |
| Completed | 2026-07-24 18:25 IST |
| Root agent | `/root` |
| Implementation agent | `/root/security_auth_research` — Phase 01 repository scope only |
| Independent reviewer | `/root/ui_ci_deploy_research` — review only, no edits or provider access |
| Runtime | Exact Node `24.18.0`; pnpm `11.1.3`; default user Node was not changed |
| Dependency result | Next/eslint-config-next `16.2.11`; Sharp `0.35.3`; Next PostCSS `8.5.22`; shadcn development-only; Better Auth unchanged at `1.6.23` |
| Audit result | Production: 0 critical, 0 high, 1 moderate; full graph: 0 critical, 0 high, 2 moderate |
| Accepted moderate advisory | `GHSA-67mh-4wv8-2f99`: esbuild `0.18.20` through Better Auth → Drizzle Kit tooling; re-evaluate with Better Auth in Phase 04 |
| Accepted development advisory | `GHSA-frvp-7c67-39w9`: `@hono/node-server` through development-only shadcn/MCP tooling |
| Repository safety | `.claude/`, `.pi/`, and `.pi-subagents/` preserved and ignored; marketing deny source regenerated; local `.env.local` mode `0600`; no tracked secrets/transcripts/ZIPs |
| Deploy safety correction | The approved Phase 06 removal of the unproven Hostinger API command/script/job was pulled forward after review; workflow is artifact-only and official manual hPanel Path Z remains supported |
| Root gate | Frozen install, production high audit gate, marketing check, lint, 31 tests, DB and ops typechecks, Next build, pack smoke, dependency/archive scans, and `git diff --check` passed |
| Linux native evidence | Extracted `phase01-node24b` ZIP loaded Node `24.18.0`, Next `16.2.11`, Sharp `0.35.3`, libvips `8.18.3`, and PostCSS `8.5.22` in Linux/amd64 |
| Reviewer disposition | Initial stale Node 20/22/Next 16.2.10 and unsupported deploy-path findings corrected; final review approved |
| Implementation artifact | `dist/perfume-aura-standalone_20260724-phase01-node24b.zip`, 26,125,859 bytes, SHA-256 `b0ec3903be0eea3daff3cf89a8417069e77f8691d3bafab374aac293dc9a420d` |
| Root artifact | `dist/perfume-aura-standalone_20260724-phase01-final-root.zip`, 26,125,867 bytes, SHA-256 `132f49931004251030b81772daccc6ff3d03eb3d16a94a23c57d99e52f58924b` |
| Rollback evidence | Restore manifests, lockfile, runtime metadata, docs, workflow, and pack script together; keep local secret permissions strict; baseline ZIP is vulnerable and not an approved production rollback |
| Provider changes | None |
| Commit | The scoped Phase 01 commit containing this log |

## Phase 02 — Database integrity and migrations

Status: pending
Implementation agent: pending
Independent reviewer: pending
Disposable PostgreSQL evidence: pending
Rollback/restore evidence: pending

## Phase 03 — Transactional business workflows

Status: pending
Implementation agent: pending
Independent reviewer: pending
Concurrency/idempotency evidence: pending
Rollback evidence: pending

## Phase 04 — Authentication security and recovery

Status: pending
Implementation agent: pending
Independent reviewer: pending
Better Auth schema/version evidence: pending
SMTP production evidence (root-only): pending
Rollback evidence: pending

## Phase 05 — Product, UI, and performance alignment

Status: pending
Implementation agent: pending
Independent reviewer: pending
shadcn preset/CLI evidence: pending
Browser/accessibility evidence: pending
Performance evidence: pending

## Phase 06 — CI and standalone packaging

Status: pending
Implementation agent: pending
Independent reviewer: pending
CI run URLs: pending
Artifact name/size/SHA-256/manifest: pending
Rollback artifact: pending

## Phase 07 — Production recovery and verification

Status: pending
Read-only preparation agent: pending
Independent evidence reviewer: pending
Root operator: pending
Neon restore point: pending, identifier must be non-secret
Isolated Neon branch evidence: pending
Migration/runtime-role evidence: pending
Hostinger deployment/build evidence: pending
Owner login and reset evidence: pending
Marketing continuity evidence: pending
Rollback result: pending

## Phase 08 — Documentation and operational handoff

Status: pending
Implementation agent: pending
Independent reviewer: pending
Stale-term/link/command checks: pending
Final repository status: pending
