# Current state

Fresh repository, provider, database, DNS, endpoint, and browser evidence
outranks this file. Never record secrets, connection strings, credentials, or
customer data here.

Last refreshed: **2026-08-18 18:15:40 UTC**
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

The public operations surface runs source
`13490d8e8c0c704d1e1f10670b26239be6b1c3c2` from immutable image digest
`sha256:b59418264aa28ca27890e9163f5b5f7ad101eb124ee331de0da22d87283ab53b`.
Workflow run [`31963658075`](https://github.com/MohsinMMK/perfume-aura/actions/runs/31963658075)
passed quality, all disposable-PostgreSQL integration tests, verified
packaging, image build/push, Tailscale deployment through the restricted SSH
identity, generated-branch publication, Hostinger auto-deployment, and exact
public verification at 2026-08-16 18:13:18 UTC. The apex version and an
independent `/shop` check report that exact source. The `www` redirect
preserves `/shop?probe=1`.

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
after the generated branch is published. PR #40 merged as exact source
`36b30444695458c5a7c99b38dfde6c22cb8b3b02`. Its push automatically started
workflow run
[`32131014036`](https://github.com/MohsinMMK/perfume-aura/actions/runs/32131014036),
which passed quality, disposable-PostgreSQL integration, verified packaging,
generated-branch publication, Hostinger auto-deployment, and exact public
verification at 2026-08-18 11:23:52 UTC. The VPS ops publish job stayed skipped
because this changeset was storefront-only; ops remains exact source
`13490d8e8c0c704d1e1f10670b26239be6b1c3c2`. The generated storefront branch is
exact commit `1956fb2788e049657cb4055a1e294b59edcbb7a6`. The apex version and
ordinary HTML marker report the exact storefront source, dynamic HTML uses
`private, no-cache, no-store`, and the `www` redirect preserves `/shop?probe=1`.
An independent verifier at 2026-08-18 18:14:34 UTC passed the exact source,
storefront locks, path- and query-preserving `www` redirect, and a real static
asset. A fresh production browser rendered the cleaned hero bottle and all four
ingredient cutouts with no console logs or errors.

A production `/shop` check at 2026-08-16 20:38:59 UTC showed the 69-product
launch listing: 21 Signature names and 48 `Inspired by <approved reference>`
titles, the shortened shop title and grid, and locked `View scent` actions.
Incomplete inspired rows such as Heaven Rose remain absent. Add-to-cart
and Buy now remain closed. Checkout, public release, customer authentication,
and inquiries stay closed. Inspired-by titles are listing identity only and
are not India-counsel clearance. Production Neon was not imported or migrated.

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
`robots.txt` disallows indexing.
`OPS_TWO_FACTOR_REQUIRED` and
`OPS_STAFF_INVITES_ENABLED` remain false until the complete staff release gate
passes. Green health never authorizes opening a release flag.

Fresh desktop and mobile browser sessions after the split showed no horizontal
overflow or console errors. The storefront retained the cream `#f5e4c7`
full-mark-to-wordmark animation, transparent compact background, no backdrop
blur, and hidden bottle after scrolling. Fresh ops sessions rendered the login
surface from exact VPS source `9c9d7b44b3daeb45edf7d8e0900c43c0cede6874`;
workflow and independent exact-SHA acceptance passed without changing public
storefront release locks.

The historical Hostinger shared-process incident is no longer on the public
ops request path, but it remains unresolved provider evidence for the shared
hosting plan and storefront. Hostinger still has not supplied scoped process
attribution, a supervisor/restart cause, HCDN routing evidence, a case ID, or a
durable repair. Do not use plan-wide process controls as a workaround.

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
- Markdown-only merges run CI but do not publish either deployment surface.
- `hostinger-ops-production` is rollback provider state, not the active ops
  deployment path.

Next actions:

1. The frozen Hostinger ops rollback window expired on
   2026-08-16 14:47:58 UTC. Remove it only with explicit authorization and
   fresh exact-SHA acceptance evidence.
2. Keep storefront commerce and staff security flags closed.
3. Staff release and VPS ops observability may proceed independently after a
   fresh exact-SHA VPS acceptance and their owning authorization gates pass;
   the unresolved shared-plan incident does not block that VPS-only work.
4. Managed-storefront provider or observability changes remain gated by the
   rollback window, storefront Git-path decision, and scoped Hostinger incident
   evidence. Follow procedures in [`OPERATIONS.md`](OPERATIONS.md) and
   [`ENGINEERING.md`](ENGINEERING.md); do not start releases from this file.
5. Keep Inspired-by listing titles fail-closed for legal clearance, sale data,
   and Neon import. Do not apply a production catalog migration or open
   checkout without a separate owner-authorized gate.
