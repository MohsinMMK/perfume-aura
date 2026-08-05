# Perfume Aura current state

Read this file and the task-specific document before repository or provider
work. Fresh live evidence outranks this snapshot; never place credentials,
tokens, connection strings, or customer data here.

Last refreshed: **2026-08-05 IST**.

## Live topology

| Surface | Current state |
|---|---|
| `https://perfumeaura.com` | Hostinger Node.js Web App serving the animated Next.js storefront from clean artifact `perfume-aura-storefront_89b79d857568.zip` |
| `https://www.perfumeaura.com` | Path- and query-preserving `308` redirect to the apex |
| `https://app.perfumeaura.com` | Hostinger Node.js Web App for private owner operations |
| `https://www.app.perfumeaura.com` | Unintended `www` CNAME removed from Hostinger DNS on 2026-08-04; public resolvers return NXDOMAIN |
| `shop.perfumeaura.com` | Deleted from hPanel and absent from public DNS |

The storefront artifact deployed to the apex has SHA-256
`6c2c20f62f2f681100797f29ba2f8498ace2e4cca4ea2a3b1d66697feb2c00ed`.
The downloaded static-site rollback backup is retained outside the repository;
Git history and that backup are the only static rollback path.

## Fresh acceptance evidence

- Apex homepage, `/shop`, `/search`, cart drawer, branded 404, Next static
  assets, controlled bottle imagery, and `robots.txt` pass over TLS.
- `www` returns `308` to the same apex path and query.
- Storefront customer-auth returns `404` while disabled; unpublished products
  return `404`; `/api/cart` remains zero-value and checkout-locked.
- `node scripts/verify-production-deploy.mjs
  89b79d8575687978f3c0b5eee09ea43bb9d1268a --public-surface storefront
  --public-base https://perfumeaura.com --timeout-ms 180000` passed.
- Read-only Neon reconciliation found zero storefront users, sessions, cart
  items, checkouts, orders, payment records, inquiries, published products,
  published collections, invoices, payments, stock movements, inventory,
  reservations, and finance amounts. Four empty anonymous test carts remain.

## Release locks

All storefront release flags remain `false`: public catalog, checkout,
customer authentication, inquiries, and preview catalog. `robots.txt`
disallows indexing. Do not open a lock merely because runtime health is green.

## Hosting and database safety

- Domain registration remains at GoDaddy; Hostinger nameservers are
  authoritative. Do not edit GoDaddy DNS while those nameservers are active.
- Do not delete Neon: it is shared by storefront and ops.
- Only `perfumeaura.com` and `app.perfumeaura.com` are Perfume Aura websites in
  hPanel. Do not touch `perfumeaurastores.com`, `khanect.com`, mail, or other
  account resources.
- Hostinger shared hosting has a recurring plan-wide NPROC risk. Capture fresh
  resource evidence before provider changes, re-smoke both applications after
  every deployment, and never use the plan-wide process-stop control without
  explicit authorization and confirmed scope.

## Active ops incident

Fresh checks at **2026-08-04 14:53 IST** found the incident recovered but not
resolved. Ops `/login`, live, ready, version, unauthenticated session, and a real
Next static asset all returned `200`; the version endpoint reported
`cc38326dcf46651e10cb618727e4c03ef1fdc948`. The apex, shop, search, cart,
customer-auth lock, robots lock, and path/query-preserving `www` redirect also
passed. hPanel showed 41/120 live Max Processes and a 26/120 24-hour average.

The last-day runtime log still showed unexplained duplicate Next.js starts:
six starts between **2026-08-03 16:09:09 and 16:09:13 IST**, paired starts at
18:39:34, 19:01:53, and 22:09:40, and another pair at **2026-08-04 05:14:17
IST**, without application errors. At **14:56 IST**, a scoped Hostinger support
escalation was submitted with these timestamps and the prior HCDN `503`/104 of
120 NPROC evidence. A specialist is assigned and reviewing the conversation;
no case identifier has been supplied yet. The escalation explicitly forbids a
plan-wide process stop or redeployment and requests Linux user/domain/path/PID
attribution, supervisor/restart-policy analysis, HCDN routing verification, and
the relevant LVE snapshot or equivalent evidence. Do not deploy the staff
release until Hostinger supplies a durable scoped repair and both applications
are re-smoked.

A read-only staff-release preflight at **2026-08-04 20:04 IST** passed P1–P4
except for the still-blocking P0 repair gate. The current draft PR #7 head is
`74797a6cb25e3ab041d2aa158cc92210f3354ed3`; GitHub Actions run `30903769087`
passed quality, PostgreSQL integration, dependency review, and the verified
Hostinger ZIP, while publish/live jobs remained intentionally skipped. Both ops
security flags are absent from Hostinger and therefore non-`true`. All five
storefront release flags are explicitly `false` in Hostinger. Fresh exact-SHA
HTTP verification and the path/query-preserving `www` redirect passed.

