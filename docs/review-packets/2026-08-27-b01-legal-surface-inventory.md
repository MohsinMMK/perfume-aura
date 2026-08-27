# B01 India-counsel legal-surface inventory — 27 August 2026

Status: **prepared for review; no legal approval recorded**.

This inventory identifies the exact product-name and customer-communication
surfaces that require India-counsel review. It does not offer legal advice,
interpret law, approve a disclaimer, or authorize publication, advertising,
packaging, customer accounts, inquiries, or commerce.

The signed opinion and privileged material must stay in the owner-controlled
legal store. The repository may record only a dated decision, conditions, and a
non-sensitive evidence reference.

## Review snapshot

| Item | Snapshot |
|---|---|
| Repository baseline | `2a7cf6f02fc0406b6f54431555f641a133c31463` |
| Intended catalog scope | 103 products: 82 inspired and 21 Signature |
| First counsel-review batch | 69 names confirmed by the owner on 27 August 2026: 48 inspired and 21 Signature |
| Excluded inspired rows | 34 left unchanged by owner direction: 4 family-level exact detail pending, 4 unresolved, 26 needing owner input |
| Inspired legal state | All 82 rows are `india_counsel_pending` |
| Signature legal state | All 21 rows are `trademark_clearance_pending` |
| Sale-data approval state | All 103 rows remain `needs_owner_input` |
| Live check | `/shop` exposed 48 unique `inspired-by-*` product links on 27 August 2026 |
| Customer-facing disclaimer | None found in storefront application source or the live `/shop` response |

The absence of a disclaimer is a review finding, not a conclusion that a
disclaimer would make any use lawful. Counsel must decide whether each use is
permitted and, if so, approve the exact wording and placement for each surface.

## Frozen catalog evidence

| Artifact | Purpose | SHA-256 |
|---|---|---|
| [`launch-products.csv`](../../data/catalog/launch-products.csv) | Exact source names, planned public names/slugs, mapping state, and legal state | `c200a3641a2dafca409cf0f282f53f26144ce619c803e08aa932f3aaca9031e2` |
| [`launch-variants.csv`](../../data/catalog/launch-variants.csv) | Intended size/variant scope and approval state | `9c29326da1b237481b31a0f1a116c4a979f822b311f811684754e6bd235fd493` |
| [`perfumes.csv`](../../data/catalog/perfumes.csv) | Source transcription and mapping inputs | `a3fba3d6a7a3e9b85477d0766010e3e7776d89def6eed5a20af483585d5c81ef` |
| [`69-name counsel review CSV`](2026-08-27-b01-69-name-review.csv) | First-batch names, slugs, legal states, and blank counsel decision fields | `f6bbf314d95e7bee2a79d6aab28e2ce5c6ca4de36e578e823a8e66ea1c4e39b4` |

Any change to these files after review invalidates the affected decision unless
the changed material is re-submitted and the replacement evidence is recorded.

## Surface inventory

