# Staff operations release checklist

Run only after `CURRENT_STATE.md` shows a durable Hostinger repair. Stop at the
first failure. Record privacy-safe production results in `CURRENT_STATE.md`.

## Preconditions

- Hostinger has supplied scoped process/restart/HCDN evidence and both apps pass
  a fresh re-smoke.
- The staff commit and deployment artifact are CI-verified.
- `OPS_TWO_FACTOR_REQUIRED` and `OPS_STAFF_INVITES_ENABLED` are not `true`.
- Every `STOREFRONT_*` release flag remains false.
- Integration tests use only `TEST_DATABASE_URL` on loopback PostgreSQL with a
  name matching `perfume_aura_phaseNN_<purpose>`.

Never use production or Neon as an integration-test database.

## Phase A — schema and flags-off deploy

1. Create an isolated Neon branch and apply `0010_curved_puma`.
2. Run migration and authenticated integration tests on that branch.
3. Apply the reviewed migration to production using `DATABASE_URL_DIRECT`.
4. Reapply `packages/db/sql/ops-runtime-grants.sql` with the reviewed runtime
   role; reject any unexpected effective privilege.
5. Deploy ops with both security flags false.
6. Verify exact SHA, live, ready, version, unauthenticated session, a real static
   asset, and existing owner login.
7. Re-smoke storefront, its release locks, and the path-preserving `www` `308`.

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 180000
```

## Phase B — owner security

1. Prove one real Hostinger SMTP delivery to the owner mailbox.
2. Enroll the owner in TOTP.
3. Complete one authorized recovery-code sign-in.
4. Set `OPS_TWO_FACTOR_REQUIRED=true`.
5. Prove pending-2FA sessions cannot access protected data and raw 2FA-disable
   requests are rejected.

Do not enable invitations yet. The break-glass TOTP reset is not part of normal
release testing; it revokes every owner session.

## Phase C — staff

Set `OPS_STAFF_INVITES_ENABLED=true` only after Phase B passes. Complete one
owner-created invitation, password setup, staff sign-in, and append-only
invitation/audit record check.

The capability matrix must remain:

| Capability | Owner | Staff |
|---|---:|---:|
| Staff management and security audit | Yes | No |
| Cost and commercial fields | Yes | No |
| Finance and payment recording | Yes | No |
| COD reconciliation and refunds | Yes | No |
| Promotions and release gates | Yes | No |
| Approved shipment update | Yes | Yes |

Prove staff denial through direct server actions, not only hidden navigation:

- invite, deactivate, and list staff;
- view cost or change commercial fields;
- adjust stock where owner-only;
- record payments or view finance;
- reconcile COD or manage refunds;
- manage promotions or release gates;
- void invoices;
- settle COD while updating a shipment.

Unknown, missing, stale, comma-separated, or non-staff roles must fail closed.

## Phase D — checkout lock

Staff release does not authorize commerce. Effective checkout requires both:

```text
commerceSettings.checkoutEnabled === true
&& STOREFRONT_CHECKOUT_RELEASE_APPROVED === "true"
```

Prove checkout stays locked with either plane false, public catalog stays empty
while public release is false, unpublished products return `404`, and the
zero-value cart contract remains intact.

## Final acceptance

- Owner login requires TOTP.
- One authorized staff account is active.
- Every owner-only server action denies staff.
- Invitation and audit rows are append-only.
- Ops and storefront pass a final full smoke.
- All storefront commerce flags remain closed.
- `CURRENT_STATE.md` records deploy SHA, flag state, evidence time, and residual
  risk without secrets.

Completion order:

```text
Hostinger repair
→ isolated migration/tests
→ production migration/grants
→ flags-off deploy and health
→ SMTP/TOTP/recovery
→ mandatory 2FA
→ invitations
→ staff denial matrix
→ final re-smoke
→ stop; commerce remains closed
```
