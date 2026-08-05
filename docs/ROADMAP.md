# Roadmap

## Completed

| Capability | Status |
|---|---|
| Owner operations: catalog, stock, customers, invoices, payments, finance | Implemented and production-verified |
| Storefront: animated editorial UI, cart, search, product/collection routes, customer-auth boundary, Cashfree/COD contracts | Implemented and deployed fail-closed |
| Storefront schema, controlled catalog projection, reservation/order/payment/shipment/review/return records | Migrated to shared Neon production database |
| INR contract and legacy PKR audit gate | Implemented; no automatic FX conversion |
| Apex cutover | `perfumeaura.com` is the deployed storefront; `www` redirects; `shop` is deleted |
| Hostinger packages | Ops generated branch and apex storefront verified ZIP paths pass extracted smoke |
| Staff operations foundation | Implemented locally: official Better Auth Admin/2FA plugins, strict roles/capabilities, invitation/audit records, owner break-glass recovery, and migration/integration coverage |

## Release gates still closed

1. Publish only catalog rows with individual legal, identity, copy, media, SKU,
   stock, cost, and INR-price approval.
2. Approve Signature prices, delivery fee/free-shipping threshold, tax,
   cancellation/returns/shipping policy, courier process, and support channel.
3. Complete Cashfree KYC/sandbox or live proof; never substitute a provider.
4. Prove storefront SMTP, customer-auth credentials and callback domains before
   enabling email, Google, or Apple customer accounts.
5. Complete an authorized prepaid and COD lifecycle acceptance test before
   checkout release.

## Pending staff-operations release gate

Execute the ordered smoke checklist in
[STAFF_OPERATIONS_RELEASE_SMOKE.md](./STAFF_OPERATIONS_RELEASE_SMOKE.md) after
Hostinger repair. Summary:

1. Resolve the active Hostinger ops HCDN 503 / NPROC incident before any
   staff-ops production deployment.
2. Test `0010_curved_puma` on an isolated Neon branch (never use production as
   `TEST_DATABASE_URL`), then apply it to production and reapply the reviewed
   runtime grant matrix.
3. Deploy with `OPS_TWO_FACTOR_REQUIRED=false` and
   `OPS_STAFF_INVITES_ENABLED=false`; prove current owner login and ops health.
4. Prove Hostinger SMTP delivery, owner TOTP enrollment, and one recovery-code
   use before enabling mandatory 2FA.
5. Enable invitations only after mandatory 2FA is proven; complete one
   authorized staff setup and direct server-action authorization denial tests
   (`security.staff.manage`, finance, COD, release-gates, cost view, etc.).
6. Keep all storefront commerce env flags closed; dual checkout lock is
   `commerceSettings.checkoutEnabled` ∧ `STOREFRONT_CHECKOUT_RELEASE_APPROVED`.

## Operational follow-up

- Keep the Hostinger NPROC incident under observation. Obtain durable
  command/domain attribution before any plan-wide remediation is considered
  routine.
- Keep production migrations manual and reviewed; never imply push-only schema
  deployment.
