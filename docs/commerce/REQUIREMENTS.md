# Commerce requirements

Status legend:

- **Accepted** — owner explicitly approved requirement or process
- **Proposed** — recommended design awaiting implementation approval
- **Blocked** — cannot proceed until listed decision or dependency resolves
- **Verified** — implemented and supported by evidence in `VERIFICATION.md`

No requirement marked Proposed represents live behavior.

## Catalog

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| CAT-001 | Accepted | Preserve supplied source list exactly during normalization. | Retained PDF checksum matches reviewed source; structured catalog contains sequential main-list rows 1–82 and Signature Series rows 1–21; source names remain unchanged unless a fresh manual PDF comparison authorizes verifier updates. |
| CAT-002 | Blocked | Approve public product identity before publication. | Staged fields record public title, unique slug, identity approval, source-name review, reference mapping status, public-reference status, and legal-review state without treating partial approval as publishable. Signature products use their exact owner-approved in-house names. Inspired products may use `Inspired by <owner-confirmed reference>` only after exact mapping resolution and later official/legal review of wording, disclaimer, and each surface. Designer logos, copied assets, and misleading affiliation remain forbidden. |
| CAT-003 | Blocked | Approve sale data before publication. | Every selected 10/30/50/100 ml product × size row has SKU, integer-paise INR retail price and cost, numeric opening stock, reorder level, and approved launch status; its parent product has approved media. Parallel size/price list encoding is forbidden. |
| CAT-004 | Accepted | Model each fragrance as one product and each purchasable size as a variant. | All 103 selected products have explicit 10/30/50/100 ml intake rows; 10 ml is tester and 30/50/100 ml are bottle variants; only fully approved variants may become purchasable. |
| CAT-005 | Proposed | Support controlled merchandising. | Signature, inspired/reference if legally approved, audience, family, occasion, featured, new, and best-seller properties come from structured data. |
| CAT-006 | Proposed | Never publish empty promotional collections. | Collection route is hidden or unavailable when it has no launch-approved product. |
| CAT-007 | Blocked | Define purchasable testers and discovery sets before publication. | Every fragrance has an accepted 10 ml tester intake row, but publication still requires packaging, SKU, INR price/cost, stock allocation, availability, images, and fulfillment rules; multi-product discovery sets additionally require exact included product × size rows. |
| CAT-008 | Blocked | Define bundles before publication. | Each bundle has exact component variants and quantities, SKU, INR price/cost, stock-allocation behavior, substitution policy, images, and return treatment. |

### Catalog naming state rules

- Signature rows use `name_approval_status=owner_approved` only after an explicit owner decision. Inspired rows use `reference_title_pending_mapping` while the planned `Inspired by <reference>` title cannot yet be generated from an exact approved mapping; discarded separate-name proposals are not persisted.
- `source_name_review_status` is `not_flagged`, `ambiguity_unresolved`, or `owner_confirmed_as_public_name`. Source transcription never changes in the launch workbook.
- `reference_mapping_status` may remain `needs_owner_input` or `unresolved`; a broad owner-approved family uses `family_approved_exact_pending`; an owner-approved exact title reference uses `owner_approved_title_reference`; confirmed in-house Signature entries use `not_applicable`. Exact mapping approval needs an explicit owner decision.
- Inspired rows use `reference_display_status=planned_public_pending_review` and `legal_review_status=india_counsel_pending`. These values record commercial intent, not permission or publication readiness. Exact disclaimer text, placement, and allowed surfaces require later review before any public status can be enabled. Signature public names stay `trademark_clearance_pending` until collision review completes.
- Partial identity or mapping approval never changes overall `approval_status=needs_owner_input`; product and variant publication remains fail-closed until every CAT-002 and CAT-003 gate passes.

## Experience and discovery

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| UX-001 | Accepted | Preserve current black, graphite, brass, ivory, and cinematic Perfume Aura identity. | Storefront reuses approved tokens and bottle direction without foreign branding or assets. |
| UX-002 | Proposed | Separate cinematic storytelling from conversion-critical surfaces. | Home can use restrained motion; catalog, PDP, cart, and checkout stay legible, fast, and task-focused. |
| UX-003 | Proposed | Provide catalog navigation suitable for approved launch volume. | Shop and collection routes expose only approved product groups; mobile navigation remains keyboard and screen-reader usable. |
| FIND-001 | Blocked | Add predictive search only after searchable product data is approved. | Search returns relevant approved products, prices, images, availability, and a full-results path. |
| FIND-002 | Blocked | Add rule-based scent finder only after scent metadata is complete. | Every recommendation states which approved answers and product properties produced it. |
| FIND-003 | Proposed | Filter broad catalogs by useful fragrance attributes. | Available filters include real family, notes, occasion, intensity, size, price, audience, and availability values. |

