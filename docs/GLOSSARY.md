# Glossary — Perfume Aura

| Term | Meaning |
|------|---------|
| **SKU** | Sellable stock unit = one **product** × **size_ml** (one `product_variants` row). |
| **Variant** | Same as SKU row; has unique `sku`, cost, retail, on-hand qty. |
| **Product** | Fragrance catalog parent (`products`); may have many variants. |
| **On hand** | Cached balance `quantity_on_hand` (bottles, integer). |
| **Reserved** | `qty_reserved` — held for future orders; reduces **available**. |
| **Available** | `on_hand − reserved` (never shown negative). |
| **Movement** | Append-only ledger row in `stock_movements`. |
| **applyMovement** | Sole write path that updates on-hand + inserts ledger in one TX. |
| **Receive** | Inbound stock (+qty). |
| **Sale** | Outbound stock (−qty); used for retail/out and invoice fulfill. |
| **Adjust** | Signed delta with **required note** (count correction). |
| **Damage** | Outbound loss (−qty). |
| **Return** | Inbound return (+qty). |
| **Paisa / cents** | Integer minor units of PKR; 100 paisa = 1 rupee. Stored as `*_cents`. |
| **Rupees (major)** | UI form amounts; converted with `rupeesToCents`. |
| **MAIN** | Default `locations.code` warehouse. |
| **Idempotency key** | Optional unique key so the same movement is not applied twice. |
| **FOR UPDATE** | Row lock on variant during stock TX (prevents concurrent oversell). |
| **Owner-only** | v1: public sign-up disabled; single seeded owner account. |
| **Path A** | DNS via Hostinger nameservers at GoDaddy (not A records at registrar). |
| **Classic Git** | Hostinger Git → `public_html` (static marketing only). |
| **Node Web App** | Hostinger product for Next.js ops. |
| **SoR** | System of record — our Neon DB, not Zoho/QuickBooks. |
| **AR** | Accounts receivable — issued unpaid invoices. |
| **Fulfill** | Phase 2 action that ships goods and posts **sale** movements. |
| **Preset** | shadcn lock code `b23PPibQOI` (luma / taupe / hugeicons). |
| **Ops** | Internal admin app at `apps/ops` / `app.perfumeaura.com`. |
| **Marketing** | Public brand site `apps/marketing` / `perfumeaura.com`. |
