Hostinger Node.js Web App — prebuilt standalone (Perfume Aura ops)

Settings and redeploy:
  Source: upload this zip
  Framework: Other (or Next.js)
  Node: 24.x (archive built and validated with 24.6.0)
  Root directory: ./
  Build command: echo prebuilt-standalone
  Package manager: pnpm (or npm)
  Output directory: (leave empty)
  Entry file: apps/ops/server.js

IMPORTANT:
  - Keep the extracted node_modules tree. Root package.json has empty deps on purpose
    (install no-op). Do NOT rm -rf node_modules && pnpm i on the server.
  - Portability comes from materialized apps/ops/node_modules (real dirs), not zip -y alone.

Required env (hPanel only — never bake into zip):
  DATABASE_URL=<Neon pooled production>
  BETTER_AUTH_SECRET=<openssl rand -base64 32>
  BETTER_AUTH_URL=https://app.perfumeaura.com
  SMTP_HOST=smtp.hostinger.com
  SMTP_PORT=465
  SMTP_SECURE=true
  SMTP_USER=<Hostinger mailbox>
  SMTP_PASSWORD=<mailbox password>
  SMTP_FROM=<approved sender>
  BUSINESS_TIMEZONE=Asia/Karachi
  NODE_ENV=production
  PORT=<injected by Hostinger; do not set manually>

Phase 07 staged rollout (run from the reviewed repository, outside this zip):
  Read the direct URL without echoing it, then reuse the exported value:
  read -rsp "Neon direct migration URL: " DATABASE_URL_DIRECT; printf "\n"
  export DATABASE_URL_DIRECT
  1. Apply only expansions through 0007:
  pnpm --filter @perfume-aura/db migrate:through-auth-expansion
  2. Verify the journal boundary:
  psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
    "SELECT (SELECT count(*) FROM drizzle.__drizzle_migrations), hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784912984473"
  Expect exactly:
  8|49bede137e6fd29d1c87a84170502e4f4e1329ab36521a9e37d2fc5f3d5dfa7f|1784912984473
  3. Upload/redeploy this compatible archive; require /api/health/ready = 200
     and /api/auth/get-session to be non-500 while the write freeze remains.
  test "$(curl -sS --connect-timeout 5 --max-time 15 -o /dev/null -w '%{http_code}' \
    https://app.perfumeaura.com/api/health/ready)" = "200"
  test "$(curl -sS --connect-timeout 5 --max-time 15 -o /dev/null -w '%{http_code}' \
    https://app.perfumeaura.com/api/auth/get-session)" != "500"
  4. Reconcile; every returned count must be zero:
  psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 \
    -f packages/db/sql/phase02-reconciliation.sql
  5. With only 0008 pending, apply the full official journal:
  pnpm db:migrate
  6. Verify the final journal:
  psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
    "SELECT (SELECT count(*) FROM drizzle.__drizzle_migrations), hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784913049848"
  Expect exactly:
  9|3f7d6d86e395cfc2e996cdfe81c0820bb93b4dfd7b6c7cebe78d8ee239e45e56|1784913049848
  7. Only now seed MAIN and the owner:
  DATABASE_URL='<Neon pooled production>' pnpm --filter @perfume-aura/db seed
  DATABASE_URL='<Neon pooled production>' \
    BETTER_AUTH_SECRET='<same hPanel runtime secret>' \
    BETTER_AUTH_URL=https://app.perfumeaura.com \
    OWNER_EMAIL=… OWNER_PASSWORD=… \
    pnpm --filter @perfume-aura/ops seed:owner
  unset DATABASE_URL_DIRECT

Do NOT use root entry.cjs / flat server.js experiments.
Smoke: https://app.perfumeaura.com/login
       https://app.perfumeaura.com/api/auth/get-session  (not 500)
