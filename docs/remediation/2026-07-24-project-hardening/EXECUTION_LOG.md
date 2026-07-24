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

| Item | Evidence |
|---|---|
| Status | Completed and root-approved |
| Started from | Phase 01 commit `9733987` |
| Completed | 2026-07-24 20:56 IST |
| Root agent | `/root` |
| Implementation agent | `/root/db_integrity_research` — Phase 02 schema, migration, reconciliation, role-design, and disposable-test scope only |
| Independent reviewer | `/root/security_auth_research` — two-pass review only, no edits or provider access |
| Expansion migrations | `0003_phase02_domain_expansion` (`when=1784902795186`, snapshot `ad7c7163-7482-4ffd-9b0e-d5db95d663ac`, SHA-256 `d9124906b28883dfedbe14fd329e47defb8df54a5a7ac6603fe632bb7e3e29f0`); `0004_phase02_legacy_backfill` (`when=1784902795825`, snapshot `f9248b89-ffc9-4dea-bd74-e39035f89fa0`, SHA-256 `e4e0d50bda7390a8f7580678fe98c5269e97e008a45e20d3475cddc159c21f54`); `0005_phase02_invoice_line_position_unique` (`when=1784905160582`, snapshot `614ec60b-ed4e-4484-b569-13da2b18e538`, SHA-256 `0a6941b3cf770886660906a31fa7360c026fa0e575f976da7b3c25c80469deb7`); `0006_phase02_remaining_integrity_indexes` (`when=1784905780962`, snapshot `7431f5a5-05b5-47b1-89b5-6967fb83340b`, SHA-256 `8546eec9b4c75d134f8c7c456affcdd06c6dd48db9cbdefb335637a2b258bbc0`) |
| Immutable baseline | `0000`–`0004` SQL and snapshots remained byte-identical through the forward-only `0005`/`0006` correction; full snapshot `prevId` lineage verified |
| Schema result | Atomic `(kind, year)` document counters; nullable unique payment idempotency; sale cost snapshot/basis expansion; deterministic legacy backfills; unique invoice-line position and product-size invariants; auth foreign-key, invoice-date, and query-backed indexes |
| Reconciliation safety | Exact-`0002` preflight and post-expansion reconciliation cover 22 and 27 categories respectively, including malformed/over-range numbers, bigint-safe arithmetic, subtotal/payment cache mismatch, draft/void/empty/free-text lifecycle invalidity, aggregate invoice fulfillment versus invoice-referenced sale movements, inventory balance, duplicate line positions/product sizes, and legacy snapshot readiness |
| Intentional safety deviation | Payment append-only trigger deferred until linked reversal/credit-note rows and authoritative net-sum semantics exist; a positive-only immutable payment table would have no valid correction path. The future stock-movement trigger remains specified. |
| Runtime-role design | Exact table matrix, no DDL, no sequence privileges, counters have no `DELETE`, ledgers are `SELECT/INSERT`; `PUBLIC TEMPORARY` is inventoried and conditionally revoked only during root-controlled Phase 07 |
| Root PostgreSQL gate | PostgreSQL `16.14`, Node `24.18.0`, pnpm `11.1.3`; all 37 DB tests passed, migration integration 3/3, all seven guarded migrations applied, exact-`0002` preflight all 22 zero, post-expansion reconciliation all 27 zero, and `drizzle-kit check` passed |
| Root application gate | DB and ops typechecks, lint, Next production build, migration checksum checks, and `git diff --check` passed |
| Privilege proof | Disposable effective-privilege catalog: runtime CONNECT/schema USAGE true; TEMP/schema CREATE/counter DELETE/ledger UPDATE/DELETE false; zero sequence privileges; exact table matrix returned zero mismatches; direct denied-operation probes passed |
| Correction history | Initial local Phase 02 checkpoint `2ffb73a`; remaining integrity/index coverage was added forward-only and folded into the final scoped Phase 02 commit |
| Review disposition | Seven initial P1/P2 findings plus the completeness audit findings were corrected; final independent re-review approved with no remaining P1/P2 blocker |
| Disposable infrastructure | Implementation, review, and root PostgreSQL containers removed and verified absent |
| Provider changes | None — no Neon, Hostinger, production, staging, DNS, email, GitHub push, or deployment access |
| Rollback evidence | Revert this scoped commit before provider rollout; migrations are additive and have not been applied outside disposable local PostgreSQL |
| Commit | The scoped Phase 02 commit containing this log |

