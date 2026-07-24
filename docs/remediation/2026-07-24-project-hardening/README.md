# Perfume Aura project-hardening execution plan

Date: 2026-07-24
Working branch: `codex/project-hardening`
Immutable baseline: `cd5b02dd7eb542c50a74292eb16de6f7749364b0`
Baseline relationship: `HEAD == main == origin/main` when Phase 00 began.

## Outcome

This directory is the decision-complete implementation contract for hardening the current Perfume Aura monorepo. It converts the repository review into ordered, testable work without changing application code or external provider state during Phase 00.

The target state is:

- Node `24.18.0` locally, in CI, while building the standalone archive, and Hostinger Node `24.x`.
- Audited and officially upgraded dependencies: Better Auth `1.6.25`, Next.js and `eslint-config-next` `16.2.11`, Sharp `0.35.3`, and PostCSS `8.5.22`.
- Database-enforced integrity, atomic document numbering, captured cost basis, append-only ledgers, and a least-privilege runtime role.
- Whole-request transactions for invoice issue, payment, fulfillment, stock, and product aggregate changes.
- Owner-only Better Auth with database-backed protection and a Hostinger SMTP self-service password-reset flow.
- Official shadcn CLI composition, accessible destructive confirmations, aligned product lifecycle behavior, and reduced server-rendering/query overhead.
- CI gates for formatting-equivalent repository checks, lint, typecheck, unit and PostgreSQL integration tests, build, audit, and Node 24 standalone packaging.
- No unsupported automated Hostinger deployment path. Production uses Hostinger's official manual Path Z Node Web App ZIP upload until Path G is independently proven.
- Current, evidence-backed documentation and an operational handoff.

## Phase order

| Phase | File | Gate |
|---|---|---|
| 00 | [00-baseline-and-official-sources.md](00-baseline-and-official-sources.md) | Baseline, inventory, sources, and boundaries are recorded |
| 01 | [01-toolchain-dependency-and-repository-safety.md](01-toolchain-dependency-and-repository-safety.md) | Node/dependencies/repository safety checks pass |
| 02 | [02-database-integrity-and-migrations.md](02-database-integrity-and-migrations.md) | Expansion migration and contract design pass on disposable PostgreSQL |
| 03 | [03-transactional-business-workflows.md](03-transactional-business-workflows.md) | Concurrency, idempotency, and rollback tests pass |
| 04 | [04-authentication-security-and-recovery.md](04-authentication-security-and-recovery.md) | Auth security and password-reset tests pass |
| 05 | [05-product-ui-and-performance-alignment.md](05-product-ui-and-performance-alignment.md) | Product, accessibility, and browser checks pass |
| 06 | [06-ci-and-standalone-packaging.md](06-ci-and-standalone-packaging.md) | CI and Node 24 archive validation pass |
| 07 | [07-production-recovery-and-verification.md](07-production-recovery-and-verification.md) | Root operator proves production, including owner login |
| 08 | [08-documentation-and-operational-handoff.md](08-documentation-and-operational-handoff.md) | Documentation matches verified repository and provider state |

Do not skip forward across a failed gate. Phase 02 creates the expansion migration; Phase 03 adds the contract migration only after compatible transaction code exists. Phase 07 is the only phase allowed to change external provider state, including creation of a nonproduction Neon validation branch.

## Normal-agent execution protocol

Every phase uses two normal sub-agents sequentially. In Phase 07 they are a read-only preparation agent and a separate read-only evidence reviewer; the root operator performs every provider mutation.

1. The root agent records the phase start and baseline in `EXECUTION_LOG.md`.
2. The root agent starts one bounded implementation agent using the prompt embedded in the phase file.
3. The implementation agent reads `AGENTS.md` and the complete phase file, stays inside the stated scope, preserves unrelated work, uses official tooling, edits without staging or committing unless the root explicitly authorizes it, and returns commands plus evidence.
4. The root agent checks the diff and reruns the phase gate.
5. The root agent starts a different independent-review agent. That reviewer does not rewrite the implementation. It inspects the diff, tests, official-source compliance, migration safety, security, and phase completion evidence.
6. The implementation agent or a fresh bounded fix agent addresses accepted findings.
7. The root agent reruns the complete gate, records results in `EXECUTION_LOG.md`, and only then closes the phase.

Agents must not work concurrently on overlapping files. A reviewer must be independent from the implementation agent.

## External-provider boundary

Normal sub-agents may prepare commands, artifacts, redacted checklists, migration SQL, and read-only public verification. They must not:

- create, reset, or delete Neon branches;
- migrate or seed production;
- create roles or rotate database credentials;
- change Hostinger environment variables, Node version, SMTP, DNS, SSL, builds, or files;
- change GoDaddy nameservers or DNS;
- upload or deploy an archive;
- send real recovery email;
- write GitHub secrets or environments.

Those actions are root-agent-only in Phase 07, after explicit target resolution, backup/rollback preparation, and all local gates.

## Global prohibited shortcuts

- No Vercel production deployment.
- No `neon-http` for ledger writes; retain `pg` Pool plus Drizzle interactive transactions.
- No edits to committed migration history; create forward migrations.
- No direct database mutation that bypasses the application transaction contract except an approved, logged recovery procedure.
- No hand-copied shadcn registry components.
- No whole-monorepo Next.js runtime under marketing `public_html`.
- No secrets in source, archives, logs, screenshots, prompts, or `EXECUTION_LOG.md`.
- No `git add .`, blanket audit suppression, `--force` dependency upgrade, or skipped failing test presented as success.
- No production claim based only on `/login`; session health and an actual owner sign-in are mandatory.
