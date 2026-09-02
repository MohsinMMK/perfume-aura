# Current state

Fresh repository, provider, database, DNS, endpoint, and browser evidence
outranks this file. Never record secrets, connection strings, credentials, or
customer data here.

Last refreshed: **2026-09-02 16:55:03 UTC** from public HTTPS, authoritative
DNS, Hostinger inventory, GitHub Actions, and this checkout. Do not infer live
SHAs from `git HEAD`.

## How to read the project

Perfume Aura is live as a **brand and discovery website**. Ecommerce, customer
accounts, inquiries, sellable catalog publication, and staff 2FA/invites are
**implemented and fail-closed**. The next session should assume:

1. Visitors can browse the 114-product discovery shop. They cannot buy online.
2. Production still runs Neon. Self-hosted PostgreSQL is approved and not cut
   over. Repo `main` is ahead of live because of an unapplied migration.
3. Do not open a release flag, import catalog into Neon, apply `0017`, write
   DNS, rotate secrets, or touch unrelated Hostinger sites without explicit
   authorization and the owning gate in [`OPERATIONS.md`](OPERATIONS.md).

| Need | Owner |
|---|---|
| Users, routes, live vs locked UX | [`PRODUCT.md`](PRODUCT.md) |
| Stack, tests, CI, data/auth invariants | [`ENGINEERING.md`](ENGINEERING.md) |
| Deploy, migrate, recover, staff release | [`OPERATIONS.md`](OPERATIONS.md) |
| Commerce ADRs, requirements, checklist | [`COMMERCE.md`](COMMERCE.md) |
| Launch blockers B01–B07 | [`BLOCKERS.md`](BLOCKERS.md) |
| Mapping register and design tokens | [`REFERENCE.md`](REFERENCE.md) |

## Production topology

| Surface | Production state |
|---|---|
| `perfumeaura.com` | Hostinger Node.js Web App, archive deploy, HCDN |
| `www.perfumeaura.com` | Path- and query-preserving `308` to the apex |
| `app.perfumeaura.com` | VPS container behind Caddy on `194.164.149.3` |
| `www.app.perfumeaura.com` | Absent (NXDOMAIN) |
| `shop.perfumeaura.com` | Absent (NXDOMAIN); do not recreate |

GoDaddy remains registration-only. Hostinger nameservers
`lunar.dns-parking.com` / `solar.dns-parking.com` are authoritative. Apex is
ALIAS to Hostinger CDN; `www` is CNAME to Hostinger CDN. The `app` record is
TTL-300 `A` `194.164.149.3` with no `AAAA` on authoritative NS and public
resolvers. Caddy terminates TLS and proxies only to `127.0.0.1:3020`.

Storefront and ops share Neon PostgreSQL. Auth tables, secrets, cookies,
origins, and recovery stay separate. No database moved to the VPS.

The Hostinger DNS zone API listing can omit the `app` A record. Authoritative
NS is the authority; do not add a duplicate `app` record from an incomplete
API listing.

## Exact releases and automation

The storefront reports source
`3e822a8e3fe389a34652a8e4d6c0cb565533a744`; ops remains on
`09164609b918cf8c356ec35e42e6d96ff1a25dce`:

| Probe | Result |
|---|---|
| `https://perfumeaura.com/api/health/version` | `{"status":"ok","commit":"3e822a8…"}` |
| Homepage `data-perfume-aura-release` | storefront SHA |
| `https://app.perfumeaura.com/api/health/version` | `{"status":"ok","commit":"09164609…"}` |
| Ops `/api/health/live` / `/ready` | `ok` / `ready` |
| `www` `/shop?probe=1` | `308` → `https://perfumeaura.com/shop?probe=1` |
| Storefront `/api/health/live` and `/ready` | do not exist |

