# Production blocker tracker

Perfume Aura is already live as a brand and discovery website. This tracker
covers the remaining work required for a controlled commerce launch: approved
sellable products, customer accounts, inquiries, checkout, payments, and staff
access.

Fresh provider, repository, database, endpoint, and browser evidence outranks
this file. Record only evidence references and decisions here—never credentials,
connection strings, private provider payloads, legal advice, tax documents,
recovery codes, or customer data.

## How to close a blocker

A blocker may be marked complete only when:

1. every checklist item has current evidence;
2. the owning approval or provider proof is recorded in its authoritative
   document;
3. the affected fail-closed behavior is verified;
4. [`CURRENT_STATE.md`](CURRENT_STATE.md) records any resulting production,
   release-lock, risk, or next-action change; and
5. no release flag is opened merely because a prerequisite passed.

## Status

| ID | Blocker | Owner | Status | Depends on |
|---|---|---|---|---|
| B01 | India legal clearance | Owner and India counsel | In progress | — |
| B02 | Approved sellable catalog | Owner | Blocked | B01 |
| B03 | Tax, delivery, returns, and support operations | Owner, CA, counsel, and logistics providers | Blocked | B01 |
| B04 | Google, SMTP, and Cashfree provider acceptance | Owner and providers | Blocked | — |
| B05 | Owner and staff security acceptance | Owner | Blocked | B04 SMTP |
| B06 | Production observability and commerce maintenance | Owner and engineering | Blocked | B04 |
| B07 | Controlled commerce activation and live acceptance | Owner | Blocked | B01–B06 |

Work from B01 through B07. B01 and B04 may progress independently, but B07 is
always last.

## B01 — India legal clearance

**Goal:** approve the exact customer-visible naming, claims, policies, and
reference-fragrance treatment for every intended surface.

**Current blocker:** the India-counsel review packet is still pending. B01
preparation was refreshed on 29 August 2026 for the replacement catalog with an
exact [`114-name legal-surface inventory`](review-packets/2026-08-29-b01-114-name-legal-surface-inventory.md).
Inspired listing titles remain planning identity only; they are not trademark
clearance or permission to use references on labels or packaging.

Preparation completed:

- [x] Inventory the customer-visible, metadata, policy, packaging, invoice,
      email, inquiry, review, advertising, and social surfaces requiring review.
- [x] Freeze the replacement catalog artifacts by SHA-256 and record exact scope
      counts without modifying catalog approval state.
- [x] Confirm that 79 inspired product links are already visible on the live
      discovery shop and that no customer-facing disclaimer is implemented.
- [x] Define a surface-specific counsel response format and preserve the
      repository's fail-closed handoff.
- [x] Record the owner's 29 August 2026 replacement scope in the separate
      [`114-name review CSV`](review-packets/2026-08-29-b01-114-name-review.csv)
      and reconcile the former 49-name gap in the
      [`B03 research packet`](review-packets/2026-08-29-b03-49-name-reconciliation.md):
      79 Inspired, 15 temporary Unknown, and 20 Signature names are staged.

- [ ] Counsel reviews public product names and `Inspired by …` treatment.
- [ ] Counsel approves exact disclaimer wording and placement.
- [ ] Counsel reviews PDP copy, slugs, SEO metadata, search, ads, and social use.
- [ ] Counsel separately approves bottle-label and outer-packaging treatment.
- [ ] Counsel approves privacy, inquiry consent, returns, cancellation, refund,
      support, and records-retention wording.
- [ ] Dated evidence references and any conditions are recorded without copying
      privileged advice into the repository.

**Done when:** every intended surface has an explicit dated decision and the
fail-closed legal fields contain approved evidence references.

**Owner documents:**
[`India counsel review packet`](review-packets/2026-08-20-india-counsel-commerce-review.md),
[`114-name counsel review CSV`](review-packets/2026-08-29-b01-114-name-review.csv),
[`114-name legal-surface inventory`](review-packets/2026-08-29-b01-114-name-legal-surface-inventory.md),
[`COMMERCE.md`](COMMERCE.md), and [`REFERENCE.md`](REFERENCE.md).

## B02 — Approved sellable catalog

**Goal:** produce a fully approved, server-authoritative catalog that can be
imported without guessing product or financial facts.