## Phase 03 — Transactional business workflows

| Item | Evidence |
|---|---|
| Status | Completed and root-approved |
| Started from | Phase 02 commit `cc0e76e` |
| Completed | 2026-07-24 22:16 IST |
| Root agent | `/root` |
| Implementation agent | `/root/db_integrity_research` — Phase 03 transactions, domain workflows, server-action adapters, timezone handling, and tests only |
| Independent reviewer | `/root/security_auth_research` — two correction rounds plus final read-only approval; no provider access or edits |
| Official workflow | Drizzle interactive transactions over `pg`; explicit PostgreSQL `READ COMMITTED` and read-write mode; complete-transaction retry only for SQLSTATE `40001`/`40P01`; Next.js Server Actions authenticate before validation/domain work and revalidate only after commit |
| Domain result | Atomic product plus initial variant, invoice line totals, invoice issue/numbering, payment/numbering/cache reconciliation, whole-request fulfillment, void, product archive, and inventory movement primitives |
| Concurrency result | Fixed aggregate/child/variant/counter lock order; counter upsert instead of `max + 1`; competing payment/void and fulfillment/void races end in one valid state; multi-line fulfillment rolls back wholly; aggregate same-variant demand is checked before writes |
| Idempotency result | Exact payment replay validates invoice, amount, method, and effective time; manual receive/adjust use stable client UUIDs and full normalized payload checks; fulfillment keys are deterministic; cache invalidation cannot turn a committed stock mutation into an action failure |
| Cost/time result | New sale movements capture cost snapshots; finance separates captured COGS, legacy-current estimates, and missing-snapshot defects; strict datetime-local parsing and all business displays use validated `BUSINESS_TIMEZONE` with default `Asia/Karachi` |
| Root PostgreSQL gate | Fresh PostgreSQL `16.14`, migrations through `0006`, Node `24.18.0`; Phase 03 37/37 and full DB 72/72 passed; ops 15/15 passed |
| Root application gate | Frozen install, production high audit gate, marketing check, lint, DB and ops typechecks, Next production build, standalone pack smoke, and `git diff --check` passed |
| Root package artifact | `dist/perfume-aura-standalone_20260724.zip`, 26,137,944 bytes, SHA-256 `18745be1eff092d52d80fbc2849493467fd9c501d7c5a54fc84b246486f6ba66`; local verification only, not deployed |
| Root-gate correction | The first root run correctly refused `perfume_aura_phase03_root_admin` because the disposable guard still hard-coded Phase 02. The guard was tightened to exact loopback `perfume_aura_phaseNN_<purpose>` names, retained Phase 02 compatibility, and passed an independent fresh Phase 02 migration proof. |
| Review disposition | Initial P1 for manual stock retry duplication was corrected with end-to-end UUID idempotency and best-effort post-commit revalidation; final workflow and guard reviews approved |
| Accepted residual risk | Final required payment/cost constraints and stock append-only trigger remain intentionally ordered after the Phase 04 Better Auth expansion migration; payment immutability remains deferred until a valid reversal model exists; legacy COGS remains explicitly an estimate |
| Disposable infrastructure | Implementation, review, guard-compatibility, and root PostgreSQL containers removed and verified absent |
| Provider changes | None — no Neon, Hostinger, production, staging, DNS, email, GitHub push, or deployment access |
| Rollback evidence | Revert this scoped commit before provider rollout; Phase 03 adds no migration and has not changed any external database. Phase 02-compatible schema remains usable by the pre-Phase-03 code if the whole commit is reverted. |
| Commit | The scoped Phase 03 commit containing this log |

## Phase 04 — Authentication security and recovery

