# Staff operations release smoke checklist

Line-mapped post-Hostinger proof for the staff-operations release gate. Use
this after Hostinger supplies a durable scoped NPROC/HCDN repair and both apps
are re-smoked. Do not treat a green `/login` as readiness.

Companion docs: [OPERATIONS.md](./OPERATIONS.md) (deploy + migration),
[PRODUCT.md](./PRODUCT.md) (behavior locks), [ROADMAP.md](./ROADMAP.md)
(ordered pending work), [commerce/RELEASE-CHECKLIST.md](./commerce/RELEASE-CHECKLIST.md)
(public commerce — remains closed).

Record pass/fail evidence in `CURRENT_STATE.md` when production state changes.
Never put secrets, connection strings, recovery codes, or TOTP seeds there.

---

## Preconditions (do not skip)

| # | Check | Pass criteria | Code / ops anchor |
|---|---|---|---|
| P0 | Hostinger incident closed | Specialist repair proven; both apps healthy after re-smoke; no unexplained dual Next starts | `docs/CURRENT_STATE.md` Active ops incident |
| P1 | Branch / artifact | Staff-ops commit is CI-verified; deploy path is generated ops branch (ZIP emergency only) | `docs/OPERATIONS.md` Ops deployment |
| P2 | Security flags still false on Hostinger | Literal non-`true` for both ops flags | `OPS_TWO_FACTOR_REQUIRED`, `OPS_STAFF_INVITES_ENABLED` via `apps/ops/lib/ops-security-policy.ts` |
| P3 | Storefront commerce flags still false | All public commerce flags closed | `STOREFRONT_*` list in `docs/OPERATIONS.md` |
| P4 | Local / CI integration never hits Neon prod | Tests refuse non-loopback and production-like URLs | `requireDisposableTestDatabaseUrl()` in `packages/db/src/test-database-guard.ts` L17 |

### Disposable DB guard (migration/test safety)

Before any `pnpm test:integration` or phase migration suite against a URL:

| Rule | Implementation |
|---|---|
| Env source | `TEST_DATABASE_URL` only — never falls back to `DATABASE_URL` |
| Host | Loopback only: `127.0.0.1`, `localhost`, `::1` |
| Name | `perfume_aura_phaseNN_<purpose>` (`disposableTestDatabaseNamePattern`) |
| Reject | `neon.tech`, `hostinger`, `perfumeaura.com`, `prod`/`production` in name; query params |

Callers that must import the guard first:

- `packages/db/src/phase02-migrations.integration.test.ts`
- `packages/db/src/phase04-migrations.integration.test.ts`
- `packages/db/src/phase03-workflows.integration.test.ts`
- `packages/db/src/inventory.integration.test.ts`
- `packages/db/src/commerce-invoice-link.integration.test.ts`
- `packages/db/src/phase02-preflight.ts` / `phase02-reconcile.ts`
- `apps/ops/lib/auth.integration.test.ts`

Production DDL still uses the **direct Neon owner** connection on an isolated
branch first, then production — never the pooled runtime role for migrations.

---

## Phase A — Schema and deploy (flags false)

Execute in order. Stop on any fail.

| # | Step | Pass criteria | Anchor |
|---|---|---|---|
| A1 | Apply `0010_curved_puma` on isolated Neon branch | Migration + integration suites green on branch | `packages/db` migrations; `docs/OPERATIONS.md` staff release §1–2 |
| A2 | Apply same migration on production via **direct** owner URL | DDL complete; no runtime pool used | `DATABASE_URL_DIRECT` |
| A3 | Reapply restricted runtime grants | Reviewed role has explicit table grants only | `packages/db/sql/ops-runtime-grants.sql` |
| A4 | Deploy ops with both security flags **false** | Version endpoint matches deployed SHA | Hostinger ops app; `apps/ops/server.js` |
| A5 | Health surface | live, ready, version, unauthenticated session, real Next static asset all `200` | Do not claim ready from `/login` alone |
| A6 | Existing owner login | Owner signs in without mandatory 2FA yet | Better Auth ops session; `apps/ops/lib/auth.ts` |
| A7 | Re-smoke storefront apex | Apex + `www` 308 + release locks still closed | `scripts/verify-production-deploy.mjs` |

