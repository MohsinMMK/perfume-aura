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

## Next release: owner and staff operations

1. Add the official Better Auth Admin and 2FA plugins and generate their schema.
2. Test the reviewed migration on an isolated Neon branch, then apply it to
   production and reapply restricted runtime grants.
3. Add typed `owner`, `staff`, and fail-closed `user` roles with server-side
   capabilities and an exactly-one-owner database invariant.
4. Add audited staff invitations, mandatory TOTP, recovery codes, trusted
   devices, session revocation, bans, and break-glass owner recovery.
5. Keep `OPS_TWO_FACTOR_REQUIRED` and `OPS_STAFF_INVITES_ENABLED` false until
   SMTP delivery, owner enrollment, and recovery-code use are proven.

## Operational follow-up

- Keep the Hostinger NPROC incident under observation. Obtain durable
  command/domain attribution before any plan-wide remediation is considered
  routine.
- Keep production migrations manual and reviewed; never imply push-only schema
  deployment.
