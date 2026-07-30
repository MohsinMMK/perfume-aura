# Commerce decision log

Only **Accepted** decisions authorize implementation assumptions. Proposed and Pending entries remain unresolved.

## Current decisions

| ID | Date | Status | Decision | Reason / consequence |
|---|---|---|---|---|
| COM-ADR-001 | 2026-07-29 | Accepted | Use Markdown, structured catalog data, executable checks, and Graphify as a combined verification system. | No single layer proves requirements, runtime behavior, and relationships. Graphify remains derived. |
| COM-ADR-002 | 2026-07-29 | Accepted | Preserve source PDF names exactly during transcription and flag ambiguity rather than silently correcting it. | Source fidelity enables later review and audit. |
| COM-ADR-003 | 2026-07-29 | Accepted | Keep current public marketing honest until real commerce is operationally proven. | Prevents fabricated price, stock, review, shipping, payment, or checkout claims. |
| COM-ADR-004 | 2026-07-29 | Proposed | Build public commerce as a separate `apps/storefront` Next.js application sharing controlled packages and data. | Static marketing cannot safely own server-authoritative checkout; private ops boundaries must remain intact. |
| COM-ADR-005 | 2026-07-29 | Proposed | Stage storefront on a separate Hostinger Node domain before apex cutover. | Limits production risk and preserves rollback to current marketing. |
| COM-ADR-006 | 2026-07-29 | Proposed | Launch guest checkout before customer accounts. | Reduces friction and avoids coupling public customers to owner-only authentication. |
| COM-ADR-007 | 2026-07-30 | Accepted | Model each approved fragrance as one product and each purchasable 10/30/50/100 ml size as a separate variant row. | Owner confirmed common sizes; one-row-per-variant structure matches existing inventory boundaries and prevents paired-list ambiguity. |
| COM-ADR-008 | 2026-07-30 | Superseded | Use a unique Perfume Aura public name as each inspired product's primary identity and keep designer/reference names off bottle labels. Public “Inspired by …” references remain disabled until every reference is corrected and Indian trademark counsel approves exact presentation and disclaimer language. | Owner selected Perfume Aura-led naming and confirmed the first 82 rows are inspired fragrances. COM-ADR-017 later replaced the unique-name strategy; its source-fidelity and no-silent-approval safeguards remain historical context. |
| COM-ADR-009 | 2026-07-30 | Accepted | Plan all 103 source fragrances for launch with purchasable 10, 30, 50, and 100 ml variants. | Owner selected the complete catalog and confirmed all four sizes. Selection means intended scope only; no product or variant becomes publishable before names, prices, SKUs, numeric stock, content, and images pass validation. |
| COM-ADR-010 | 2026-07-30 | Accepted | Plan India-wide delivery in INR and record every selected product as supply-capable while numeric opening stock remains pending. | Owner confirmed market, currency, delivery reach, and current availability intent. Accepted facts authorize planning only; prices, costs, SKUs, barcodes, stock counts, reorder levels, product content, courier, fees, delivery estimates, returns, cancellations, tax, and support remain unresolved and block publication. |
| COM-ADR-011 | 2026-07-30 | Pending | Select India payment methods and provider architecture; UPI is a researched candidate, not yet an approved requirement. | Cashfree and Razorpay have documented UPI paths. Merchant onboarding, current account-specific fees, Hostinger staging proof, provider selection, COD/bank-transfer scope, and refund operations still require approval. |
| COM-ADR-012 | 2026-07-30 | Accepted | Include purchasable testers/discovery sets, bundles, customer accounts, and verified reviews in launch scope rather than deferring them. | Owner explicitly selected all optional capabilities for immediate launch. Each remains blocked on its own product, inventory, privacy/auth, moderation, policy, and verification requirements; this acceptance does not represent implementation or release readiness. |
| COM-ADR-013 | 2026-07-30 | Accepted | Use all 21 supplied Signature Series source names as their owner-approved Perfume Aura public names. | Owner approved the complete Signature Series list without replacements. Approval records naming intent only; trademark collision clearance, content, images, sale data, and publication approval remain pending. |
| COM-ADR-014 | 2026-07-30 | Accepted | Treat each selected fragrance's purchasable 10 ml variant as a tester and its 30/50/100 ml variants as bottles. | Owner explicitly confirmed the existing workbook interpretation. Tester packaging, SKU, price/cost, stock allocation, images, and fulfillment rules remain unresolved. |
| COM-ADR-015 | 2026-07-30 | Superseded | Use AI-generated batches as proposals for the 82 inspired public names, with explicit owner approval required for every name before recording it as approved. | Owner selected the batch-proposal workflow. COM-ADR-017 later removed the need for separate inspired-product names; proposals made before that change were not applied. |
| COM-ADR-016 | 2026-07-30 | Accepted | Keep `Green Creed` unresolved; record `Cycus Flora` as the Gucci Flora family, `YSL-Y` as the Yves Saint Laurent Y family, and `CH 212 Men` as the Carolina Herrera 212 Men family for internal review. | Owner approved three family-level mappings and explicitly declined a guess for Green Creed. Exact Cycus product, Y concentration/flanker, and 212 label/flanker remain pending; mapping approval remains separate from public-use clearance. |
| COM-ADR-017 | 2026-07-30 | Accepted | Use exact in-house Signature Series names without an “Inspired by” prefix, and plan future inspired-product titles as “Inspired by <owner-confirmed reference>” instead of separate Perfume Aura names. | Owner replaced the public-name strategy in COM-ADR-008 and the proposal workflow in COM-ADR-015 after reviewing ScentGPT's live pattern. Signature names remain standalone in backend/frontend. Inspired titles stay unpopulated until exact mappings are resolved; a planned disclaimer is disclosure, not recorded legal clearance, and no storefront or publication is authorized in this phase. |
| COM-ADR-018 | 2026-07-30 | Accepted | Record `VIP 212 Men` as Carolina Herrera — `212 VIP Men`, `1 Million` as Rabanne — `1 Million`, and `Baccarat` as Maison Francis Kurkdjian — `Baccarat Rouge 540` family; keep `F Fabulous` unresolved. | Owner approved three internal reference strings for future inspired-title planning and explicitly retained the abbreviated F Fabulous source without an inferred mapping. Baccarat concentration remains pending; no public title, slug, or legal clearance follows from this mapping decision. |
| COM-ADR-019 | 2026-07-30 | Accepted | Confirm `Oud of Duraj`, `Royal Stablor`, and `Mbgamare` as exact in-house Signature Series names with no external inspiration or reference mapping. | Owner explicitly clarified that every Signature Series entry is an in-house name used unchanged in backend/frontend. The three previously flagged spellings remain preserved as supplied, their reference mapping is not applicable, and trademark-clearance state remains separate from inspiration classification. |
| COM-ADR-020 | 2026-07-30 | Accepted | Keep `Gucci Guilty EX` and `Pawake` as unresolved inspired references; do not reclassify Pawake as in-house and do not choose a Gucci Guilty flanker without evidence. | Owner confirmed both rows stay in the inspired collection but declined unsupported mapping guesses. Their source text remains unchanged, future inspired titles remain blank, and supplier/owner evidence is required before exact mapping approval. |
| COM-ADR-021 | 2026-07-30 | Accepted | Approve the 46 clear brand/reference strings listed in [`REFERENCE-MAPPINGS.md`](./REFERENCE-MAPPINGS.md) as `owner_approved_title_reference` mappings for inspired-title planning. | Four read-only research passes checked rows 1–82 against official or strongest available sources, then excluded generic, conflicting, gender/flanker-choice, conditional, and unresolved rows from bulk approval. This decision raises the approved-title-reference total to 48; source transcription, public titles/slugs, legal review, and publication status remain unchanged. |
| COM-ADR-022 | 2026-07-30 | Accepted | Keep designer and inspired-reference names disabled on bottle labels and packaging until separate explicit owner approval and India-counsel approval for that surface. | Owner-selected fail-closed product policy after REQUIREMENTS and RESEARCH conflicted on bottle-label readiness. This is packaging/surface control only. It is not trademark clearance, disclaimer approval, title clearance, or permission to use references on any other surface. |

