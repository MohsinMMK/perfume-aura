# Roadmap

## Implemented and repository-verified

| Capability | Status |
|---|---|
| Monorepo, static marketing, shared UI/DB/validation packages | Complete |
| Owner login, protected routes, sign-up disabled | Complete |
| Password recovery, SMTP integration, security headers, durable rate limit | Complete in code; production delivery pending |
| Product/variant create, edit, archive/reactivate | Complete |
| Inventory receive, adjust, sell, low-stock, ledger, concurrency/idempotency | Complete |
| Customers | Complete |
| Draft/issue/fulfill/void/print invoices | Complete |
| Payments, numbering, idempotency, AR | Complete |
| Finance snapshot, inventory value, cash/accrual metrics | Complete |
| Migrations `0000–0008`, staged cutover tooling, restricted role design | Complete; production migrated through `0008` and grants verified 2026-07-27 |
| Node 24 quality/integration/package workflow | Complete; GitHub Dependency Review setting pending |
| Manual standalone Path Z packaging | Complete; current live production fallback |
| Owner login on production ops | Verified 2026-07-27 against Neon production |
| CI publish of prebuilt `hostinger-ops-production` branch (Option 1-B) | Implemented in repository; Hostinger webhook cutover pending |
| Documentation consolidation | Complete |

## Production automation — next

1. Enable GitHub Dependency Graph/Dependency Review and rerun PR gates.
2. Prove Option 1-B twice on staging/non-prod Hostinger app: push `main` → branch publish → Node Git auto-start → `/api/health/version` matches SHA.
3. One-time connect `app.perfumeaura.com` Node Web App to branch `hostinger-ops-production` with prebuilt settings (Package manager `pnpm`, build `echo prebuilt-standalone`, entry `apps/ops/server.js`); set `HOSTINGER_OPS_AUTO_DEPLOY_ENABLED=true` only after first green live poll.
4. Keep Path Z ZIP as rollback/fallback until two consecutive production push proofs pass.
5. Implement/prove production migration automation before claiming schema-changing push-only releases.
6. Complete SMTP mailbox/env and password-reset email smoke; prove trusted-proxy / per-client IP rate limiting.
7. Record dated production evidence without secrets after webhook cutover.

## Later

- Do not enable pure Hostinger monorepo source build (Path G) while esbuild EACCES remains.
- Move marketing from whole-repo classic Git to artifact-only static deployment; expected protected paths then become absent (`404`) instead of denied (`403`).
- Design linked returns, payment reversal/credit notes, and authoritative net-sum semantics.
- Add purchase orders/suppliers only after product requirements.
- Add multi-role access only after explicit authorization model.
- Add payment gateway only with webhook idempotency and accounting design; never couple stock mutation to payment webhook.

## Not planned now

- Vercel production hosting.
- Public e-commerce storefront.
- Unproven provider API/MCP/Connector deployment.
- Destructive migration shortcuts or broad runtime database privileges.
