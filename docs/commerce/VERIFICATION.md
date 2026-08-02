# Commerce verification

Verification means rerunnable evidence, not remembered confidence. A completed row must identify what ran, which version ran, when it ran, and what passed.

## Required evidence fields

Every completed requirement should record:

- Requirement ID
- Implementation path or schema/migration
- Automated command and focused test
- Manual/browser or provider check where automation is insufficient
- Git commit or dirty-tree marker
- Artifact checksum when deployment is involved
- UTC verification date
- Result and residual risk

Never paste secrets, full database URLs, payment tokens, passwords, customer addresses, or private provider payloads.

## Foundation verification matrix

These rows cover documentation and catalog normalization only. They do not prove a storefront or commerce capability.

Evidence version for all rows re-run on 2026-07-30: Git `a3d28437792e-dirty`; commerce docs/data/verifier are untracked in the current worktree, so this evidence is not attributable to the current commit. Shared residual risk: source transcription is digest-checked rather than visually reparsed, legal clearance remains pending, and foundation checks do not prove storefront behavior.

| Evidence ID | Requirement | Reproducible check | Expected | Last result | Status |
|---|---|---|---|---|---|
| COM-FND-001 | VER-001, VER-002: required commerce documents and relative file links exist. | `pnpm commerce:verify` | Eight commerce Markdown files and their relative file targets, including mapping and launch catalog workbooks, resolve. External URL reachability and heading fragments are outside this check. | Pass 2026-07-30: 8 documents checked; relative targets resolved. | Verified |
| COM-FND-002 | CAT-001: source list transcription contains 103 rows. | `pnpm commerce:verify` | 82 main-list rows plus 21 Signature Series rows. | Pass 2026-07-29: 103 rows = 82 main + 21 signature. | Verified |
| COM-FND-003 | CAT-001: source numbering is complete and unique. | `pnpm commerce:verify` | Main list is 1–82; Signature Series is 1–21; no duplicate source key. | Pass 2026-07-29: both ranges sequential; 103 unique source keys. | Verified |
| COM-FND-004 | CAT-002, CAT-003: missing business facts remain visibly unresolved. | `pnpm commerce:verify` | Immutable source rows remain `needs_review`; all launch products remain overall `needs_owner_input`; standard launch variants retain approved INR prices while Signature prices remain blank; every variant remains non-publishable until its SKU, cost, stock, media, content, and legal gates pass. | Pending re-verification after the approved 2026-08-02 catalog-shape change. | In progress |
| COM-FND-005 | CAT-001: ambiguous source names remain unchanged and flagged. | `pnpm commerce:verify` | Listed ambiguous rows preserve exact reviewed text and carry review notes. | Pass 2026-07-29: 13 required ambiguity flags present; source digest locked. | Verified |
| COM-FND-006 | CAT-001: retained source PDF matches reviewed checksum. | `pnpm commerce:verify` | Retained PDF SHA-256 matches reviewed source. Automated check does not reparse PDF; source-text changes require manual comparison. | Pass 2026-07-29: SHA-256 `cfe8a5c88c08b99baa7b9a57ccab8fd99a0b0f5aafb446ccfcb38015e0aa22c2`. | Verified |
| COM-FND-007 | VER-002: commerce records enter repository relationship map. | Graphify scoped update, integrity diagnostic, then focused queries | Graph includes current commerce decisions, requirements, research, mapping register, verification, and verifier relationships, with no dangling, missing, duplicate, collapsed, or self-loop edges; focused queries resolve naming, catalog, mapping, legal, bottle-label, and fail-closed verification paths. Disposable `.marketing-sync.*` temp snapshots are excluded via `.gitignore` and `.graphifyignore`. | Pass 2026-07-30: clean staged-snapshot commerce refresh produced 1,680 nodes and 3,609 edges with 0 `.marketing-sync.*` corpus entries; exact nodes COM-ADR-017–022, evidence metadata semantics, approved mapping identity digest authority line, `main_list:20` retailer exception, `main_list:22` evidence gap, India Code §§29/30 including s.29(8) and s.30(1) cumulative conditions, surface-named counsel evidence, verifier self-test baseline+diagnostic mode, disclaimer-not-safe-harbor, Commerce Reference Mapping Register, COM-FND-011, and COM-FND-012 are present; structural diagnostics report 0 dangling endpoints and 0 self-loops. This row attests only the listed commerce scope and makes no whole-dirty-worktree freshness claim. | Verified |
| COM-FND-008 | COM-ADR-007–027: reviewed decision statuses and owner wording remain stable. | `pnpm commerce:verify` plus human prose review | Verifier enforces superseded historical decisions, the accepted storefront/catalog/India-provider/design decisions through COM-ADR-027, and the retained owner statements that govern naming, mapping, legal review, and packaging. | Pending re-verification after the accepted 2026-08-02 decisions. | In progress |
| COM-FND-009 | CAT-002, CAT-004, TRUST-001: product-level launch workbook preserves every source identity and selected scope. | `pnpm commerce:verify` | 103 ordered product rows; first 82 remain inspired with blank titles/slugs and `reference_title_pending_mapping`; 21 Signature Series rows carry owner-approved unique standalone public names/slugs; inspired references are planned but remain review-pending; all products stay blocked on remaining data and clearance. | Pass 2026-07-30: 21 unique Signature names/slugs and 82 pending inspired reference titles validated without making any row publishable. | Verified |
| COM-FND-010 | CAT-003, CAT-004, COM-ADR-024: variant workbook uses one row per approved product/size combination. | `pnpm commerce:verify` | Exactly 288 ordered rows = 82 standard products × 30/50/100 ml plus 21 Signature products × 50/105 ml; INR; all rows are bottles; standard prices equal ₹600/₹800/₹1,400 in paise; Signature prices remain blank and range-gated; SKU, cost, numeric stock, and reorder values remain blocked. | Pending re-verification after the accepted 2026-08-02 size and price decision. | In progress |
| COM-FND-011 | CAT-002, TRUST-001, COM-ADR-016–022: staged mapping, legal, and bottle-label states fail closed. | `pnpm commerce:verify` | Mapping states contain exactly 48 owner-approved title references, 4 family mappings with exact detail pending, 4 explicit unresolved references, and 26 rows needing owner input. Inspired rows remain `planned_public_pending_review` with Indian legal review pending; bottle/packaging designer references stay disabled under COM-ADR-022; all Signature mappings are `not_applicable` while trademark-clearance state remains separate. | Pass 2026-07-30: mapping counts and launch rows validated separately from legal clearance; bottle-label disablement recorded; all 21 Signature rows remain exact in-house identities; no inspired public title or slug is populated and no product is publishable. | Verified |
| COM-FND-012 | CAT-002, VER-001, COM-ADR-021: mapping register and launch workbook remain aligned. | `pnpm commerce:verify` and `pnpm commerce:verify -- --self-test` | `REFERENCE-MAPPINGS.md` contains all 82 inspired rows in source order. Launch CSV alignment covers source name, brand, reference, and mapping state only. Evidence metadata, source-type/host provenance, effective-URL handling, exception-table keys, and decision attribution are validated inside the register/docs/verifier; approved identity tuples are digest-attested against the locked DECISIONS authority line so coordinated register+CSV identity rewrites and digest-constant bypass without a new COM-ADR fail. Non-gap approved citations keep every original and effective HTTPS URL globally unique; official rows require exact brand-bound audited hostnames; only the documented retailer exception key may use retailer evidence; explicit evidence-gap rows invent no URL. Live HTTP reachability remains outside this check. | Pass 2026-07-30: 82 mapping rows aligned; evidence metadata enums and exact-host provenance enforced; self-test baseline plus negative diagnostics green; `main_list:20` retailer exception and `main_list:22` evidence gap accepted; pending/unresolved rows remain blank and fail-closed. | Verified |

