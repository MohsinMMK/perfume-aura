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
| Migrations `0000–0008`, staged cutover tooling, restricted role design | Complete locally; production pending |
| Node 24 quality/integration/package workflow | Complete; GitHub Dependency Review setting pending |
| Manual standalone Path Z packaging | Complete and locally verified |
| Documentation consolidation | Complete |

## Production recovery — next

1. Enable GitHub Dependency Graph/Dependency Review and rerun PR gates.
2. Retain verified `main` ZIP/checksum/manifest plus previous known-good artifact.
3. Execute [OPERATIONS.md](./OPERATIONS.md) write-freeze cutover exactly:
   bare SQL role → `0007` → grants → Path Z smoke → reconcile → `0008` → grant reproof → seed.
4. Verify owner login, auth session, live/readiness, core workflows, and reset email.
5. Record dated production evidence without secrets.

## Later

- Prove Hostinger GitHub source build (Path G) end-to-end before enabling it.
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
