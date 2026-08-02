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
| Manual standalone Path Z packaging | Complete; emergency rollback/fallback only |
| Owner login on production ops | Re-verified 2026-07-31 after generated-branch cutover and secret rotation |
| CI publish of prebuilt `hostinger-ops-production` branch (Option 1-B) | Production connected; two consecutive webhook deployments and exact-SHA health proofs passed 2026-07-31 |
| Documentation consolidation | Complete |
| Storefront routes, editorial UI, cart, gated checkout, customer auth, Cashfree/COD contracts, owner commerce console | Complete locally; production release gated |
| Storefront migration `0009`, public catalog projection, reservation/order/payment/shipment/review/return schema | Generated and repository-verified; not applied |
| INR read-only audit and fail-closed migration preflight | Complete in code; owner treatment decision pending |
| Hostinger storefront prebuilt ZIP (`apps/storefront/server.js`) | Extracted-artifact smoke passed locally; Hostinger app/DNS not created |

## Production automation — completed 2026-07-31

1. Connected `app.perfumeaura.com` Hostinger Node Web App to generated branch `hostinger-ops-production`.
2. GitHub runs `30615774862` and `30623386605` published sources `43edda3e7b05…` and `3e7fa94c1a18…`; hPanel showed completed deploy commits `db10bb11b724…` and `cd7f2d818d66…`, followed immediately by matching manual `/api/health/version` probes.
3. Enabled repository variable `HOSTINGER_OPS_AUTO_DEPLOY_ENABLED=true` after those proofs so subsequent releases require the workflow's automated exact-SHA live poll.
4. Rotated the restricted Neon runtime-role password and Better Auth secret, applied the hPanel environment, redeployed, and re-verified readiness, auth, static assets, owner session, dashboard, and core pages.

## Production automation — remaining

1. Enable GitHub Dependency Graph/Dependency Review and rerun PR gates.
2. Implement/prove production migration automation before claiming schema-changing push-only releases.
3. Complete SMTP mailbox/env and password-reset email smoke.
4. Prove trusted-proxy / per-client IP rate limiting and restart persistence.
5. Retain a checksum-verified Path Z ZIP as emergency rollback material, not routine deployment.

## Storefront release gates

1. Complete browser/design/accessibility QA and the full serial repository suite.
2. Run the read-only currency audit; record the owner's treatment decision for
   every non-zero legacy monetary record. Never perform automatic FX conversion.
3. Approve every product's legal identity, copy, media, SKU, stock, cost, and
   price. Supply exact Signature prices.
4. Approve delivery fee/threshold, shipping/returns/cancellation text, tax
   treatment, and support channel in ops.
5. Complete Cashfree KYC/sandbox proof, isolated customer-auth secret, SMTP,
   Google and Apple credentials/callback domains, and India-counsel review.
6. Create a separate Hostinger Node Web App and DNS record for
   `shop.perfumeaura.com`, upload the verified prebuilt artifact, and run the
   explicitly authorized prepaid + COD lifecycle acceptance tests.
7. Cut the apex only after explicit release approval and preserve current Path
   M marketing files/settings as rollback.

## Later

- Do not enable pure Hostinger monorepo source build (Path G) while esbuild EACCES remains.
- Move marketing from whole-repo classic Git to artifact-only static deployment; expected protected paths then become absent (`404`) instead of denied (`403`).
- Design linked returns, payment reversal/credit notes, and authoritative net-sum semantics.
- Add purchase orders/suppliers only after product requirements.
- Add multi-role access only after explicit authorization model.
- Enable Cashfree production payments only after merchant approval, signed-webhook idempotency, refund/reconciliation proof, and Hostinger staging evidence; never couple stock mutation directly to a browser callback.

## Not planned now

- Vercel production hosting.
- Unproven provider API/MCP/Connector deployment.
- Destructive migration shortcuts or broad runtime database privileges.