## Future requirement traceability

Use this format once implementation begins:

| Requirement ID | Implementation | Automated evidence | Manual evidence | Version | Verified UTC | Result | Residual risk |
|---|---|---|---|---|---|---|---|
| Example: INV-001 | `packages/db/...` | Focused transaction test | Concurrent sandbox checkout | commit/artifact | date | Pass/Fail | risk or none |

A requirement remains Proposed or Blocked until implementation and required evidence pass. Do not mark work Verified because a page renders or a unit test passes if its acceptance criteria require more.

## Verification loop

1. Read linked requirements and accepted decisions.
2. Query Graphify for affected relationships before broad searching.
3. Implement smallest coherent change.
4. Run focused automated checks.
5. Run integration checks for database, order, inventory, payment, or auth boundaries.
6. Run browser QA at supported mobile and desktop widths for public UX.
7. Check accessibility, console, page errors, failed requests, network behavior, and real assets.
8. Obtain independent read-only review for financial, inventory, auth, migration, or release-sensitive changes.
9. Record evidence only after all required checks pass.
10. Run `pnpm commerce:verify` and appropriate repository quality gates.
11. Update Graphify after meaningful changes and query critical flows again.

## Planned full storefront gate

Current `pnpm commerce:verify` validates only the planning/catalog foundation. Before storefront release it must expand or delegate to checks for:

- Catalog schema and import validation
- Lint and typecheck
- Unit and PostgreSQL integration tests
- Inventory reservation concurrency and expiry
- Order/invoice transition invariants
- Payment sandbox, signature, idempotency, replay, and reconciliation tests if applicable
- Production build and extracted-artifact smoke
- Browser E2E for home, catalog, PDP, cart, guest checkout, confirmation, and owner order handling
- WCAG keyboard, focus, error, contrast, reduced-motion, and screen-reader checks
- SEO, sitemap, Product structured data, canonical, asset, and broken-link checks
- Security audit, secret scan, rate-limit, CSRF/origin, and authorization checks
- Deployment and rollback smoke defined in `RELEASE-CHECKLIST.md`

## Deployment evidence record

```text
Release identifier:
Git commit:
Dirty tree: yes/no
Artifact filename:
Artifact SHA-256:
Database migration state:
Catalog row and publication counts:
Automated verification command/result:
Desktop browser QA:
Mobile browser QA:
Payment sandbox result:
Inventory reconciliation:
Deployment target:
Live smoke result:
Rollback artifact/procedure:
Known residual risks:
Verified by:
Verified UTC:
```
