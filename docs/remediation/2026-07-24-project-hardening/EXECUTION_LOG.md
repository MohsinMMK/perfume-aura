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

| Item | Evidence |
|---|---|
| Status | Complete and root-approved locally; provider verification remains Phase 07 |
| Started from | Phase 04 commit `896bd75` |
| Completed locally | 2026-07-25 01:53 IST |
| Root agent | `/root` |
| Implementation agent | `/root/ui_ci_deploy_research` — Phase 05 product lifecycle, UI composition, query/pagination, tests, and local browser scope only |
| Independent reviewer | `/root/security_auth_research` — multi-pass read-only review; final code verdict approved with no remaining P0–P2 finding |
| Official workflow | Project `shadcn`, Vercel React/composition, and Playwright skills; official shadcn monorepo/CLI/component docs; Base UI Button guidance; official Next.js data/component/accessibility guidance; React `cache()` guidance |
| shadcn evidence | `info` and `preset resolve` returned locked preset `b23PPibQOI` with no fallback; official docs resolved for Alert Dialog, Field, Native Select, Spinner, Button, and Sonner; dry-run and add placed only `packages/ui/src/components/alert-dialog.tsx` |
| Product lifecycle | Transactional timestamp/version-guarded product and variant edits; product-first atomic archive preserving balances/history; product-only reactivation plus explicit per-variant restore; archived catalog remains discoverable but is excluded from new selectors |
| Domain lifecycle safety | Manual receive/adjust locks product→variant and requires both active while replaying an exact prior idempotent result; draft add-line locks invoice→product→variant; concurrent archive tests prove only serially valid outcomes; fulfillment of an already-issued line remains the explicit archived-SKU exception |
| UI/accessibility | Base Alert Dialog confirmations, Sonner feedback, Field/NativeSelect errors, real semantic links styled with `buttonVariants`, pending-focus preservation through `focusableWhenDisabled`, spinner icon metadata, no `space-y-*`, and unique IDs/label targets for simultaneously mounted forms |
| Pagination/query result | Products, customers, invoices, AR, payments, stock movements, and invoice-scoped payment history use bounded count+row queries, stable ID tiebreakers, URL page state, filter preservation, and canonical out-of-range redirects; invoice detail uses dedicated `paymentsPage` and total metadata |
| Performance evidence | Request session remains React-cached; protected layout changed from full three-query dashboard metrics to one purpose-specific low-stock count; independent dashboard reads and every list row/count pair use `Promise.all` |
| Cost visibility | Stock ledger labels fulfillment-time captured unit cost separately from legacy-current estimates; finance separation remains unchanged |
| Disposable DB gate | PostgreSQL 16, Node `24.18.0`: full `pnpm test:integration` passed 98/98 with no skip (DB 37/37; ops/auth 61/61). Coverage includes archived mutation rejection/replay, manual-mutation/archive races, add-line/archive races, and archived issued-invoice fulfillment. |
| Unit/static gate | `pnpm test:unit` passed 75/75 (DB 23/23; ops 52/52); root lint, DB/ops typechecks, marketing sync check, optimized Next build, and `git diff --check` passed |
| Browser lifecycle evidence | Disposable owner completed product/variant edit→archive→product reactivate→explicit variant reactivate; archived stock stayed visible and active stock/invoice selectors excluded it. Customer creation, preselected invoice creation, line add, issue, print, and partial payment flows rendered correctly. Native invalid controls received focus. Keyboard Alert Dialog opened with Cancel focused and Escape returned focus to the trigger. |
| Pending-focus evidence | A held product lifecycle POST produced `aria-disabled="true"`, retained the action as `document.activeElement`, and showed `Reactivating…`; the request was intentionally aborted after the assertion so no duplicate mutation committed |
| Pagination browser evidence | Product page 999 canonicalized to its last page with filters preserved. A 26-row disposable invoice history canonicalized `paymentsPage=999` to page 2 of 2, preserved `view=activity`, and generated a first-page Previous URL without the custom page parameter. |
| Browser quality evidence | Optimized local server: signed-out `/products` redirected to `/login?next=%2Fproducts`; 375×812 stock view had no horizontal overflow; print media retained invoice content. DOM scans on stock, invoice detail, product detail, customer creation, invoice creation, and security found zero duplicate IDs and zero unresolved labels. Final multi-route console check returned 0 errors and 0 warnings. |
| Review corrections | Fixed semantic Button/Link composition, stale variant lifecycle state, out-of-range canonical pages, payment-history truncation, archived direct stock mutation, add-line/archive lock ordering, archived idempotent replay/races, pending focus, and duplicate stock form IDs; final structural review was green |
| Root dependency correction | The earlier scoped Next-only PostCSS override left shadcn/Tailwind tooling on `8.5.20`. Root changed the workspace override to global `postcss=8.5.22` and `sharp=0.35.3`; a fresh install plus frozen install and `pnpm why` prove exactly one Next `16.2.11`, one Sharp `0.35.3`, and one PostCSS `8.5.22` resolution. |
| Root test/build gate | Disposable PostgreSQL 16 with every migration applied; exact Node `24.18.0`; complete `pnpm test` passed 143/143 with no skip (DB 82/82, ops/auth/UI 61/61). Frozen install, marketing check, root lint, DB/ops typechecks, production high audit gate, optimized build, official shadcn info/preset/dry-run, and `git diff --check` passed. Audit result remained 0 critical, 0 high, 1 moderate (esbuild development-server advisory). |
| Root archive evidence | `dist/perfume-aura-standalone_20260725.zip`, 26,465,028 bytes, SHA-256 `ec2f6d8cb74769b80d860be87519faf7c11b43eb7fbb70eed9bcc3552ca49c2f`; stage/extract smoke proved Next `16.2.11`, Sharp `0.35.3`, PostCSS `8.5.22`, Linux Sharp tree, static assets, and entry `apps/ops/server.js`. No deployment occurred. |
| Root browser gate | A separate disposable owner signed in, edited product metadata, received 5 units, and completed product archive → product-only reactivation → explicit variant reactivation. Cancel returned focus to the Archive trigger; archive preserved the 5-unit balance, hid Receive/Adjust, and removed the SKU from active selectors while the stock ledger retained it. Product and stock pages had no duplicate IDs or unresolved labels; 390×844 had no page overflow; signed-out `/` redirected to `/login`; live, ready, and login returned `200`; console finished at 0 errors and 0 warnings. |
| Local credential incident | An implementation-agent dev form fallback placed the local-only owner password in transient local logs. Root rotated that retained local credential without echoing the replacement, revoked one local session, preserved `.env.local` mode `600`, and removed browser artifacts. No production/provider credential was read or changed. |
| Accepted residual risk | No provider latency/query telemetry or production accessibility proof was attempted; Phase 07 must repeat health/auth/browser checks against isolated provider state |
| Rollback | Revert the bounded Phase 05 source/docs changes; no schema migration or provider state was introduced |
| Provider changes | None — no Neon, Hostinger, production, staging, DNS, email, GitHub push, or deployment action |
| Root cleanup | Approved. Disposable PostgreSQL container/database, local dev server, browser daemons, port 3000 listener, and `.playwright-cli` artifacts were removed; the validated ZIP remains in ignored `dist/` for Phase 06 rollback work. |
| Commit | The scoped Phase 05 commit containing this log, implementation, tests, official UI artifact, and durable product-design context |

