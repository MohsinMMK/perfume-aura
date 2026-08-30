# Current state

Fresh repository, provider, database, DNS, endpoint, and browser evidence
outranks this file. Never record secrets, connection strings, credentials, or
customer data here.

Last refreshed: **2026-08-30 12:44:43 UTC**
(`Asia/Kolkata`, UTC+05:30).

## Production topology

| Surface | Production state |
|---|---|
| `perfumeaura.com` | Hostinger Node.js Web App deployed by verified archive API and HCDN |
| `www.perfumeaura.com` | Path- and query-preserving `308` to the apex |
| `app.perfumeaura.com` | VPS container behind Caddy on `194.164.149.3` |
| `www.app.perfumeaura.com` | Absent from Hostinger DNS and public DNS |
| `shop.perfumeaura.com` | Deleted; do not recreate without an explicit decision |

GoDaddy remains registration-only and Hostinger nameservers remain
authoritative. The `app` record is a TTL-300 `A` record to
`194.164.149.3`; authoritative nameservers and the `1.1.1.1`, `8.8.8.8`, and
`9.9.9.9` resolvers returned that address with no `AAAA`. Caddy terminates TLS
and proxies only to `127.0.0.1:3020`.

Storefront and ops continue to share Neon PostgreSQL. No database or migration
moved to the VPS. Their auth tables, secrets, cookies, origins, and recovery
flows remain separate. The Neon owner and restricted runtime credentials and
the storefront auth/maintenance secrets were rotated on 2026-08-14 after an
operator-output exposure; current values exist only in approved secret stores
and ignored local environment files.

## Exact releases and automation

