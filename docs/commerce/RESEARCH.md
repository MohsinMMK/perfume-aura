# Commerce research

Research snapshot: 2026-07-29. Public reference sites can change. Observations below are design inputs, not claims about their current business operations.

## Method and safety boundary

- Read-only inspection of publicly accessible pages, sitemaps, structured data, search, product, collection, cart-empty, policy, and mobile experiences.
- No order, payment, checkout submission, account creation, or destructive interaction.
- Browser resource counts are session observations, not Core Web Vitals measurements.
- Perfume Aura will not copy foreign branding, assets, descriptions, code, analytics, or customer claims.

## ScentGPT snapshot

Primary sources:

- [Homepage](https://scentgpt.in/)
- [Catalog](https://scentgpt.in/collections/all)
- [Sitemap](https://scentgpt.in/sitemap.xml)
- [Agent instructions](https://scentgpt.in/agents.md)
- [UCP profile](https://scentgpt.in/.well-known/ucp)
- [Representative PDP](https://scentgpt.in/products/inspired-by-creed-aventus)

Observed catalog snapshot:

- 150 products and 880 variants
- 722 variants reported available by public product data
- 17 collection routes and 8 informational page routes
- 149 products described as Eau de Parfum
- Common size variants: 100, 50, 30, and 10 ml; perfume-oil entries also used 12 and 6 ml
- Merchandising tags included Men, Women, Best Sellers, Date Night, Wedding, Everyday, Office, New, Trend, and Bundle
- 146 products exposed fragrance-family text, 137 top/base notes, and 110 middle-note text

Observed positive patterns:

- Predictive search shows suggestions, product imagery, and pricing.
- Product pages expose size choices as buttons rather than hiding them in a select.
- Price-per-ml and best-value cues help size comparison.
- Sticky mobile purchasing keeps selected size and action available.
- Occasion-led navigation reduces dependence on fragrance vocabulary.
- Product notes, delivery information, trust content, and bundles support blind-buy decisions.
- Sitemap, structured product data, `agents.md`, and UCP discovery provide useful future machine-readable patterns.

Observed weaknesses to avoid or improve:

- Public finder/quiz routes appeared empty or unrelated to their stated purpose during inspection.
- Some promoted collection routes contained no products.
- Collection filters were limited mainly to availability and price despite rich product tags.
- Delivery and return language varied between FAQ, policy, product, and bundle content.
- Empty cart offered a return-to-shop action but no useful recovery recommendations.
- One inspected session loaded 347 resources and 119 scripts and showed repeated failed legacy WooCommerce cart requests on a Shopify storefront.
- Promotional popup, announcement content, newsletter controls, chat, and mobile controls competed for attention.
- Generic testimonials should not substitute for verified, product-linked reviews.

## Award and conversion references

- [Abel Fragrance — Awwwards](https://www.awwwards.com/sites/abel-fragrance): scent selector, product cards, bundle builder, strong mobile execution
- [KAYALI — Awwwards](https://www.awwwards.com/sites/kayali): fragrance finder, layered scent education, mobile product storytelling
- [Rahasya Fragrances — Awwwards](https://www.awwwards.com/sites/rahasya-fragrances): cinematic reveal, ingredient storytelling, cultural narrative
- [Henry Jacques — Awwwards](https://www.awwwards.com/sites/henry-jacques): guided discovery, collection journeys, wishlist patterns
- [Apotheke Perfume — Awwwards](https://www.awwwards.com/sites/apotheke-perfume): restrained black boutique presentation
- [Jusbox Perfumes — Awwwards](https://www.awwwards.com/sites/jusbox-perfumes): memorable editorial pairing concept
- [Baymard size-selection guidance](https://baymard.com/blog/use-buttons-for-size-selection): expose product variations as visible buttons

## Adaptation decision

### Take

- Predictive search once the catalog is approved
- Fragrance-family, note, occasion, intensity, size, price, and availability filters
- Explicit size buttons, price per ml, inventory state, and sticky mobile purchase action
- Editorial scent-note explanation near the buy box
- Guest checkout, transparent delivery, and clear return language
- Discovery sets and bundles once real operational support exists

### Improve

- Keep one authoritative policy source reused across PDP, cart, checkout, email, and support.
- Show only collections containing launch-approved products.
- Use verified order-linked reviews.
- Build a real rule-based scent finder from approved metadata before considering AI.
- Set a strict third-party script budget and measure each integration.

### Avoid

- Artificial urgency, permanent discount theater, or manipulative opt-out copy
- Empty routes, dead controls, or finder claims without a working result model
- Copied brand assets, product descriptions, designer logos, or customer claims
- Payment, shipping, stock, review, or delivery promises before systems and policies are proven

## India payment and trademark review — 2026-07-30

### INR and UPI gateway candidate

Owner confirmed India and INR, then asked whether UPI should be used. UPI remains a researched option rather than an approved payment requirement. [Cashfree Payments](https://www.cashfree.com/docs/payments/manage/payment-methods/upi) is a documented candidate, not an approved provider:

- Its official UPI documentation covers India UPI payments.
- Its [sandbox](https://www.cashfree.com/docs/payments/online/resources/sandbox-environment) supports test UPI VPAs.
- Its [webhook documentation](https://www.cashfree.com/docs/payments/online/webhooks/overview) requires signature verification and documents retries/resends; implementation must still be idempotent.
- Its [refund documentation](https://www.cashfree.com/docs/payments/manage/refunds/overview) supports full/partial refund APIs, status lookup, and refund webhooks.
- Its [server SDK list](https://www.cashfree.com/docs/api-reference/payments/sdk) includes a JavaScript/TypeScript Node.js SDK. This supports architectural compatibility with a Hostinger Node app but does not prove this repository's staging or production integration.
- Its [pricing page](https://www.cashfree.com/payment-gateway-charges/) lists INR payment-gateway modes and time-limited/promotional terms. Fees must be captured from the approved merchant account and contract at provider selection and rechecked before release; promotional page copy is not a durable fee decision.

[Razorpay's official UPI test documentation](https://razorpay.com/docs/payments/payments/test-upi-details/) confirms domestic Indian one-time UPI test IDs, so Razorpay remains another candidate. No provider is selected until merchant eligibility, KYC, current fees/taxes, settlements, refunds, signed webhooks, sandbox behavior, support, and Hostinger staging are compared and approved. COD and manual bank-transfer scope also remain unanswered.

### Designer-reference risk

This is planning evidence, not legal advice. Official India Code sources:

- [Trade Marks Act, 1999 PDF](https://www.indiacode.nic.in/bitstream/123456789/1993/1/a199947.pdf)
- [Section 29 — Infringement of registered trade marks](https://www.indiacode.nic.in/show-data?actid=AC_CEN_11_60_00004_199947_1517807323972&orderno=29&sectionId=16814&sectionno=29)
- [Section 30 — Limits on effect of registered trade mark](https://www.indiacode.nic.in/show-data?actid=AC_CEN_11_60_00004_199947_1517807323972&orderno=30&sectionId=16815&sectionno=30)

Cautious paraphrase only:

- Section 29 addresses infringement of a **registered** trade mark, including likely confusion or association under the statute's conditions.
- Section 29(6) treats specified acts as use of a registered mark, including affixing it to goods or packaging and using it on business papers or in advertising, under the statute's conditions.
- Section 29(8) advertising uses of a mark infringe if the advertising:
  - takes unfair advantage of **and** is contrary to honest practices in industrial or commercial matters; **or**
  - is detrimental to its distinctive character; **or**
  - is against the reputation of the trade mark.
- Section 30(1) identification-type limits apply only when use is in accordance with honest practices in industrial or commercial matters **and** is not such as to take unfair advantage of or be detrimental to the distinctive character or repute of the trade mark. Sections 30(1)(a) and 30(1)(b) are cumulative and fact-dependent.
- Neither section creates automatic clearance for `Inspired by` titles, packaging references, metadata, ads, or any other surface. Repository documentation cannot determine whether a proposed perfume reference qualifies.
- A non-affiliation disclaimer is not a statutory safe harbor.
- Competitor behavior is not government guidance and is not proof of permission or absence of disputes.

Live ScentGPT re-check on 2026-07-30 found a current competitor pattern only:

- [`Inspired By Creed Aventus`](https://scentgpt.in/products/inspired-by-creed-aventus) appears in the product title and URL; its public Shopify JSON records vendor `Creed` and the same title.
- The reviewed product image displays `SCENTGPT` and `AVENTUS` on the bottle, without the word `CREED`.
- ScentGPT's [About page](https://scentgpt.in/pages/about) states that its products are inspired alternatives, attributes third-party marks to their owners, disclaims affiliation, and describes references as a comparative guide.
- This observation proves what one seller currently publishes. It does not prove registration status, permission, absence of disputes, or that the same wording/layout satisfies sections 29 and 30 for Perfume Aura.

Owner-selected planning direction after reviewing that pattern:

- All 21 in-house Signature Series names remain exact standalone backend/frontend names with no `Inspired by` prefix.
- Inspired products are planned for future title format `Inspired by <owner-confirmed reference>` rather than separate Perfume Aura names.
- Exact reference mapping must be resolved before generating a title; ambiguous source text cannot silently become a famous mark.
- A non-affiliation disclaimer is planned, but its exact text, placement, and surface coverage remain pending official/legal review. The catalog does not encode a disclaimer as clearance.
- Designer logos, copied bottles/packaging, copied images, and copied descriptions remain forbidden.
- Designer and inspired-reference names remain disabled on bottle labels and packaging until separate explicit owner approval and India-counsel approval for that surface (COM-ADR-022). That product policy is fail-closed surface control, not legal clearance. Current work authorizes catalog planning only, not storefront implementation or publication.

## Perfume Aura catalog source

Source reviewed: user-supplied [`Perfume_List_Table.pdf`](../../data/catalog/source/Perfume_List_Table.pdf).

SHA-256:

```text
cfe8a5c88c08b99baa7b9a57ccab8fd99a0b0f5aafb446ccfcb38015e0aa22c2
```

Transcription facts:

- Four pages
- Main unlabeled list numbered 1–82
- Signature Series numbered 1–21
- 103 total names
- PDF supplies names only; it does not supply confirmed classifications, public naming, sizes, prices, SKUs, stock, notes, audience, concentration, images, or launch status

Potentially ambiguous source spellings are preserved exactly and flagged in the CSV. No silent correction or trademark classification has been applied.

`pnpm commerce:verify` confirms the retained binary matches this PDF digest and freezes the reviewed CSV source-section, source-number, and source-name sequence. It does not automatically reparse or visually compare PDF text. Any source-name or digest change requires a fresh manual PDF comparison before updating verifier constants.