## Phase 06 — CI and standalone packaging

| Item | Evidence |
|---|---|
| Status | Complete and root-approved locally; real PR/`main` runs remain external follow-up evidence |
| Started from | Phase 05 commit `c5e775ec7238538ea872c4b9193cf325686daab7` |
| Local implementation completed | 2026-07-25 02:19 IST |
| Root approval completed | 2026-07-25 03:16 IST |
| Root agent | `/root` |
| Implementation agent | `/root/ui_ci_deploy_research` — Phase 06 CI, workspace test/typecheck contracts, packaging, artifact/runbook, and local disposable verification only |
| Independent reviewer | `/root/security_auth_research` — initial verdict not approved with four P2 release-integrity findings; final current-tree verdict approved with no P0–P2 finding |
| Official workflow | GitHub workflow/service-container/SHA-pin/artifact/dependency-review guidance; pnpm CI/filtering; Next standalone/self-hosting; Hostinger Node 24 ZIP upload; Neon `pg` Pool/provider-boundary guidance |
| Skills used | `vercel-react-best-practices` for the optimized production-build gate and `neon-postgres` for long-running `pg` Pool plus disposable PostgreSQL-only CI |
| Workflow result | One artifact-only workflow owns PR/`main` gates: exact Node `24.18.0`, npm `11.16.0`, pnpm `11.1.3`, `contents: read`, full-SHA actions, quality, PostgreSQL 16 integration, PR dependency review, and package `needs` quality+integration. Package/native/server/static smoke runs on PR/manual/main; upload alone requires `refs/heads/main` and push or workflow dispatch. |
| Workspace contracts | DB/UI/validators/ops typechecks; root `check` includes optimized build and both high production audits after unit tests; quoted Node 24 discovery globs plus an exact-once repository inventory; missing/unsafe `TEST_DATABASE_URL` fails rather than skips |
| Local quality gate | Frozen install, root `check` (marketing, lint, all four typechecks, 95/95 unit tests with zero skip, optimized build, audits), pnpm audit 0 critical/0 high/1 moderate, narrow npm lock audit 0 vulnerabilities, Bash/JSON/YAML parse, and official `actionlint v1.7.9` passed |
| Local PostgreSQL gate | PostgreSQL `16.14`; all forward migrations; 49/49 integration tests with zero skip across inventory, Phase 02/03/04 migration/workflow, and Better Auth suites |
| Packaging contract | Exact Node/npm/pnpm/Next `16.2.11`/Sharp `0.35.3`/PostCSS `8.5.22`; committed/audited narrow Sharp npm lock and verified hash; Linux x64 glibc native load; explicit required/forbidden paths; static-asset/server smoke; 50,000,000-byte ceiling; unique candidate workspace and atomic no-overwrite publication |
| Phase 06 local artifact | Ignored `dist/perfume-aura-standalone_20260725-phase06-local.zip`; 26,267,078 bytes; 3,639 paths; SHA-256 `381d1c1267e6e2906232d118a3009975416aa0076cd67757107da352ea91f2ca`; 117-byte checksum; 1,133-byte manifest; local `dirty: true`, so not promotable |
| Final packer safety corrections | Every setup-node step reads committed `.nvmrc` and asserts exact `24.18.0`; the shared repository guard validates `TEST_DATABASE_URL` before extracted-server smoke; unsafe remote URLs and `../unsafe` artifact stamps fail closed; normal Git porcelain includes untracked source changes in manifest dirtiness |
| Linux/native/server proof | Linux/amd64 Node `24.18.0` loaded Next `16.2.11`, Sharp `0.35.3`, libvips `8.18.3`, PostCSS `8.5.22`; extracted server against disposable PostgreSQL returned `200` for `/login`, `/api/health/ready`, and `/api/auth/get-session` |
| Current-tree correction artifact | Ignored `dist/perfume-aura-standalone_20260725-phase06-duplicate-audit.zip`; 26,270,957 bytes; 3,640 paths; SHA-256 `8e09cb8483b0f1aa80125c6279844d649f9e3c89d8b3b092a8fb51ee7540d659`; 127-byte checksum; 1,428-byte schema-2 manifest; local `dirty: true`, not promotable |
| Root current-tree artifact | Ignored `dist/perfume-aura-standalone_20260725-phase06-root-final.zip`; 26,271,008 bytes; 3,640 paths; SHA-256 `b16d8b8b960e88c8c03a4c69dcf44cf51a0c529ae4e9ca163e1ede53cbb8f044`; checksum, external schema-2 manifest, embedded runtime lock, forbidden-path scan, and 50,000,000-byte ceiling passed; local `dirty: true`, not promotable |
| Patched-block duplicate audit | Current source has exactly one build auth-secret assignment, optional-root comment, and verifier `$VERIFY` argument; no adjacent exact duplicate remains. Fresh syntax + unique-stamp pack passed candidate checksum/manifest, PostgreSQL server endpoints, and the Next static asset. |
| Review correction proof | All 25 test files assigned exactly once (20 unit/5 integration); PostgreSQL 16.14 integration 49/49 zero skip; locked runtime SHA-256 `59ec5b45083851bd3c6015af04ed5e67dc2feef93a0145e4d8ecc66427cbaebb`; macOS and Linux server/static asset `200`; overwrite refusal preserved hash; late failure left no final or temporary output; branch upload condition is main-only |
| Unsupported automation removal | No active `HOSTINGER_API_TOKEN`, `ops:deploy`, deploy script/job, provider credential, `continue-on-error`, floating action reference, or provider mutation contract remains |
| Prior local artifact custody | Preserved ignored `dist/perfume-aura-standalone_20260725-phase05-known-good.zip`; 26,465,028 bytes; SHA-256 `ec2f6d8cb74769b80d860be87519faf7c11b43eb7fbb70eed9bcc3552ca49c2f`; local regression rollback only, not production-byte proof |
| CI run URLs | Pending root push/PR; no GitHub mutation was authorized or performed |
| Provider changes | None — no GitHub push, Neon, Hostinger, production, staging, DNS, SMTP, secret, upload, or deploy access |
| Accepted residual risk | GitHub-hosted action/service/artifact behavior and Dependency Review repository eligibility require the first PR/`main` runs; 14-day artifacts require external operator custody; Hostinger behavior remains Phase 07 |
| Rollback | Revert the Phase 06 workflow/package/test/packer/docs revision together; preserve the last reviewed artifact and runtime metadata; never restore provider API/token automation |
| Root gate | Approved. Exact Node `24.18.0`/npm `11.16.0`/pnpm `11.1.3`; frozen install; marketing check; lint; all four workspace typechecks; 95/95 unit and 49/49 PostgreSQL integration tests with zero skip; optimized build; zero-high production audits; `actionlint`; Bash syntax; `git diff --check`; checksum/manifest/forbidden-path proof; packaged server and static asset `200`; Linux/amd64 native load of Next `16.2.11`, Sharp `0.35.3`/libvips `8.18.3`, and PostCSS `8.5.22`; disposable containers/listeners removed. |

