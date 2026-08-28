# Commerce

Executable storefront and catalog contract. Live production state belongs in
[`CURRENT_STATE.md`](CURRENT_STATE.md). Catalog identity, legal research, and
design/evidence records belong in [`REFERENCE.md`](REFERENCE.md).

- [Contract](#contract)
- [Architecture](#architecture)
- [Requirements](#requirements): catalog, journeys, payments, trust, and quality
- [Decisions](#decisions): accepted, superseded, and unresolved ADRs
- [Verification](#verification): evidence schema and executable checks
- [Release checklist](#release-checklist): approval, journey, deployment, and live-smoke gates

<!-- commerce:contract:start -->
## Contract

The storefront and commerce schema are implemented and deployed fail-closed.
No catalog row, checkout, payment, customer account, inquiry, review, or
indexing path is public until its release evidence passes.

These sections plus [`REFERENCE.md`](REFERENCE.md) are executable specification inputs to `pnpm commerce:verify`:

| Section | Owns |
|---|---|
| [Requirements](#requirements) | Stable requirement IDs and acceptance criteria |
| [Decisions](#decisions) | Accepted and superseded owner decisions |
| [Architecture](#architecture) | Current storefront/data boundary |
| [Release checklist](#release-checklist) | Commerce production gate |
| [Verification](#verification) | Requirement-to-evidence protocol |
| [Mapping register](REFERENCE.md#inspired-mapping-register) | Reviewed inspired-reference register |
| [Research](REFERENCE.md#research) | Source and legal research record |
| [Storefront design](REFERENCE.md#storefront-design) | Repeatable Bucks Sauce visual and interaction reference |

Structured catalog inputs live in `data/catalog/`. Selection never means
publication approval.

Evidence precedence is runtime/provider proof, structured data, accepted
decisions, requirements, architecture/research, then conversation memory.
Generated Graphify output is not source material and is not tracked.

General product state belongs in [`PRODUCT.md`](PRODUCT.md); deployment
state belongs in [`CURRENT_STATE.md`](CURRENT_STATE.md).
<!-- commerce:contract:end -->

<!-- commerce:architecture:start -->
## Architecture

```text
perfumeaura.com                 app.perfumeaura.com
Next.js storefront              Next.js owner/staff operations
        │                                  │
        ├── controlled catalog projection ─┤
        ├── HttpOnly cart token             ├── private owner/staff actions
        ├── separate customer-auth boundary ├── independent Better Auth boundary
        └────────────── Neon PostgreSQL ────┘
```

This document owns commerce data, authentication, and release boundaries only.
Live topology belongs in [`CURRENT_STATE.md`](CURRENT_STATE.md); provider,
deployment, migration, and recovery procedures belong in
[`OPERATIONS.md`](OPERATIONS.md).

### Data boundaries

- Public projection exposes only approved product identity, approved media,
  approved retail price, and calculated availability.
- Costs, raw stock, internal notes, archived records, audit records, finance,
  and operations auth records never cross the storefront projection.
- Storefront carts, checkout sessions, reservations, orders, payment events,
  shipments, reviews, returns, and inquiries are server-authoritative.
- Customer auth and owner/staff auth have separate tables, secrets, cookies,
  origins, and recovery paths.

### Release behavior

All public commerce flags are closed. Disabled customer-auth routes return 404
without initializing Better Auth or Neon. Catalog publication, checkout,
payments, accounts, inquiries, reviews, and indexing open only through their
separate owner-approved gates.
<!-- commerce:architecture:end -->

<!-- commerce:requirements:start -->
## Requirements

Status legend:

- **Accepted** — owner explicitly approved requirement or process
- **Proposed** — recommended design awaiting implementation approval
- **Blocked** — cannot proceed until listed decision or dependency resolves
- **Verified** — implemented and supported by evidence recorded through the
  [Verification](#verification) protocol and linked from the owning release
  record or [`CURRENT_STATE.md`](CURRENT_STATE.md)

No requirement marked Proposed represents live behavior.

### Catalog

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| CAT-001 | Accepted | Preserve supplied source list exactly during normalization. | Retained PDF checksum matches reviewed source; structured catalog contains sequential main-list rows 1–82 and Signature Series rows 1–21; source names remain unchanged unless a fresh manual PDF comparison authorizes verifier updates. |
| CAT-002 | Blocked | Approve public product identity before publication. | Staged fields record public title, unique slug, identity approval, source-name review, reference mapping status, public-reference status, and legal-review state without treating partial approval as publishable. Signature products use their exact owner-approved in-house names. Inspired products may use `Inspired by <owner-confirmed reference>` only after exact mapping resolution and later official/legal review of wording, disclaimer, and each surface. Designer logos, copied assets, and misleading affiliation remain forbidden. |
| CAT-003 | Blocked | Approve sale data before publication. | Every selected collection-specific product × size row has SKU, integer-paise INR retail price and cost, numeric opening stock, reorder level, and approved launch status; its parent product has approved media. Standard retail prices are fixed by COM-ADR-024; Signature prices remain per-product inputs. Parallel size/price list encoding is forbidden. |
| CAT-004 | Accepted | Model each fragrance as one product and each purchasable size as a variant. | All 103 selected products have explicit collection-specific intake rows: standard products use 30/50/100 ml and Signature products use 50/105 ml. No 10 ml variant is public commerce. Only fully approved variants may become purchasable. |
| CAT-005 | Proposed | Support controlled merchandising. | Signature, inspired/reference if legally approved, audience, family, occasion, featured, new, and best-seller properties come from structured data. |
| CAT-006 | Proposed | Never publish empty promotional collections. | Collection route is hidden or unavailable when it has no launch-approved product. |
| CAT-007 | Blocked | Define discovery sets only after a new sample format is approved. | The public catalog contains no 10 ml sale row. A future discovery set requires an explicitly approved sample size, packaging, component variants, SKU, INR price/cost, stock allocation, availability, images, and fulfillment rules. No empty discovery-set route may ship. |
| CAT-008 | Blocked | Define bundles before publication. | Each bundle has exact component variants and quantities, SKU, INR price/cost, stock-allocation behavior, substitution policy, images, and return treatment. |

#### Catalog naming state rules

- Signature rows use `name_approval_status=owner_approved` only after an explicit owner decision. Inspired rows with an `owner_approved_title_reference` mapping use `listing_title_recorded` and a generated `Inspired by <brand> <reference>` storefront listing title (COM-ADR-029). Inspired rows without that mapping keep `reference_title_pending_mapping` and a blank public title. Discarded separate-name proposals are not persisted. A listing title is not legal clearance or publication approval.
- `source_name_review_status` is `not_flagged`, `ambiguity_unresolved`, or `owner_confirmed_as_public_name`. Source transcription never changes in the launch workbook.
- `reference_mapping_status` may remain `needs_owner_input` or `unresolved`; a broad owner-approved family uses `family_approved_exact_pending`; an owner-approved exact title reference uses `owner_approved_title_reference`; confirmed in-house Signature entries use `not_applicable`. Exact mapping approval needs an explicit owner decision.
- Inspired rows use `reference_display_status=planned_public_pending_review` and `legal_review_status=india_counsel_pending`. These values record commercial intent, not permission or publication readiness. Exact disclaimer text, placement, and allowed surfaces require later review before any public status can be enabled. Signature public names stay `trademark_clearance_pending` until collision review completes.
- Partial identity or mapping approval never changes overall `approval_status=needs_owner_input`; product and variant publication remains fail-closed until every CAT-002 and CAT-003 gate passes.

### Experience and discovery

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| UX-001 | Accepted | Preserve current black, graphite, brass, ivory, and cinematic Perfume Aura identity. | Storefront reuses approved tokens and bottle direction without foreign branding or assets. |
| UX-002 | Proposed | Separate cinematic storytelling from conversion-critical surfaces. | Home can use restrained motion; catalog, PDP, cart, and checkout stay legible, fast, and task-focused. |
| UX-003 | Proposed | Provide catalog navigation suitable for approved launch volume. | Shop and collection routes expose only approved product groups; mobile navigation remains keyboard and screen-reader usable. |
| FIND-001 | Blocked | Add predictive search only after searchable product data is approved. | Search returns relevant approved products, prices, images, availability, and a full-results path. |
| FIND-002 | Blocked | Add rule-based scent finder only after scent metadata is complete. | The implemented finder reads published structured profiles only, explains which answer axes and product properties matched, and returns no recommendation below two matching axes. Completion remains blocked until approved scent metadata and live browser evidence exist. |
| FIND-003 | Proposed | Filter broad catalogs by useful fragrance attributes. | Available filters include real family, notes, occasion, intensity, size, price, audience, and availability values. |

### Product detail

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| PDP-001 | Proposed | Make size selection explicit. | Size choices are visible buttons with selected, unavailable, keyboard-focus, and error states. |
| PDP-002 | Blocked | Show real purchase facts near primary action. | Selected price, price per ml, availability, quantity, delivery summary, payment methods, and return summary use approved data. |
| PDP-003 | Blocked | Explain fragrance without copied claims. | Approved family, top/heart/base notes, concentration, intensity, longevity guidance, occasion, usage, and ingredients appear where available. |
| PDP-004 | Proposed | Keep purchase action available on small screens. | Sticky mobile action reflects current product, size, price, stock state, and cart status without covering content. |
| PDP-005 | Blocked | Show only verified reviews. | The implemented submission path permits one pending review for a customer-owned delivered, fully fulfilled order item; staff moderation is audited and only approved reviews enter PDP queries. Completion remains blocked until approved catalog publication and the live customer/staff journey are verified. |

### Cart, checkout, orders, and inventory

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| CART-001 | Proposed | Persist server-authoritative guest carts. | Quantity and current price/availability are revalidated before checkout; client values are never trusted as financial truth. |
| CART-002 | Proposed | Make empty-cart recovery useful. | Empty cart links to approved products or collections without fabricated recommendations. |
| CHECK-001 | Accepted | Require a verified customer account when checkout opens. | Visitors may browse and build a cart anonymously, but `/checkout` redirects signed-out visitors to customer sign-in and every new order is linked from the server-verified session. |
| CHECK-002 | Blocked | Use one authoritative India shipping and return policy. | The implemented public projection remains absent unless both release planes, checkout, every policy approval, ₹99/₹999 values, and the support mailbox match the locked decision. Return creation requires a fully fulfilled delivered order inside seven calendar days. Completion remains blocked until India-wide serviceability, courier, policy, tax, support, and every customer surface are approved and verified. |
| INV-001 | Proposed | Reserve stock atomically. | Reservation cannot exceed available quantity and is created in a transaction with deterministic lock order. |
| INV-002 | Proposed | Release abandoned reservations. | Expired, cancelled, and failed checkout reservations release exactly once and produce auditable stock events. |
| ORD-001 | Proposed | Keep customer order lifecycle separate from invoices. | Order records immutable purchase facts; controlled workflow creates or links financial invoice records. |
| ORD-002 | Proposed | Preserve order-item snapshots. | Product name, SKU, size, unit price, discount, tax, and quantity remain historically accurate after catalog edits. |

### Payments, auth, and trust

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| PAY-001 | Blocked | Prove approved India payment methods before production enablement. | Cashfree prepaid UPI is selected, including provider-supported intent/QR flows such as Google Pay where eligible; COD is excluded. Production remains blocked until merchant eligibility, account-specific fees, approved UPI methods, refund operations, signed webhook behavior, sandbox evidence, live credentials, and Hostinger runtime compatibility pass. |
| PAY-002 | Proposed | Process payment callbacks idempotently. | Authentic duplicate or reordered callbacks cannot create duplicate payment, order, invoice, or stock effects. |
| PAY-003 | Proposed | Never trust browser payment success alone. | Server verifies provider state before marking order paid. |
| AUTH-001 | Accepted | Keep owner authentication separate from public customer identity. | Customer routes cannot use or weaken owner-only Better Auth configuration. |
| AUTH-002 | Blocked | Support launch-scope customer accounts without weakening anonymous browsing and cart creation. | Implemented customer mutations require the exact storefront origin and verified session where applicable; disabled routes return `404` before auth/database initialization. Completion remains blocked until Google primary sign-in, verified email/password recovery, privacy, deletion, authorization, and checkout journeys are provider-approved and verified. |
| TRUST-001 | Blocked | Obtain Indian legal approval for trademark/reference naming before publication. | Exact public reference wording and disclaimer receive counsel approval for every intended surface; designer and inspired-reference names remain disabled on bottle labels and packaging until separate owner approval and India-counsel approval for that surface (COM-ADR-022); no product implies designer affiliation; no designer logo, copied image, copied description, or misleading packaging claim is used. A disclaimer is disclosure only and is not a statutory safe harbor. |
| TRUST-002 | Accepted | Do not fabricate commerce facts. | No unverified pricing, availability, review, delivery, return, payment, or checkout claim is public. |

### Quality, deployment, and verification

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| A11Y-001 | Proposed | Meet WCAG 2.2 AA for core purchase journeys. | Keyboard, focus, names, errors, contrast, reduced motion, and screen-reader checks pass for home through confirmation. |
| PERF-001 | Proposed | Protect mobile performance. | Performance budgets are recorded before launch; third-party scripts require owner, purpose, and measured cost. |
| SEO-001 | Proposed | Publish accurate machine-readable catalog data. | Canonical, sitemap, Product structured data, availability, price, and images match public server truth. |
| OPS-001 | Verified | Deploy the storefront through a separately verified artifact. | The apex runs the checksum-verified Hostinger ZIP; `www` redirects and the former staging host remains deleted. Exact artifact and automation evidence is linked from the [current release record](CURRENT_STATE.md#exact-releases-and-automation). |
| OPS-002 | Accepted | Verify every deployment beyond `/login` or homepage. | Readiness, version, session, static asset, storefront locks, cart, canonical redirect, and authenticated owner operations are checked as applicable. |
| VER-001 | Accepted | Maintain requirement-to-evidence traceability. | Every completed requirement links implementation, automated check, manual check where needed, commit/artifact, date, and result. |
| VER-002 | Accepted | Use Markdown, structured data, and executable checks together. | `pnpm commerce:verify` passes and code review protects deliberate changes to locked evidence. |
<!-- commerce:requirements:end -->

<!-- commerce:decisions:start -->
## Decisions

Only **Accepted** decisions authorize implementation assumptions. Proposed and Pending entries remain unresolved.

### Current decisions

| ID | Date | Status | Decision | Reason / consequence |
|---|---|---|---|---|
| COM-ADR-001 | 2026-07-29 | Accepted | Use Markdown, structured catalog data, and executable checks as the commerce verification system. | Requirements, source records, and rerunnable checks cover different evidence classes. Generated relationship maps are optional local analysis and are not tracked source. |
| COM-ADR-002 | 2026-07-29 | Accepted | Preserve source PDF names exactly during transcription and flag ambiguity rather than silently correcting it. | Source fidelity enables later review and audit. |
| COM-ADR-003 | 2026-07-29 | Accepted | Keep current public marketing honest until real commerce is operationally proven. | Prevents fabricated price, stock, review, shipping, payment, or checkout claims. |
| COM-ADR-004 | 2026-07-29 | Superseded | Build public commerce as a separate `apps/storefront` Next.js application sharing controlled packages and data. | COM-ADR-023 accepted the separate storefront application and replaced this proposal with the deployed monorepo boundary. |
| COM-ADR-005 | 2026-07-29 | Superseded | Stage storefront on a separate Hostinger Node domain before apex cutover. | COM-ADR-027 superseded the temporary staging-domain plan: the apex is the storefront and the former staging host must remain absent. |
| COM-ADR-006 | 2026-07-29 | Superseded | Launch guest checkout before customer accounts. | COM-ADR-030 requires a verified customer account at checkout while preserving anonymous browsing and cart creation. |
| COM-ADR-007 | 2026-07-30 | Superseded | Model each approved fragrance as one product and each purchasable 10/30/50/100 ml size as a separate variant row. | COM-ADR-024 replaces the universal size rule; the one-row-per-variant invariant remains authoritative. |
| COM-ADR-008 | 2026-07-30 | Superseded | Use a unique Perfume Aura public name as each inspired product's primary identity and keep designer/reference names off bottle labels. Public “Inspired by …” references remain disabled until every reference is corrected and Indian trademark counsel approves exact presentation and disclaimer language. | Owner selected Perfume Aura-led naming and confirmed the first 82 rows are inspired fragrances. COM-ADR-017 later replaced the unique-name strategy; its source-fidelity and no-silent-approval safeguards remain historical context. |
| COM-ADR-009 | 2026-07-30 | Superseded | Plan all 103 source fragrances for launch with purchasable 10, 30, 50, and 100 ml variants. | COM-ADR-024 retains all 103 fragrances but replaces the universal size set and removes 10 ml from public commerce. |
| COM-ADR-010 | 2026-07-30 | Accepted | Plan India-wide delivery in INR and record every selected product as supply-capable while numeric opening stock remains pending. | Owner confirmed market, currency, delivery reach, and current availability intent. Accepted facts authorize planning only; prices, costs, SKUs, barcodes, stock counts, reorder levels, product content, courier, fees, delivery estimates, returns, cancellations, tax, and support remain unresolved and block publication. |
| COM-ADR-011 | 2026-07-30 | Superseded | Select India payment methods and provider architecture; UPI is a researched candidate, not yet an approved requirement. | COM-ADR-025 first selected Cashfree plus COD; COM-ADR-030 now selects Cashfree prepaid UPI only, while merchant onboarding, account-specific fees, and live approval remain release gates. |
| COM-ADR-012 | 2026-07-30 | Accepted | Include purchasable testers/discovery sets, bundles, customer accounts, and verified reviews in launch scope rather than deferring them. | Owner explicitly selected all optional capabilities for immediate launch. Each remains blocked on its own product, inventory, privacy/auth, moderation, policy, and verification requirements; this acceptance does not represent implementation or release readiness. |
| COM-ADR-013 | 2026-07-30 | Accepted | Use all 21 supplied Signature Series source names as their owner-approved Perfume Aura public names. | Owner approved the complete Signature Series list without replacements. Approval records naming intent only; trademark collision clearance, content, images, sale data, and publication approval remain pending. |
| COM-ADR-014 | 2026-07-30 | Superseded | Treat each selected fragrance's purchasable 10 ml variant as a tester and its 30/50/100 ml variants as bottles. | COM-ADR-024 removes 10 ml from public commerce and introduces collection-specific bottle sizes. |
| COM-ADR-015 | 2026-07-30 | Superseded | Use AI-generated batches as proposals for the 82 inspired public names, with explicit owner approval required for every name before recording it as approved. | Owner selected the batch-proposal workflow. COM-ADR-017 later removed the need for separate inspired-product names; proposals made before that change were not applied. |
| COM-ADR-016 | 2026-07-30 | Accepted | Keep `Green Creed` unresolved; record `Cycus Flora` as the Gucci Flora family, `YSL-Y` as the Yves Saint Laurent Y family, and `CH 212 Men` as the Carolina Herrera 212 Men family for internal review. | Owner approved three family-level mappings and explicitly declined a guess for Green Creed. Exact Cycus product, Y concentration/flanker, and 212 label/flanker remain pending; mapping approval remains separate from public-use clearance. |
| COM-ADR-017 | 2026-07-30 | Accepted | Use exact in-house Signature Series names without an “Inspired by” prefix, and plan future inspired-product titles as “Inspired by <owner-confirmed reference>” instead of separate Perfume Aura names. | Owner replaced the public-name strategy in COM-ADR-008 and the proposal workflow in COM-ADR-015 after reviewing ScentGPT's live pattern. Signature names remain standalone in backend/frontend. Inspired titles stay unpopulated until exact mappings are resolved; a planned disclaimer is disclosure, not recorded legal clearance, and no storefront or publication is authorized in this phase. |
| COM-ADR-018 | 2026-07-30 | Accepted | Record `VIP 212 Men` as Carolina Herrera — `212 VIP Men`, `1 Million` as Rabanne — `1 Million`, and `Baccarat` as Maison Francis Kurkdjian — `Baccarat Rouge 540` family; keep `F Fabulous` unresolved. | Owner approved three internal reference strings for future inspired-title planning and explicitly retained the abbreviated F Fabulous source without an inferred mapping. Baccarat concentration remains pending; no public title, slug, or legal clearance follows from this mapping decision. |
| COM-ADR-019 | 2026-07-30 | Accepted | Confirm `Oud of Duraj`, `Royal Stablor`, and `Mbgamare` as exact in-house Signature Series names with no external inspiration or reference mapping. | Owner explicitly clarified that every Signature Series entry is an in-house name used unchanged in backend/frontend. The three previously flagged spellings remain preserved as supplied, their reference mapping is not applicable, and trademark-clearance state remains separate from inspiration classification. |
| COM-ADR-020 | 2026-07-30 | Accepted | Keep `Gucci Guilty EX` and `Pawake` as unresolved inspired references; do not reclassify Pawake as in-house and do not choose a Gucci Guilty flanker without evidence. | Owner confirmed both rows stay in the inspired collection but declined unsupported mapping guesses. Their source text remains unchanged, future inspired titles remain blank, and supplier/owner evidence is required before exact mapping approval. |
| COM-ADR-021 | 2026-07-30 | Accepted | Approve the 46 clear brand/reference strings listed in [`REFERENCE.md`](REFERENCE.md) as `owner_approved_title_reference` mappings for inspired-title planning. | Four read-only research passes checked rows 1–82 against official or strongest available sources, then excluded generic, conflicting, gender/flanker-choice, conditional, and unresolved rows from bulk approval. This decision raises the approved-title-reference total to 48; source transcription, public titles/slugs, legal review, and publication status remain unchanged. |
| COM-ADR-022 | 2026-07-30 | Accepted | Keep designer and inspired-reference names disabled on bottle labels and packaging until separate explicit owner approval and India-counsel approval for that surface. | Owner-selected fail-closed product policy after REQUIREMENTS and RESEARCH conflicted on bottle-label readiness. This is packaging/surface control only. It is not trademark clearance, disclaimer approval, title clearance, or permission to use references on any other surface. |
| COM-ADR-023 | 2026-08-02 | Accepted | Build the public storefront as a separate Next.js application in the existing Hostinger/Neon monorepo, stage it at `shop.perfumeaura.com`, and retain `app.perfumeaura.com` as the owner-only operations surface. | This keeps the current marketing site available during development, preserves one inventory source of truth, and avoids Shopify or Vercel production dependencies. |
| COM-ADR-024 | 2026-08-02 | Accepted | Keep all 103 fragrances in intended launch scope; sell inspired/standard fragrances only in 30 ml at ₹600, 50 ml at ₹800, and 100 ml at ₹1,400; sell Signature fragrances only in 50 ml and 105 ml with owner-approved per-product prices in the ranges ₹1,200–₹1,800 and ₹2,200–₹3,000; do not sell 10 ml or publish discovery sets without a newly approved sample format. | The owner replaced the earlier universal size model. Standard prices are fixed; Signature prices, SKU, cost, stock, media, and legal approvals remain fail-closed inputs. |
| COM-ADR-025 | 2026-08-02 | Superseded | Launch India/INR commerce with guest checkout, optional separate customer accounts using verified email/password plus Google and Apple, Cashfree prepaid payments, COD, configurable flat shipping, and manual courier fulfillment. | COM-ADR-030 replaces guest checkout, Apple launch sign-in, and COD with required customer authentication and Cashfree UPI-only checkout while preserving separate customer identity, configurable shipping, and manual courier fulfillment. |
| COM-ADR-026 | 2026-08-02 | Accepted | Recreate the Bucks Sauce storefront structure and interaction rhythm with Perfume Aura branding, real Perfume Aura bottle photography, and original fragrance copy while correcting the audited accessibility and mobile-purchase defects. The current reference system is recorded in [`REFERENCE.md`](REFERENCE.md#storefront-design). | The owner confirmed permission/terms responsibility. Foreign branding, copy, media, unlicensed fonts, hidden focusable clones, inaccessible controls, and long blocking intros remain forbidden. |
| COM-ADR-027 | 2026-08-02 | Accepted | Supersede the temporary staging-domain portion of COM-ADR-023: deploy the verified animated storefront at `perfumeaura.com`, permanently redirect `www` to the apex, retain `app.perfumeaura.com` for internal operations, and delete `shop.perfumeaura.com` after apex acceptance. | The static apex backup and Git history provide rollback material without retaining duplicate public sites. Neon remains shared and is never part of the website deletion scope. |
| COM-ADR-028 | 2026-08-13 | Accepted | Adapt the reference site's expanded-to-compact header motion using the supplied `perfume-aura-icon.svg` and `perfume-aura-wordmark.svg` assets: the bottle icon lifts and fades on scroll while the wordmark remains as the compact identity. | The owner selected the inverse of the source site's retained-icon treatment. Use the existing GSAP/ScrollTrigger boundary, preserve native scrolling and reduced motion, and do not copy foreign marks or animation code. |
| COM-ADR-029 | 2026-08-16 | Accepted | Use `Inspired by <brand> <reference>` as the storefront listing title for every `owner_approved_title_reference` inspired row; omit the word `family` from the customer title; if the cleaned reference already begins with the brand, do not repeat the brand; keep the 34 incomplete inspired rows unlistable; keep Signature names unchanged. This records listing identity only and is not India-counsel clearance, disclaimer approval, publication approval, or permission to use references on bottle labels or packaging. | Owner selected this title pattern for the live shop listing after rejecting `Perfume Aura` plus source-name titles. Mapping identities are unchanged. Legal review, sale data, media, and checkout remain fail-closed. |
| COM-ADR-030 | 2026-08-20 | Accepted | Launch India/INR commerce with anonymous browsing and cart creation, required verified customer authentication at checkout, Google as the primary sign-in path with verified email/password fallback, Cashfree prepaid UPI intent/QR (including Google Pay where Cashfree and the customer's device support it), no COD, configurable flat shipping, and manual courier fulfillment. | The owner selected an account-linked prepaid-only journey. Cashfree remains the sole approved payment provider; Google Pay is a UPI app within the Cashfree flow, not a direct integration. OAuth, SMTP, shipping values, policies, merchant approval, approved UPI methods, refunds, provider credentials, sandbox proof, and live activation remain independent release gates. |
| COM-ADR-031 | 2026-08-27 | Accepted | Stage the 48 Inspired products as the first fixed-price cart-preview batch at 30 ml ₹600, 50 ml ₹800, and 100 ml ₹1,400. Keep all 21 Signature products visible but price-pending and non-purchasable until one exact owner-approved price is supplied for each 50 ml and 105 ml variant. | The split lets the owner test every approved standard price, size selector, cart quantity, and subtotal without inventing Signature prices. Preview cart access remains limited to development or the existing explicit preview flag; checkout, Cashfree payment, production catalog import, publication, legal approval, SKU/cost/stock/media approval, and every release flag remain separate fail-closed gates. |

Field-level supersession rules: COM-ADR-027 replaces only COM-ADR-023's
temporary `shop.perfumeaura.com` staging-domain field. COM-ADR-023's separate
storefront application, shared Neon source of truth, and private ops boundary
remain accepted. COM-ADR-030 fully replaces COM-ADR-025. Anonymous browsing and
cart creation, separate customer identity, configurable shipping, and manual
courier remain; guest checkout, COD, and Apple launch sign-in are no longer
selected launch requirements.

### Outstanding owner/legal inputs

Accepted scope does not make catalog rows sale-ready. These facts remain required:

- **COM-ADR-013 / 017 / 029:** all 21 in-house Signature Series names are owner-approved as exact standalone backend/frontend names. The 48 `owner_approved_title_reference` rows now have storefront listing titles in the `Inspired by <brand> <reference>` form. That is listing identity only. India-counsel wording, disclaimer, slug/SEO/ads review, and publication approval remain open. The 34 incomplete inspired rows stay unlistable.
- **COM-ADR-016 / 018–021 mappings:** 48 inspired rows have owner-approved title-reference strings; 4 have owner-approved family mappings with exact product/concentration details pending; `Green Creed`, `F Fabulous`, `Gucci Guilty EX`, and `Pawake` remain explicitly unresolved; 26 still need owner input. Exact rows, evidence metadata, and states are recorded in [`REFERENCE.md`](REFERENCE.md#inspired-mapping-register). `main_list:22` retains the approved `212 VIP Men` identity with an explicit evidence gap; `main_list:20` retains Ulta only as labeled strongest-available retailer evidence. All 21 Signature names are confirmed in-house with mapping not applicable. Source transcription stays unchanged; no internet guess may silently replace it.
- **COM-ADR-022 bottle/packaging surface:** designer and inspired-reference names stay disabled on bottle labels and packaging until separate owner approval and India-counsel approval for that surface. This product policy is not legal clearance.
- **COM-ADR-024 variant prices:** standard retail prices are approved, but Signature products still need one explicit price per approved size. No 10 ml row is sellable or publishable.
- **COM-ADR-030 provider and policy inputs:** Cashfree merchant approval, Google credentials, SMTP, and dated professional/owner evidence remain required. The operating values are locked at ₹99 shipping below ₹999, free shipping from ₹999, approved Delhivery/India Post PIN codes, 3–7 business days, seven-day unopened returns, damaged/wrong-item support, cancellation only before dispatch, and `support@perfumeaura.com`; locking these values is not professional approval.
- **COM-ADR-010 product/variant data:** INR retail price and cost, SKU, optional barcode, opening stock count, reorder level, audience, family, notes, occasion, season, intensity, concentration, longevity guidance, sillage, ingredients, usage, and approved images.
- **COM-ADR-010 policy data:** courier, PIN-code/serviceability rules, delivery fee, free-shipping threshold, delivery estimate, returns, cancellations, tax treatment, and support channel.
- **COM-ADR-030 provider gate:** Cashfree prepaid UPI is selected and COD is excluded. Cashfree merchant KYC, sandbox access, account-specific fees, approved UPI intent/QR methods, webhook credentials, refund operations, and production activation still require owner/provider evidence. Google Pay is presented only when supported inside the Cashfree UPI flow. Razorpay, direct Google Pay integration, manual bank transfer, and COD are not approved substitutes.
- **COM-ADR-012 operating data:** tester/discovery-set composition and packaging, bundle composition/pricing/stock allocation, customer-account privacy/auth rules, and completed-order review eligibility/moderation.

### Decision template

Append decisions; do not rewrite history silently.

```markdown
| COM-ADR-NNN | YYYY-MM-DD | Accepted/Proposed/Pending/Superseded | Decision | Reason and consequences |
```

When superseding a decision, add a new row and identify the replaced ID. Update affected requirements, architecture, catalog, tests, and verification evidence in the same change.

#### Approved mapping identity digest protocol

`pnpm commerce:verify` freezes approved inspired mapping identities as canonical tuples:

`(key, source_name, brand, reference, status, decision)`

for every `owner_approved_title_reference` and `family_approved_exact_pending` row.

Approved mapping identity digest `3701891d6afbaa5c34a7f830749688a420e6498a17d5e19af34b71315db02ded` authorized by COM-ADR-016, COM-ADR-018, and COM-ADR-021; any replacement digest requires a new COM-ADR row citing that digest before the verifier constant may change.

Coordinated edits that change those identity fields in both `REFERENCE.md` and `launch-products.csv` still fail unless the verifier digest constant and this authority line are deliberately updated in the same change with a new COM-ADR that cites the replacement digest. Evidence URL/metadata-only repairs do not require a digest update. The verifier cannot prevent a total coordinated rewrite of every trust anchor (register, launch workbook, decisions authority line, and verifier constants); code review remains required for that class of change.
<!-- commerce:decisions:end -->

<!-- commerce:verification:start -->
## Verification

Verification is rerunnable evidence, not a planning statement or rendered page.
Never record secrets, customer data, credentials, or private provider payloads.

### Foundation check

```bash
pnpm commerce:verify
```

The check validates:

- `docs/COMMERCE.md`, `docs/REFERENCE.md`, and their relative links;
- the retained source PDF digest and 103-row transcription;
- requirement and decision IDs;
- 103 selected launch products and 288 selected product/size rows whose sale
  data remains fail-closed until SKU, cost, stock, and approval states pass;
- standard INR prices and blocked Signature prices;
- reference-mapping counts, evidence provenance, and locked identity digest;
- fail-closed legal, packaging, content, media, SKU, cost, and stock states.

It does not prove external URL reachability, legal clearance, merchant approval,
production flags, customer journeys, or a live payment lifecycle.

### Change evidence

For a completed requirement, record:

```text
requirement ID
implementation path or migration
automated command and result
manual/provider evidence when required
commit and artifact checksum when applicable
verification time
residual risk
```

Database, auth, inventory, order, payment, and release changes also require the
relevant unit/integration tests, production build/package proof, browser QA,
accessibility checks, and the deployment smoke in
[Release checklist](#release-checklist).

A requirement remains Proposed or Blocked until every acceptance criterion is
proven. A unit test or page render never substitutes for provider, policy,
legal, or end-to-end evidence.

### Release record

```text
release identifier and Git SHA
artifact filename and SHA-256
database migration and runtime-grant state
catalog publication count
automated and browser results
payment and inventory reconciliation
deployment target and live smoke
rollback procedure
residual risks and verifier
```
<!-- commerce:verification:end -->

<!-- commerce:release-checklist:start -->
## Release checklist

No item is complete until current evidence is recorded through the
[Verification](#verification) protocol and linked from the owning release
record or [`CURRENT_STATE.md`](CURRENT_STATE.md). A green build alone is not a
deployment, payment proof, inventory proof, or customer-journey proof.

### Scope and decisions

- [ ] Launch catalog and featured products approved
- [ ] Public names and reference-fragrance policy legally reviewed
- [ ] India-counsel evidence recorded naming every intended surface reviewed (at minimum: public title, PDP copy, URL/slug, metadata/SEO, search/ads/social, bottle label, outer packaging, invoices/customer messages) with exact wording approved per surface; generic legal signoff is insufficient (TRUST-001)
- [ ] Bottle-label and packaging reference policy remains disabled unless separate owner and India-counsel surface approval exists and is recorded for those surfaces (COM-ADR-022)
- [ ] Disclaimer wording and placement approved for each intended surface; disclaimer is not treated as safe harbor
- [ ] Sizes, prices, SKUs, and stock policy approved
- [ ] Delivery regions, fees, estimates, and provider approved
- [ ] Return, cancellation, refund, privacy, and terms text approved
- [ ] Prepaid UPI methods, refund handling, and reconciliation procedure approved
- [ ] Customer support owner and channels approved
- [ ] Known residual risks accepted by owner

### Catalog and content

- [ ] Every published product passes required catalog validation
- [ ] No `needs_review` row is public
- [ ] Product and variant status agree with storefront visibility
- [ ] Prices use integer paisa internally despite legacy `*Cents` field names and render correctly
- [ ] Availability comes from server-authoritative inventory policy
- [ ] Product images, labels, and alternative text match selected product
- [ ] Notes, ingredients, concentration, longevity, and occasion claims are approved
- [ ] No copied designer asset, description, logo, or misleading affiliation claim
- [ ] No empty public collection or dead finder/search route

### Functional journey

- [ ] Home, shop, collection, search, finder if enabled, and PDP work
- [ ] Size and quantity errors are accessible and block invalid adds
- [ ] Cart persists and revalidates price, availability, and quantity
- [ ] Empty cart has useful, truthful recovery links
- [ ] Anonymous browsing/cart works, while checkout requires a verified customer session and preserves the cart through sign-in
- [ ] Address and delivery validation work
- [ ] Order confirmation is non-enumerable and shows correct snapshot
- [ ] Owner can locate and operate resulting order safely
- [ ] Email/SMS messages, if enabled, match order and policy truth

### Inventory and finance

- [ ] Concurrent reservation cannot oversell
- [ ] Expired, cancelled, and failed reservations release exactly once
- [ ] Confirmed sale creates correct auditable stock movement
- [ ] Order item snapshots remain stable after catalog changes
- [ ] Order-to-invoice transition is idempotent
- [ ] Totals, discounts, delivery, tax if applicable, paid, due, and refunds reconcile
- [ ] Zero-drift reconciliation passes before and after release smoke

### Payments

- [ ] Browser cannot mark order paid
- [ ] Callback/webhook authenticity verified
- [ ] Amount, currency, order, and provider reference matched server-side
- [ ] Duplicate and reordered callbacks are idempotent
- [ ] Pending, failed, cancelled, paid, and refunded paths tested as supported
- [ ] Sandbox success and failure evidence recorded
- [ ] Production credentials exist only in approved provider/runtime secret stores
- [ ] Refund and manual reconciliation runbook tested

### Security and privacy

- [ ] Owner and customer authorization boundaries tested
- [ ] Public sign-up behavior matches accepted decision
- [ ] CSRF/origin and cookie controls verified
- [ ] Rate limiting verified for real client identity or documented safe fallback
- [ ] No secret or private customer data in repo, logs, analytics, artifacts, or docs
- [ ] Dependency/security audits pass at required severity
- [ ] Data retention and deletion responsibilities approved

### Accessibility and performance

- [ ] Keyboard-only journey passes from home through confirmation
- [ ] Focus order, focus restoration, dialogs, errors, and live status pass
- [ ] Screen-reader names and relationships pass
- [ ] Contrast and reduced-motion behavior pass
- [ ] Mobile layouts have no horizontal overflow or covered actions
- [ ] Image sizes and lazy/eager loading match purpose
- [ ] Performance budgets pass on representative mobile profile
- [ ] Third-party scripts have owner, purpose, consent behavior, and measured cost
- [ ] No actionable console, page, or network errors

### SEO and machine-readable data

- [ ] Canonical and robots behavior approved per route
- [ ] Sitemap contains only canonical public routes
- [ ] Product structured data matches visible name, image, price, currency, and availability
- [ ] Open Graph assets use HTTPS and match product
- [ ] Search and agent-facing data expose no private fields

### Build and deployment

- [ ] Exact Node, package-manager, lockfile, and build inputs recorded
- [ ] Full verification command passes on clean checkout
- [ ] Artifact checksum and source commit recorded
- [ ] Artifact contains no environment or owner/customer secret
- [ ] Hostinger Node settings and entry file verified
- [ ] Database migrations and runtime grants verified in approved order
- [ ] Previous production-known-good artifact retained
- [ ] Rollback steps and operator access confirmed before cutover

### Live smoke

- [ ] TLS and DNS target expected deployment
- [ ] Home, catalog, representative PDP, and real static asset return expected status
- [ ] Cart-safe smoke passes without placing an unintended order
- [ ] Payment health/sandbox route if applicable reports expected state without secrets
- [ ] Auth/session and health routes do not return unexpected `500`
- [ ] Authenticated owner product, inventory, order, invoice, and finance pages render
- [ ] One explicitly authorized end-to-end prepaid transaction reconciles order, payment, stock, invoice, and confirmation
- [ ] Monitoring and support contacts active

### Post-release

- [ ] Reconciliation repeated after authorized smoke
- [ ] Logs checked for auth, payment, order, inventory, and server errors
- [ ] Failed requests and third-party errors reviewed
- [ ] Release evidence recorded through [Verification](#verification) and linked
  from the owning release record or [`CURRENT_STATE.md`](CURRENT_STATE.md)
> Optional: regenerate local Graphify analysis when useful. It is not release
> evidence, is not committed, and never blocks checklist completion.
- [ ] `CURRENT_STATE.md` and each owning document's pending-outcome section updated
- [ ] Rollback decision window closed explicitly
<!-- commerce:release-checklist:end -->
