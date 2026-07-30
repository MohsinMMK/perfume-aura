# Commerce reference mapping review

Status: owner-reviewed mapping register for catalog planning. This file is not public copy, trademark clearance, or publication approval.

## Rules

- `source_name` remains the exact supplied transcription and never changes here.
- Approved mappings are internal inputs for the future `Inspired by <owner-confirmed reference>` title policy in COM-ADR-017.
- Evidence URLs and evidence metadata support identity research only. They do not grant trademark permission or approve a disclaimer.
- `owner_approved_title_reference` records the exact brand/reference string approved for title planning; it does not populate a public title or slug.
- `family_approved_exact_pending` still needs exact product, flanker, or concentration resolution.
- `unresolved` and `needs_owner_input` remain fail-closed.
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
- Audit snapshot for current metadata: 2026-07-30 round-2 manual follow-up after round-1 official-source review (URL/provenance corrections and metadata semantics).
- Approved mapping identity tuples `(key, source_name, brand, reference, status, decision)` are digest-attested by `pnpm commerce:verify` and by the locked authority line in [`DECISIONS.md`](./DECISIONS.md). Changing an approved identity requires a new COM-ADR that cites the replacement digest, deliberate verifier constant + authority-line update, and matching launch-workbook edits in the same change. Verifier cannot stop a total coordinated rewrite of every trust anchor; code review remains the final gate for that class of edit.

## Current summary

- Inspired rows: 82
- Owner-approved title references: 48
- Owner-approved family mappings with exact detail pending: 4
- Explicitly unresolved: 4
- Still needing owner input: 26
- In-house Signature rows with mapping not applicable: 21
- Evidence gaps on approved rows: 1 (`main_list:22`)
- Strongest-available retailer exceptions: 1 (`main_list:20`)

## Inspired mapping register

