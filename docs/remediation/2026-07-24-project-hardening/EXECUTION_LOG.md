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

Status: pending
Implementation agent: pending
Independent reviewer: pending
Gate evidence: pending
Rollback evidence: pending

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