| Surface | Exact source | Current state | Decision required from counsel |
|---|---|---|---|
| Shop listing names and links | `data/catalog/launch-products.csv`; `apps/storefront/lib/inspired-listing-title.ts`; `apps/storefront/lib/listing-workbook-data.ts` | 48 inspired and 21 Signature names are visible as discovery listings; sales remain locked | Approve, reject, or condition each naming pattern and name; specify whether a disclaimer is required and its exact placement |
| Product URL slugs | `data/catalog/launch-products.csv`; `apps/storefront/lib/inspired-listing-title.ts` | 48 `inspired-by-*` slugs are live but release-locked from indexing | Approve or reject reference use in URLs and state any required replacement pattern |
| Product page title and copy | `apps/storefront/app/products/[slug]/page.tsx`; catalog approval fields | Listed PDPs show name and preview copy; detailed scent/commercial facts remain gated | Review exact public title, summary, story, family, notes, ingredients, usage, comparison/reference language, and claims |
| Metadata and structured data | `apps/storefront/app/products/[slug]/page.tsx`; `apps/storefront/lib/seo.ts` | Product indexing and Product structured data remain release-locked | Review title, description, canonical slug, image, price/availability claims, and reference use in metadata |
| Search, collections, finder, and related products | `apps/storefront/lib/shop-listing-query.ts`; `apps/storefront/lib/public-catalog.ts`; `apps/storefront/app/find-your-scent/page.tsx` | Discovery results use the same approved product projection; wider indexing remains locked | Confirm whether approved wording may be reused on each discovery surface and under what conditions |
| Product images and alternative text | Catalog media review template; `apps/storefront/app/products/[slug]/page.tsx` | Final product media approval is incomplete | Review image rights, trade dress, labels, logos, reference presentation, and required attribution or restrictions |
| Bottle labels and outer packaging | `docs/COMMERCE.md` COM-ADR-022; no approved rendered implementation | Designer/reference names remain disabled | Give a separate explicit decision for bottle labels and outer packaging; identify prohibited and permitted elements |
| Non-affiliation disclaimer | No storefront implementation; pending review packet | No customer-facing disclaimer is present | Approve exact wording, prominence, repetition, and placement per listing, PDP, metadata, ads/social, packaging, invoice, and message surface—or direct that the reference use must not occur |
| Privacy notice and account deletion | `apps/storefront/app/privacy/page.tsx`; customer-auth/account routes | Placeholder is `noindex`; customer auth is disabled | Approve the complete notice, purposes, processors, retention, deletion, data-subject requests, and account/payment relationships |
| Contact and wholesale consent | `docs/COMMERCE_OPERATING_POLICIES.md`; `apps/storefront/components/gated-inquiry-form.tsx`; inquiry routes | Inquiries are disabled and consent version is pending | Approve exact consent text, privacy link, purpose, retention/deletion handling, support recipient, and response claims |
| Shipping policy | `apps/storefront/app/shipping/page.tsx`; `apps/storefront/lib/commerce-policy.ts` | Placeholder is `noindex`; approved projection is gated | Review serviceability, courier, delivery estimate, fee/threshold, cancellation, and support wording |
| Returns and refund policy | `apps/storefront/app/returns/page.tsx`; `apps/storefront/lib/commerce-policy.ts`; return routes | Placeholder is `noindex`; approved projection is gated | Review eligibility, unopened condition, damaged/wrong item handling, timing, approval language, refund state, and support process |
| Terms and order acceptance | `apps/storefront/app/terms/page.tsx`; checkout/payment routes | Placeholder is `noindex`; checkout is disabled | Approve order formation/acceptance, pricing error, payment state, cancellation, refund, liability, dispute, and governing-law text |
| Customer authentication and order emails | `apps/storefront/lib/customer-mail.ts` | Templates exist; SMTP and customer auth are disabled | Review verification/reset/deletion copy, order lifecycle claims, refund wording, support wording, and required legal/footer content |
| Inquiry notification email | `apps/storefront/lib/customer-mail.ts` | Internal delivery is disabled | Review reply-to handling, minimum data content, retention, access, and privacy requirements |
| Invoice/customer record | `apps/ops/app/(dashboard)/invoices/[id]/print/page.tsx`; invoice schema/workflows | Internal print view exists; commerce invoice acceptance is incomplete | Review mandatory identity/tax fields, product descriptions, reference names, disclosures, terms, and retention; coordinate tax fields with the CA |
| Reviews and customer content | `apps/storefront/lib/customer-reviews.ts`; review form and ops moderation | Submission and publication are customer-auth/catalog gated | Review consent, moderation, prohibited claims, takedown, attribution, privacy, and display requirements |
| Advertising, social, and search campaigns | No approved campaign artifact | Disabled from this packet | State whether and how approved names, comparisons, claims, images, and disclaimers may be used; require separate artifact review where necessary |

## Decisions counsel must return

For every reviewed item, record:

1. **Decision:** approved, rejected, or approved with conditions.
2. **Exact material:** the name, wording, image, or policy version reviewed.
3. **Surface scope:** listing, PDP, URL, metadata/SEO, search, ads, social,
   bottle, outer packaging, invoice, email, or customer support message.
4. **Required wording and placement:** exact text, prominence, proximity,
   repetition, and surfaces where it must appear.
5. **Restrictions:** prohibited logos, assets, claims, comparisons, keywords,
   packaging treatment, or other conditions.
6. **Evidence:** reviewer identity, decision date/time zone, and the reference to
   the signed opinion held outside the repository.

Generic approval such as “website approved” is insufficient because it does not
identify the reviewed wording or surfaces.

## Fail-closed handoff

Until the required decisions are recorded:

- the 48 current inspired discovery titles are not sale or advertising approval;
- the 34 incomplete inspired rows remain unchanged, excluded from the first
  counsel-review batch, and unlistable;
- product/catalog indexing, customer accounts, inquiries, checkout, and commerce
  maintenance remain closed;
- designer/reference names remain disabled on bottle labels and packaging;
- placeholder privacy, shipping, returns, and terms pages remain `noindex`; and
- no legal approval field or release flag may be enabled from this inventory.

## Owner handoff checklist

- [x] Owner confirmed the 69 currently visible names as the intended first
      legal-review batch on 27 August 2026; the 34 incomplete inspired rows stay
      untouched and excluded.
- [ ] Owner supplies final candidate disclaimer text only if counsel requests an owner proposal.
- [ ] Owner supplies final product images, labels, packaging, and planned advertising artifacts for the relevant surface reviews.
- [ ] Owner sends this inventory, the frozen CSV artifacts, and the counsel review packet to India counsel.
- [ ] Owner records the returned evidence reference and conditions without committing privileged material.
- [ ] Engineering maps each approved/rejected decision back to the exact catalog and surface before any activation request.
