# Current state

Fresh repository, provider, database, DNS, endpoint, and browser evidence
outranks this file. Never record secrets, connection strings, credentials, or
customer data here.

Last refreshed: **2026-08-23 16:42:00 UTC**
(`Asia/Kolkata`, UTC+05:30).

## Production topology

| Surface | Production state |
|---|---|
| `perfumeaura.com` | GitHub-connected Hostinger Node.js Web App and HCDN |
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

Both production surfaces run exact source
`6a3dc24fbcacc9ed0f44219e9e0f260e0a2e207b`. Ops uses immutable image digest
`sha256:f3cef390441886c598e8b1d929cc806c1844c6553cae17daa032c483a7c74a72`.
Workflow run [`32640619706`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32640619706)
passed quality, all disposable-PostgreSQL integration tests, verified
packaging, immutable image build/push, Tailscale deployment through the
restricted SSH identity, generated-branch publication, Hostinger
auto-deployment, and exact live verification on both surfaces at 2026-08-23
12:58:10 UTC. Independent acceptance rechecked both exact versions, ops
live/ready/unauthenticated-session behavior, storefront release locks, a real
immutable Next asset, and the path- and query-preserving `www` redirect.

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

The storefront is a GitHub-connected Hostinger Node.js Web App following
`hostinger-storefront-production`, with Node `24.x`, Framework Other, root
`./`, no build command or output directory, and entry
`apps/storefront/server.js`. Repository variable
`HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED=true` enables exact live verification
after the generated branch is published. PR #46 merged as exact source
`919071a96a229378597a8a1fa513121f10750258`. Its push automatically started
workflow run
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

A production `/shop` check after that release shows the 69-product launch
listing with URL-driven search, Signature / Inspired / Featured segments, size
filters, and name sort. Incomplete inspired rows such as Heaven Rose remain
absent. Card hover shows a disabled Add to cart control and a View product
action; purchase still cannot complete. Checkout, public release, customer
authentication, and inquiries stay closed. Inspired-by titles are listing
identity only and are not India-counsel clearance. Production Neon was not
imported or migrated. Inner pages use the wordmark SVG only; the home portal
keeps the bottle animation.

The first live verifier exposed stale HCDN homepage HTML from source
`917499d7dae04aa04697a7af7fd3d062c029c7f6` because the statically rendered
root advertised a one-year shared-cache lifetime. A scoped cache clear restored
the current HTML. The root layout is now dynamic so subsequent releases do not
leave versioned HTML behind the CDN while immutable Next assets remain
cacheable.

## Rollback state

The old Hostinger managed ops Web App is off the public DNS path and retained
only as a short rollback target. Its restricted `DATABASE_URL` was updated to
the rotated credential and a `hostinger-ops-production` redeployment completed
at 2026-08-14 15:11:17 UTC (`Asia/Kolkata`, UTC+05:30). The successful exact
public verification in workflow run `31810808329` at
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

The 69-product launch listing is live. Sellable public catalog publication,
checkout approval, customer authentication, and inquiries remain closed.
Brand discovery is separated from commerce release: `/`, `/fragrance-guide`,
`/about`, and `/faq` are the only release-locked sitemap URLs. Public crawling
is allowed, while preview commerce and incomplete policy/inquiry pages remain
`noindex` and private account, API, cart, checkout, and order paths stay
disallowed in `robots.txt`. Product and collection URLs enter the sitemap only
after the existing public-catalog gate opens.
`OPS_TWO_FACTOR_REQUIRED` and
`OPS_STAFF_INVITES_ENABLED` remain false until the complete staff release gate
passes. Green health never authorizes opening a release flag.

Fresh 390 px mobile and 768 px tablet browser sessions showed no horizontal
overflow or console errors. Mobile renders the cream `#f5e4c7` wordmark from
first paint with the bottle SVG absent; tablet and desktop retain the
full-mark-to-wordmark animation, transparent compact background, and no
backdrop blur. Fresh ops sessions rendered the login
surface from exact VPS source `9c9d7b44b3daeb45edf7d8e0900c43c0cede6874`;
workflow and independent exact-SHA acceptance passed without changing public
storefront release locks.

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
- Markdown-only merges run CI but do not publish either deployment surface.
- `hostinger-ops-production` is rollback provider state, not the active ops
  deployment path.

Next actions:

1. Obtain India-counsel clearance and owner-approved catalog facts: unresolved
   mappings, Signature prices, SKUs, costs, opening stock, media, and structured
   scent content. Do not migrate or publish sale data before that gate.
2. Supply and accept the provider identities: Google OAuth production client,
   Hostinger SMTP sender credentials and delivery proof, and Cashfree merchant
   KYC/UPI-only sandbox credentials, webhooks, transaction TTL, and refunds.
3. Approve the operating rules and references for tax, serviceability/courier,
   shipping fee and threshold, returns/cancellations, and support staffing.
4. Complete owner TOTP/recovery and staff journey acceptance, then separately
   authorize the documented maintenance, customer-auth, catalog, checkout, and
   inquiry activation sequence plus the final low-value live UPI
   purchase/refund. Until then, keep every commerce and staff-security flag
   closed; brand/guide discovery does not weaken those gates.
