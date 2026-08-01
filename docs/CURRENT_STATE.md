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

Last refreshed: **2026-08-01 22:42 IST**.

| Item | Current evidence |
|---|---|
| Repository | `MohsinMMK/perfume-aura` |
| Working branch | `codex/current-state-handoff` |
| `main` / `origin/main` | `6d79a49593895b2e656e22df0b6d33141b5c89dc` |
| Generated ops branch | `hostinger-ops-production` |
| Generated branch commit | `a11d4fbdfb76b6a8fac042dc49e5e6f644fcad61` |
| Embedded production source | `6d79a49593895b2e656e22df0b6d33141b5c89dc` |
| Marketing | `https://perfumeaura.com` — static collection preview |
| Ops | `https://app.perfumeaura.com` — owner-only internal operations |
| Latest CI proof | GitHub Actions run `30690719178` rerun succeeded on 2026-08-01; quality, PostgreSQL 16 integration, verified ZIP, generated-branch publication, and exact-SHA live verification passed; Dependency Review remained skipped |

The working tree was clean when this snapshot was gathered. Re-check with
`git status --short --branch`; do not assume it stays clean.

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
| Current deployment UUID | `019fbc95-3a20-72c2-9417-720cb19ee319` |
| Provider state | completed |

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

Fresh recovery proof:

- `node scripts/verify-production-deploy.mjs 6d79a49593895b2e656e22df0b6d33141b5c89dc --timeout-ms 1200000` passed.
- `/login`, `/api/health/live`, `/api/health/ready`,
  `/api/health/version`, `/api/auth/get-session`, and a real Next static asset
  passed; the version endpoint matched the exact source SHA.
- Marketing returned `200`; protected marketing source paths returned `403`.
- The failed GitHub live-verification job was rerun and passed in run
  `30690719178`.
- Immediately after recovery, hPanel live usage showed roughly `10/120` Max
  Processes, `61 MB / 3072 MB` memory, and `0%` CPU.

The last authenticated owner smoke remains **2026-07-31**. No production owner
credentials were accessed during the 2026-08-01 recovery, so do not describe
authenticated owner pages as freshly reverified after the process stop.

## Active risk: process-limit recurrence

The outage symptom was Hostinger/hCDN `503 Service Unavailable` on all dynamic
ops routes while hPanel reported Deployment Completed, Application Running,
and Next.js Ready on `0.0.0.0:3000`. A cached `/login` could still return `200`.

Hostinger support identified the plan-wide 120-process limit and restored
service by stopping running processes. That action is temporary and affected a
Business Web Hosting order containing five websites. Hostinger has not yet
provided process commands, PIDs, timestamps, peak history, or site attribution,
so the durable root cause is **not established**.

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
- The public commerce storefront remains intentionally unimplemented.
- Catalog publication remains fail-closed.

## Safe verification commands

```bash
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main refs/heads/hostinger-ops-production

node scripts/verify-production-deploy.mjs \
  6d79a49593895b2e656e22df0b6d33141b5c89dc \
  --timeout-ms 1200000

gh run view 30690719178 \
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