The storefront and ops both run exact source
`66f9e2c44872c599b9a8b926ecbe75c90c33469d`. Ops uses immutable image digest
`sha256:a7b1ab5de6d447f014fb3fabdef6f8ccd9af06866dd30772a10e35d1823a79eb`.
Workflow run
[`33311717758`](https://github.com/MohsinMMK/perfume-aura/actions/runs/33311717758)
passed quality, all 101 disposable-PostgreSQL integration tests, verified
packaging, direct Hostinger archive deployment, immutable VPS ops deployment,
and both exact live verifiers. Hostinger build
`01a052ad-4bee-72f2-a430-a3495eea8570` completed at 2026-08-30 12:39:08 UTC.
Independent acceptance verified the exact source on both surfaces, seven
discovery sitemap URLs, a real immutable Next asset, storefront health and
release locks, ops live/ready, and the path- and query-preserving `www`
redirect.

PR #94 merged the responsive shop and product-purchase UX release. It added
the 39-brand catalog filter, compact animated mobile search and reliable filter
menus, aligned catalog cards, per-card size and price selection, correct
selected-variant cart updates, quantity-aware product totals and WhatsApp order
messages, and the mobile product hero/sticky purchase handoff. Review fixes
route every automatic size-menu dismissal through one close path, restore the
full-card link, move keyboard focus into the portalled size dialog, and require
HTTPS for the configured production storefront mutation origin.

Fresh production browser acceptance confirmed exactly 114 shop cards with zero
horizontal overflow or broken images at 1280 by 900. The Unknown query returned
exactly 15 cards; selecting Heaven Rose 50 ml added the ₹800 variant to the
cart; the brand menu reported 39 brands and Dior returned exactly three scents;
and mobile search expanded from 44 px to the available toolbar width with input
focus. At 390 by 844, the Regent Noir hero and primary Add to Cart action both
ended exactly at the viewport bottom, quantity three updated the action and
WhatsApp total to ₹3,600, and the transparent sticky purchase controls appeared
after the hero. The Inspired by label used Londrina Outline while the reference
name remained solid. Production console acceptance returned zero errors and
warnings. No Neon catalog import or migration occurred, and public catalog
publication, checkout, payment, customer authentication, inquiries, and all
staff-security release flags remain closed. The remote repository continues to
contain only `main`.

PR #77 merged the responsive shop-discovery release. It added compact animated
collection, size, sort, and instant-search controls; collection-aware size
availability; aligned two-column mobile product cards; fixed two-line titles;
and preserved the labeled mobile add-to-cart action while removing only the
redundant mobile product link.

PR #75 merged the storefront social-contact release and commerce blocker
tracker. It added the modern floating WhatsApp action, placed Instagram and
WhatsApp profile links in the mobile menu, recorded the owner-confirmed first
69-name India-counsel review batch, and kept every legal, catalog, inquiry,
customer-auth, checkout, and staff-security gate fail-closed.

PR #73 merged the storefront typography and interaction release. It replaced
the previous display face with self-hosted Londrina Solid and Londrina Outline,
kept Inter Tight for body copy including its real italic face, added the
solid-to-outline desktop navigation wave, placed Account after Cart, made the
opening-edit heading fluid across viewports, removed the approved homepage and
shop copy, and converted the cart sheet into an accessible floating popover
with reduced-motion behavior.

PR #67 merged the dependency modernization and Better Auth 1.7 operations
identity migration as exact source
`674a3995a245d98aeec20b54479f4b5550d4accc`. Its protected migration
changeset correctly deployed neither runtime. Migration `0013_silly_vanisher`
first passed on expiring isolated Neon branch
`codex-dependency-modernization-20260824`; production preflight then found one
credential account, zero unmapped providers, and zero proposed issuer/account
collisions. The direct-owner production migration advanced the migration count
from 13 to 14, backfilled issuer `local:credential`, made issuer non-null, and
created the unique issuer/account identity index. Both restricted runtime grant
scripts returned zero drift, and no commerce-settings row exists, so the
application's server-authoritative default remains flags-off. Fresh 2026-08-25 isolated proof on expiring Neon branch
`release-0014-oil-lots-20260825` (`br-aged-heart-azqgc9lk`, expires
2026-08-26 15:44:26 UTC) found production `main` already at migration 15.
The recorded hash matches `0014_oil_lots`. `oil_lots`, `oil_movements`, and
`ops_sales` exist and are empty. Login runtime role `perfume_aura_runtime`
already has the oil grant matrix; isolated reapply of both grant scripts
returned zero drift. PR #70 merged the ops oil UI, and the subsequent explicit
flags-off dispatch deployed exact source `ab7bef6`; every commerce and
staff-security flag remains closed.

PR #68 recorded
the migration gate as migration-free source
`1c283305d2c1a5889d5cc72dd87da24e58bd54f6`; its explicit flags-off deployment
and exact production acceptance completed in workflow run `32668717916`.

Routine ops deployment is now:

```text
runtime-affecting main merge -> full CI and verified ZIP
  -> immutable GHCR image -> Tailscale forced SSH
  -> hardened VPS container -> exact public verification
```

`VPS_OPS_AUTO_DEPLOY_ENABLED` and
`VPS_OPS_PUBLIC_VERIFICATION_ENABLED` are true. The deploy identity is not in
the Docker group, accepts only `probe` or an exact SHA/digest deploy command,
and reaches Docker only through a root-owned validating wrapper. The container
runs as UID/GID `10001`, has a read-only root filesystem, no Docker socket, all
capabilities dropped, `no-new-privileges`, and limits of 1 CPU, 768 MiB memory,
and 256 PIDs.

The storefront is a Hostinger Node.js Web App deployed directly from the
checksum-verified release archive through the official API, with Node `24.x`,
Framework Other, root `./`, no build command or output directory, and entry
`apps/storefront/server.js`. Repository variables
`HOSTINGER_STOREFRONT_ARCHIVE_DEPLOY_ENABLED=true` and
`HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED=true` enable the direct deployment
only when exact live verification is also enabled. The dedicated
`HOSTINGER_API_TOKEN` secret and `HOSTINGER_ACCOUNT_USERNAME` variable supply
the provider identity without entering the archive or logs. PR #46 merged as
exact source `919071a96a229378597a8a1fa513121f10750258`. Its push automatically
started workflow run
[`32292518427`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32292518427),
which passed quality, disposable-PostgreSQL integration, verified packaging,
generated-branch publication, Hostinger auto-deployment, and exact public
verification at 2026-08-19 19:27:01 UTC. The VPS ops publish job stayed skipped
because this changeset was storefront-only; ops remains exact source
`13490d8e8c0c704d1e1f10670b26239be6b1c3c2`. The generated storefront branch is
exact commit `8fc33abfadf5663e780cbf8b4510a861568fc5ea`. The apex HTML marker
reports the exact storefront source, dynamic HTML uses
`private, no-cache, no-store`, and the `www` redirect preserves `/shop?probe=1`.
An independent exact-source verifier passed against a real immutable Next asset,
and a fresh 1280-by-720 browser pass confirmed the hero/header handoff with no
horizontal overflow or console errors.

PR #48 merged as exact storefront source
`24ba5349165cf43969066a3e30f31e8833d594e2`. Workflow run
[`32339366806`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32339366806)
passed quality, all disposable-PostgreSQL integration tests, verified packaging,
generated-branch publication, Hostinger auto-deployment, and exact public
verification at 2026-08-20 06:28:58 UTC. The generated storefront branch is
exact commit `a28a391f7a0f60215f8bc7102346573c6126300b`; the VPS ops deployment
stayed skipped. An independent verifier confirmed the exact storefront source,
release locks, the path-preserving `www` redirect, and a real immutable Next
asset. Fresh 390-by-844, 768-by-1024, and 1280-by-720 browser passes confirmed
the responsive header, centered mobile scent label, journey heading and cards,
edge-aligned footer, cream-action hover treatment, compact-header scroll
handoff, zero horizontal overflow, and zero console errors.

PR #50 merged the customer-commerce schema as migration
`0011_unknown_dormammu`; its protected migration changeset correctly did not
deploy either runtime. The migration was then applied through the Neon owner
connection, both restricted runtime grant sets were reapplied, and their drift
queries returned zero rows. Production now contains the storefront customer
profile, notification outbox, issuer, checkout idempotency, payment lifecycle,
and refund reconciliation structures while preserving immutable historical
order snapshots and inert legacy COD values.

PR #51 merged as exact source
`dd3784156c32990f2b3649df9c1541bdd29de302`. Workflow run
[`32364851643`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32364851643)
passed quality, all disposable-PostgreSQL integration tests, verified archives,
the immutable ops image rollout, generated storefront publication, and exact
live verification on both surfaces. Ops runs immutable image digest
`sha256:da96d3ae29990682bd46acf114775810529e65948f519e11ac32b880e023d4f4`;
the generated storefront branch is exact commit
`83d690901d846d1751439cab59bf9cce19c188f4`. Independent version, health,
readiness, unauthenticated-session, release-lock, redirect, and current static
asset probes passed. Fresh 390-by-844, 768-by-1024, and 1280-by-900 production
browser passes had zero horizontal overflow and zero console errors or warnings.

PR #53 merged migration `0012_amused_cloak` as exact source
`dbab3abdae9372d135cf54f1961360469e166ed9`. Its protected migration
changeset correctly published neither runtime. The migration was applied to
production through the direct Neon owner connection after the isolated normal
branch proof and a zero-row provider-payment collision check. Production
advanced from 12 to 13 migrations; all five payment-reconciliation fields and
both new inquiry tables were present; every commerce release gate remained
closed. The storefront and ops restricted grant scripts were reapplied and
both drift queries returned zero rows before the runtime merge.

PR #54 merged the commerce production hardening as exact source
`5a426b542eecb8c825b4b20590a68d93fc03908d`. Workflow run
[`32407236586`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32407236586)
passed quality, all 83 disposable-PostgreSQL integration tests, verified
packaging, immutable ops image rollout, generated storefront publication, and
exact live verification on both surfaces. Ops runs immutable image digest
`sha256:5f236d1fff3c4e37f63c048ee0312c95daee8d018fe8353ccfef912e7002eadc`;
the generated storefront branch is exact commit
`3f9aa0f07f2f470ca38f1191f7dc1f65e89c0eef`. Independent production
verifiers passed for both surfaces against exact source, health/readiness,
unauthenticated-session behavior, storefront locks, the path-preserving `www`
redirect, and real immutable Next assets. Fresh `/shop` browser passes at
390-by-844, 768-by-1024, and 1280-by-900 reported zero horizontal overflow and
zero console errors or warnings.

PR #56 merged the responsive Khanect AI footer attribution as exact storefront
source `83d32f9c7542e77a289f4c2142ecc514f9622ae4`. Workflow run
[`32476320377`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32476320377)
passed quality, all 83 disposable-PostgreSQL integration tests, verified
packaging, generated-branch publication, Hostinger auto-deployment, and exact
live verification at 2026-08-21 11:20:25 UTC. The generated storefront branch
is exact commit `73f2ddf5ea8a299c52ed92127e78d96485165819`; the VPS ops deployment
stayed skipped. An independent verifier confirmed the exact storefront source,
release locks, path-preserving `www` redirect, and a real immutable Next asset.
Fresh 393 px mobile and 1280-by-900 desktop browser passes confirmed the
right-aligned footer credit, hover and keyboard-focus logo reveal,
reduced-motion fallback, zero horizontal overflow, and zero console errors or
warnings.

PR #58 merged the adaptive mobile product-detail refinement as exact storefront
source `88521ca775321fc13ab9756ea3c78d695c2e2ca2`. Workflow run
[`32525289244`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32525289244)
passed quality, all 83 disposable-PostgreSQL integration tests, verified
packaging, generated-branch publication, Hostinger auto-deployment, and exact
live verification at 2026-08-21 20:56:07 UTC. The generated storefront branch
is exact commit `46c093c1e69ccb4c31f2979036c389df75db308e`; the VPS ops
deployment stayed skipped. The verifier confirmed the exact storefront source,
closed release locks, path-preserving `www` redirect, and immutable asset
`/_next/static/chunks/36n1lupunhhzk.css`. Pre-release browser checks at
320-by-568, 393-by-659, and 589-by-1204 confirmed the 8 px rounded image frame,
44 px breadcrumb target, visible purchase action, adaptive details handoff, and
zero horizontal overflow. A separate remote fetch confirmed the live Dior
Sauvage product content; direct workstation browser acceptance was unavailable
because connections to every resolved Hostinger CDN address timed out.

PR #60 merged the flags-off customer lifecycle completion as exact source
`6a3dc24fbcacc9ed0f44219e9e0f260e0a2e207b`. It added verified-delivery product
reviews with staff moderation, full-order return requests and staff lifecycle
management, approval-backed shipping and return projections, structured-only
scent recommendations, and same-origin mutation enforcement. Workflow run
[`32640619706`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32640619706)
deployed both production surfaces; ops uses immutable image digest
`sha256:f3cef390441886c598e8b1d929cc806c1844c6553cae17daa032c483a7c74a72`.
Fresh 390-by-844, 768-by-1024, and 1440-by-1000 browser acceptance covered the
home page, scent finder, policy pages, product delivery/returns disclosure,
disabled customer sign-in, and ops login with zero horizontal overflow and
zero console errors. Lazy product imagery loaded after scrolling; the finder
returned no fabricated match; policy content stayed unpublished; customer
mutation routes returned `404` before auth/database initialization; and a
cross-origin cart mutation returned `403` while the same-origin request reached
normal validation.

Production `/shop` now shows the complete 114-product discovery listing with
URL-driven search, collection and size filters, and name sorting. It contains
79 Inspired mappings, 15 temporary Unknown literal names, and all 20 Signature
names. Inspired and Unknown main-list products use the supplied
₹600 / ₹800 / ₹1,400 tier for rows 1-16 and ₹450 / ₹650 / ₹1,200 for rows
17-94. Signature products use ₹1,200 / ₹2,200 except Oud of Dubai and
Visionnaire at ₹1,800 / ₹3,000.

PR #90 also published the canonical 114-product / 322-variant source files,
owner source artifacts, B01 legal-review inventory and CSV, and B02 intake
workbook. These are repository and discovery-presentation changes only:
Inspired-by title mappings are not India-counsel clearance, production Neon was
not imported or migrated, and checkout cannot complete. The public-catalog,
checkout, customer-auth, inquiry, and staff-security gates remain closed.

The customer account and private operations sign-in presentation is also live
as a flags-off UX release. Customer sign-in, registration, recovery,
verification, checkout-return, and signed-in account navigation use a focused
storefront flow, while the operations login explicitly identifies owner and
invited-staff access. Disabled customer-auth routes still avoid Better Auth and
Neon initialization, and neither customer auth nor staff registration is
enabled by this presentation change.

Migration `0015_catalog-publication-profile` passed a normal copy-on-write Neon
proof on branch `release-0015-catalog-profile-20260828`
(`br-polished-meadow-azw1tecy`, expires 2026-08-30 00:00:00 UTC). The branch
advanced from 15 to 16 migrations, added `audience`, `season`, `concentration`,
and `sillage` to the empty `product_publications` table, and both restricted
runtime grant scripts returned zero drift. PR #79 merged the reviewed runtime
source as `9c88ee66e75de9409ef91d43af55e12b2994506d`. The direct-owner production
gate then advanced the migration count from 15 to 16, added the same four
columns to the still-empty `product_publications` table, and left
`commerce_settings` empty. Reapplying both restricted grant scripts returned
zero table-privilege drift and zero sequence-privilege drift. No catalog data
was imported and no release flag was opened. The subsequent explicit flags-off
runtime deployment completed in workflow run `33149842602`.

The first live verifier exposed stale HCDN homepage HTML from source
`917499d7dae04aa04697a7af7fd3d062c029c7f6` because the statically rendered
root advertised a one-year shared-cache lifetime. A scoped cache clear restored
the current HTML. The root layout is now dynamic so subsequent releases do not
leave versioned HTML behind the CDN while immutable Next assets remain
cacheable.

## Rollback state

The old Hostinger managed ops Web App is off the public DNS path and retained
only as a short rollback target. Its restricted `DATABASE_URL` was updated to
the rotated credential and its final managed redeployment completed at
2026-08-14 15:11:17 UTC (`Asia/Kolkata`, UTC+05:30). The historical
`hostinger-ops-production` branch used for that provider path was deleted after
the direct storefront and current VPS ops release passed fresh acceptance. The
successful exact public verification in workflow run `31810808329` at
2026-08-14 14:47:58 UTC is the DNS-cutover acceptance anchor. Retain the old
app for exactly 48 hours after that anchor; it is eligible for removal no
earlier than 2026-08-16 14:47:58 UTC, and only with explicit authorization and
fresh exact-SHA acceptance evidence. Do not publish new ops releases to it or
change public DNS back outside an authorized rollback.

The pre-cutover recovery ZIP remains exact source
`917499d7dae04aa04697a7af7fd3d062c029c7f6`. Workflow run `31946168431` also
produced a checksum-verified storefront package from exact source
`35f187877290e44eb97c773d8d9dddefb7355ee1`, after the dynamic-root correction.
A fresh Hostinger backup completed at 2026-08-16 11:26 UTC. The prior upload
app is retained as a rollback target at
`perfumeaura-com-642844.hostingersite.com`; do not reassign the apex to it
outside an authorized rollback.

## Capacity and VPS ownership

The post-cutover VPS snapshot reported 7.8 GiB RAM with about 6.3 GiB
available, 4 GiB swap with about 108 MiB used, and 79 GiB free of 96 GiB root
disk. Perfume Aura ops used about 107 MiB of its 768 MiB limit, 12 PIDs, and
negligible CPU in the sample. Fourteen containers were running and no systemd
unit was failed.

Firecrawl, the obsolete Omni migration workload, and the EventConnect runner
were removed. The remaining self-hosted runners were migrated to GitHub-hosted
workflows and removed from the VPS, eliminating workflow access to its Docker
socket. Portainer remains a tailnet-only administrative surface and Kuma
remains monitoring infrastructure.

## Release locks and acceptance

The 114-product replacement discovery listing is live. Sellable public catalog
publication, checkout approval, customer authentication, and inquiries remain
closed.
Brand discovery is separated from commerce release. The request-time discovery
sitemap contains exactly `/`, `/fragrance-guide`, `/about`, `/faq`,
`/guides/perfume-for-hyderabad-weather`, `/guides/fragrance-families`, and
`/guides/perfume-for-occasions`. Public crawling is allowed, while preview
commerce and incomplete policy/inquiry pages remain `noindex` and private
account, API, cart, checkout, and order paths stay disallowed in `robots.txt`.
Product and collection URLs enter the sitemap only after the existing
public-catalog gate opens and then only from the approved Neon projection.
IndexNow accepted all seven materially changed discovery URLs with HTTP `200`
on 2026-08-28; this confirms submission, not search-engine indexing.
The `perfumeaura.com` Google Search Console domain property is ownership-
verified through Hostinger-authoritative DNS. Google Search Console accepted
`https://perfumeaura.com/sitemap.xml` on 2026-08-24 IST (2026-08-23 UTC),
reported `Success`, and discovered the original four release-locked URLs. The
expanded seven-URL sitemap still requires account-side resubmission and URL
inspection. Keep the DNS verification records in place; indexing and coverage
remain subject to Google's recrawl schedule.
Production browser acceptance on all seven discovery URLs covered 360-by-640,
390-by-844, 844-by-390, 768-by-1024, and 1440-by-900 viewports. All 35 checks
confirmed `en-IN`, self-canonicals, fitting H1 headings, no document overflow,
no broken loaded images, and Article schema on the three guide routes. Live
Googlebot, Bingbot, OAI-SearchBot, GPTBot, ChatGPT-User, Claude-SearchBot,
Claude-User, ClaudeBot, and Google-Extended probes returned `200` for the
Hyderabad-weather guide on 2026-08-28. A prior throttled live Lighthouse run
scored SEO 100,
accessibility 100, best practices 100, performance 77, and cumulative layout
shift 0; the remaining performance variance is primarily LCP/network cost and
does not weaken the crawl or release locks.
`OPS_TWO_FACTOR_REQUIRED` and
`OPS_STAFF_INVITES_ENABLED` remain false until the complete staff release gate
passes. Green health never authorizes opening a release flag.

Fresh 390 px mobile and 768 px tablet browser sessions showed no horizontal
overflow or console errors. Mobile renders the cream `#f5e4c7` wordmark from
first paint with the bottle SVG absent; tablet and desktop retain the
full-mark-to-wordmark animation, transparent compact background, and no
backdrop blur. Fresh ops acceptance rendered the login surface from exact VPS
source `205f8489ab81b1dbf6368acc78b4e0b7b405ba75`; workflow and independent
exact-SHA acceptance passed without changing public storefront release locks.

The historical Hostinger shared-process incident is no longer on the public
ops request path, but it remains unresolved provider evidence for the shared
hosting plan and storefront. Hostinger still has not supplied scoped process
attribution, a supervisor/restart cause, HCDN routing evidence, a case ID, or a
durable repair. Do not use plan-wide process controls as a workaround.

## Customer-commerce foundation

COM-ADR-030 is implemented and deployed flags-off: Better Auth 1.7.1 issuer
support, Google-primary One Tap and rendered-button fallback, verified
account-gated checkout, one optional saved Indian delivery profile,
customer-linked orders, Cashfree UPI-only Hosted Checkout, request and webhook
idempotency, provider-aware reservation expiry, customer-safe order tracking,
owner refunds, fulfillment events, and a transactional email outbox. Active COD
and Apple launch controls are absent; legacy database/provider compatibility
remains inert for historical records.

This is deployed code and schema evidence, not provider or launch acceptance.
Production Google OAuth configuration, Cashfree KYC/domain/UPI-only/20-minute
transaction-TTL/refund/webhook acceptance, Hostinger SMTP acceptance, the
maintenance workflow secret and enable variable, and an authorized sandbox
payment/refund flow remain outstanding. Customer authentication, catalog
publication, checkout, and commerce maintenance therefore remain closed.

The deployed customer-lifecycle release passed `pnpm check`, all 232 unit
tests, and all 88 integration tests against a fully migrated disposable
loopback PostgreSQL database. The integration database was removed afterward.
Both Next production
builds, all guarded client-JavaScript budgets, the commerce and runtime-grant
contracts, deployment self-tests, lint/typecheck, and dependency audits were
green. No Graphify or browser artifacts were committed.

The release adds atomic stale-cart rejection, approval invalidation for
customer-facing catalog changes, deterministic catalog-import identity guards,
fail-closed inquiry throttling, per-record Cashfree reconciliation isolation,
customer reconciliation leases, provider-bound refunds, and fenced email and
inquiry outbox claims. The maintenance scheduler keeps payment reconciliation
and checkout expiry safety-coupled while allowing refund and notification
workers to run independently.

Migration `0012_amused_cloak` first passed on the temporary normal Neon branch
`release-0012-20260821`, created from production `main` with an automatic
expiry. The branch had zero provider-payment identity collisions; migration
count advanced from 12 to 13; all five payment reconciliation columns and both
new tables were present; every new commerce gate remained closed; and both
restricted runtime grant matrices returned zero drift. The protected schema
merge, direct-owner production migration, restricted grant verification,
runtime merge, and exact flags-off production deployment have now completed.

## Repository and next action

- PR #21 introduced the generated storefront branch and was merged.
- PR #22 introduced the immutable VPS ops deployment and was merged as source
  `917499d7dae04aa04697a7af7fd3d062c029c7f6`.
- PR #24 added browser-artifact ignore rules and deployed exact ops source
  `fec2c0c623640e6cda8c92038a5a2d6a7c69f412`; it also refreshed the prepared
  storefront branch without changing the live upload-sourced storefront.
- PR #25 reconciled the documentation and publication-authorization contract;
  its Markdown-only merge did not publish or deploy either surface.
- PR #28 consolidated project documentation and made migration configuration
  fail closed on `DATABASE_URL_DIRECT`. Its non-Markdown tooling change deployed
  exact ops source `9c9d7b44b3daeb45edf7d8e0900c43c0cede6874`, refreshed the disconnected
  generated storefront branch, and passed exact live acceptance; the live
  upload-sourced storefront remained unchanged.
- PR #30 introduced the storefront visual and product-detail refinement. Its
  first post-merge release built the exact verified artifacts but failed closed
  because the shallow deployment-classifier checkout could not resolve the
  valid multi-commit push baseline.
- PR #31 fixed that classifier checkout. Its merge deployed and independently
  verified exact ops source `774ca0bd7fc042a14cf6005cf79b2827082fc205` and
  refreshed the then-disconnected storefront branch to the same source.
- PR #33 connected the protected publication flow to the live Hostinger Web
  App and made storefront HTML dynamic. Its merge automatically deployed and
  verified exact storefront source
  `35f187877290e44eb97c773d8d9dddefb7355ee1` without manual redeployment.
- PR #36 replaced the six-product preview fixtures with the 69-product launch
  listing. Its merge automatically deployed and verified exact source
  `13490d8e8c0c704d1e1f10670b26239be6b1c3c2` on both the storefront and VPS ops
  surfaces.
- PR #37 recorded that launch-listing release. Its Markdown-only merge did not
  publish or deploy either surface.
- PR #38 tightened the storefront to the Bucks Sauce visual rhythm. Its merge
  automatically deployed and independently verified exact storefront source
  `bb1bd2fe9a14fa1c14b167b354c512e81e96624a` without changing the live VPS ops
  source or any commerce release lock.
- PR #40 added the interactive perfumery ingredient atmosphere and cleaned hero
  bottle. Its merge automatically deployed and independently verified exact
  storefront source `36b30444695458c5a7c99b38dfde6c22cb8b3b02`
  without changing the live VPS ops source or any commerce release lock.
- PR #41 recorded that ingredient-atmosphere release. Its Markdown-only merge
  did not publish or deploy either surface.
- PR #42 added shop search, segments, size filters, and name sort. Its merge
  automatically deployed and independently verified exact storefront source
  `273c04935b94884c2da90ebf52de3d9917dbc8c1` without changing the live VPS ops
  source or any commerce release lock.
- PR #44 made the home header wordmark-only below 640 px while preserving the
  bottle transition on larger screens. Its merge automatically deployed and
  independently verified exact storefront source
  `14568a1a670ea2050c05273d556a1b1551e4dc49` without changing the live VPS ops
  source or any commerce release lock.
- PR #48 refined the responsive header, journey, footer, and shared cream-action
  treatment. Its merge automatically deployed and independently verified exact
  storefront source `24ba5349165cf43969066a3e30f31e8833d594e2` without
  changing the live VPS ops source or any commerce release lock.
- PR #50 introduced and proved the customer-commerce migration and restricted
  grants. Its migration changeset did not publish either runtime; production
  migration and grant verification completed before the runtime release.
- PR #51 deployed the flags-off customer account, UPI checkout, order tracking,
  refund, fulfillment, and email-outbox implementation as exact source
  `dd3784156c32990f2b3649df9c1541bdd29de302` on both production surfaces.
- PR #53 introduced and proved migration `0012_amused_cloak`; production owner
  migration and both restricted grant matrices completed before runtime merge.
- PR #54 deployed commerce production hardening as exact source
  `5a426b542eecb8c825b4b20590a68d93fc03908d` on both production surfaces with
  every customer-commerce release flag still closed.
- PR #56 deployed the responsive Khanect AI footer attribution as exact
  storefront source `83d32f9c7542e77a289f4c2142ecc514f9622ae4` without changing
  the live VPS ops source or any commerce release lock.
- PR #58 deployed the adaptive mobile product-detail layout as exact storefront
  source `88521ca775321fc13ab9756ea3c78d695c2e2ca2` without changing the live
  VPS ops source or any commerce release lock.
- PR #60 deployed reviews, returns, policy projection, structured-only scent
  matching, and mutation-origin hardening as exact source
  `6a3dc24fbcacc9ed0f44219e9e0f260e0a2e207b` on both production surfaces with
  every commerce and staff-security release flag still closed.
- PR #62 deployed the search-discovery foundation as exact source
  `613828984e860b2c311e94384c5a679e9ae45a14`: public crawler access, an exact
  four-URL sitemap, canonical/social metadata, safe entity and editorial
  structured data, a server-rendered fragrance guide, self-hosted fonts,
  IndexNow support, and fail-closed preview-commerce indexing. No commerce,
  customer-auth, inquiry, or staff-security flag opened.
- PR #63 corrected only the production verifier's canonical homepage sitemap
  expectation after the live release exposed the trailing-slash mismatch. Its
  normal non-Markdown main workflow repackaged, deployed, and exactly verified
  source `4746fe1bb70f7cd37d8616729e7bf628699821e4` on both surfaces without
  changing website behavior or opening any release flag.
- PR #67 modernized the supported dependency set, migrated ops identity keys
  to Better Auth 1.7's issuer-aware contract, and kept runtime publication
  blocked until migration `0013_silly_vanisher` and restricted grants passed.
- PR #68 recorded the completed production migration gate. Its explicit
  migration-free dispatch deployed and exactly verified source
  `1c283305d2c1a5889d5cc72dd87da24e58bd54f6` on both production surfaces with
  every commerce and staff-security release flag still closed.
- PR #70 merged the oil lots and guided-sale implementation as source
  `80e915e3fb1a1ea5eb3d7c560c4affcd5d340543`. Its drizzle changeset correctly
  blocked automatic runtime publication. Production Neon already had empty
  `0014` tables and oil grants. The subsequent Markdown-only gate merge and
  explicit dispatch deployed source `ab7bef6` on both production surfaces in
  workflow run `32871053573`; its ops-target verifier proved the exact ops
  source and public storefront checks, and a subsequent independent storefront
  target verifier proved its exact source and `www` redirect. No release flag
  opened.
- PR #72 records the resulting exact live source, image digest, generated
  storefront commit, verification evidence, and remaining owner gates. Its
  Markdown-only merge must not publish or deploy either surface.
- PR #79 staged the fixed-price Inspired catalog and customer-account
  presentation flags-off. PRs #80 and #81 recorded the completed migration and
  exact production acceptance without opening any commerce or staff-security
  release flag.
- PR #82 replaced generated-branch storefront publication with direct,
  checksum-verified Hostinger archive deployment. PR #83 aligned the resumable
  upload target with the provider contract, and PR #84 moved the binary transfer
  to a no-shell curl process with temporary upload credentials supplied through
  stdin. Workflow run `33161060140` accepted that path and deployed exact source
  `0d94d4b324d5683757d55cfa4ce540d530549cce` to both production surfaces.
- PR #86 deployed the local and editorial SEO foundation: seven discovery
  sitemap URLs, three original fragrance guides, `en-IN`, route-specific social
  metadata, typed business and editorial contracts, privacy-safe discovery
  analytics, a dynamic fail-closed public-catalog sitemap, approved URL
  manifests, and public-product schema without premature Offers. PR #87 fixed
  the 360 px FAQ heading acceptance issue and made the ops verifier require the
  exact storefront and ops release together. Workflow run `33182832227`
  attempt 3 completed successfully and deployed exact source
  `9dd00abc0ca8fcf647b2ea29633f0ca7d9017742` to both surfaces. The verified
  storefront archive SHA-256 is
  `f1b54065b94cabe6995e893f20cfcd3a9c8d02a5cc082561aa96aee1265b6894`.
  Independent `--target both` discovery verification confirmed seven sitemap
  URLs, the `www` redirect, live and ready ops endpoints, the exact release,
  real `404` behavior, and a real static asset. No database migration or
  release flag changed.
- PR #90 deployed the owner-supplied replacement catalog as exact source
  `258c121d94428829f48a36e25be2b52c9afee689`. Workflow run `33262248611`
  deployed and exactly verified both surfaces. Independent endpoint and browser
  acceptance confirmed the 45 Inspired / 20 Signature listing, supplied price
  tiers, no overflow, and no console warnings. No Neon import, migration, or
  release-flag change occurred.
- PR #92 reconciled all 49 previously unmapped main-list names into 34
  additional Inspired mappings and 15 temporary Unknown literal names. It
  deployed and independently verified exact source
  `205f8489ab81b1dbf6368acc78b4e0b7b405ba75` on both surfaces in workflow run
  `33266315017`; production `/shop` now exposes the exact 79 / 15 / 20 split
  without a Neon import, migration, price change, or release-flag change.
- Markdown-only merges run CI but do not publish either deployment surface.
- After fresh exact-source, endpoint, provider, and browser acceptance, the
  obsolete `hostinger-storefront-production` and `hostinger-ops-production`
  branches were deleted. The local checkout and remote repository contain only
  `main`; routine storefront releases no longer require a provider branch.

Next actions:

1. Confirm the complete public Kondapur NAP record, geo coordinates, hours,
   category, accessibility/parking facts, store photography, and official
   profile URLs before shipping the gated location page and Store schema. Gain
   management access to the existing Google Business Profile without creating
   a duplicate, then align its name, website, NAP, category, hours, and photos.
   In Google Search Console, resubmit the expanded seven-URL sitemap and inspect
   the seven discovery URLs; verify or import the property in Bing Webmaster
   Tools and submit the same sitemap. IndexNow notification is complete, while
   Google/Bing indexing and ranking remain external pending outcomes.
2. Obtain India-counsel clearance and the remaining owner-approved catalog
   facts: permanent collection naming for the 15 temporary Unknown rows, the 3
   documented evidence gaps, SKUs, costs, opening stock, media, and structured
   scent content. All 322 retail prices are now owner-supplied. The deployed
   discovery projection contains 79 Inspired titles, 15 temporary Unknown
   literal names, and 20 Signature names. B01 preparation includes the
   [114-name review CSV](review-packets/2026-08-29-b01-114-name-review.csv),
   [replacement legal-surface inventory](review-packets/2026-08-29-b01-114-name-legal-surface-inventory.md),
   [49-name reconciliation packet](review-packets/2026-08-29-b03-49-name-reconciliation.md),
   and frozen catalog digests. Legal approval remains pending. The fail-closed
   discovery projection is deployed, but do not import or migrate the catalog,
   publish the gated Neon projection, enable checkout, or open any release flag
   before its owning gates pass.
3. Rotate the dedicated Hostinger archive-deployment token before its
   2026-09-28 expiry. Supply and accept the remaining provider identities:
   Google OAuth production client, Hostinger SMTP sender credentials and
   delivery proof, and Cashfree merchant KYC/UPI-only sandbox credentials,
   webhooks, transaction TTL, and refunds.
4. Approve the operating rules and references for tax, serviceability/courier,
   shipping fee and threshold, returns/cancellations, and support staffing.
5. Complete owner TOTP/recovery and staff journey acceptance, then separately
   authorize the documented maintenance, customer-auth, catalog, checkout, and
   inquiry activation sequence plus the final low-value live UPI
   purchase/refund. Until then, keep every commerce and staff-security flag
   closed; brand/guide discovery does not weaken those gates.
