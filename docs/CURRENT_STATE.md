# Perfume Aura current state

Authoritative handoff for the next agent or developer. Read this file before
acting, then open the task-specific runbook linked below. This file records
current evidence and active blockers; it does not replace the detailed safety
procedures in `AGENTS.md` or `docs/OPERATIONS.md`.

## How every agent must use this file

1. Read `AGENTS.md` and this file before repository or provider work.
2. Re-check drift-prone facts (Git, CI, public endpoints, hPanel, Neon) before
   mutating them. A dated observation is evidence, not a permanent guarantee.
3. Load only the owning document needed for the task:
   - product behavior: `docs/PRODUCT.md`
   - code, data, auth, local development, tests: `docs/ENGINEERING.md`
   - DNS, Hostinger, Neon, deploy/recovery: `docs/OPERATIONS.md`
   - remaining product work: `docs/ROADMAP.md`
   - locked tooling: `docs/STACK.md`
4. Update this file in the same change whenever the current production state,
   active incident, deployment route, branch/SHA, or next required action changes.
5. Never place secrets, passwords, connection URLs, cookies, tokens, or private
   environment values here.

## Evidence precedence

1. Live, freshly verified provider/runtime/database evidence.
2. Non-negotiable safety and tooling rules in `AGENTS.md`.
3. Detailed procedures in the owning document.
4. This current-state summary.
5. Dated snapshots elsewhere in documentation.

If sources disagree, stop, verify the live state safely, and update the stale
document. Do not select whichever statement is more convenient.

## Snapshot

Last refreshed: **2026-08-02 18:13 IST**.

| Item | Current evidence |
|---|---|
| Repository | `MohsinMMK/perfume-aura` |
| Working branch | `codex/storefront-hostinger-blocker` |
| `main` / `origin/main` | `b4410852f71351b92cfd7f9ad351de3affed436a` |
| Generated ops branch | `hostinger-ops-production` |
| Generated branch commit | `cfd2efca5d0c9d59ef8bd8f4bb9550bb93511d09` |
| Embedded production source | `b4410852f71351b92cfd7f9ad351de3affed436a` |
| Marketing | `https://perfumeaura.com` — static collection preview |
| Ops | `https://app.perfumeaura.com` — owner-only internal operations |
| Latest release CI proof | GitHub Actions run `30743458937` passed quality, PostgreSQL 16 integration, verified Hostinger ZIP, generated-branch publication, and its rerun exact-SHA live verification for `b4410852f71351b92cfd7f9ad351de3affed436a` |

Pull request #4 was merged and the reviewed storefront/INR implementation is on
`main`. Migration, runtime grants, the storefront artifact deployment, the
custom-domain connection, and the required credential rotations were performed.
Re-check the branch, SHA, and worktree with `git status --short --branch` before
continuing.

## Storefront implementation state

`apps/storefront` now contains the release-gated Next.js storefront for
`shop.perfumeaura.com`: the requested routes, responsive Bucks-inspired
editorial structure, real Perfume Aura media derivatives, secure cookie cart,
controlled public catalog projection, gated checkout, Cashfree server/webhook/
refund contracts, COD settlement, separate customer Better Auth boundary,
guest-order claiming, and non-enumerable order status.

The local storefront now includes a fresh page-by-page Bucks Sauce fidelity
pass: exact measured `#100b06` / `#f5e4c7` source colors, an open-source
condensed display face, fixed-to-compact navigation, floating cream cart,
oversized filled/outlined editorial typography, long horizontal storytelling,
stacked proof panels, conversion splits, dense footer, and matched Shop, PDP,
About, FAQ, Contact, and Wholesale rhythms. GSAP drives hero choreography,
active bottle transitions, scroll reveals, parallax, floating media, progress,
the pinned horizontal story sequence, editorial marquee, and keyboard/
coarse-pointer-safe product-card interactions. Featured cards retain the
controlled flat-color bottle media by default and reveal the existing cloth,
water, and petal campaign compositions plus price, Buy now, and Add to cart on
hover/focus. Manrope and Playfair Display remain self-hosted; Bebas Neue is
self-hosted through the locked Fontsource package. No source font or media was
copied or hotlinked.

The same change adds:

- migration `0009_storefront-commerce.sql`, including separate customer-auth,
  merchandising, cart, reservation, order, payment, shipment, promotion,
  review, return, and inquiry records;