```bash
# After ops deploy (substitute real SHA)
node scripts/verify-production-deploy.mjs <40-character-sha> \
  --public-surface storefront \
  --public-base https://perfumeaura.com \
  --timeout-ms 180000
```

Also hit ops live/ready/version/auth/static per project operations runbook.

---

## Phase B — SMTP, owner TOTP, recovery

| # | Step | Pass criteria | Anchor |
|---|---|---|---|
| B1 | Hostinger SMTP | One real delivery to owner mailbox (invite/reset style path as configured) | Ops mail config; `apps/ops/lib/mail.ts` |
| B2 | Owner TOTP enroll | Owner completes enrollment on security settings | `apps/ops` security UI; Better Auth 2FA plugin |
| B3 | Recovery code | Owner consumes **one** recovery code in authorized test journey; remaining codes still valid path documented | 2FA recovery flow |
| B4 | Enable `OPS_TWO_FACTOR_REQUIRED=true` | Only the literal string `true` enables | `isOpsTwoFactorRequired()` → `apps/ops/lib/ops-security-policy.ts` L11–16 |
| B5 | 2FA enforcement | Unauthenticated or pending-2FA sessions cannot reach protected data; raw 2FA-disable rejected per product rules | `requireOpsSession` / `requireCapability` in `apps/ops/lib/session.ts` |
| B6 | Break-glass not used casually | Owner break-glass TOTP path requires exact confirmation from `apps/ops/.env.example`; revokes all owner sessions | `owner-maintenance.ts` `resetOwnerTwoFactorBreakGlass()` |

Do **not** enable invitations until B4–B5 pass.

---

## Phase C — Staff invite flag and owner-only staff management

### C0 Capability matrix (static proof)

| Capability | Owner | Staff | Enforced by |
|---|---|---|---|
| `security.staff.manage` | Yes | **No** | `OPS_CAPABILITIES` / `STAFF_CAPABILITIES` in `apps/ops/lib/ops-access.ts` |
| `security.audit.view` | Yes | **No** | same |
| `system.owner` | Yes | **No** | same |

Automated anchors:

- `apps/ops/lib/ops-access.test.ts` — staff lacks `security.staff.manage`
- `apps/ops/lib/ops-action-capability-contract.test.ts` — invite/deactivate map to that capability

### C1 Flags still false (invite blocked for owner)

With `OPS_STAFF_INVITES_ENABLED` not `"true"`:

| # | Actor | Action | Expected | Code |
|---|---|---|---|---|
| C1.1 | Owner | Open `/settings/staff` | Page loads (capability allows) | `StaffAccessPage` → `requireCapability("security.staff.manage")` L22 `apps/ops/app/(dashboard)/settings/staff/page.tsx` |
| C1.2 | Owner | UI copy | Invites described as release-gated disabled | CardDescription when `!areOpsStaffInvitesEnabled()` |
| C1.3 | Owner | Submit invite | Action fails: `"Staff invitations are not enabled for this release"` | `inviteStaffAction` L107–108 `apps/ops/lib/staff-operations.ts` |
| C1.4 | Owner | Deactivate (if a test staff exists) | Allowed by capability; ban + session revoke only | `deactivateStaffAction` L230+ (no invite flag) |

### C2 Enable invites only after B4–B5

Set `OPS_STAFF_INVITES_ENABLED=true` (literal `true` only).