## Outstanding owner/legal inputs

Accepted scope does not make catalog rows sale-ready. These facts remain required:

- **COM-ADR-013 / 017:** all 21 in-house Signature Series names are owner-approved as exact standalone backend/frontend names. Inspired products use no separate Perfume Aura naming workflow; their future `Inspired by <reference>` titles remain blank until each exact internal mapping and later official/legal review are complete.
- **COM-ADR-016 / 018–021 mappings:** 48 inspired rows have owner-approved title-reference strings; 4 have owner-approved family mappings with exact product/concentration details pending; `Green Creed`, `F Fabulous`, `Gucci Guilty EX`, and `Pawake` remain explicitly unresolved; 26 still need owner input. Exact rows, evidence metadata, and states are recorded in [`REFERENCE-MAPPINGS.md`](./REFERENCE-MAPPINGS.md). `main_list:22` retains the approved `212 VIP Men` identity with an explicit evidence gap; `main_list:20` retains Ulta only as labeled strongest-available retailer evidence. All 21 Signature names are confirmed in-house with mapping not applicable. Source transcription stays unchanged; no internet guess may silently replace it.
- **COM-ADR-022 bottle/packaging surface:** designer and inspired-reference names stay disabled on bottle labels and packaging until separate owner approval and India-counsel approval for that surface. This product policy is not legal clearance.
- **COM-ADR-010 product/variant data:** INR retail price and cost, SKU, optional barcode, opening stock count, reorder level, audience, family, notes, occasion, season, intensity, concentration, longevity guidance, sillage, ingredients, usage, and approved images.
- **COM-ADR-010 policy data:** courier, PIN-code/serviceability rules, delivery fee, free-shipping threshold, delivery estimate, returns, cancellations, tax treatment, and support channel.
- **COM-ADR-011:** decide whether UPI launches, select Cashfree, Razorpay, or another verified India provider if needed, confirm merchant eligibility and account fees, and decide whether COD and manual bank transfer launch.
- **COM-ADR-012 operating data:** tester/discovery-set composition and packaging, bundle composition/pricing/stock allocation, customer-account privacy/auth rules, and completed-order review eligibility/moderation.