- deterministic stock reservation/release/consume workflows;
- owner commerce surfaces under `/commerce/*`;
- a read-only `pnpm currency:audit` gate and fail-closed legacy PKR check;
- a verified `pnpm storefront:pack` Hostinger ZIP path with entry
  `apps/storefront/server.js`.

Repository proof on 2026-08-02: commerce foundation (103 products / 288
variants), production-only unused-file/dependency analysis, repository lint and
typecheck, 117 unit tests, 51 guarded PostgreSQL integration tests, both
production builds, production dependency audit, diff hygiene, and both
extracted-artifact smoke paths passed after the fidelity implementation. Fresh
live-reference and local captures at 1280 x 720
cover homepage, Shop, PDP, header, menu, cart, About, FAQ, Contact, and
Wholesale; the populated INR cart journey and opening purchase controls also
pass. See `design-qa.md` for the paired comparison and current P3 mobile-capture
limitation. The recovery artifact currently deployed at the storefront is
`perfume-aura-storefront_8d3e9cdc0509-dirty-20260802T122848Z-39627.zip`
(SHA-256 `1c30501db9ced0eca26e56d11230dc4338fd5a079b6d38cc8fdaefadec252d93`).
Its manifest is explicitly dirty-worktree provenance, not a clean commit
artifact; the apex cutover must use a newly packed clean artifact from `main`.

Migration `0009` was applied to the Neon production `main` branch on
**2026-08-02** only after the read-only repeatable-read audit proved zero
products, invoices, invoice lines, payments, stock cost, receivables, and
finance values. No exchange-rate conversion or non-zero monetary relabelling
occurred. Production now has 10 Drizzle journal rows ending at timestamp
`1785618937648` with migration hash
`025e2ed6c654733329f41e2995accc7ecb90daf00dad08469c0134e62c59ac15`.

The existing `perfume_aura_runtime` role received the explicit 31-table
storefront matrix in `packages/db/sql/storefront-runtime-grants.sql`.
Post-apply proof found zero matrix mismatches and zero sequence privileges;
the role remains `NOINHERIT`, non-superuser, and unable to create database,
schema, or temporary objects.

## Current Hostinger ops deployment

| Field | Verified value |
|---|---|
| Domain | `app.perfumeaura.com` |
| Product | Hostinger Node.js Web App |
| Source | GitHub App → `MohsinMMK/perfume-aura` |
| Branch | `hostinger-ops-production` |
| Framework | Other |
| Node selection | `24.x` |
| Observed platform patch | `24.6.0`; Hostinger controls the patch version |
| Root | `./` |
| Build command | None — branch is already prebuilt |
| Output directory | empty |
| Entry | `apps/ops/server.js` |
| Auto-deployment | enabled |
| Provider state | deployment `cfd2efca…` completed, app reports Running, and exact-SHA dynamic/live verification passes |

Do **not** configure a fixed `PORT` in hPanel. The standalone server binds to
`process.env.PORT` supplied by Hostinger and falls back to `3000` only when the
platform does not provide one.

The recreated app had these key names present: `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`,
`NODE_ENV`, and `BUSINESS_TIMEZONE`. Values are secret and must never be
printed. SMTP keys remain pending and must not be claimed present without a
fresh hPanel check.

## Live production state

Production was restored on **2026-08-01** after Hostinger support stopped
plan-wide running processes when the Business Web Hosting account reached its
hard **120 NPROC** limit.

Fresh release proof:

- `node scripts/verify-production-deploy.mjs e0597b7ca563231d2fda130edb2890e42c96113a --timeout-ms 180000` passed.
- `/login`, `/api/health/live`, `/api/health/ready`,
  `/api/health/version`, `/api/auth/get-session`, and a real Next static asset
  passed; the version endpoint matched the exact source SHA.
- Marketing returned `200`; protected marketing source paths returned `403`.
- GitHub release run `30740484665` published the generated production branch and
  passed its live exact-SHA job.
- Immediately after recovery, hPanel live usage showed roughly `10/120` Max
  Processes, `61 MB / 3072 MB` memory, and `0%` CPU.

Authenticated owner smoke passed on **2026-08-02** after the sealed database and
Better Auth credential rotation: `/dashboard`, `/commerce`, and `/products`
rendered for the owner. Public health, readiness, auth session, and a real static
asset also passed.

