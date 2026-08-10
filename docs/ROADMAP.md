# Roadmap

Execute in this order. Current blockers and SHAs belong in
[CURRENT_STATE.md](CURRENT_STATE.md).

1. Remediate production dependency advisories and restore a green `pnpm check`.
2. Obtain a scoped Hostinger repair for the ops NPROC/HCDN incident and a
   compliant Node/pnpm runtime.
3. Complete the ordered
   [staff-operations release smoke](STAFF_OPERATIONS_RELEASE_SMOKE.md): isolated
   Neon proof, production migration and grants, flags-off deployment, SMTP,
   owner TOTP/recovery, invitations, and staff-denial tests.
4. Keep storefront commerce closed until catalog, legal, media, price, stock,
   shipping, tax, policy, support, Cashfree, SMTP/customer-auth, and authorized
   prepaid/COD lifecycle gates pass.
5. After hosting repair, collect privacy-safe production Core Web Vitals with a
   representative approved catalog/cart/checkout fixture.

Production migrations remain manual and reviewed. A code push never implies a
schema migration, deployment, or release-flag change.