## Product detail

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| PDP-001 | Proposed | Make size selection explicit. | Size choices are visible buttons with selected, unavailable, keyboard-focus, and error states. |
| PDP-002 | Blocked | Show real purchase facts near primary action. | Selected price, price per ml, availability, quantity, delivery summary, payment methods, and return summary use approved data. |
| PDP-003 | Blocked | Explain fragrance without copied claims. | Approved family, top/heart/base notes, concentration, intensity, longevity guidance, occasion, usage, and ingredients appear where available. |
| PDP-004 | Proposed | Keep purchase action available on small screens. | Sticky mobile action reflects current product, size, price, stock state, and cart status without covering content. |
| PDP-005 | Blocked | Show only verified reviews. | Review is tied to a completed eligible order and moderation state; aggregate counts match displayed records. |

## Cart, checkout, orders, and inventory

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| CART-001 | Proposed | Persist server-authoritative guest carts. | Quantity and current price/availability are revalidated before checkout; client values are never trusted as financial truth. |
| CART-002 | Proposed | Make empty-cart recovery useful. | Empty cart links to approved products or collections without fabricated recommendations. |
| CHECK-001 | Proposed | Offer guest checkout first. | Customer can complete approved checkout without creating or entering owner authentication. |
| CHECK-002 | Blocked | Use one authoritative India shipping and return policy. | India-wide serviceability, courier, fees, threshold, delivery estimate, returns, cancellations, tax, and support are approved; PDP, cart, checkout, confirmation, and email render matching policy identifiers and current text. |
| INV-001 | Proposed | Reserve stock atomically. | Reservation cannot exceed available quantity and is created in a transaction with deterministic lock order. |
| INV-002 | Proposed | Release abandoned reservations. | Expired, cancelled, and failed checkout reservations release exactly once and produce auditable stock events. |
| ORD-001 | Proposed | Keep customer order lifecycle separate from invoices. | Order records immutable purchase facts; controlled workflow creates or links financial invoice records. |
| ORD-002 | Proposed | Preserve order-item snapshots. | Product name, SKU, size, unit price, discount, tax, and quantity remain historically accurate after catalog edits. |

## Payments, auth, and trust

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| PAY-001 | Blocked | Choose supported India payment methods before payment implementation. | Selected INR method set records any provider, UPI/COD/bank-transfer scope, account-specific fees, refunds, signed webhooks where applicable, sandbox, merchant eligibility, and Hostinger staging compatibility. |
| PAY-002 | Proposed | Process payment callbacks idempotently. | Authentic duplicate or reordered callbacks cannot create duplicate payment, order, invoice, or stock effects. |
| PAY-003 | Proposed | Never trust browser payment success alone. | Server verifies provider state before marking order paid. |
| AUTH-001 | Accepted | Keep owner authentication separate from public customer identity. | Customer routes cannot use or weaken owner-only Better Auth configuration. |
| AUTH-002 | Blocked | Support launch-scope customer accounts without weakening guest purchase completion. | Account creation, sign-in, recovery, privacy, deletion, and authorization are approved and verified; checkout does not require an account unless a later accepted decision explicitly changes that rule. |
| TRUST-001 | Blocked | Obtain Indian legal approval for trademark/reference naming before publication. | Exact public reference wording and disclaimer receive counsel approval for every intended surface; designer and inspired-reference names remain disabled on bottle labels and packaging until separate owner approval and India-counsel approval for that surface (COM-ADR-022); no product implies designer affiliation; no designer logo, copied image, copied description, or misleading packaging claim is used. A disclaimer is disclosure only and is not a statutory safe harbor. |
| TRUST-002 | Accepted | Do not fabricate commerce facts. | No unverified pricing, availability, review, delivery, return, payment, or checkout claim is public. |

## Quality, deployment, and verification

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| A11Y-001 | Proposed | Meet WCAG 2.2 AA for core purchase journeys. | Keyboard, focus, names, errors, contrast, reduced motion, and screen-reader checks pass for home through confirmation. |
| PERF-001 | Proposed | Protect mobile performance. | Performance budgets are recorded before launch; third-party scripts require owner, purpose, and measured cost. |
| SEO-001 | Proposed | Publish accurate machine-readable catalog data. | Canonical, sitemap, Product structured data, availability, price, and images match public server truth. |
| OPS-001 | Proposed | Stage storefront separately before apex cutover. | Hostinger Node staging serves exact tested artifact with isolated environment and no production customer impact. |
| OPS-002 | Proposed | Verify every deployment beyond `/login` or homepage. | Readiness, static asset, public catalog, cart, checkout-safe smoke, and authenticated owner operations are checked as applicable. |
| VER-001 | Accepted | Maintain requirement-to-evidence traceability. | Every completed requirement links implementation, automated check, manual check where needed, commit/artifact, date, and result. |
| VER-002 | Accepted | Use Markdown, structured data, executable checks, and Graphify together. | `pnpm commerce:verify` passes; Graphify is updated after meaningful changes but is never treated as runtime proof. |