### 2026-08-02 recurrence during storefront cutover

After `main` source `b4410852…` published generated ops commit `cfd2efca…`,
Hostinger completed the deployment at 15:52 IST and continued to show the app
as Running. Runtime logs showed zero issues and zero errors, but `/api/health/live`,
`/api/health/ready`, `/api/health/version`, and `/api/auth/get-session` returned
hCDN `503`; only the cached `/login` shell returned `200`. An app-scoped Restart
completed without recovery. Workflow `30743458937` therefore failed only its
bounded live exact-SHA job after 20 minutes.

The plan resource snapshot then reached 106 of 120 processes while the 24-hour
average was 23. Hostinger specialist Petra confirmed that this process pressure
was the reason hCDN refused new ops connections and confirmed the hPanel
**Stop running processes** control is plan-wide. After explicit owner
authorization and capture of the live evidence, the control was used once.
Ops immediately recovered: live, readiness, version, auth-session, login, and a
real static asset returned `200`, the version endpoint matched source
`b4410852f71351b92cfd7f9ad351de3affed436a`, the serial production verifier
passed, and rerun workflow `30743458937` passed its exact-SHA live job.

The storefront's separate `403`/`404` was then traced to a blank **Entry file**
in Hostinger's managed redeploy form. The saved verified ZIP was redeployed with
entry `apps/storefront/server.js`; deployment `2026-08-02 17:16:12` IST
completed and became Current. `/`, `/shop`, `/robots.txt`, the main content
routes, a real Next static asset, and the controlled bottle image all returned
`200`. Hostinger DNS, TLS, CDN, and the generated Node proxy are now live.

After production credentials were rotated, the release-locked search, product,
collection, and cart paths exposed an unnecessary database dependency. The
storefront now avoids loading the public catalog and durable cart while
`STOREFRONT_PUBLIC_RELEASE` is false. Verified artifact deployment
`2026-08-02 18:02:20` became Current, but Hostinger continued serving prior
build `CJ3rUMbFMzqq7GXhZPGNo` after redeploy, app Restart, and CDN cache clear.
That was fresh evidence of a stuck runtime, so the explicitly authorized
plan-wide recovery was confirmed a second time. The live storefront then moved
to build `mIFtH1Pi0De0_ulWeiVcr`; `/search` and `/api/cart` returned `200`,
unpublished product/collection routes returned `404`, and the complete public
smoke passed. Ops exact-SHA verification passed again after the interruption.

The restricted Neon runtime credential, ops Better Auth secret, storefront
customer-auth secret, and storefront maintenance secret were rotated during
the recovery; values remain only in provider configuration. The storefront
remains intentionally fail-closed: no product is public until
its catalog gates pass, robots disallows crawling, and public release,
checkout, customer auth, and inquiries remain disabled. Do not enable those
flags merely because the runtime is healthy.

## Active risk: process-limit recurrence

The outage symptom was Hostinger/hCDN `503 Service Unavailable` on all dynamic
ops routes while hPanel reported Deployment Completed, Application Running,
and Next.js Ready on `0.0.0.0:3000`. A cached `/login` could still return `200`.

Hostinger support identified the plan-wide process limit and twice restored
service by stopping running processes, most recently with explicit approval on
2026-08-02. The action is temporary and affects a Business Web Hosting order
containing five websites. Hostinger has not yet provided process commands,
PIDs, timestamps, peak history, or site attribution, so the durable root cause
is **not established**.

Support later generated a plan-level `.logs/LVE_snapshot` and described the
visible workload as `lsphp` running `index.php`. That is material evidence of
PHP activity, but it is **not yet attributed to a domain or document root**.
`app.perfumeaura.com` is the Node.js/Next.js Web App and does not execute those
PHP entry points, so do not attribute this workload to the ops app without a
matching path. Hostinger has been asked for the event timestamp, peak NPROC,
per-command counts, and exact site/document-root attribution; no hosting change
was authorized.

Hostinger confirmed the snapshot should expose `COMMAND`, `PATH`, CPU, and
memory fields, but Abdel did not provide the rows or attribution before his
shift ended. The existing support conversation now asks the next specialist to
attach the generated snapshot or paste those exact rows. SSH is active for the
plan, but no matching local key is available; do not rotate credentials merely
to read this log.