| Item | Evidence |
|---|---|
| Status | Complete and root-approved locally; provider rollout remains Phase 07 |
| Started from | Phase 03 commit `9690b2fba14e` |
| Implementation completed | 2026-07-25 00:22 IST, including final bare-build correction |
| Root agent | `/root` |
| Implementation agent | `/root/security_auth_research` — Phase 04 auth, owner authorization/recovery, SMTP recovery, security headers, compatible schema/migrations, tests, and runbooks only |
| Independent reviewer | `/root/db_integrity_research` — approved after two read-only review passes; the first pass blocked the inherited `.env.local` build regression, and the focused re-review found no remaining P0–P3 findings |
| Official workflow | Better Auth official Next.js, Drizzle adapter, email/password, rate-limit, options, and security guidance; official Nodemailer SMTP/TLS guidance; official Hostinger email-client SMTP settings; official Next.js Proxy, headers, and production guidance; official Drizzle generate/migrate and PostgreSQL constraint/trigger/privilege guidance |
| Better Auth package result | Exact Better Auth `1.6.25`; Nodemailer `9.0.3`; email/password sign-up disabled; password length 12–256; reset expires after 30 minutes and revokes sessions; production trusts only `https://app.perfumeaura.com`, while development/test trust only the exact localhost pair; database-backed endpoint rate limits; secure production cookie policy; explicit CSRF/origin protections |
| Official schema evidence | Fresh official Better Auth CLI reference generated outside the repository; SHA-256 `50c90fbe895b60e243b6cecb59244c59727383249561798ad48b1fd1423f7d4b`. Intentional repository deltas preserve established snake_case/timestamptz/index conventions and a non-null role defaulting to `user`; generated relations, verification index, and durable `rate_limit` table were incorporated. |
| Authorization result | `getOwnerSession` / `requireOwnerSession` enforce owner authorization in every protected page, loader, and Server Action; cookie Proxy remains optimistic only. Executable real-session tests prove owner allow, valid non-owner denial, unauthenticated page redirect, access-denied page redirect, action denial, and deleted/expired stale-cookie denial without a redirect loop. Login remains database-independent static content. |
| Recovery result | Same-origin typed auth client; generic forgot-password responses; reset success is shown only after API success; Hostinger-only SMTP host with explicit port 465 implicit TLS or port 587 STARTTLS, TLS 1.2 minimum, escaped HTML plus text, environment-specific reset origins, and redacted provider/seed failures |
| Owner maintenance | Advisory-lock-protected atomic seed/repair; repeated seed preserves the current password; ambiguous case-insensitive users or credentials are refused; explicit break-glass recovery atomically replaces the password and revokes sessions only after confirmation |
| Application hardening | Generic no-store liveness/readiness endpoints; CSP and security headers; powered-by header disabled; login failures distinguish invalid credentials from unavailable auth/session infrastructure without exposing provider details |
| Ordered migrations | `0007_phase04_auth_expansion`, journal `when=1784912984473`, SQL SHA-256 `49bede137e6fd29d1c87a84170502e4f4e1329ab36521a9e37d2fc5f3d5dfa7f`; `0008_phase03_contract`, journal `when=1784913049848`, SQL SHA-256 `3f7d6d86e395cfc2e996cdfe81c0820bb93b4dfd7b6c7cebe78d8ee239e45e56`. The bounded command takes an advisory lock, verifies the deployed Drizzle journal as an exact count/time/hash prefix before and after, refuses an already-contracted schema, prints only the verified eight-row `0007` boundary, then leaves `0008` pending for post-deploy reconciliation. |
| Database result | Auth relations, verification-token lookup index, durable rate-limit table, staged required payment/cost constraints, and append-only stock-movement trigger. The trigger function revokes `PUBLIC` execution; the runtime grant matrix includes only required `rate_limit` CRUD. |
| Test evidence | Node `24.18.0`, pnpm `11.1.3`, disposable PostgreSQL `16.14`; full repository tests 123/123 passed (DB 75/75 across 20 suites; ops 48/48 across 15 suites), with no skips or failures. Coverage includes fresh/exact-`0006` bounded migration, already-`0008` refusal without success output, final contract, environment-split origins, real owner/non-owner/stale sessions, owner maintenance, reset response, SMTP mapping, security headers, and append-only enforcement. |
| Static/build gates | Frozen install, marketing check, lint, DB and ops typechecks, `drizzle-kit check`, Next production build, standalone pack/extract smoke, production high audit gate, and `git diff --check` passed. Final correction additionally passed the literal `fnm exec --using 24.18.0 -- pnpm build:ops` while `.env.local` contained conflicting local auth values. |
| Audit result | Production dependency graph: 0 critical, 0 high, 1 moderate |
| Package artifact | Root-rebuilt local verification artifact: `dist/perfume-aura-standalone_20260725.zip`, 26,436,303 bytes, SHA-256 `462a2df0b17d7ad4b1c5332dbd1acccd8d5f7cac83ce5aafafd440cd65394db6`; exact archive passed stage/extract dependency smoke and was not deployed. Phase 06 must add the checksum sidecar and final rollback retention workflow. |
| Packaging correction | `pnpm ops:pack` places a known random poison value over any `.env.local` secret and refuses the archive if that value appears in the staged tree. During `NEXT_PHASE=phase-production-build`, the server resolver ignores every inherited `BETTER_AUTH_SECRET` and creates its own per-process random ephemeral secret. The embedded runbook contains every SMTP variable and the exact bounded-`0007` / journal proof / compatible deploy and auth-readiness proof / reconciliation / only-pending-`0008` / production-targeted seed sequence. Real secrets remain runtime/operator-only. |
| Bare-build correction evidence | Build phase now takes precedence before reading `BETTER_AUTH_URL` or `BETTER_AUTH_SECRET`: conflicting local/canonical/short/valid values yield only the canonical production origin plus one per-process ephemeral secret. Non-build production still rejects missing, short, local, or noncanonical values. Focused secret/origin tests passed 7/7; ops typecheck, lint, literal bare build, and `git diff --check` passed. The Phase 07 MAIN seed command now names the pooled Neon production target explicitly. |
| Reviewer correction disposition | All reported P1–P3 findings were corrected: staged migration order, environment-specific origins/reset URLs, executable non-owner/stale-cookie proof, Phase 07 trusted-proxy/IP procedure, journal-aware bounded migrator and refusal tests, complete SMTP archive instructions, random build-canary scan, redacted seed error, and inherited-env-safe bare build. Focused final review approved the literal bare build, 14/14 focused auth/source tests, typecheck, pack canary, archive smoke, and runtime checks. |
| Root packaged-browser gate | Root extracted the exact checksum-recorded ZIP, started it with Node `24.18.0` against disposable PostgreSQL `16`, and placed only a local TLS proxy in front to preserve the production origin contract. Signed-out `/` redirected to `/login`; live/ready, login, forgot/reset, auth session, dashboard, settings, and prefetched protected routes returned successfully. A disposable owner signed in, changed password with other-session revocation, signed out, and signed back in with the new password. Playwright recorded 0 console errors and 0 warnings; one Chromium verbose password-form username-field advisory is deferred to the Phase 05 form cleanup. |
| Provider changes | None — no Neon, Hostinger, production, staging, DNS, SMTP delivery, GitHub push, or deployment access |
| Production evidence | Pending Phase 07: real Hostinger SMTP delivery; inspect actual Hostinger socket/forwarding headers and accept only a provider-controlled single value or exact trusted chain; prove two client buckets, sixth-attempt `429` plus positive `X-Retry-After`, spoof resistance, and restart persistence; then verify production health/auth, owner seed/login, browser reset, and provider-side environment |
| Accepted residual risk | Provider-specific SMTP delivery and proxy/IP behavior cannot be proven locally. Phase 07 must apply the staged migration runbook, configure hPanel/Neon secrets, prove a real owner login and one reset email, and retain rollback evidence before declaring production recovered. |
| Rollback evidence | Before provider rollout, revert the scoped Phase 04 commit. The new migrations were exercised only against disposable PostgreSQL; after any provider migration, use the documented restore-point/write-freeze/`0007` compatibility/`0008` validation procedure rather than destructive down migrations. |
| Root gate | Approved. Frozen install, high production audit gate, marketing check, lint, DB/ops typechecks, literal bare build, 123/123 database/auth tests with no skips, final pack and checksum, real packaged-browser smoke, `git diff --check`, and disposable port/container/browser/server cleanup passed. |

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