## Phase 07 — Production recovery and verification

| Item | Evidence |
|---|---|
| Status | In progress. Read-only production inventory and isolated Neon pre-production validation are complete; production database migration, Hostinger environment/deployment, SMTP delivery, proxy/IP proof, and final cutover are not complete. |
| Started from | Clean Phase 06 commit `1f68928c6c9f29e9f8baad105c59a7fd26ad17f3` on local branch `codex/project-hardening`; `main`/`origin/main` still point to the pre-hardening revision, so no production artifact is represented by the source-of-truth branch yet. |
| Root operator | `/root`; all provider mutations remained root-controlled. |
| Read-only preparation agent | `/root/db_integrity_research` — verified the clean artifact/public/provider boundary and identified the unresolved GitHub custody/main-CI gate; no provider mutation. |
| Independent evidence reviewer | Pending until after an actual production cutover; must be a different normal read-only agent. |
| Official workflows rechecked | Current Neon CLI/API branching and role endpoints; official Neon branching/restore/pooling guidance; official Hostinger Node Web App ZIP, Node `24.x`, environment, redeploy, and SMTP guidance; official Better Auth rate-limit/security guidance. |
| Clean candidate | `dist/perfume-aura-standalone_1f68928c6c9f.zip`, 26,270,975 bytes, SHA-256 `e1455ac120134638f75f6e81bd7ef0581bc9dd3cd32f56bcba244d0ced5275f2`; external/embedded manifests record the exact full source commit and `dirty: false`. Local packaged endpoints and static assets passed before provider work. |
| Public preflight | Marketing `/` returned `200`; protected marketing paths returned `403`; ops `/login` returned `200`, while `/`, `/api/auth/get-session`, and the old deployment's auth/database path remained broken. New health/recovery routes were absent on the old deployment. DNS resolved through the established Hostinger nameservers; no DNS change was warranted. |
| Hostinger inventory | Exact website `app.perfumeaura.com`, hosting user `u602723373`, latest deployment `019f8f41-3783-73ad-8190-6525bf739d90`; old deployment uses Node `20`, root `./`, entry `apps/ops/server.js`, and a prebuilt archive. Build logs showed the no-op install and `echo prebuilt-standalone` path. No environment value was read or printed. |
| Neon target | Project `aged-star-64023346` (`perfume-aura`), production branch `br-ancient-boat-azyjtmnj` (`main`), PostgreSQL `17`, database `neondb`. Production initially had exactly the three reviewed migrations through `0002`; the production read-only preflight returned zero for all 22 categories. |
| Restore evidence | Named production snapshot `snap-bold-moon-azlxqhqn` (`phase07-pre-hardening-20260725`) created before migration work; isolated expiring branch `br-summer-hill-az81q4rb` (`phase07-preprod-20260725`) created from production with endpoint `ep-spring-boat-az9a9mri`. Both are scheduled to expire on 2026-08-02. |
| Provider credential incident | The Neon branch-create command unexpectedly printed an inherited owner URI. Root immediately reset the owner password independently on production and pre-production, suppressed all replacements, and verified that both new secrets exist and differ. No exposed value was reused. |
| Pre-production expansion | Exact-`0002` preflight: 22/22 zero. The bounded Drizzle migrator reached exactly eight rows through `0007_phase04_auth_expansion`; a repeat verifier under exact Node `24.18.0` proved `before=8`, `after=8`, target hash `49bede137e6fd29d1c87a84170502e4f4e1329ab36521a9e37d2fc5f3d5dfa7f`, with `0008` pending. |
| Runtime role discovery | A role created through Neon's role API inherited `neon_superuser`, `CREATEROLE`, `CREATEDB`, and `BYPASSRLS`; the catalog gate rejected it. Root revoked its object grants, deleted it through the API, and recreated `perfume_aura_runtime` directly in SQL as required by the runbook. |
| Runtime role proof | SQL-defined role is `LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`, has zero memberships, can connect/use `public`, cannot create schema/temp objects, has zero unexpected/missing table grants, zero sequence privileges, and cannot update/delete payments or stock movements. Broad database `TEMPORARY` was removed from `PUBLIC` on the isolated branch and retained explicitly for the inventoried Neon provider/admin roles. |
| Expansion-code compatibility | The exact clean ZIP booted under Node `24.18.0` against the eight-row schema using only the restricted pooled runtime role. `/login`, `/api/health/live`, `/api/health/ready`, and `/api/auth/get-session` all returned `200`. |
| Contract migration | Expansion reconciliation returned 27/27 zero. The ordinary Drizzle migrator applied only `0008_phase03_contract`; the journal then contained exactly nine rows and contract hash `3f7d6d86e395cfc2e996cdfe81c0820bb93b4dfd7b6c7cebe78d8ee239e45e56`. Post-contract reconciliation remained 27/27 zero. |
| Contract catalog proof | All 11 contract checks are validated; payment number/idempotency columns are required; the enabled `stock_movements_append_only` trigger is present; its function is executable only by the owner; the runtime grant matrix remains exact. Payment trigger remains intentionally deferred to a linked reversal/credit-note model. |
| Pre-production seed/browser proof | MAIN seed was already present. Owner break-glass recovery completed on the isolated branch, the clean package booted with the restricted role, and Playwright signed in successfully. Dashboard, products, stock, customers, invoices, payments, finance, and security each returned `200` with the expected heading and zero browser errors/warnings. |
| Browser credential incident | A diagnostic Playwright snapshot unexpectedly rendered the filled owner form fields. Root closed the browser/server, deleted the generated artifacts, rotated `.env.local` to a new mode-`600` password, ran confirmed break-glass recovery on both pre-production and production, revoked all owner sessions, and repeated sign-in with credential-bearing CLI output fully suppressed. The exposed value is invalidated. |
| Better Auth proxy gate | Current official Better Auth guidance says the default `X-Forwarded-For` value is not sufficient behind an appending proxy; production must use a provider-controlled single header or a proven right-to-left trusted proxy chain. Hostinger's public Node documentation does not define such a header/chain. Production needs redacted boundary observation plus spoof/two-network/restart tests before cutover can be approved. |
| Hostinger browser gate | In-app browser remains at the unauthenticated Hostinger login page. Chrome is installed but not running; the browser skill requires user permission before launch. No hPanel setting, environment, mailbox, upload, restart, or deployment was changed. |
| SMTP gate | No approved Hostinger SMTP credentials are present locally. `smtp.hostinger.com:465` is the approved default, but mailbox/password/from values must come from the authenticated account or user; they will not be guessed. No email was sent. |
| GitHub custody gate | No push/PR/main run was authorized or performed. The candidate is clean and checksum-verified locally, but Phase 06 GitHub gates and `main` artifact custody remain unproven. Root needs explicit push/PR/merge authority or an explicit locally reviewed Path Z exception before production upload. |
| Production mutations completed | Restore snapshot/branch creation; Neon owner-password rotation after URI exposure; confirmed owner break-glass password recovery/session revocation after browser exposure. No production migration, runtime role, Hostinger, SMTP, DNS, deployment, or business-ledger mutation occurred. |
| Rollback state | Production database remains at its original three-migration schema; the named restore snapshot exists; prior Hostinger deployment remains active; the Phase 06 ZIP has not been uploaded. The isolated branch can be deleted after final evidence retention. |
| Root gate | Not approved for production cutover. Await authenticated hPanel access/Chrome permission, approved SMTP mailbox credentials, trusted-proxy evidence, and GitHub artifact-custody direction. |

## Phase 08 — Documentation and operational handoff

Status: pending
Implementation agent: pending
Independent reviewer: pending
Stale-term/link/command checks: pending
Final repository status: pending