Hostinger storefront build `01a0630a-62a3-7036-a965-1360011b94a8` completed
2026-09-02 16:54:06 UTC: Node `24`, Framework Other, root `./`, no build or
output directory, entry `apps/storefront/server.js`, `source_type: archive`.
Workflow run
[`33657044753`](https://github.com/MohsinMMK/perfume-aura/actions/runs/33657044753)
is the last successful storefront runtime deploy. Its hosted verifier and a
separate repository verifier both confirmed `3e822a8…`. The workflow published
an immutable ops image because shared dependency files changed, but the
Tailscale, VPS deploy, and ops live-verification steps remained skipped; the
public ops SHA did not change.

Repository `main` is `3e822a8e3fe389a34652a8e4d6c0cb565533a744`. It contains
self-hosted PostgreSQL preparation and migration
`0017_storefront_sale_settlement`; that migration is still not applied to
production. The storefront-only release passed quality, 110
disposable-PostgreSQL integration tests, packaging, archive deployment, and
exact live verification without deploying ops or applying a migration.

The release keeps two homepage product cards (one Signature and one Inspired),
moves the detailed guide links to `/fragrance-guide`, adds the responsive
Signature/Inspired bottle image, and publishes the verified Kondapur address
and Google Maps destination on About and FAQ. It also pins patched `qs` and
`fast-uri` transitive dependency versions.

Do not deploy ops or apply `0017` until its owner migration gate (including
restricted grants) is explicitly completed. Storefront-only releases may
publish when the classifier keeps ops and database work excluded. Markdown-only
merges still run CI and do not publish either surface. Package lock is Better
Auth `1.7.2`.

Routine storefront path: verified ZIP → Hostinger archive API → exact public
verification. Routine ops path: verified ZIP → immutable GHCR image →
Tailscale forced SSH → hardened VPS container → exact public verification.
The last recorded ops image digest for the live SHA is
`sha256:077f7017b2ebbb0e5258f7011426143cbd5d913fe2c8507d1e1cddf08c09df54`
(not re-pulled this refresh).

## Database

Production is Neon. Last **recorded** owner apply is migration
`0015_catalog-publication-profile` (journal count 16). `commerce_settings`
was empty at that apply, so application defaults stay flags-off.

| Migration | In live source `09164609…` | Production apply |
|---|---|---|
| `0000`–`0015` | Yes | Recorded applied |
| `0016_even_silk_fever` | Yes | **Unrecorded** — confirm the Neon journal before any oil-provenance work |
| `0017_storefront_sale_settlement` | No | **Not applied**; present only on `main` |

`0017` adds FIFO oil reservations and the table-grant-free payment-finalizer
routines. Do not apply it as a side effect of docs or storefront work.

Self-hosted PostgreSQL 17.10 under [`deploy/postgres-vps/`](../deploy/postgres-vps/)
is the approved target and is **not cut over**. The VPS has no
`/srv/perfume-aura` checkout, Postgres/pooler containers, or pgBackRest
repository. Pre-cutover remains blocked by independently managed encrypted
off-VPS backup material, a successful on-VPS restore drill, and an
authenticated Hostinger update path for both restricted storefront database
URLs plus mutual-TLS material. Do not change either runtime `DATABASE_URL` or
open port 6432 until every pre-cutover gate passes.

## Release locks

Keep every commerce and staff-security flag closed. Green health is not
authorization.

| Flag | Live effect |
|---|---|
| `STOREFRONT_PUBLIC_RELEASE` | Off. Shop is the workbook listing, not the Neon projection. Shop/product URLs stay `noindex`. |
| `STOREFRONT_PREVIEW_CATALOG` | Off in production. Add to cart disabled; cart totals stay zero. |
| `STOREFRONT_CUSTOMER_AUTH_ENABLED` | Off. `/api/customer-auth/*` returns `404` before Better Auth/Neon. |
| `STOREFRONT_CHECKOUT_RELEASE_APPROVED` and DB `checkout_enabled` | Off. `/checkout` is `404`. Either plane false keeps checkout locked. |
| `STOREFRONT_INQUIRIES_ENABLED` | Off. Contact/wholesale stay disabled. |
| `STOREFRONT_COMMERCE_MAINTENANCE_ENABLED` | Off. |
| `OPS_TWO_FACTOR_REQUIRED` | Off. |
| `OPS_STAFF_INVITES_ENABLED` | Off. |

Discovery listing is **not** catalog publication. Live `/shop` shows 114
workbook products: 79 Inspired, 15 temporary Unknown, 20 Signature; 322
variants; owner-supplied prices. SKU, cost, stock, media, and legal clearance
are incomplete. Inspired-by titles are listing identity, not India-counsel
approval.

Public crawling is allowed. The sitemap has exactly `/`, `/fragrance-guide`,
`/about`, `/faq`, `/guides/perfume-for-hyderabad-weather`,
`/guides/fragrance-families`, and `/guides/perfume-for-occasions`. Preview
commerce and incomplete policy pages stay `noindex`. `robots.txt` disallows
account, API, cart, checkout, and order paths. `/llms.txt` is public.

## Rollback inventory

The old Hostinger Node.js app for `app.perfumeaura.com` is **still enabled**
as provider inventory (`source_type: git`, last deploy 2026-08-14 15:11:17 UTC,
entry `apps/ops/server.js`). Public DNS no longer points at it. The 48-hour
retention after the 2026-08-14 DNS-cutover acceptance expired on
2026-08-16 14:47:58 UTC. Treat it as leftover rollback inventory eligible for
authorized removal, not an open countdown. Do not publish new ops releases to
it or change public DNS back outside an authorized rollback.

The prior storefront upload app remains at
`perfumeaura-com-642844.hostingersite.com`. Do not reassign the apex to it
outside an authorized rollback. Generated storefront and historical
`hostinger-*-production` branches are deleted. Remote heads contain only
`main`.

The historical Hostinger shared-process/NPROC incident is off the public ops
path and remains unresolved provider evidence for shared hosting. Do not use
plan-wide process controls as a workaround.

## Next actions

Work from [`BLOCKERS.md`](BLOCKERS.md). Order:

1. Confirm the complete public Kondapur NAP, geo, hours, category,
   accessibility/parking, store photography, and official profile URLs before
   any gated location page or Store schema. Recover the existing Google
   Business Profile; do not create a duplicate. In Google Search Console,
   resubmit the seven-URL sitemap and inspect those URLs. Verify or import the
   property in Bing Webmaster Tools and submit the same sitemap.
2. Obtain India-counsel clearance on the **live 79 Inspired titles** (already
   on `/shop`, no disclaimer implemented) and remaining owner catalog facts:
   permanent names for the 15 Unknown rows, the 3 evidence gaps, SKUs, costs,
   opening stock, media, and structured scent content. All 322 retail prices
   are owner-supplied. Use the
   [114-name review CSV](review-packets/2026-08-29-b01-114-name-review.csv)
   and
   [B03 reconciliation packet](review-packets/2026-08-29-b03-49-name-reconciliation.md).
   The 2026-08-29 legal-surface inventory markdown was rewritten to match
   COM-ADR-033; do not hand counsel the 69-name packets.
3. Rotate the dedicated Hostinger archive-deployment token before its
   2026-09-28 expiry. Supply Google OAuth production, Hostinger SMTP delivery
   proof, and Cashfree merchant KYC/UPI-only sandbox credentials, webhooks,
   20-minute transaction TTL, and refunds.
4. Approve tax, serviceability/courier, shipping fee and threshold, returns,
   cancellations, and support staffing. Locked ₹99/₹999 values are
   implementation inputs, not CA/counsel approval.
5. Complete owner TOTP/recovery and the staff denial journey, then separately
   authorize customer-auth, catalog publication, checkout, inquiries, and one
   low-value live UPI purchase/refund. Until then keep every commerce and
   staff-security flag closed.
6. Complete the self-hosted PostgreSQL rehearsal: independently encrypted
   off-VPS pgBackRest material, a disposable restore, then a controlled write
   freeze to update runtime secrets. Keep Neon as rollback until the recovery
   window and exact acceptance complete.
7. Decide whether to keep or authorize deletion of the leftover Hostinger ops
   Web App. Confirm the production Neon journal for `0016` before oil-provenance
   work.