**Current blocker:** production serves the 114-product discovery-only
projection, but no row is approved for sellable import or public commerce. The
[`B02 catalog intake workbook`](review-packets/2026-08-29-b02-114-product-catalog-intake.xlsx)
contains 114 products and all 322 owner-supplied retail prices. Its staged code
projection contains all 79 researched Inspired titles, 15 temporary Unknown
titles, and 20 Signature names. SKU, cost, stock, media, structured scent facts,
and legal approval remain incomplete.

- [x] Research the 49 previously incomplete main-list rows; map 34 to Inspired
      and place 15 ambiguous/generic names in temporary Unknown without
      changing their supplied prices.
- [x] Apply ₹600 / ₹800 / ₹1,400 to main rows 1–16 and
      ₹450 / ₹650 / ₹1,200 to main rows 17–94.
- [x] Apply every supplied Signature price, including ₹1,800 / ₹3,000 for Oud
      of Dubai and Visionnaire.
- [x] Keep preview-cart access behind the existing preview boundary and keep
      production checkout, payment, import, publication, and release flags closed.
- [ ] Supply and approve SKU, cost, opening stock, and reorder level per variant.
- [ ] Approve product copy, audience, notes, concentration, occasion, longevity,
      sillage, ingredients, and usage claims.
- [ ] Approve product media, rights/evidence reference, and accessible alt text.
- [ ] Populate the catalog templates and run the deterministic dry-run review.
- [ ] Import only reviewed rows after a separate owner-authorized apply; do not
      publish them as part of the import unless publication is separately
      authorized.

**Done when:** every launch row passes catalog validation with no
`needs_review`, missing evidence, or invented value, and the reviewed import
digest is accepted by the owner.

**Owner documents:** [`REFERENCE.md`](REFERENCE.md),
[`COMMERCE.md`](COMMERCE.md), and
[`COMMERCE_OPERATING_POLICIES.md`](COMMERCE_OPERATING_POLICIES.md). Complete
the [`B02 catalog intake workbook`](review-packets/2026-08-29-b02-114-product-catalog-intake.xlsx)
before moving reviewed values into the import templates.

## B03 — Tax, delivery, returns, and support operations

**Goal:** make every price, invoice, delivery promise, return rule, and support
claim operationally true and professionally approved.

**Current blocker:** the CA packet and operating-policy evidence fields remain
pending. The proposed ₹99/₹999 shipping values, serviceability model, delivery
estimate, return window, and support language are locked implementation inputs,
not approvals.

- [ ] CA approves entity/GSTIN, place of supply, GST rates, and HSN/SAC treatment.
- [ ] CA approves GST-inclusive pricing, paise rounding, invoice requirements,
      Cashfree fees/settlements, refunds, and credit-note treatment.
- [ ] Approve Delhivery and India Post commercial/serviceability evidence.
- [ ] Approve PIN-code rules and evidence-backed delivery estimates.
- [ ] Approve shipping fee, free-shipping threshold, returns, cancellations, and
      refund-support ownership.
- [ ] Approve the customer support mailbox, staffing, hours, and response claim.
- [ ] Approve wholesale minimums, territories, terms, and response ownership
      before enabling wholesale inquiries.

**Done when:** the CA/counsel decisions are dated, every operating-policy row has
an evidence reference, and the same approved values project consistently into
PDP, cart, checkout, email, policy, invoice, and support surfaces.

**Owner documents:**
[`CA/GST review packet`](review-packets/2026-08-20-ca-gst-commerce-review.md) and
[`COMMERCE_OPERATING_POLICIES.md`](COMMERCE_OPERATING_POLICIES.md).

## B04 — Google, SMTP, and Cashfree provider acceptance

**Goal:** prove each launch provider on its owning production or sandbox
environment before enabling the dependent customer journey.

**Current blocker:** production Google OAuth, Hostinger SMTP delivery, and the
Cashfree merchant/payment lifecycle have not completed their acceptance gates.

- [ ] Configure and verify the Google OAuth production client, domains, origins,
      redirect URIs, consent screen, rendered button, and One Tap fallback.
- [ ] Configure Hostinger SMTP sender values in the approved secret store.
- [ ] Prove one real SMTP delivery to the owner mailbox, then verify customer
      auth/recovery and transactional templates without exposing message data.
