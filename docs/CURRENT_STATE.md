# Current state

Fresh repository, provider, database, DNS, endpoint, and browser evidence
outranks this file. Never record secrets, connection strings, credentials, or
customer data here.

Last refreshed: **2026-08-14 IST**.

## Production topology

| Surface | Production state |
|---|---|
| `perfumeaura.com` | Hostinger managed Node.js Web App and HCDN; verified ZIP deployment |
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
`917499d7dae04aa04697a7af7fd3d062c029c7f6` from immutable image digest
`sha256:cbbd231052de6edfe2265e6bbcf02a77a3886a0aedb86ba8a20bc075efcdaf6`.
Workflow run [`31810808329`](https://github.com/MohsinMMK/perfume-aura/actions/runs/31810808329)
passed quality, all disposable-PostgreSQL integration tests, verified
packaging, image build/push, Tailscale deployment through the restricted SSH
identity, and exact public verification.

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

The storefront runs the completed, checksum-verified manual archive
`perfume-aura-storefront_917499d7dae0.zip`, exact source
`917499d7dae04aa04697a7af7fd3d062c029c7f6`, with Node `24.x`, Framework Other,
root `./`, no build command or output directory, and entry
`apps/storefront/server.js`. Deployment completed at 21:01:18 IST. Its
`/api/health/version` response is public, `no-store`, and reports the same exact
commit; the cached-HTML marker, real static asset, locks, `/shop`, `/search`,
and path/query-preserving `www` redirect passed the production verifier.

The generated branch `hostinger-storefront-production` exists at generated
commit `d64297dc10beca6033604f484e9d43f028f49b8a`; its manifest identifies exact
source `917499d7dae04aa04697a7af7fd3d062c029c7f6` and entry
`apps/storefront/server.js`. The live app is not connected to that branch.
Hostinger's current dashboard for this upload-sourced app exposes only archive
redeployment, and its website action menu does not expose `Connect to GitHub`.
No destructive delete/recreate conversion was attempted. Keep
`HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED` unset until a recoverable provider
conversion is completed.

## Rollback state

The old Hostinger managed ops Web App is off the public DNS path and retained
only as a short rollback target. Its restricted `DATABASE_URL` was updated to
the rotated credential and a `hostinger-ops-production` redeployment completed
at 20:41:17 IST on 2026-08-14. Keep it frozen for at least 24-48 hours after
the DNS cutover. Do not publish new ops releases to it, change public DNS back,
or delete it without explicit authorization and fresh acceptance evidence.

The verified storefront ZIP remains the emergency storefront recovery path.
The generated storefront branch is prepared but does not prove Hostinger Git
auto-deployment until the provider source is actually connected.

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

All storefront release flags remain closed: public catalog, preview catalog,
checkout approval, customer authentication, and inquiries. `robots.txt`
disallows indexing. `OPS_TWO_FACTOR_REQUIRED` and
`OPS_STAFF_INVITES_ENABLED` remain false until the complete staff release gate
passes. Green health never authorizes opening a release flag.

Fresh desktop and mobile browser sessions after the split showed no horizontal
overflow or console errors. The storefront retained the cream `#f5e4c7`
full-mark-to-wordmark animation, transparent compact background, no backdrop
blur, and hidden bottle after scrolling. Fresh ops sessions rendered the login
surface from exact VPS source `917499d7dae04aa04697a7af7fd3d062c029c7f6`
without stale chunks or console errors.

The historical Hostinger shared-process incident is no longer on the public
ops request path, but it remains unresolved provider evidence for the shared
hosting plan and storefront. Hostinger still has not supplied scoped process
attribution, a supervisor/restart cause, HCDN routing evidence, a case ID, or a
durable repair. Do not use plan-wide process controls as a workaround.

## Repository and next action

- PR #21 introduced the generated storefront branch and was merged.
- PR #22 introduced the immutable VPS ops deployment and was merged as source
  `917499d7dae04aa04697a7af7fd3d062c029c7f6`.
- Markdown-only merges run CI but do not publish either deployment surface.
- `hostinger-ops-production` is rollback provider state, not the active ops
  deployment path.

Next actions:

1. Preserve and monitor the frozen Hostinger ops rollback for 24-48 hours;
   remove it only with explicit authorization after the VPS acceptance window.
2. Ask Hostinger to enable an in-place Git source conversion for the existing
   upload-sourced storefront, or approve a separately backed-up/recoverable
   recreation plan. Do not delete the live apex app merely to expose the Git
   onboarding flow.
3. After Git is connected, select `hostinger-storefront-production`, preserve
   the existing runtime settings, enable
   `HOSTINGER_STOREFRONT_AUTO_DEPLOY_ENABLED=true`, dispatch one storefront-only
   deployment, and prove the exact generated source plus clean HCDN/browser
   acceptance.
4. Keep storefront commerce and staff security flags closed.