| Key | Source transcription | Approved/candidate brand | Approved/candidate reference | Mapping state | Evidence URL | Source type | Content support | Audit date | Effective URL | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| main_list:1 | Bvlgari Tygar | Bvlgari | Tygar | owner_approved_title_reference | https://www.bulgari.com/en-us/product/LE-GEMME-TYGAR | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:2 | Dior Sauvage | Dior | Sauvage family | owner_approved_title_reference | https://www.dior.com/en_us/beauty/products/sauvage-eau-de-toilette-Y0685240.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:3 | Afternoon Swim | Louis Vuitton | Afternoon Swim | owner_approved_title_reference | https://us.louisvuitton.com/eng-us/products/afternoon-swim-nvprod3630151v/LP0314 | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:4 | Green Creed | — | — | unresolved | — | — | — | — | — | COM-ADR-016 |
| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:6 | Hawas For Him | Rasasi | Hawas for Him | owner_approved_title_reference | https://store.rasasi.com.sa/en/wlqzamr/p2072824605 | official_regional | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:7 | Elysium Roja | Roja Parfums | Elysium Pour Homme family | owner_approved_title_reference | https://www.rojaparfums.com/products/elysium-homme-edp | official_brand | confirmed | 2026-07-30 | https://www.rojalondon.com/products/elysium-homme-edp | COM-ADR-021 |
| main_list:8 | Stronger With You | Emporio Armani | Stronger With You family | owner_approved_title_reference | https://www.armani.com/en-us/emporio-armani/experience/fragrances-ea/ | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:9 | Hudson Valley | Gissah | Hudson Valley | owner_approved_title_reference | https://qa.gissah.com/shop/g00031-hudson-valley-200ml-1761 | official_regional | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:10 | Heaven Rose | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:11 | Cycus Flora | Gucci | Flora family | family_approved_exact_pending | https://www.gucci.com/us/en/ca/beauty/fragrances/fragrances-for-women/gucci-flora-c-fragrances-women-flora-by-gucci | official_brand | blocked | 2026-07-30 | — | COM-ADR-016 |
| main_list:12 | YSL-Y | Yves Saint Laurent | Y family | family_approved_exact_pending | https://www.yslbeauty.com/int/fragrance/fragrance-for-him/y/y--eau-de-parfum/WW-50194YSL.html | official_brand | confirmed | 2026-07-30 | — | COM-ADR-016 |
| main_list:13 | Rose Elegance | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:14 | Alexandria II | Xerjoff | Alexandria II | owner_approved_title_reference | https://www.xerjoff.com/en-us/products/alexandria-ll-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:15 | Lavender Oud | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:16 | Aurum | Ajmal | Aurum | owner_approved_title_reference | https://en-ae.ajmal.com/aurum-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:17 | Black Afgano | Nasomatto | Black Afgano | owner_approved_title_reference | https://nasomatto.com/products/black-afgano | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:18 | Dunhill Icon | Dunhill | Icon | owner_approved_title_reference | https://www.dunhill.com/nl/men/icon | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:19 | Diptyque Tam Dao | Diptyque | Tam Dao family | owner_approved_title_reference | https://us.diptyqueparis.com/en-us/products/eau-de-parfum-tam-dao-tamdaop75cv1 | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:20 | One Million Lucky | Rabanne | 1 Million Lucky | owner_approved_title_reference | https://www.ulta.com/p/1-million-lucky-eau-de-toilette-xlsImpprod18151073 | retailer | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:21 | CH 212 Men | Carolina Herrera | 212 Men family | family_approved_exact_pending | https://www.carolinaherrera.com/us/en/editorial/fragrance-212-men-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-016 |
| main_list:22 | VIP 212 Men | Carolina Herrera | 212 VIP Men | owner_approved_title_reference | — | evidence_gap | none | 2026-07-30 | — | COM-ADR-018 |
| main_list:23 | Azzaro Most Wanted | Azzaro | The Most Wanted | owner_approved_title_reference | https://www.azzaro.com/en/fragrances/azzaro-the-most-wanted | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:24 | JPG Scandal | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:25 | Tom Ford Oud Wood | Tom Ford | Oud Wood | owner_approved_title_reference | https://www.tomfordbeauty.com/product/oud-wood-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:26 | I Want Choo | Jimmy Choo | I Want Choo | owner_approved_title_reference | https://us.jimmychoo.com/en/women/beauty/fragrance/i-want-choo-100ml/jimmy-choo-i-want-choo-eau-de-parfum-100ml-J000144607001.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:27 | Burberry Her | Burberry | Her family | owner_approved_title_reference | https://us.burberry.com/c/burberry-her/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:28 | 1 Million | Rabanne | 1 Million | owner_approved_title_reference | https://www.rabanne.com/us/en_US/fragrance/p/1-million-parfum--000000000065156000 | official_brand | weak | 2026-07-30 | — | COM-ADR-018 |
| main_list:29 | Armani Passione | Giorgio Armani | Sì Passione family | owner_approved_title_reference | https://www.giorgioarmanibeauty-usa.com/fragrances/womens-perfume/si/si-passione-eau-de-parfum/3614271994721.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:30 | Polo Sport Women | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:31 | Ultra Male | Jean Paul Gaultier | Ultra Male | owner_approved_title_reference | https://www.jeanpaulgaultier.com/us/en_US/p/range/eau-de-toilette-intense-000000000065119981 | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:32 | Gucci Bloom | Gucci | Bloom family | owner_approved_title_reference | https://www.gucci.com/us/en/pr/beauty/fragrances/fragrances-for-women/gucci-bloom-100ml-eau-de-parfum-p-488830999990099 | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:33 | Flower Bomb | Viktor&Rolf | Flowerbomb | owner_approved_title_reference | https://us.viktor-rolf.com/fragrance/flowerbomb-eau-de-parfum-VKR_002.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:34 | Coco Chanel | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:35 | Invictus | Rabanne | Invictus family | owner_approved_title_reference | https://www.rabanne.com/us/en_US/fragrance/p/invictus-miniature--000000000065055745 | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:36 | YSL Libre | Yves Saint Laurent | Libre family | owner_approved_title_reference | https://www.yslbeauty.com/int/libre.html | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:37 | Erba Pura | Xerjoff | Erba Pura | owner_approved_title_reference | https://www.xerjoff.com/en-de/products/erba-pura-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:38 | F Fabulous | — | — | unresolved | — | — | — | — | — | COM-ADR-018 |
| main_list:39 | Club de Nuit | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:40 | Baccarat | Maison Francis Kurkdjian | Baccarat Rouge 540 family | family_approved_exact_pending | https://www.franciskurkdjian.com/us-en/landing_page_baccarat-rouge-540.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-018 |
| main_list:41 | Ombre Nomad | Louis Vuitton | Ombre Nomade | owner_approved_title_reference | https://us.louisvuitton.com/eng-us/products/ombre-nomade-nvprod990245v/LP0095 | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:42 | Prada Candy | Prada | Candy family | owner_approved_title_reference | https://www.prada-beauty.com/fragrance/candy/candy-eau-de-parfum/MPL01333.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:43 | Tom Ford Vanilla Fatale | Tom Ford | Vanille Fatale | owner_approved_title_reference | https://www.tomfordbeauty.com/products/vanille-fatale-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:44 | Black Orchid | Tom Ford | Black Orchid family | owner_approved_title_reference | https://www.tomfordbeauty.com/products/black-orchid-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:45 | Dior Homme Intense | Dior | Dior Homme Intense | owner_approved_title_reference | https://www.dior.com/en_us/beauty/products/dior-homme-intense-Y0479201.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:46 | Delina | Parfums de Marly | Delina family | owner_approved_title_reference | https://us.parfums-de-marly.com/products/delina | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:47 | Chocolate Musk | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:48 | One Million Elixir | Rabanne | 1 Million Elixir | owner_approved_title_reference | https://www.rabanne.com/ww/en/fragrance/p/1-million-elixir--000000000065177272 | official_brand | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:49 | Narciso For Her | Narciso Rodriguez | for Her family | owner_approved_title_reference | https://www.narcisorodriguezparfums.com/en/fragrances/for-her/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:50 | Vanilla Cream | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:51 | Sweet Pine | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:52 | Good Girl | Carolina Herrera | Good Girl family | owner_approved_title_reference | https://www.carolinaherrera.com/us/en/editorial/fragrances-good-girl | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:53 | Black Opium | Yves Saint Laurent | Black Opium family | owner_approved_title_reference | https://www.yslbeautyus.com/fragrance/womens-fragrances/black-opium/black-opium-eau-de-parfum-spray/252YSL.html | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:54 | Burberry Weekend | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:55 | Terre d'Hermes | Hermès | Terre d'Hermès family | owner_approved_title_reference | https://www.hermes.com/us/en/content/101186-terre-d-hermes/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:56 | Body Musk | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:57 | Gucci Guilty EX | — | — | unresolved | — | — | — | — | — | COM-ADR-020 |
| main_list:58 | Tom Ford Tobacco Vanille | Tom Ford | Tobacco Vanille | owner_approved_title_reference | https://www.tomfordbeauty.com/products/tobacco-vanille-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:59 | VS Bombshell | Victoria's Secret | Bombshell family | owner_approved_title_reference | https://www.victoriassecret.com/us/vs/beauty/fragrances-bombshell-shop | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:60 | Bvlgari Man In Black | Bvlgari | Man in Black family | owner_approved_title_reference | https://www.bulgari.com/en-us/fragrances/bvlgari-man | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:61 | Versace Dylan Blue | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:62 | Ombre Leather | Tom Ford | Ombré Leather family | owner_approved_title_reference | https://www.tomfordbeauty.com/products/ombre-leather-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:63 | Pawake | — | — | unresolved | — | — | — | — | — | COM-ADR-020 |
| main_list:64 | Oud of Aura | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:65 | Arabian Oud | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:66 | CK Escape | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:67 | Dark Oud | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:68 | Leather Noir | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:69 | Ameer Al Oud | Lattafa | Ameer Al Oudh family | owner_approved_title_reference | https://lattafa.com/product/ameer-al-oudh-intense/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:70 | Purple Oud | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:71 | Gucci Guilty | Gucci | Guilty family | owner_approved_title_reference | https://www.gucci.com/us/en/ca/beauty/fragrances/fragrances-for-men/gucci-guilty-for-men-c-fragrances-men-gucci-guilty | official_brand | blocked | 2026-07-30 | — | COM-ADR-021 |
| main_list:72 | Yara Candy | Lattafa | Yara Candy | owner_approved_title_reference | https://www.lattafa-usa.com/products/yara-candy | official_regional | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:73 | Dareej | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:74 | Khamra | Lattafa | Khamrah | owner_approved_title_reference | https://lattafa.com/product/khamrah/ | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:75 | White Oud | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:76 | Candy Oud | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:77 | Misk Rijali | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:78 | Bin Shaikh | Ahmed Al Maghribi | Bin Shaikh | owner_approved_title_reference | https://www.ahmedalmaghribi.us/ | official_regional | weak | 2026-07-30 | — | COM-ADR-021 |
| main_list:79 | Coffee | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:80 | Chocolate Love | — | — | needs_owner_input | — | — | — | — | — | Pending |
| main_list:81 | Wisal | Ajmal | Wisal | owner_approved_title_reference | https://en-ae.ajmal.com/wisal | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |
| main_list:82 | Oud Mumtaz | — | — | needs_owner_input | — | — | — | — | — | Pending |