- [ ] Complete Cashfree merchant KYC and domain approval.
- [ ] Record account-specific fees and approved UPI intent/QR methods.
- [ ] Configure sandbox credentials, webhook endpoint/signature verification,
      and the required 20-minute payment TTL in approved secret stores.
- [ ] Prove sandbox success, pending, failure, cancellation, duplicate/reordered
      webhook, expiry, refund, and reconciliation behavior.
- [ ] Confirm production credentials and webhook settings exist only in the
      owning provider/runtime secret stores.

**Done when:** Google sign-in, SMTP delivery, and the complete Cashfree sandbox
lifecycle have current provider evidence and fail closed under missing,
ambiguous, duplicated, or invalid input.

**Owner documents:** [`CURRENT_STATE.md`](CURRENT_STATE.md),
[`OPERATIONS.md`](OPERATIONS.md), and [`COMMERCE.md`](COMMERCE.md).

## B05 — Owner and staff security acceptance

**Goal:** require strong owner authentication and prove that one real staff
account cannot perform owner-only actions.

**Current blocker:** mandatory operations 2FA and staff invitations remain
disabled pending SMTP, owner TOTP/recovery, and the staff authorization journey.

- [ ] Complete B04's SMTP delivery proof.
- [ ] Enrol the owner in TOTP.
- [ ] Complete one authorized recovery-code sign-in.
- [ ] Enable mandatory operations 2FA and verify pending-2FA sessions cannot
      access protected data or disable 2FA directly.
- [ ] Enable staff invitations only after owner 2FA acceptance.
- [ ] Complete one owner-created invitation, password setup, staff sign-in, and
      append-only invitation/audit-record check.
- [ ] Prove every owner-only server action denies the staff account, including
      staff management, costs, finance, refunds, promotions, publication,
      inventory restrictions, and payment-state changes.
- [ ] Run the final ops/storefront smoke while all commerce flags remain closed.

**Done when:** owner login requires TOTP, recovery is proven, one authorized
staff account is active, the direct-action denial matrix passes, and audit rows
are append-only.

