# Staff operations release checklist

Read [`../CURRENT_STATE.md`](../CURRENT_STATE.md) first. Run only after the
active VPS ops release passes fresh exact-SHA acceptance. The unresolved
Hostinger shared-plan incident still gates managed-storefront provider changes,
but does not gate an independently authorized VPS ops release. Stop at the first
failure and record privacy-safe production results in `CURRENT_STATE.md`.

## Preconditions

- Active VPS ops exact-SHA acceptance passes, and storefront locks plus the
  path-preserving `www` redirect pass a fresh re-smoke.
- The staff commit and deployment artifact are CI-verified.
- `OPS_TWO_FACTOR_REQUIRED` and `OPS_STAFF_INVITES_ENABLED` are not `true`.
- Every `STOREFRONT_*` release flag remains false.
- Integration tests use only `TEST_DATABASE_URL` on loopback PostgreSQL with a
  name matching `perfume_aura_phaseNN_<purpose>`.

Never use production or Neon as an integration-test database.

## Phase A — schema and flags-off deploy

1. Create an isolated Neon branch and apply `0010_curved_puma`.
2. Validate the migration and restricted grant contract on that Neon branch;
   do not run the integration suite there.
3. Apply the same migration to a disposable loopback PostgreSQL database and run
   authenticated integration tests through `TEST_DATABASE_URL`.
4. Apply the reviewed migration to production using `DATABASE_URL_DIRECT`.
5. Reapply `packages/db/sql/ops-runtime-grants.sql` with the reviewed runtime
   role; reject any unexpected effective privilege.
6. Deploy ops with both security flags false.
7. Verify exact SHA, live, ready, version, unauthenticated session, a real static
   asset, and existing owner login.
8. Re-smoke storefront, its release locks, and the path-preserving `www` `308`.

```bash
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --target ops \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 1200000
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
fresh exact-SHA VPS and storefront acceptance
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