### Documented evidence exceptions and gaps

| Key | Mapping identity retained | Evidence handling | Reason |
|---|---|---|---|
| main_list:20 | Rabanne — `1 Million Lucky` | `retailer` / Ulta URL kept as strongest-available identity support | No durable official Rabanne/manufacturer or archive page established in the 2026-07-30 audit. Retailer page supports identity only; not official proof. |
| main_list:22 | Carolina Herrera — `212 VIP Men` | `evidence_gap` / no URL | Prior citation used nonexistent `carolinaherreras.com` and a `212 VIP Black` path. Owner mapping stays; durable first-party VIP Men evidence remains outstanding. |

## Signature Series identity register

All rows below are owner-confirmed in-house names. They never receive an `Inspired by` prefix or external reference mapping.

| Key | Backend/frontend name | Name status | Mapping state | Legal state | Decision |
|---|---|---|---|---|---|
| signature_series:1 | Regent Noir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:2 | Velour Venom | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:3 | Serpenti Noir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:4 | Kingdom Elixir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:5 | Azure Tides | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:6 | Crimson Elixir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:7 | Eternal Athena | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:8 | Blush Petal | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:9 | Sahara Bloom | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:10 | Zavan Prestige | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:11 | Smoked Crimson | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:12 | Desert Crown Oud | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:13 | Oud of Duraj | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:14 | Royal Stablor | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:15 | Mbgamare | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:16 | Velvet Petal | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:17 | Rouge Lumina | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:18 | Petalia Noir | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:19 | Rose Valerio | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:20 | Celestial Ember | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |
| signature_series:21 | Visionnaire | owner_approved | not_applicable | trademark_clearance_pending | COM-ADR-013 / COM-ADR-019 |

## Remaining review buckets

Rows left `needs_owner_input` include generic names, gender/flanker choices, or candidate identities without enough primary evidence for bulk approval. Resolve them through later explicit decisions; never infer from a competitor listing alone.
