# Commerce documentation

Status: planning and verification foundation. No public storefront, cart, checkout, payment gateway, or customer-order workflow is implemented or represented as live.

This directory is the durable source of truth for Perfume Aura commerce planning. It supplements the current product, engineering, operations, roadmap, and design documents; it does not replace their existing responsibilities.

## Documents

| Document | Owns |
|---|---|
| [RESEARCH.md](./RESEARCH.md) | Public reference-site observations, adaptation decisions, and source links |
| [REFERENCE-MAPPINGS.md](./REFERENCE-MAPPINGS.md) | Owner-reviewed inspired-reference register, evidence links, and unresolved mapping states |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Numbered commerce requirements and acceptance criteria |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Proposed storefront boundaries, data flow, routes, and domain model |
| [DECISIONS.md](./DECISIONS.md) | Accepted, proposed, and pending decisions with rationale |
| [VERIFICATION.md](./VERIFICATION.md) | Requirement-to-evidence traceability and repeatable check protocol |
| [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) | Production commerce release gate; all items remain unchecked until proven |
| [`data/catalog/perfumes.csv`](../../data/catalog/perfumes.csv) | Immutable structured transcription of the supplied 103-fragrance PDF list |
| [`data/catalog/launch-products.csv`](../../data/catalog/launch-products.csv) | Product-level owner workbook for all 103 selected launch fragrances; intentionally non-publishable while required facts are blank |
| [`data/catalog/launch-variants.csv`](../../data/catalog/launch-variants.csv) | One-row-per-product × size intake for 10/30/50/100 ml INR variants; intentionally non-importable while SKU, price, cost, and stock counts are blank |
| [`Perfume_List_Table.pdf`](../../data/catalog/source/Perfume_List_Table.pdf) | Retained reviewed source binary; checksum-gated but manually transcribed |

Related current documents:

- [Product behavior](../PRODUCT.md)
- [Engineering contracts](../ENGINEERING.md)
- [Production operations](../OPERATIONS.md)
- [Roadmap](../ROADMAP.md)
- [Locked stack](../STACK.md)

## Evidence precedence

When records disagree, use this order:

1. Reproducible command output, tests, migrations, browser evidence, and provider evidence
2. Structured catalog and database records
3. Accepted decisions and numbered requirements
4. Architecture and research prose
5. Generated Graphify output
6. Conversation memory

Graphify is a derived relationship map. Never edit `graphify-out/` as source material and never treat graph traversal as runtime proof.

## Current baseline — 2026-07-30

- The animated apex storefront remains a cinematic, honest pre-launch
  experience while all commerce release flags stay closed.
- Existing ops supports owner-managed products, size variants, inventory, customers, invoices, fulfillment, payments, and finance.
- Owner confirmed India, INR, India-wide intended delivery, and that the first 82 entries represent inspired fragrances.
- All 103 source entries remain selected for intended launch. Standard fragrances use 30/50/100 ml variants at approved fixed retail prices; Signature fragrances use 50/105 ml variants with per-product price approval still pending. 10 ml is not sold and discovery sets remain blocked until a different sample format is approved. Bundles, customer accounts, and verified reviews remain selected launch capabilities.
- Selection is not publication approval. All 21 Signature names are owner-approved in-house identities. Inspired products use the planned `Inspired by <owner-confirmed reference>` policy: 48 title references are owner-approved, 4 family mappings need exact detail, 4 mappings are explicitly unresolved, and 26 still need owner input. Public titles/slugs and legal review remain pending. Designer and inspired-reference names stay disabled on bottle labels/packaging under COM-ADR-022 until separate owner and India-counsel surface approval. Evidence metadata records official/retailer/gap provenance; `main_list:22` is an explicit evidence gap and `main_list:20` is strongest-available retailer evidence only.
- Standard retail prices are approved. Signature prices, costs, SKUs, numeric stock, reorder levels, product content, images, shipping values, returns, tax, support, Cashfree merchant approval, SMTP, and Google/Apple credentials remain unresolved. `launch-products.csv` and `launch-variants.csv` stay non-publishable/non-importable.
- The separate `apps/storefront` architecture is approved for implementation. Public checkout and production cutover remain fail-closed until the catalog, policy, provider, legal, and operational gates are complete.

## Change protocol

For every commerce change:

1. Link work to one or more requirement IDs.
2. Record new business choices in `DECISIONS.md` before implementing them.
3. Update the structured catalog rather than copying product facts into multiple documents.
4. Add or update a reproducible test.
5. Record evidence in `VERIFICATION.md` only after the check passes.
6. Run `pnpm commerce:verify`.
7. Update Graphify after meaningful committed code or documentation changes.
8. Keep secrets, full connection URLs, passwords, tokens, and customer data out of documentation and evidence.
