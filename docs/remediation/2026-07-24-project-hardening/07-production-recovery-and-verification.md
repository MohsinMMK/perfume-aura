# Phase 07 — Production recovery and verification

## Objective

Safely migrate and recover the production ops application through official Neon and Hostinger workflows, then prove database, auth, mail, application, artifact, and marketing continuity.

## Dependencies

Phases 01–06 green; reviewed artifact and checksum available; independent reviewer has no unresolved high-risk finding. Root operator has explicit access and exact targets.

## In scope

- Read-only preflight, backup/restore point, Neon migration/runtime role, Hostinger environment/SMTP/Node settings, manual official Path Z upload, restart, production seed/recovery, browser/HTTP verification, rollback.

## Out of scope

- Path G experimentation, unsupported API deploy, DNS/name-server changes without a demonstrated DNS fault, domain transfer, Vercel, or marketing redesign.

## Confirmed evidence and root causes

- Baseline on 2026-07-24: marketing `200`, protected source `403`, ops `/login` `200`, but `/` and `/api/auth/get-session` `500`.
- A login page response does not prove database/auth readiness.
- Production needs pooled least-privilege `DATABASE_URL`, direct migration URL, Better Auth secrets/URLs, `BUSINESS_TIMEZONE=Asia/Karachi`, and Hostinger SMTP settings.
- Path G is known blocked by Hostinger shared-build execution; Path Z ZIP upload is an official Hostinger source.
- Automated archive deploy was removed in Phase 06 and must remain disabled.

## Exact implementation decisions

1. All provider mutations are performed by the root agent only. Use one normal read-only preparation agent before cutover and a different normal read-only reviewer after cutover; neither receives secrets or performs provider actions.
2. Preflight:
   - identify exact Neon project/branch and Hostinger `app.perfumeaura.com` Node Web App;
   - confirm marketing and ops are distinct products;
   - capture current Node settings, redacted env-key presence, latest logs/build, database migration journal, counts, and a Neon restore point/branch;
   - retain the previous known-good ZIP.
3. Enforce a write freeze, then apply every migration classified and recorded as expansion: the Phase 02 domain expansion and the Phase 04 Better Auth/rate-limit expansion. Stop before the later contract migration. Prove the previous ZIP against this fully expanded schema before treating it as an interim rollback.
4. Create/use the least-privilege pooled runtime role from Phase 02, apply and verify its grants for both domain and Phase 04 auth tables, and keep migration credentials out of Hostinger runtime.
5. Set Hostinger Node to `24.x`, root `./`, build `echo prebuilt-standalone`, blank output directory, and entry `apps/ops/server.js`.
6. Set required environment keys without logging values:
   - pooled `DATABASE_URL`;
   - `BETTER_AUTH_SECRET` and exact `BETTER_AUTH_URL` (the browser client is same-origin; no public auth URL env);
   - `BUSINESS_TIMEZONE=Asia/Karachi`, `NODE_ENV=production`, `PORT=3000`;
   - Hostinger SMTP host/port/secure/user/password/from.
7. Upload the checksum-verified Phase 06 ZIP manually through Hostinger Node Web App Path Z, inspect logs, restart, and prove it against the expanded schema while the write freeze remains active.
8. Run the reviewed reconciliation SQL and require every count to be zero. Reconfirm that the journal has exactly eight reviewed rows through `0007`; then run the full migrator, which must have only `0008` pending. Verify the ninth row/hash, restart, and rerun readiness.
9. Seed MAIN and the owner against the production database only after contract migration. Never guess credentials. Existing owner recovery should use the verified SMTP reset flow; break-glass maintenance is secondary.
10. Verify public HTTP, real browser owner sign-in, core read pages, a controlled reversible business smoke, reset-email receipt/link, auth rate limit, and static asset freshness. End the write freeze only after these gates.
11. Re-verify marketing `200`, apex/www SSL, and source isolation `403`; do not touch DNS when these are healthy.

## Affected subsystems

Neon production, runtime/migration roles, Hostinger Node Web App, environment and SMTP, owner/auth data, ops routes, marketing continuity, and operational evidence.

## Official documentation

- Neon branching: https://neon.com/docs/introduction/branching
- Neon restore: https://neon.com/docs/introduction/branch-restore
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Hostinger Node Web App: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- Hostinger environment variables: https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/
- Hostinger email settings: https://www.hostinger.com/support/4305847-set-up-hostinger-email-on-your-applications-and-devices/
- Hostinger classic Git: https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/

## Required project skills

`neon`, `neon-postgres`, `neon-postgres-branches`, Better Auth skills, and `playwright` for real browser verification. Hostinger provider actions stay with the root agent.

## Commands and test cases

