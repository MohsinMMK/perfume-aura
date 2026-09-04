# Catalog, legal, and storefront reference

High-volume catalog identity, legal research, storefront design contract, and
source evidence. Current product/release locks belong in
[Product behavior](COMMERCE.md#product-behavior) and [`COMMERCE.md`](COMMERCE.md). Live production
state belongs in [`CURRENT_STATE.md`](CURRENT_STATE.md). These records are not
publication approval, trademark clearance, or production authorization.

- [Research](#research): design, payments, trademark sources, and catalog provenance
- [Mapping register](#mapping-register): status summary, approved rows, exceptions, and pending inputs
- [Storefront design](#storefront-design): tokens, interaction, motion, and adaptation limits
- [Verification](#verification): current acceptance procedure

<!-- reference:research:start -->
## Research

Use approved catalog evidence and current source contracts. Do not copy foreign
branding, assets, code, fonts, analytics or claims. Do not promise payment,
shipping, stock or reviews before the corresponding gates pass.

### India payment and trademark sources

#### Cashfree prepaid UPI

COM-ADR-030 supersedes COM-ADR-025: checkout is prepaid-only through Cashfree
UPI, with no cash on delivery. Google Pay is a UPI
app reached through the provider's supported intent flow, not a separate direct
payment integration. The official sources below support implementation review
but do not prove merchant approval or production readiness:

- Its official [UPI payment-method documentation](https://www.cashfree.com/docs/payments/manage/payment-methods/upi) covers India UPI intent, QR, and collect flows.
- Its [sandbox](https://www.cashfree.com/docs/payments/online/resources/sandbox-environment) supports test UPI VPAs.
- Its [webhook documentation](https://www.cashfree.com/docs/payments/online/webhooks/overview) requires signature verification and documents retries/resends; implementation must still be idempotent.
- Its [refund documentation](https://www.cashfree.com/docs/payments/manage/refunds/overview) supports full/partial refund APIs, status lookup, and refund webhooks.
- Its [server SDK list](https://www.cashfree.com/docs/api-reference/payments/sdk) includes a JavaScript/TypeScript Node.js SDK.
- Its [pricing page](https://www.cashfree.com/payment-gateway-charges/) is not a durable merchant fee decision; use the approved account contract.

Release still requires KYC, sandbox and live credentials, signed-webhook proof,
refund/reconciliation proof, account-specific fees, approved UPI methods, and
an authorized prepaid lifecycle test. No substitute provider is approved.

#### Designer-reference risk

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

Current naming policy:

- All 20 owner-supplied Signature Series names remain exact standalone backend/frontend names with no `Inspired by` prefix.
- Inspired products use listing title format `Inspired by <brand> <reference>` rather than separate Perfume Aura names (COM-ADR-029 / 033). If the cleaned reference already begins with the brand, do not repeat the brand.
- Exact reference mapping must be resolved before generating a title; ambiguous source text cannot silently become a famous mark. The current workbook has no remaining unresolved main-list titles.
- A non-affiliation disclaimer is planned, but its exact text, placement, and surface coverage remain pending official/legal review. The catalog does not encode a disclaimer as clearance.
- Designer logos, copied bottles/packaging, copied images, and copied descriptions remain forbidden.
- Designer and inspired-reference names remain disabled on bottle labels and packaging until separate explicit owner approval and India-counsel approval are recorded for that surface (COM-ADR-022). That product policy is fail-closed surface control, not legal clearance. Discovery listing titles are already live on `/shop`. This research does not authorize India-counsel clearance, bottle or packaging references, ads, Neon import, or sellable publication.

### Perfume Aura catalog source

Replacement sources supplied by the owner on 2026-08-29:

- [Premium Segment image](../data/catalog/source/Perfume_Aura_Premium_Segment_2026-08-29.png) — SHA-256 `1c6d741ba6231ba5d806cf2044f2bc62d681b0d0c34c6150864ae0abe07fcdcf`
- [₹450 / ₹650 / ₹1,200 price-list PDF](../data/catalog/source/Perfume_Aura_Price_List_450_650_1200.pdf) — SHA-256 `23f945e637a791cef6078029fd4d69f65e1f99bf05f73f6856e4825c349a133e`
- [Signature Series image](../data/catalog/source/Perfume_Aura_Signature_Series_2026-08-29.png) — SHA-256 `69cac3ea92827a3baed7274f9f2c1ce92557a3e9a3333f1291a0d102adacb910`

Transcription facts:

- Premium Segment image supplies main rows 1–16 with 30/50/100 ml prices of ₹600/₹800/₹1,400.
- Price-list PDF supplies main rows 17–94 with 30/50/100 ml prices of ₹450/₹650/₹1,200.
- Signature Series image supplies 20 exact names and 50/105 ml prices: ₹1,200/₹2,200 for rows 1–12 and 14–19; ₹1,800/₹3,000 for Oud of Dubai and Visionnaire.
- Active replacement scope is 94 main rows plus 20 Signature rows: 114 products and 322 size variants.
- The owner-supplied artifacts authorize exact catalog names and retail prices only. They do not approve reference mappings, trademark use, SKUs, costs, stock, product copy, media rights, publication, checkout, or release flags.

Canonical source transcription digest: `2ad2260ce293b0337bd92b79f98dba8b01631db4409c139590b7df3372c8460a`.

`pnpm commerce:verify` confirms all three retained replacement artifact digests and freezes the reviewed CSV source-section, source-number, source-name, sizes, and retail-price sequence. It does not automatically reparse or visually compare the source artifacts. Any source-name, size, price, or digest change requires a fresh manual comparison before updating verifier constants.
<!-- reference:research:end -->

<!-- reference:mapping-register:start -->
## Mapping register

Status: owner-reviewed mapping register for catalog planning. This file is not public copy, trademark clearance, or publication approval.

### Rules

- `source_name` remains the exact supplied transcription and never changes here.
- Approved mappings feed the live `Inspired by <brand> <reference>` listing
  titles (COM-ADR-029 / 033). That listing is identity only, not legal
  clearance or Neon publication.
- Evidence URLs and evidence metadata support identity research only. They do not grant trademark permission or approve a disclaimer.
- `owner_approved_title_reference` records the exact brand/reference string
  used to generate the storefront listing title and slug. It is not
  India-counsel clearance, disclaimer approval, or permission to use
  references on bottle labels or packaging.
- `not_applicable_unknown` records the owner's temporary Unknown classification:
  the literal supplied name is listable, while brand/reference fields remain
  blank and permanent naming still needs owner review.
- Evidence metadata fields:
  - `source_type`: `official_brand`, `official_regional`, `retailer`, `archive`, or `evidence_gap`
  - `content_support`:
    - `confirmed` — dated manual audit found readable support for the mapped brand/reference on the cited page (or its recorded effective URL)
    - `blocked` — official/host citation exists, but anti-bot, auth, or transport blocked content validation
    - `weak` — page reachable but only generic/shell/landing support, or identity support is partial
    - `mismatch` — citation identity conflicts with the approved mapping; must be removed or converted to `evidence_gap`
    - `none` — no durable citation (`evidence_gap` only)
  - `audit_date`: real calendar ISO date of the latest manual evidence audit
  - `effective_url`: final URL after observed redirect, or blank when unused/no redirect
- `retailer` rows are strongest-available identity evidence only. They are never official proof. Only explicitly listed exception keys may use `retailer`.
- `evidence_gap` keeps the owner-approved mapping identity and records that durable supporting citation is missing. It does not invent a URL.
- Official `source_type` rows must use brand-bound audited first-party hosts. Matching is exact hostname equality against the audited host list (no arbitrary subdomain wildcards). Known retailer hosts and unlisted retail hosts cannot be labeled official.
- Every non-blank original evidence URL and every non-blank effective URL must be globally unique across approved rows. Cross-row reuse of either field fails even when the other field differs.
- Live HTTP reachability is outside `pnpm commerce:verify`. Content-support values come from dated manual audit, not CI network checks.
- Audit snapshot for current metadata: 2026-08-29 reconciliation of all 49
  formerly incomplete replacement rows, preserving the 2026-07-30 evidence
  audits for carried mappings.
- Approved mapping identity tuples `(key, source_name, brand, reference, status, decision)` are digest-attested by `pnpm commerce:verify` and by the locked authority line in [`COMMERCE.md`](COMMERCE.md#approved-mapping-identity-digest-protocol). Changing an approved identity requires a new COM-ADR that cites the replacement digest, deliberate verifier constant + authority-line update, and matching launch-workbook edits in the same change. Verifier cannot stop a total coordinated rewrite of every trust anchor; code review remains the final gate for that class of edit.

### Current summary

- Main source rows: 94
- Owner-approved Inspired title references: 79
- Temporary Unknown collection rows: 15
- Family/exact mappings still pending: 0
- Unresolved mapping rows: 0
- In-house Signature rows with mapping not applicable: 20
- Evidence gaps on approved rows: 3 (`main_list:37`, `main_list:74`, `main_list:87`)
- Strongest-available retailer exceptions: 1 (`main_list:35`)

### Main-list mapping register

| Key | Source transcription | Approved/candidate brand | Approved/candidate reference | Mapping state | Evidence URL | Source type | Content support | Audit date | Effective URL | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| main_list:1 | Bvlgari Tygar | Bvlgari | Tygar | owner_approved_title_reference | https://www.bulgari.com/en-us/product/LE-GEMME-TYGAR | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:2 | Dior Sauvage | Dior | Sauvage family | owner_approved_title_reference | https://www.dior.com/en_us/beauty/products/sauvage-eau-de-toilette-Y0685240.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:3 | Louis Vuitton Afternoon Swim | Louis Vuitton | Afternoon Swim | owner_approved_title_reference | https://us.louisvuitton.com/eng-us/products/afternoon-swim-nvprod3630151v/LP0314 | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:4 | Green Creed | Creed | Green Irish Tweed | owner_approved_title_reference | https://creedboutique.com/collections/all-fragrances/products/green-irish-tweed | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:6 | Hawas for Him | Rasasi | Hawas for Him | owner_approved_title_reference | https://store.rasasi.com.sa/en/wlqzamr/p2072824605 | official_regional | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:7 | Elysium Roja | Roja Parfums | Elysium Pour Homme family | owner_approved_title_reference | https://www.rojaparfums.com/products/elysium-homme-edp | official_brand | confirmed | 2026-07-30 | https://www.rojalondon.com/products/elysium-homme-edp | COM-ADR-021 |
| main_list:8 | Emporio Armani Stronger With You | Emporio Armani | Stronger With You family | owner_approved_title_reference | https://www.armani.com/en-us/emporio-armani/experience/fragrances-ea/ | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:9 | Hudson Valley | Gissah | Hudson Valley | owner_approved_title_reference | https://qa.gissah.com/shop/g00031-hudson-valley-200ml-1761 | official_regional | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:10 | Heaven Rose | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:11 | Gucci Flora | Gucci | Flora family | owner_approved_title_reference | https://www.gucci.com/us/en/ca/beauty/fragrances/fragrances-for-women/gucci-flora-c-fragrances-women-flora-by-gucci | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:12 | YSL Y | Yves Saint Laurent | Y family | owner_approved_title_reference | https://www.yslbeauty.com/int/the-y-collection/y.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:13 | Rose Elegance | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:14 | Alexandria II | Xerjoff | Alexandria II | owner_approved_title_reference | https://www.xerjoff.com/en-us/products/alexandria-ll-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:15 | Aurum | Ajmal | Aurum | owner_approved_title_reference | https://en-ae.ajmal.com/aurum-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:16 | Black Afgano | Nasomatto | Black Afgano | owner_approved_title_reference | https://nasomatto.com/products/black-afgano | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:17 | Aqua Di Gio | Giorgio Armani | Acqua di Giò | owner_approved_title_reference | https://www.giorgioarmanibeauty-usa.com/fragrances/mens-cologne/acqua-di-gio/ | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:18 | Azzaro Chrome | Azzaro | Chrome | owner_approved_title_reference | https://www.azzaro.com/en/fragrances/azzaro-chrome/eau-de-toilette | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:19 | Versace Pour Homme | Versace | Pour Homme | owner_approved_title_reference | https://www.versace.com/us/en/pour-homme/SET_Fragrances_PourHomme.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:20 | Hugo Boss | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:21 | Polo Sport | Ralph Lauren | Polo Sport | owner_approved_title_reference | https://corporate.ralphlauren.com/on/demandware.static/-/Sites-RalphLauren_Corporate-Library/default/dwb49e2771/assets/images/PRESS_RELEASES/Polo%20Est.%2067%20Eau%20De%20Toilette%20Press%20Release.pdf | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:22 | Bleu de Chanel | Chanel | Bleu de Chanel | owner_approved_title_reference | https://www.chanel.com/us/fragrance/men/c/7x1x2x34/bleu-de-chanel/ | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:23 | Prada Luna | Prada | Luna Rossa | owner_approved_title_reference | https://www.prada-beauty.com/fragrance/luna-rossa/luna-rossa-eau-de-toilette/MPL01360.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:24 | CK One | Calvin Klein | CK One | owner_approved_title_reference | https://www.calvinklein.us/en/ck-one-spray/10740.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:25 | Rehab Blue | Al-Rehab | Blue | owner_approved_title_reference | https://alrehab.com/wp-content/uploads/Catalogues/Alrehab_3ML_1Pcs_Catalogue.pdf | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:26 | Hawas Ice | Rasasi | Hawas Ice | owner_approved_title_reference | https://store.rasasi.com.sa/en/aeezlxd/p330366857 | official_regional | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:27 | Bvlgari Aqva | Bvlgari | Aqva Pour Homme | owner_approved_title_reference | https://www.bulgari.com/pt-br/fragrancias/masculino | official_regional | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:28 | Polo Blue | Ralph Lauren | Polo Blue | owner_approved_title_reference | https://www.ralphlauren.com/men-accessories-fragrance/polo-blue-eau-de-toilette/111518.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:29 | Cool Water Women | Davidoff | Cool Water Woman | owner_approved_title_reference | https://www.zinodavidoff.com/fragrances/cool-water-woman-eau-de-toilette-100-ml | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:30 | Cool Water | Davidoff | Cool Water | owner_approved_title_reference | https://www.zinodavidoff.com/fragrances/cool-water-eau-de-toilette-125-ml | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:31 | Bright Crystal | Versace | Bright Crystal | owner_approved_title_reference | https://www.versace.com/us/en/women/accessories/fragrances-body-care/bright-crystal/ | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:32 | CR7 | Cristiano Ronaldo | CR7 | owner_approved_title_reference | https://cristianoronaldo.com/brands | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:33 | Dunhill Icon | Dunhill | Icon | owner_approved_title_reference | https://www.dunhill.com/nl/men/icon | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:34 | Diptyque Tam Dao | Diptyque | Tam Dao family | owner_approved_title_reference | https://us.diptyqueparis.com/en-us/products/eau-de-parfum-tam-dao-tamdaop75cv1 | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:35 | One Million Lucky | Rabanne | 1 Million Lucky | owner_approved_title_reference | https://www.ulta.com/p/1-million-lucky-eau-de-toilette-xlsImpprod18151073 | retailer | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:36 | CH 212 Men | Carolina Herrera | 212 Men family | owner_approved_title_reference | https://www.carolinaherrera.com/us/en/c/fragrances/fragrances_men/menfragrances_212 | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:37 | 212 VIP Men | Carolina Herrera | 212 VIP Men | owner_approved_title_reference | — | evidence_gap | none | 2026-07-30 | — | COM-ADR-018 |
| main_list:38 | Azzaro Most Wanted | Azzaro | The Most Wanted | owner_approved_title_reference | https://www.azzaro.com/en/fragrances/azzaro-the-most-wanted | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:39 | JPG Scandal | Jean Paul Gaultier | Scandal family | owner_approved_title_reference | https://www.jeanpaulgaultier.com/us/en_US/p/range-scandal/scandal-eau-de-parfum-000000000065176518 | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:40 | Tom Ford Oud Wood | Tom Ford | Oud Wood | owner_approved_title_reference | https://www.tomfordbeauty.com/product/oud-wood-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:41 | I Want Choo | Jimmy Choo | I Want Choo | owner_approved_title_reference | https://us.jimmychoo.com/en/women/beauty/fragrance/i-want-choo-100ml/jimmy-choo-i-want-choo-eau-de-parfum-100ml-J000144607001.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:42 | Burberry Her | Burberry | Her family | owner_approved_title_reference | https://us.burberry.com/c/burberry-her/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:43 | 1 Million | Rabanne | 1 Million | owner_approved_title_reference | https://www.rabanne.com/us/en_US/fragrance/p/1-million-parfum--000000000065156000 | official_brand | weak | 2026-07-30 | — | COM-ADR-018 |
| main_list:44 | Armani Passione | Giorgio Armani | Sì Passione family | owner_approved_title_reference | https://www.giorgioarmanibeauty-usa.com/fragrances/womens-perfume/si/si-passione-eau-de-parfum/3614271994721.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:45 | Polo Sport Women | Ralph Lauren | Polo Sport Woman | owner_approved_title_reference | https://investor.ralphlauren.com/static-files/0db4c61d-dd53-49fa-9e3c-2b869481b01f | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:46 | Ultra Male | Jean Paul Gaultier | Ultra Male | owner_approved_title_reference | https://www.jeanpaulgaultier.com/us/en_US/p/range/eau-de-toilette-intense-000000000065119981 | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:47 | Gucci Bloom | Gucci | Bloom family | owner_approved_title_reference | https://www.gucci.com/us/en/pr/beauty/fragrances/fragrances-for-women/gucci-bloom-100ml-eau-de-parfum-p-488830999990099 | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:48 | Flower Bomb | Viktor&Rolf | Flowerbomb | owner_approved_title_reference | https://us.viktor-rolf.com/fragrance/flowerbomb-eau-de-parfum-VKR_002.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:49 | Coco Chanel | Chanel | Coco | owner_approved_title_reference | https://www.chanel.com/us/fragrance/coco/c/7x2x6/ | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:50 | Invictus | Rabanne | Invictus family | owner_approved_title_reference | https://www.rabanne.com/us/en_US/fragrance/p/invictus-miniature--000000000065055745 | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:51 | YSL Libre | Yves Saint Laurent | Libre family | owner_approved_title_reference | https://www.yslbeauty.com/int/libre.html | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:52 | Erba Pura | Xerjoff | Erba Pura | owner_approved_title_reference | https://www.xerjoff.com/en-de/products/erba-pura-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:53 | Club de Nuit | Armaf | Club de Nuit family | owner_approved_title_reference | https://armaf.com/ | official_brand | weak | 2026-08-29 | — | COM-ADR-033 |
| main_list:54 | Baccarat Rouge 540 | Maison Francis Kurkdjian | Baccarat Rouge 540 family | owner_approved_title_reference | https://www.franciskurkdjian.com/us-en/landing_page_baccarat-rouge-540.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:55 | Ombre Nomad | Louis Vuitton | Ombre Nomade | owner_approved_title_reference | https://us.louisvuitton.com/eng-us/products/ombre-nomade-nvprod990245v/LP0095 | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:56 | Prada Candy | Prada | Candy family | owner_approved_title_reference | https://www.prada-beauty.com/fragrance/candy/candy-eau-de-parfum/MPL01333.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:57 | Black Orchid | Tom Ford | Black Orchid family | owner_approved_title_reference | https://www.tomfordbeauty.com/products/black-orchid-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:58 | Dior Homme Intense | Dior | Dior Homme Intense | owner_approved_title_reference | https://www.dior.com/en_us/beauty/products/dior-homme-intense-Y0479201.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:59 | Delina | Parfums de Marly | Delina family | owner_approved_title_reference | https://us.parfums-de-marly.com/products/delina | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:60 | Chocolate Musk | Al-Rehab | Choco Musk | owner_approved_title_reference | https://alrehab.com/wp-content/uploads/Catalogues/Alrehab.pdf | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:61 | One Million Elixir | Rabanne | 1 Million Elixir | owner_approved_title_reference | https://www.rabanne.com/ww/en/fragrance/p/1-million-elixir--000000000065177272 | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:62 | Narciso For Her | Narciso Rodriguez | for Her family | owner_approved_title_reference | https://www.narcisorodriguezparfums.com/en/fragrances/for-her/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:63 | Good Girl | Carolina Herrera | Good Girl family | owner_approved_title_reference | https://www.carolinaherrera.com/us/en/editorial/fragrances-good-girl | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:64 | Black Opium | Yves Saint Laurent | Black Opium family | owner_approved_title_reference | https://www.yslbeautyus.com/fragrance/womens-fragrances/black-opium/black-opium-eau-de-parfum-spray/252YSL.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:65 | Burberry Weekend | Burberry | Weekend family | owner_approved_title_reference | https://us.burberry.com/burberry-weekend-eau-de-parfum-100ml-p34547061 | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:66 | Terre d'Hermes | Hermès | Terre d'Hermès family | owner_approved_title_reference | https://www.hermes.com/us/en/content/101186-terre-d-hermes/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:67 | Tom Ford Tobacco Vanille | Tom Ford | Tobacco Vanille | owner_approved_title_reference | https://www.tomfordbeauty.com/products/tobacco-vanille-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:68 | VS Bombshell | Victoria's Secret | Bombshell family | owner_approved_title_reference | https://www.victoriassecret.com/us/vs/beauty/fragrances-bombshell-shop | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:69 | Bvlgari Man in Black | Bvlgari | Man in Black family | owner_approved_title_reference | https://www.bulgari.com/en-us/fragrances/bvlgari-man | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:70 | Versace Dylan Blue | Versace | Dylan Blue Pour Homme | owner_approved_title_reference | https://www.versace.com/us/en/men/accessories/fragrances-body-care/dylan-blue-pour-homme/dylan-blue-pour-homme-edt-100-ml-blue/R721010-R100MLS_RTU_TU_RNUL__.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:71 | Ombre Leather | Tom Ford | Ombré Leather family | owner_approved_title_reference | https://www.tomfordbeauty.com/products/ombre-leather-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:72 | Oud of Aura | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:73 | Arabian Oud | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:74 | CK Escape | Calvin Klein | Escape | owner_approved_title_reference | — | evidence_gap | none | 2026-08-29 | — | COM-ADR-033 |
| main_list:75 | Leather Noir | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:76 | Amber Al Oud | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:77 | Purple Oud | Dior | Purple Oud | owner_approved_title_reference | https://www.dior.com/en_us/beauty/products/purple-oud-Y0786427.html | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:78 | Gucci Guilty | Gucci | Guilty family | owner_approved_title_reference | https://www.gucci.com/us/en/ca/beauty/fragrances/fragrances-for-men/gucci-guilty-for-men-c-fragrances-men-gucci-guilty | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:79 | Yara Candy | Lattafa | Yara Candy | owner_approved_title_reference | https://www.lattafa-usa.com/products/yara-candy | official_regional | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:80 | Khamrah | Lattafa | Khamrah | owner_approved_title_reference | https://lattafa.com/product/khamrah/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:81 | White Oud | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:82 | Candy Oud | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:83 | Coffee | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:84 | Wisal | Ajmal | Wisal | owner_approved_title_reference | https://en-ae.ajmal.com/wisal | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:85 | Oud Mumtaz | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:86 | Khamrah Qahwa | Lattafa | Khamrah Qahwa | owner_approved_title_reference | https://lattafa.com/product/khamrah-qahwa/ | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:87 | CR7 Sport | Cristiano Ronaldo | CR7 Sport | owner_approved_title_reference | — | evidence_gap | none | 2026-08-29 | — | COM-ADR-033 |
| main_list:88 | Fawake | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:89 | Dareej | Rasasi | Daarej Pour Homme | owner_approved_title_reference | https://store.rasasi.com.sa/en/dpqdewz/p1037939516 | official_regional | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:90 | Mysore Sandal | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:91 | Sabaya | Al-Rehab | Sabaya | owner_approved_title_reference | https://alrehab.com/wp-content/uploads/Catalogues/Alrehab_100ML.pdf | official_brand | confirmed | 2026-08-29 | — | COM-ADR-033 |
| main_list:92 | Oud Saffron | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:93 | Areen Al Oud | — | — | not_applicable_unknown | — | — | — | 2026-08-29 | — | COM-ADR-033 |
| main_list:94 | Imperial Valley | Gissah | Imperial Valley | owner_approved_title_reference | https://qa.gissah.com/shop/category/signature-line-13/page/3?order=create_date+desc | official_regional | confirmed | 2026-08-29 | — | COM-ADR-033 |

#### Documented evidence exceptions and gaps

| Key | Mapping identity retained | Evidence handling | Reason |
|---|---|---|---|
| main_list:35 | Rabanne — `1 Million Lucky` | `retailer` / Ulta URL kept as strongest-available identity support | No durable official Rabanne/manufacturer or archive page established in the 2026-07-30 audit. Retailer page supports identity only; not official proof. |
| main_list:37 | Carolina Herrera — `212 VIP Men` | `evidence_gap` / no URL | Prior citation used nonexistent `carolinaherreras.com` and a `212 VIP Black` path. Owner mapping stays; durable first-party VIP Men evidence remains outstanding. |
| main_list:74 | Calvin Klein — `Escape` | `evidence_gap` / no URL | The supplied `CK Escape` string is a strong potential Calvin Klein mapping, but no durable current first-party product URL was found in this pass. The owner-directed Inspired classification is recorded without inventing evidence. |
| main_list:87 | Cristiano Ronaldo — `CR7 Sport` | `evidence_gap` / no URL | Cristiano Ronaldo's official brand page supports the CR7 fragrance brand but did not expose the exact `CR7 Sport` product. The exact potential mapping is retained without presenting secondary results as first-party proof. |

### Signature Series identity register

All rows below use the exact owner-supplied replacement names. They never receive an `Inspired by` prefix or external reference mapping. Trademark clearance remains pending.

| Key | Owner-approved public name | Name status | Reference mapping | Legal state | Decision |
|---|---|---|---|---|---|
| signature_series:1 | Regent Noir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:2 | Velour Venom | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:3 | Serpent Noir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:4 | Kingdom Elixir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:5 | Azure Tides | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:6 | Crimson Elixir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:7 | Eternal Athena | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:8 | Blush Petal | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:9 | Sahara Bloom | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:10 | Zayan Prestige | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:11 | Smoked Crimson | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:12 | Desert Crown Oud | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:13 | Oud of Dubai | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:14 | Royal Stabler | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:15 | Velvet Petal | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:16 | Rouge Lumina | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:17 | Petalia Noir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:18 | Rose Valeria | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:19 | Celestial Ember | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |
| signature_series:20 | Visionnaire | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-032 |

### Remaining review buckets

All 94 main-list rows are classified. The remaining review work is limited to
the 3 documented evidence gaps and selecting permanent collection naming for
the 15 temporary Unknown rows; never invent supporting evidence or infer a
mapping from spelling similarity alone.
<!-- reference:mapping-register:end -->

<!-- reference:storefront-design:start -->
## Storefront design

Perfume Aura owns its name, media, copy, routes and accessible interactions.
The design contract adapts editorial proportions, not third-party assets or code.

### Typography and licensing

| Role | Live source | Perfume Aura decision |
|---|---|---|
| Body and UI | `Inter Tight`, variable 100–900, with Arial metric fallback | Use `@fontsource-variable/inter-tight` under SIL OFL 1.1. |
| Display and buttons | `PeperoncinoSansCustom`, regular 400, with Arial metric fallback | Do not copy the live WOFF. The Resistenza family requires appropriate WebFont rights. Implemented Perfume Aura display faces are self-hosted Londrina Solid and Londrina Outline; Inter Tight remains body.  |

Primary license references:

- [Inter Tight on Google Fonts](https://fonts.google.com/specimen/Inter+Tight)
- [SIL Open Font License 1.1](https://openfontlicense.org/)
- [Peperoncino Sans licensing](https://www.myfonts.com/collections/peperoncino-sans-font-resistenza/)

The live display treatment is uppercase, condensed, about `-0.02em` tracking,
and tightly led. At the captured mobile hero it measured approximately
`52px / 45.76px`; desktop uses fluid clamp tokens and reached approximately
`88.89px / 78.22px` at 1280px. Perfume Aura should match those roles and fluid
proportions without claiming the commercial source font.

### Tokens and geometry

| Token | Value | Adaptation |
|---|---:|---|
| Canvas | `#100b06` | Primary Perfume Aura background |
| Foreground | `#f5e4c7` | Text, light panels, and primary controls |
| Menu | `#322c23` | Secondary dark controls and elevated surfaces |
| Elevated dark | `#272119` | Low-contrast dark panel option |
| Brown | `#593e2c` | Supporting neutral accent |
| Gold | `#be8d3f` | Brass / first editorial theme |
| Orange | `#f15726` | Second editorial theme and progress accent |
| Red | `#da1f27` | Third editorial theme |

Layout grammar:

- 12-column fluid system with `10px` mobile and `20px` desktop gaps.
- `5px` mobile and `10px` desktop outer gutters in the source; Perfume Aura may
  increase the smallest gutter where touch or reading comfort requires it.
- Primary composition change at `1024px`, supported by `640`, `768`, `1280`,
  and `1536px` refinements.
- Predominantly `10px` corner radii, one-pixel dashed cream rules near 30%
  opacity, oversized full-bleed media, and alternating dark/cream panels.
- Large uppercase section titles, tight editorial crops, small uppercase
  metadata, and explicit numbered sequences provide the visual rhythm.
- Interactive targets remain at least `44px`; desktop source inputs measured
  about `77px` high and close controls about `48px` square.

### Information and interaction rhythm

The reusable source pattern is:

1. Immersive product-led hero with manual next/previous controls.
2. Oversized brand statement interrupted by floating product imagery.
3. Short numbered value or guidance rows.
4. Three-up product/editorial cards with accent themes.
5. Pinned desktop narrative that moves horizontally with scroll.
6. Alternating image-led story panel and large closing product edit.
7. Dense footer combining identity, navigation, status/newsletter, and utility
   actions.

Desktop begins with a complete inline navigation. Scrolling condenses it into a
small identity, primary CTA, cart, and menu cluster. The menu becomes an ivory
right-hand panel approximately six columns wide; the cart is a separate ivory
panel. On mobile each becomes an almost full-viewport sheet inset from the
edges. Perfume Aura keeps its existing inert modal primitive, focus trap,
labelled controls, focus restoration, and route-aware menu closing.

The source retains a simplified icon after its full mark leaves. Perfume Aura
adapts that transition to its own supplied assets: the bottle icon lifts and
fades while the `PERFUME AURA` wordmark settles into the compact header. This
owner-selected inversion preserves brand recognition without copying the
source mark or its exact animation.

Catalog cards use a second-image reveal, title movement, and collection-aware
size/price selection. In production, Add to cart stays disabled unless
`STOREFRONT_PREVIEW_CATALOG=true`; local development also enables preview
carts. WhatsApp remains the honest public order path. Do not fake a working
checkout control.

### Motion contract

Perfume Aura uses its existing GSAP/ScrollTrigger dependency for scoped reveals,
parallax, a desktop-only pinned journey, and a pausable marquee. Native scrolling
remains the foundation; no Lenis dependency is added because it is not needed
to reproduce the composition and could interfere with accessibility. All
animations must:

- disable cleanly for `prefers-reduced-motion`;
- avoid hiding meaningful content before JavaScript runs;
- clean up only triggers created by their own component;
- pause continuous motion during hover, keyboard focus, or document hiding;
- preserve usable native horizontal scroll-snap on mobile.

### Fidelity and adaptation matrix

| Source pattern | Perfume Aura implementation | Boundary |
|---|---|---|
| Inter Tight body typography | Exact open font package | OFL attribution retained in the package |
| Peperoncino display typography | Self-hosted Londrina Solid / Londrina Outline | No source WOFF copying |
| Dark cream/gold/orange/red palette | Exact relationship using Perfume Aura tokens | Perfume Aura imagery and content only |
| Product-led hero and manual slider | Perfume Aura bottle compositions and labelled controls | No automatic carousel or copied fruit/media |
| Compact scrolled header | Supplied full mark transitions to the supplied wordmark beside the route-aware CTA, cart, and menu cluster | Existing release locks remain authoritative |
| Cream menu/cart sheets | Accessible controlled sheets with focus management | Do not copy non-inert closed panels |
| Pinned horizontal narrative | Desktop GSAP journey; mobile native scroll-snap cards | Reduced motion remains complete and readable |
| Hover product reveal | CSS-owned reveal with real routes and honest locked state | No duplicated GSAP hover ownership |
| Newsletter/status footer cell | Clearly non-input status panel until subscription exists | No dead form control or collection claim |

### Defects that must not be copied

- Global outline removal from controls.
- Closed overlays that remain exposed to assistive technology.
- Clickable FAQ `div` elements without button or keyboard semantics.
- Tabs without `aria-expanded` and `aria-controls` relationships.
- Duplicate animated labels that produce repeated accessible names.
- Placeholder-only forms without persistent labels.
- A blocking intro or any animation without a reduced-motion alternative.

Fresh browser evidence outranks this document. Update this contract when the
implemented design changes.
<!-- reference:storefront-design:end -->

<!-- reference:evidence:start -->
## Verification

Use current source and fresh endpoint/browser evidence. Run the commands in
[Engineering](ENGINEERING.md#local-development-and-validation) and the exact
public gate in [Operations](OPERATIONS.md#production-acceptance). For visual
changes compare desktop/mobile, keyboard focus, closed dialogs and reduced
motion. Screenshots stay outside tracked source. A local pass does not establish
production acceptance or authorize opening a release flag.
<!-- reference:evidence:end -->
