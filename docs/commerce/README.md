# Commerce contract

The storefront and commerce schema are implemented and deployed fail-closed.
No catalog row, checkout, payment, customer account, inquiry, review, or
indexing path is public until its release evidence passes.

These files are executable specification inputs to `pnpm commerce:verify`:

| Document | Owns |
|---|---|
| [REQUIREMENTS.md](REQUIREMENTS.md) | Stable requirement IDs and acceptance criteria |
| [DECISIONS.md](DECISIONS.md) | Accepted and superseded owner decisions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Current storefront/data boundary |
| [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) | Commerce production gate |
| [VERIFICATION.md](VERIFICATION.md) | Requirement-to-evidence protocol |
| [REFERENCE-MAPPINGS.md](REFERENCE-MAPPINGS.md) | Reviewed inspired-reference register |
| [RESEARCH.md](RESEARCH.md) | Source and legal research record |
| [STOREFRONT-REFERENCE.md](STOREFRONT-REFERENCE.md) | Repeatable Bucks Sauce visual and interaction reference |

Structured catalog inputs live in `data/catalog/`. Selection never means
publication approval.

Evidence precedence is runtime/provider proof, structured data, accepted
decisions, requirements, architecture/research, then conversation memory.
Generated Graphify output is not source material and is not tracked.

General product state belongs in [`../PRODUCT.md`](../PRODUCT.md); deployment
state belongs in [`../CURRENT_STATE.md`](../CURRENT_STATE.md).