The same preflight applied all migrations to a disposable loopback PostgreSQL
database, passed 62 integration tests, removed the database, and passed
`pnpm check` with 131 unit tests, both production builds, client budgets,
commerce verification, typecheck, and configured dependency audits. Lint has
two warnings and no errors; the production audit reports one moderate issue
below the configured failure threshold. Graph traversal confirmed the guarded
test-database callers, owner-only staff-invite capability path, and dual
checkout-lock dependency.

A read-only Hostinger MCP reconciliation on **2026-08-04 IST** found two
additional provider inconsistencies. Both current deployment logs report Node
`24.6.0` and pnpm `10.32.1`, while the repository and verified artifacts require
Node `24.18.0` and pnpm `11.1.3`; hPanel exposes only the `24.x` major selector,
so Hostinger must clarify or update the managed builder/runtime rather than the
repository weakening its requirements. At **22:52 IST**, the exact unintended
`www` CNAME in the `app.perfumeaura.com` zone was deleted through hPanel after
explicit authorization. hPanel confirmed deletion and both Cloudflare and
Google public DNS returned NXDOMAIN; the apex ALIAS, mail records, and all
unrelated zones were preserved. Canonical ops live, ready, version,
unauthenticated session, login, and a real Next static asset remained `200`;
the storefront apex remained `200` and its `www` path/query redirect remained
`308`. A local path/query-preserving redirect remains as defense-in-depth while
the alias stays outside Better Auth trusted origins, but it is not deployed.

At **22:52 IST**, the managed Node/pnpm mismatch and the existing HCDN/NPROC
evidence were also appended to the existing Hostinger human-reviewed support
conversation. The request asks for a compliant managed runtime or supported
pinning path, joins the open process-attribution investigation, and explicitly
forbids restart, redeploy, `pkill`, plan-wide process stopping, DNS changes, or
application changes. At **23:08 IST**, Hostinger replied only that resource
usage had returned to a normal level and the website currently loaded. They did
not answer the Node/pnpm version question, provide Linux user/path/PID or
supervisor attribution, explain the HCDN routing/restart cause, or supply a case
ID. Current health therefore does not close the P0 incident.

Fresh hPanel evidence showed 40/120 live Max Processes and 31/120 in the
selected 24-hour view. The last-day ops log contains no further Next.js starts
after the unexplained **05:14:17 IST** pair, but it retains those duplicate
starts and does not prove a repair. Hostinger support attributed the earlier
503s to Max Processes without providing Linux user/domain/path/PID or
`COMMAND`/`COUNT` evidence, then suggested redeploying or stopping processes.
Those recovery actions were not taken. At **20:00 IST**, a source-backed
follow-up showed that the generated standalone entry calls `startServer` once,
uses Hostinger's `PORT`, disables retry and worker-thread paths, and has no
runtime cluster/fork/spawn path; it again requested the scoped attribution,
supervisor restart cause, HCDN routing result, durable repair, and case ID.

Fresh verification at **2026-08-05 11:43 IST** confirms the recovery remains
stable: hPanel shows **41/120** live Max Processes and **44/120** in the
selected 24-hour view; the `www.app.perfumeaura.com` CNAME remains absent from
hPanel and Cloudflare/Google public DNS return NXDOMAIN. The local resolver
also no longer resolves the alias. Exact-SHA production verification passed for
`cc38326dcf46651e10cb618727e4c03ef1fdc948`, including ops health, readiness,
version, unauthenticated session, and a real Next static asset; storefront
verification passed and `www.perfumeaura.com` preserved a probe path/query with
`308`. Hostinger's only follow-up remains the **2026-08-04 23:08 IST** statement
that resources are normal and the website loads. It has not supplied the
requested runtime-version answer, process attribution, restart/HCDN cause,
durable scoped repair, or case ID. Do not create the isolated Neon release
branch, migrate, deploy, or change flags until P0 is actually closed.

## Current repository work

`main` is at `cc38326dcf46651e10cb618727e4c03ef1fdc948`. The apex cleanup is
merged. The active `codex/staff-operations` branch implements the separate
Better Auth Admin/2FA migration, strict owner/staff capability matrix,
append-only invitation/audit records, and owner break-glass recovery. It is
not deployed and both security flags stay false until the isolated-Neon,
production-grant, SMTP, owner-TOTP, recovery-code, and staff-denial gates pass.

The branch also contains CI-verified ops optimization at `46ad43a…` and
CI-verified storefront optimization at `3dbbad6…` (GitHub Actions run
`30841501283`). Storefront entry now limits low-intent prefetch, skips
release-locked cart hydration, and defers disabled customer-auth client code;
all commerce flags remain false. No Hostinger configuration or production
application change occurred. Next action remains the assigned specialist's
scoped Hostinger repair before any deployment. After that repair, execute
`docs/STAFF_OPERATIONS_RELEASE_SMOKE.md` for the staff-ops release (capability
denials, invite flags, dual checkout lock, disposable DB guard)—do not open
storefront commerce flags as part of that release. Observability is isolated in
draft PR #8 and must not be merged until that repair is proven.