The next specialist, Arie, declined to attach the private snapshot and again
directed the operator to read `ID/PATH`, `COMMAND`, and `COUNT` inside the
plan-wide File Manager. Hostinger still has not supplied the actual rows or
domain attribution. The next safe action is therefore read-only inspection of
`.logs/LVE_snapshot`; do not treat the support case as root-cause complete until
the repeated document root and command counts are recorded.

If the `503` returns:

1. Do not infer health from `/login` alone.
2. Capture hPanel live/6-hour/24-hour resource usage before stopping anything.
3. Record deployment UUID/state, runtime logs, exact endpoint status, and the
   `Server` response header without printing environment values.
4. Preserve `.logs/LVE_snapshot`, then ask Hostinger for NPROC timestamp, peak,
   command/PID counts, and domain/document-root attribution.
5. Treat **Stop running processes** as a plan-wide disruptive action; use it
   only with explicit authorization after capturing evidence.
6. Do not delete/recreate the app again, switch to a generic source ZIP, disable
   CDN, upgrade the plan, change DNS, or rotate credentials without new evidence
   and explicit scope.
7. After recovery, run the exact-SHA production verifier and rerun only the
   relevant failed GitHub job.

## Deployment boundaries

- Marketing routine: edit `apps/marketing`, run `pnpm marketing:sync`, push
  `main`; Hostinger classic Git publishes the static surface.
- Ops routine: push `main`; CI builds/verifies the standalone tree and publishes
  `hostinger-ops-production`; Hostinger starts the prebuilt branch.
- Path Z: checksum-verified `pnpm ops:pack` ZIP, emergency fallback only. It
  intentionally contains required standalone `node_modules`; a generic source
  ZIP excluding dependencies is incompatible.
- Path G: pure monorepo Hostinger source build remains blocked by esbuild
  `EACCES`; do not enable it.
- Production migrations are not automated by the deployment workflow.
- Never use Vercel or classic Git as the ops runtime.

## Known open work

- Identify and remediate the plan-wide NPROC source before another outage.
- Production migration automation remains unimplemented.
- SMTP mailbox/password-reset delivery remains unverified.
- Trusted-proxy/client-IP rate limiting remains unproven.
- GitHub Dependency Review remains skipped until Dependency Graph is enabled.
- The exact storefront ZIP is deployed and the separate Hostinger Node Web App
  is live at `shop.perfumeaura.com`. The required Hostinger entry is
  `apps/storefront/server.js`; keep it explicit on every redeploy. The visual
  storefront runtime is public, but catalog and commerce release remain gated.
- Migration `0009`, the zero-value INR semantic cutover, and the explicit
  storefront runtime grant matrix are complete in production. No automatic
  exchange-rate conversion occurred.
- Signature prices, shipping/free-shipping amounts, policies, tax treatment,
  support channel, Cashfree approval/credentials, Google/Apple credentials,
  customer SMTP, catalog approvals, and India-counsel clearance remain release
  gates. Checkout/auth/public indexing default off.
- Catalog publication remains fail-closed.

Next safe storefront action: approve and publish catalog records product by
product only after the remaining owner/provider/legal gates pass. Keep
checkout, customer auth, indexing, inquiries, and provider integrations
disabled until their separate gates pass. In parallel, continue the Hostinger
case for exact process/domain attribution: fresh post-recovery usage had already
returned to 97/120 despite only 223 ops and 271 storefront requests over six
hours, so ordinary public traffic does not explain the process count. Do not
repeat the plan-wide process reset, delete a Web App, boost the plan, or change
another website without new evidence and explicit scope.

## Safe verification commands

```bash
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main refs/heads/hostinger-ops-production

node scripts/verify-production-deploy.mjs \
  b4410852f71351b92cfd7f9ad351de3affed436a \
  --timeout-ms 1200000

gh run view 30743458937 \
  --json status,conclusion,headSha,jobs,url
```

Replace dated SHAs/run IDs with the release being investigated. Never make an
old snapshot look current merely by rerunning its commands.

## Update template

When the state changes, update at least:

- refresh timestamp;
- `main`, generated-branch, embedded-source, and deployment identifiers;
- live verification and CI evidence;
- active incident/root cause and recovery action;
- unresolved risks and next action;
- any deployment setting that changed.

Keep this file current-state only. Git history is the historical audit trail.