| # | Step | Expected | Code |
|---|---|---|---|
| C2.1 | Owner invite | Still requires `security.staff.manage` | `inviteStaffAction` L102 |
| C2.2 | Owner invite | Still requires `isOpsTwoFactorRequired()` | L110–113 — if 2FA flag off, invite fails even with invites on |
| C2.3 | Owner invite success | Better Auth Admin `createUser` with `role: staff`; password setup link; no plaintext bootstrap password logged | L128–135, L187–192 |
| C2.4 | Audit | `staff_invitation_events` + `ops_audit_events` append-only rows | `appendStaffInvitationEvent`, `appendOpsAuditEvent` |
| C2.5 | Staff completes setup | Staff can sign in; role exact `staff` | `STAFF_ROLE` in `auth-policy.ts` |

### C3 Staff denial of staff-management (required)

| # | Actor | Action | Expected | Code |
|---|---|---|---|---|
| C3.1 | Staff | Open `/settings/staff` | Access denied / redirect (no `security.staff.manage`) | `requireCapability` L166–184 `session.ts` + matrix |
| C3.2 | Staff | Direct `inviteStaffAction` | `"Owner authorization is required"` | L102–104 |
| C3.3 | Staff | Direct `deactivateStaffAction` | `"Owner authorization is required"` | L235–237 |
| C3.4 | Staff | Sidebar | Staff access link hidden | `app-sidebar.tsx` `hasOpsCapability(role, "security.staff.manage")` |
| C3.5 | Staff | `listStaffAccounts` via any path | Denied at capability | L300 |

### C4 Broader staff denial matrix (server actions)

Each row: staff session must receive authorization failure; owner may succeed
where product allows. Prefer direct Server Action invocation where UI hides
controls.

| Capability / action | Staff expected | Primary anchor |
|---|---|---|
| `stock.view-cost` | Deny (UI + data) | `hasOpsCapability(..., "stock.view-cost")` in `stock.ts` |
| `stock.adjust` | Deny | `requireCapability("stock.adjust")` |
| `catalog.manage-commercials` | Deny | `listCommerceCatalog` / product commercial actions |
| `payments.record` | Deny | `lib/payments.ts` |
| `finance.view` | Deny | `lib/finance.ts` |
| `commerce.cod.reconcile` | Deny | `commerce.ts` COD reconcile |
| `commerce.refunds.manage` | Deny | matrix + commerce actions |
| `commerce.promotions.manage` | Deny | `listCommercePromotions` L329 |
| `commerce.release-gates.manage` | Deny | `getCommerceSettings` L334, `updateCommerceSettingsAction` L383 |
| `security.staff.manage` | Deny | Phase C3 |
| `invoices.void` | Deny | invoices actions |
| Shipment update without COD settle | **Allow** shipment path if `commerce.shipments.update`; **deny** COD reconcile | `PRODUCT.md` staff shipment vs COD |

Contract tests: `ops-action-capability-contract.test.ts`, `ops-access.test.ts`.

---

## Phase D — Dual checkout / release lock (ops DB ∧ storefront env)

Public commerce must stay closed unless **both** planes approve. Staff release
does **not** authorize opening storefront flags.

### D1 Ops plane (owner-only DB settings)

| # | Check | Expected | Code |
|---|---|---|---|
| D1.1 | Staff open `/commerce/settings` | Denied | `requireCapability("commerce.release-gates.manage")` on page |
| D1.2 | Staff `updateCommerceSettingsAction` | Denied | `commerce.ts` L383 |
| D1.3 | Staff overview | Metrics ok with `commerce.view`; checkout flag not loaded for staff | `getCommerceOverview` L44–61 — `canManageReleaseGates` false → empty settings query |
| D1.4 | Owner save `checkoutEnabled=true` without policy checkboxes | Zod reject | `settingsSchema.superRefine` L358–368 |
| D1.5 | Owner save with policies + `checkoutEnabled` | Row in `commerceSettings` id `primary` | `updateCommerceSettingsAction` insert/update |

### D2 Storefront plane (Hostinger env)

