# Ops deploy checklist — `app.perfumeaura.com`

Use this when promoting Phase 1 inventory ops to Hostinger **Node.js Web App**.  
Marketing (`perfumeaura.com`) stays on classic Git → `public_html`. **Do not** deploy Next into marketing `public_html`.

Official Node guide: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Related | [DEPLOY.md](./DEPLOY.md) · [ENV.md](./ENV.md) · [SECURITY.md](./SECURITY.md) |

## Live account snapshot (updated 2026-07-22 via Hostinger MCP)

| Item | Value |
|------|--------|
| Hosting order | `1008392140` · user `u602723373` |
| Existing websites | `perfumeaura.com`, `app.perfumeaura.com` (**created**), free `*.hostingersite.com`, others |
| **Ops website** | `app.perfumeaura.com` addon **created** · root `/home/u602723373/domains/app.perfumeaura.com/public_html` |
| Free staging site | `lightsteelblue-bear-889787.hostingersite.com` (MCP generated) |
| Marketing DNS | Hostinger zone · apex **ALIAS** → CDN |
| `app` DNS | Resolves publicly (Hostinger multi-A for addon) |
| MCP deploy | Standalone ZIP **build completed** · process may still need hPanel “Node.js Web App” start command / entry |

### MCP actions already run

1. `hosting_createWebsiteV1` → `app.perfumeaura.com`  
2. `hosting_deployJsApplication` with prebuilt Next **standalone** zip (source monorepo build fails: esbuild **EACCES** on shared hosting)  
3. Build UUID completed: install skip + `echo prebuilt-standalone`  
4. `hosting_restartNode_jsApplicationV1` accepted  
5. Public HTTP still Hostinger default **404/403** until hPanel wires Node process / proxy  

### Why source build fails on Hostinger shared Node

- `pnpm` install runs, then build shell loses `pnpm` on PATH  
- Fixing with `npx pnpm` hits **esbuild binary EACCES** (no exec bit on shared FS)  
- **Mitigation:** build `output: "standalone"` locally, deploy prebuilt zip (`node apps/ops/server.js`)  

### What you still do in hPanel (one-time)

1. Open **app.perfumeaura.com** → **Deploy Web App / Node.js** (not classic files only)  
2. Confirm **start command**: `node apps/ops/server.js` (or `pnpm start` if monorepo root is used)  
3. **Node version** 20+  
4. Paste env vars (see below) if not already on disk from deploy  
5. Redeploy or restart until `https://app.perfumeaura.com/login` returns Next (not hPanel 404)

## Pre-flight (repo / Neon)

- [x] `pnpm test` green (unit + concurrent oversell integration)
- [x] `pnpm build:ops` green locally
- [ ] Neon **production** project (or branch) ready
- [ ] `DATABASE_URL` = pooled Neon connection  
- [ ] `DATABASE_URL_DIRECT` = direct (for migrate only)
- [ ] Migrations applied against prod:  
      `DATABASE_URL_DIRECT=… pnpm db:migrate`
- [ ] Seed MAIN location: `DATABASE_URL=… pnpm --filter @perfume-aura/db seed`
- [ ] Seed owner (once):  
      `DATABASE_URL=… BETTER_AUTH_SECRET=… BETTER_AUTH_URL=https://app.perfumeaura.com OWNER_EMAIL=… OWNER_PASSWORD=… pnpm --filter @perfume-aura/ops seed:owner`

## Env vars (hPanel Node app)

Copy from `apps/ops/.env.example`. Production values:

```text
DATABASE_URL=                 # Neon pooled
DATABASE_URL_DIRECT=          # Neon direct (migrate job / one-off)
BETTER_AUTH_SECRET=           # openssl rand -base64 32  (≥32 chars)
BETTER_AUTH_URL=https://app.perfumeaura.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.perfumeaura.com
# optional extras
# BETTER_AUTH_TRUSTED_ORIGINS=
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=
```

## Hostinger — create Node.js Web App (manual in hPanel)

> Creating a website changes shared Hostinger state. Do this in hPanel (or confirm before API create).

1. hPanel → **Add Website** → **Deploy Web App** (Node.js)  
2. Connect GitHub → repo **`MohsinMMK/perfume-aura`** · branch **`main`**  
3. Framework: **Next.js** · Node **20** or **22**  
4. Root / monorepo:
   - Prefer root directory **`apps/ops`** if the UI offers it  
   - Else monorepo root with:
     - **Install:** `pnpm install` (or Hostinger’s pnpm detect)
     - **Build:** `pnpm --filter @perfume-aura/ops build`
     - **Start:** `pnpm --filter @perfume-aura/ops start` or `cd apps/ops && pnpm start`
5. Port: **3000** (Hostinger Node default)  
6. Attach domain: **`app.perfumeaura.com`**  
7. Paste env vars · save · deploy  
8. Enable SSL for `app.perfumeaura.com`

### Monorepo install fallback

If Hostinger cannot install workspace packages from `apps/ops` alone:

```bash
# Build from repo root (recommended when root is set to monorepo)
pnpm install --frozen-lockfile
pnpm --filter @perfume-aura/ops build
# Start from apps/ops after build
cd apps/ops && pnpm start
```

## DNS (Hostinger zone only — Path A)

While NS are `lunar`/`solar`, edit DNS **only** in Hostinger (not GoDaddy).

After the Node app exists, hPanel shows the record to add for the app domain. Typical patterns:

| Type | Name | Value | When |
|------|------|--------|------|
| CNAME or A | `app` | value from **hPanel Node app / Check guide** | after Web App created |

Do **not** invent an IP. Prefer the exact target Hostinger shows for that Node website.

Verify:

```bash
dig NS perfumeaura.com +short
# lunar.dns-parking.com / solar.dns-parking.com

dig A app.perfumeaura.com +short
# or CNAME — must match Hostinger Node target

curl -sI -L https://app.perfumeaura.com/login | head
```

## Marketing isolation

After classic Git deploy of marketing:

```bash
curl -sI https://perfumeaura.com/apps/ops/package.json | head -1
# expect 404 (not 200 with monorepo source)
```

Root `index.html` + `styles.css` are interim marketing mirrors only.

## Smoke test (production)

1. `https://app.perfumeaura.com/login` loads over HTTPS  
2. Owner login works  
3. Dashboard metrics load  
4. Create product → receive stock → low stock list  
5. Concurrent oversell remains enforced (already covered by integration test against Neon)

## Rollback

- Redeploy previous Git commit on the Node Web App  
- Or disable the Node site temporarily; marketing remains independent  

## Status board

| Step | Status |
|------|--------|
| Code ready | Done |
| Tests (unit + concurrent) | Done |
| Neon prod + migrate | **You** |
| Hostinger Node Web App | **You (hPanel)** |
| DNS `app` record | **You** after Web App |
| Owner seed on prod | **You** |
| SSL + smoke | **You** |

When the Node app exists, re-run Hostinger website list / DNS tools to confirm `app.perfumeaura.com` and the `app` zone record.