## Decision template

Append decisions; do not rewrite history silently.

```markdown
| COM-ADR-NNN | YYYY-MM-DD | Accepted/Proposed/Pending/Superseded | Decision | Reason and consequences |
```

When superseding a decision, add a new row and identify the replaced ID. Update affected requirements, architecture, catalog, tests, and verification evidence in the same change.

### Approved mapping identity digest protocol

`pnpm commerce:verify` freezes approved inspired mapping identities as canonical tuples:

`(key, source_name, brand, reference, status, decision)`

for every `owner_approved_title_reference` and `family_approved_exact_pending` row.

Approved mapping identity digest `3701891d6afbaa5c34a7f830749688a420e6498a17d5e19af34b71315db02ded` authorized by COM-ADR-016, COM-ADR-018, and COM-ADR-021; any replacement digest requires a new COM-ADR row citing that digest before the verifier constant may change.

Coordinated edits that change those identity fields in both `REFERENCE-MAPPINGS.md` and `launch-products.csv` still fail unless the verifier digest constant and this authority line are deliberately updated in the same change with a new COM-ADR that cites the replacement digest. Evidence URL/metadata-only repairs do not require a digest update. The verifier cannot prevent a total coordinated rewrite of every trust anchor (register, launch workbook, decisions authority line, and verifier constants); code review remains required for that class of change.