```bash
shasum -a 256 -c dist/perfume-aura-standalone_*.zip.sha256

# Read once without echoing, export for Drizzle and psql, and unset after use.
read -rsp "Neon direct migration URL: " DATABASE_URL_DIRECT; printf "\n"
export DATABASE_URL_DIRECT

# 1. Expansion only. This command verifies the pre/post Drizzle journal and
# refuses a database where the 0008 contract is already present.
pnpm --filter @perfume-aura/db migrate:through-auth-expansion

# 2. Exact expansion boundary: expect the single row shown below.
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
  "SELECT (SELECT count(*) FROM drizzle.__drizzle_migrations), hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784912984473"
# 8|49bede137e6fd29d1c87a84170502e4f4e1329ab36521a9e37d2fc5f3d5dfa7f|1784912984473

# 3. Deploy the compatible reviewed ZIP while the write freeze remains, then
# require readiness=200 and auth session !=500 before continuing.
test "$(curl -sS -o /dev/null -w '%{http_code}' \
  https://app.perfumeaura.com/api/health/ready)" = "200"
test "$(curl -sS -o /dev/null -w '%{http_code}' \
  https://app.perfumeaura.com/api/auth/get-session)" != "500"

# 4. Reconcile the expansion state. Every reported count must be zero.
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 \
  -f packages/db/sql/phase02-reconciliation.sql

# 5. Only after the exact eight-row boundary and zero reconciliation may the
# full migrator run; 0008 must be the only pending migration.
pnpm db:migrate

# 6. Exact contract boundary: expect the single row shown below.
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
  "SELECT (SELECT count(*) FROM drizzle.__drizzle_migrations), hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784913049848"
# 9|3f7d6d86e395cfc2e996cdfe81c0820bb93b4dfd7b6c7cebe78d8ee239e45e56|1784913049848

# 7. Seed only after the final boundary is verified.
DATABASE_URL='<Neon pooled production>' pnpm --filter @perfume-aura/db seed
DATABASE_URL='<Neon pooled production>' \
  BETTER_AUTH_SECRET='<same hPanel runtime secret>' \
  BETTER_AUTH_URL='https://app.perfumeaura.com' \
  OWNER_EMAIL='...' OWNER_PASSWORD='...' \
  pnpm --filter @perfume-aura/ops seed:owner
unset DATABASE_URL_DIRECT
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/login
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/api/health/live
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/api/health/ready
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/api/auth/get-session
curl -sS -o /dev/null -w '%{http_code}\n' https://app.perfumeaura.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://perfumeaura.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://perfumeaura.com/apps/ops/package.json
```

Expected signed-out root is a redirect to `/login`, session endpoint is non-500, owner sign-in/dashboard succeeds, reset email succeeds once and revokes prior sessions, core routes load, and marketing remains `200`/`403`.

### Proxy/IP rate-limit proof — do not guess the production header

1. Before changing Better Auth IP settings, inspect the actual Hostinger request
   boundary using two root-controlled clients on different public networks.
   Capture the socket peer and candidate forwarding-header names/chain lengths
   privately; retain only redacted labels such as client A/client B in this log.
2. Accept only either a single header that Hostinger demonstrably overwrites at
   its trusted edge, or an exact right-to-left proxy chain whose trusted hops
   and length were observed and documented. Never trust the leftmost
   `X-Forwarded-For`, an arbitrary client-supplied value, or an unbounded chain.
3. If no provider-controlled single value or exact trusted chain can be proven,
   stop the cutover. Change the Better Auth IP-header configuration in source,
   review it, rebuild Phase 06, and repeat; do not guess in hPanel.
4. From client A, submit five invalid sign-ins inside 60 seconds. The sixth must
   return `429` and a valid positive `X-Retry-After` header. Confirm the durable
   database rate-limit row without recording the raw IP or attempted address.
5. During the same window, client B must retain its separate five-attempt
   bucket. A forged forwarding header from either client must not create a
   third trusted identity or bypass client A's exhausted bucket.
6. Repeat once after a Node restart to prove database persistence, then remove
   any temporary diagnostic logging before ending the write freeze.

## Rollback

If failure occurs during expansion or code deployment while the write freeze is intact, use the compatibility-proven previous ZIP or restore the pre-migration Neon point plus previous ZIP. After contract activation, restore the database only when the write freeze is still intact and no post-cutover write exists. After any post-cutover write, never restore an older database or deploy the schema-incompatible previous ZIP; keep ledgers intact and roll forward.

## Completion evidence

- Exact provider targets and timestamps are recorded without secrets.
- Migration journal, role checks, deployment logs, checksum, HTTP statuses, browser owner sign-in, reset email, and marketing continuity are proven.
- No success claim remains conditional.

## Prohibited shortcuts

- No provider mutation by a sub-agent.
- No guessed owner/password, production seed against localhost, Path G retry, API multipart deploy, DNS thrash, or “live” claim from `/login` alone.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 07 file. Act as the read-only preparation agent: validate the local artifact/checksum and public endpoints and prepare a redacted expand/code/contract root-operator checklist. A different read-only agent must independently review the root's redacted post-cutover evidence. Neither agent may log in, read secrets, create/reset a Neon branch, migrate/seed production, change roles/env/SMTP/DNS/SSL, upload/restart/deploy, or send email. Report exact blockers and required root-only action.