| Flag | Function / site | Closed when not exact `"true"` |
|---|---|---|
| `STOREFRONT_PUBLIC_RELEASE` | `isPublicCatalogEnabled()` `catalog-policy.ts` L10–13 | Catalog APIs return empty / unpublished |
| `STOREFRONT_PREVIEW_CATALOG` | `isPreviewCatalogEnabled()` L1–7 | Preview path (dev may enable preview) |
| `STOREFRONT_CHECKOUT_RELEASE_APPROVED` | `durable-cart.ts` L120–122 | ANDed with DB `checkoutEnabled` |
| `STOREFRONT_CUSTOMER_AUTH_ENABLED` | customer-auth boundary | `/api/customer-auth/*` → 404 when disabled |
| `STOREFRONT_INQUIRIES_ENABLED` | inquiries | Fail closed |

### D3 Dual lock proof (required while commerce closed)

| # | Setup | Expected public behavior |
|---|---|---|
| D3.1 | DB `checkoutEnabled=true`, env checkout flag **false** | Cart/checkout still locked; block reason present |
| D3.2 | DB `checkoutEnabled=false`, env checkout flag **true** | Still locked |
| D3.3 | Both false (production default) | Locked; zero-value cart contract preserved |
| D3.4 | `STOREFRONT_PUBLIC_RELEASE` false | Public catalog empty; unpublished products 404 |

```text
checkoutEnabled_effective =
  commerceSettings.checkoutEnabled === true
  && process.env.STOREFRONT_CHECKOUT_RELEASE_APPROVED === "true"
```

Source: `apps/storefront/lib/durable-cart.ts` L120–122.

Do **not** set production storefront release flags in this staff-ops release.

---

## Phase E — Final ops acceptance (staff release only)

| # | Check | Pass |
|---|---|---|
| E1 | Owner login + TOTP | Mandatory 2FA path works |
| E2 | One staff user invited and active | After C2 |
| E3 | All C3–C4 denials documented | Staff cannot escalate |
| E4 | Append-only invitation + audit rows inspected (owner-only) | No silent deletes |
| E5 | Both apps re-smoked after final flag changes | live/ready/version + storefront locks |
| E6 | `CURRENT_STATE.md` updated | Deploy SHA, flags, evidence timestamps; no secrets |
| E7 | Storefront commerce still closed | All `STOREFRONT_*` release flags false unless a separate commerce gate is authorized |

---

## Ordered enablement summary

```text
Hostinger repair
  → 0010 on Neon branch (TEST_DATABASE_URL / branch — never prod as test)
  → 0010 + grants on production (direct owner)
  → deploy ops (both OPS_* flags false)
  → health + owner login
  → SMTP + TOTP + recovery proof
  → OPS_TWO_FACTOR_REQUIRED=true
  → staff denial matrix (even before invites)
  → OPS_STAFF_INVITES_ENABLED=true
  → one staff invite + setup
  → staff denial of security.staff.manage + finance/COD/release-gates
  → STOP — do not open STOREFRONT_* commerce flags
```

---

## Graphify orientation (optional)

When `graphify-out/graph.json` is current:

```bash
graphify query "inviteStaff areOpsStaffInvitesEnabled security.staff.manage"
graphify query "commerce.release-gates checkoutEnabled STOREFRONT_CHECKOUT"
graphify explain "requireDisposableTestDatabaseUrl()"
graphify path "inviteStaffAction()" "requireCapability()"
graphify path "lib/commerce.ts" "catalog-policy.ts"
```

Graph proves import hubs (`db`, `requireCapability`); this checklist is the
runtime proof. Never treat graph traversal as production acceptance alone.

---

## Explicit non-goals of this checklist

- Opening public catalog, checkout, customer auth, or inquiries
- Cashfree live/sandbox merchant proof
- Plan-wide Hostinger process stop
- Using production Neon as `TEST_DATABASE_URL`
- Break-glass TOTP reset for ordinary password recovery
