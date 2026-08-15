# Roadmap

This file tracks pending work only. Exact production SHAs, completed releases,
resource evidence, and dated rollback state belong in
[CURRENT_STATE.md](CURRENT_STATE.md). Production mutations always require the
authorization and evidence defined in [OPERATIONS.md](OPERATIONS.md).

## 1. Close the VPS cutover rollback window

Status: **time- and authorization-gated**.

- Retain the frozen Hostinger ops Web App until the exact deadline recorded in
  `CURRENT_STATE.md`.
- After the deadline, run fresh exact-SHA VPS acceptance and confirm public DNS
  no longer depends on the managed ops app.
- Delete the frozen app only with explicit authorization. Preserve the verified
  ops ZIP as recovery material and keep `hostinger-ops-production` inactive.

## 2. Automate the storefront provider connection

Status: **repository automation prepared; provider connection absent**.

- Obtain a recoverable in-place Git source conversion for the existing
  upload-sourced Hostinger storefront, or approve a separately backed-up and
  tested recreation plan.
- Connect only `hostinger-storefront-production`; preserve Node 24.x, Framework
  Other, root `./`, empty build/output settings, existing environment values,
  and entry `apps/storefront/server.js`.
- Enable `HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED=true` only after the provider
  connection exists, then prove one exact generated-source deployment through
  HCDN and clean desktop/mobile browsers.
- Until then, the checksum-verified ZIP remains the routine and emergency
  storefront deployment path.

## 3. Release staff operations

Status: **implementation prepared; migration and activation gated**.

- Test migration `0010_curved_puma` on an isolated Neon branch.
- With separate authorization, apply the production migration through the
  direct owner connection and reapply restricted runtime grants.
- Follow the [staff operations release runbook](runbooks/STAFF_OPERATIONS_RELEASE.md)
  with both staff flags initially false.
- Prove SMTP, owner TOTP, recovery-code login, invitations, append-only audit,
  and the owner/staff denial matrix before enabling mandatory 2FA and then
  invitations.

## 4. Activate observability

Status: **provider configuration and runtime proof pending**.

- Configure the platform-specific PostHog and Sentry values without committing
  secrets.
- Deploy through each surface's owning release path.
- Verify privacy-filtered events, source maps, logs, application separation, IP
  discard, and the absence of session replay or sensitive fields.

## 5. Release storefront commerce

Status: **foundation prepared and release-locked**.

- Keep catalog, checkout, customer authentication, inquiries, and every commerce
  flag disabled until their business, catalog, policy, media, pricing, stock,
  shipping, tax, support, Cashfree, SMTP, and lifecycle gates pass.
- Use a separate authorized release decision for each public capability.

## 6. Measure and optimize production

Status: **representative released content required**.

- Capture privacy-safe Core Web Vitals and repeat desktop/mobile performance
  checks after representative approved catalog content is live.
- Treat the unresolved Hostinger shared-process incident as storefront/provider
  evidence only; public ops now runs on the VPS.
- Optimize from measured bottlenecks and preserve the regression policy in
  [OPTIMIZATION.md](OPTIMIZATION.md).