**Owner document:**
[`Staff operations release procedure`](OPERATIONS.md#staff-operations-release-procedure).

## B06 — Production observability and commerce maintenance

**Goal:** make production failures visible and enable the bounded background
jobs required to reconcile payments, refunds, stock holds, and email delivery.

**Current blocker:** provider projects and code exist, but production telemetry
and the commerce-maintenance workflow have not completed production acceptance.

- [ ] Configure the approved PostHog and Sentry runtime/build values on each
      owning platform without exposing secrets or PII.
- [ ] Deploy observability-enabled artifacts through the protected release flow.
- [ ] Prove one controlled event per application reaches the correct Sentry
      project with release, readable stack, and application tag.
- [ ] Prove one privacy-safe page view per application reaches PostHog with no
      query string, email, name, IP retention, DOM autocapture, or recording.
- [ ] Verify production source maps and alert routing.
- [ ] Configure the same 32-character-or-longer maintenance secret in Hostinger
      and GitHub Actions without recording its value.
- [ ] After B04 provider acceptance, enable and verify the bounded payment,
      checkout-expiry, refund, order-email, and inquiry-email jobs.
- [ ] Prove degraded or ambiguous provider responses retain recoverable work and
      cannot release stock or mark payment/refund success incorrectly.

**Done when:** production telemetry is privacy-safe and actionable, all five
maintenance streams have accepted evidence, and the scheduled workflow no
longer skips for lack of authorization.

**Owner document:**
[`Observability configuration and activation`](OPERATIONS.md#observability-configuration-and-activation).

## B07 — Controlled commerce activation and live acceptance

**Goal:** open only the explicitly authorized capabilities in dependency order
and prove one complete production customer lifecycle.

**Current blocker:** every commerce release flag and both staff-security flags
are intentionally closed. Passing CI, migrations, health checks, or an earlier
blocker does not authorize activation.

- [ ] Confirm B01–B06 are complete with current evidence.
- [ ] Obtain a separate owner authorization for each activation step.
- [ ] Enable and verify customer authentication.
- [ ] Publish only the reviewed catalog and verify unpublished products remain
      `404`.
- [ ] Enable and verify contact and wholesale inquiries separately.
- [ ] Confirm the database checkout setting and storefront checkout approval
      gate are both explicitly enabled; either plane alone must remain locked.
- [ ] Run full desktop/mobile customer journeys for browsing, cart persistence,
      sign-in, address, checkout, order tracking, email, returns, and staff
      handling.
- [ ] With separate real-money approval, complete one low-value live UPI
      purchase and refund, then reconcile provider, order, invoice, inventory,
      payment, refund, and notification state.
- [ ] Run exact-source production verification, independent browser acceptance,
      privacy/telemetry checks, and final zero-drift reconciliation.
- [ ] Record the exact release, flags, evidence time, residual risks, and
      rollback decision in `CURRENT_STATE.md`.

**Done when:** the authorized commerce surfaces are live, the complete payment
and refund lifecycle reconciles without drift, fail-closed controls remain
effective, and the owner accepts the recorded residual risks.

**Owner documents:** [`COMMERCE.md`](COMMERCE.md),
[`OPERATIONS.md`](OPERATIONS.md), and [`CURRENT_STATE.md`](CURRENT_STATE.md).

## Deferred SEO and discoverability owner actions

These four actions are intentionally deferred for the owner to complete later.
They do not indicate a crawlability failure in the deployed discovery site and
do not authorize any commerce, catalog-publication, customer-auth, checkout,
inquiry, or staff-security flag change.

| ID | Deferred owner action | Status | Depends on |
|---|---|---|---|
| SEO01 | Confirm the complete Kondapur public business record | Deferred | Owner-supplied facts |
| SEO02 | Recover the existing Google Business Profile | Deferred | SEO01 |
| SEO03 | Complete Google Search Console and Bing submissions | Deferred | Account access |
| SEO04 | Approve catalog indexing and Merchant Center readiness | Deferred | B01–B04 and the applicable B07 release gates |

### SEO01 — Confirm the public Kondapur business record

- [ ] Confirm the exact public address, telephone, regular and special hours,
      latitude/longitude, primary category, accessibility and parking facts,
      original store photography, and official profile URLs.
- [ ] Confirm that each fact is suitable for public display and is consistent
      across the website and controlled profiles.

**Done when:** the complete owner-approved NAP, geo, hours, category, imagery,
and profile record can be used without guessing. Engineering may then publish
the gated location page and matching Store structured data.

### SEO02 — Recover the existing Google Business Profile

- [ ] Sign in to the Google account that should manage Perfume Aura and request
      access to the existing profile; do not create a duplicate listing.
- [ ] After access and SEO01 approval, align the public name `Perfume Aura`,
      website `https://perfumeaura.com/`, NAP, category, hours, and photographs.

**Done when:** the existing public profile is owner-controlled and its visible
facts match the approved website business record.

### SEO03 — Complete Google Search Console and Bing submissions

- [ ] In the verified Google Search Console property, resubmit
      `https://perfumeaura.com/sitemap.xml` and inspect the seven discovery URLs.
- [ ] Verify or import `perfumeaura.com` in Bing Webmaster Tools, submit the same
      sitemap, run Site Scan, and inspect representative discovery URLs.
- [ ] Record indexing and ranking as external pending outcomes; do not repeatedly
      resubmit unchanged URLs.

**Done when:** both webmaster platforms accept the current sitemap and the
account-side inspection evidence is recorded without claiming that submission
guarantees indexing or ranking.

### SEO04 — Approve catalog indexing and Merchant Center readiness

- [ ] Complete the applicable legal, catalog, price, media, policy, checkout,
      shipping, returns, tax, support, and payment gates in B01–B04.
- [ ] Separately authorize the reviewed public-catalog subset and
      `STOREFRONT_PUBLIC_RELEASE=true`; keep all unrelated release flags closed.
- [ ] Claim `perfumeaura.com` in the correct Merchant Center account only after
      approved products are genuinely purchasable and feed, HTML, structured
      data, cart, and checkout agree.

**Done when:** the exact approved catalog manifest is live and indexable, the
commerce journey is truthful and accepted, and Merchant Center diagnostics have
no domain, price, currency, availability, shipping, or returns mismatch.

## Items that do not currently block commerce launch

- Google Search Console recrawl and coverage changes after the accepted sitemap.
- Lighthouse performance variance that does not break release locks or journeys.
- Historical completed migrations, CI, packaging, and flags-off deployments.

These remain worth monitoring, but they do not replace or weaken B01–B07.
