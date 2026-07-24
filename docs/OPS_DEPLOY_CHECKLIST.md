# Ops deploy checklist — `app.perfumeaura.com`

Use this when promoting Phase 1 inventory ops to Hostinger **Node.js Web App**.  
Marketing (`perfumeaura.com`) stays on classic Git → `public_html`. **Do not** deploy Next into marketing `public_html`.

Official Node guide: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

| Field | Value |
|-------|--------|
| Updated | 2026-07-24 |
| Related | [DEPLOY.md](./DEPLOY.md) · [ENV.md](./ENV.md) · [SECURITY.md](./SECURITY.md) |
| Pack script | `pnpm ops:pack` → `dist/perfume-aura-standalone_YYYYMMDD.zip` (**materialize** `apps/ops/node_modules` primary; zip `-y` secondary; `next`+`sharp` smoke; no `.env`) |

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
5. Historical: public HTTP was Hostinger default **404/403** until Node process/proxy wired — **re-check live** (login may already be Next 200 while auth env still missing)  

### Why source build fails on Hostinger shared Node

- `pnpm` install runs, then build shell loses `pnpm` on PATH  
- Fixing with `npx pnpm` hits **esbuild binary EACCES** (no exec bit on shared FS)  
- **Mitigation:** build `output: "standalone"` locally, deploy prebuilt zip (`node apps/ops/server.js`)  

### What you still do in hPanel (one-time)

1. Open **app.perfumeaura.com** → **Deploy Web App / Node.js** → **Settings and redeploy**  
2. Fill fields exactly as in **[hPanel Settings and redeploy (prebuilt zip)](#hpanel-settings-and-redeploy-prebuilt-zip)**  
3. **Add** env vars (below)  
4. **Save and redeploy**  
5. Smoke: `https://app.perfumeaura.com/login` returns Next login (not Hostinger 404/403)

## Why marketing ≠ ops on push

Official Hostinger model = **one GitHub repo, two websites**:

| Site | Domain | Product | Auto on `git push main` |
|------|--------|---------|-------------------------|
| Marketing | `perfumeaura.com` | Classic **Git** → `public_html` | Yes (when auto-deploy on) |
| Ops | `app.perfumeaura.com` | **Node.js Web App** | Ideal yes via Git — **blocked today** by shared-host monorepo/esbuild **EACCES** |

So push does **not** publish both until ops Node app is healthy. Classic Git cannot run Next.js. Do not merge ops into marketing `public_html`.

**Workable ops path now:** local `pnpm ops:pack` → upload zip → entry `apps/ops/server.js` + env → Save and redeploy.  
**Later Git auto path:** when Hostinger can build monorepo (or CI ships artifact Hostinger pulls), reconnect GitHub on the Node app and drop zip uploads.

## hPanel Settings and redeploy (prebuilt zip)

Matches Hostinger **Settings and redeploy** UI. Use after `pnpm ops:pack` (or **Use previous files** if zip already uploaded).

| Field | Value |
|-------|--------|
| **Source files** | **Upload new files** → `dist/perfume-aura-standalone_*.zip` · or **Use previous files** if same zip already on server |
| **Framework preset** | **Other** (or Next.js if listed; either OK for standalone) |
| **Node version** | **20.x** |
| **Root directory** | `./` |
| **Build command** | `echo prebuilt-standalone` — **not** `pnpm run build` |
| **Package manager** | `pnpm` (or npm) |
| **Output directory** | *(leave empty)* |
| **Entry file** | **`apps/ops/server.js`** — required; empty entry = public 403/404 |
| **Forbidden** | Root `entry.cjs` / flat `server.js` zip · baking `.env` into zip |

Then **Environment Variables → Add**:

```text
DATABASE_URL=<Neon pooled production URL>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://app.perfumeaura.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.perfumeaura.com
NODE_ENV=production
PORT=3000
```

Optional (not required to boot app):

```text
DATABASE_URL_DIRECT=<Neon direct, migrate only>
# BETTER_AUTH_TRUSTED_ORIGINS=
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=
```

Click **Save and redeploy**. If build is green but site still Hostinger HTML: **Restart** app; confirm entry path is exactly `apps/ops/server.js` (try `./apps/ops/server.js` only if panel requires it).

### Pack zip locally (official repo command)

```bash
pnpm ops:pack
# → dist/perfume-aura-standalone_YYYYMMDD.zip
# zip root must contain:
#   apps/ops/server.js
#   apps/ops/.next/static/
#   apps/ops/node_modules/next (+ react, @swc/helpers, sharp, …) as REAL dirs
#   node_modules/.pnpm/ store
#   root package.json (empty deps, start → node apps/ops/server.js)
```

Do **not** hand-zip `.next/standalone` without `pnpm ops:pack` (materialize + linux sharp + smoke).  
Do **not** `rm -rf node_modules && pnpm i` on Hostinger after extract — empty root deps would wipe the runtime tree.

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

Copy names from `apps/ops/.env.example`. **Runtime required** on Node app:

```text
DATABASE_URL=                 # Neon pooled
BETTER_AUTH_SECRET=           # openssl rand -base64 32  (≥32 chars)
BETTER_AUTH_URL=https://app.perfumeaura.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.perfumeaura.com
NODE_ENV=production
PORT=3000
```

Optional / one-off:

```text
DATABASE_URL_DIRECT=          # Neon direct (migrate job only)
# BETTER_AUTH_TRUSTED_ORIGINS=
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=
```

## Hostinger — Node.js Web App paths

> `app.perfumeaura.com` addon **already created**. Prefer **Settings and redeploy** on that site over creating a second website.

### Path B — CI artifact (autonomous pack)

GitHub Actions [ops-pack.yml](../.github/workflows/ops-pack.yml) runs `pnpm ops:pack` on ops-related `main` pushes.

| Step | Detail |
|------|--------|
| Artifact | Actions run → **ops-standalone-zip** |
| Auto deploy | Repo secret `HOSTINGER_API_TOKEN` → `pnpm ops:deploy` / `from-archive` API |
| Manual | Download artifact → hPanel upload (same entry/build as Path Z) |
| Limit | Zip ≤ **50MB** |

### Path Z — Prebuilt zip (current workable; Hostinger official source #2)

Works around shared-Node monorepo EACCES. Full agent write-up: [AGENTS.md Path Z](../AGENTS.md#path-z--ops-node-via-prebuilt-zip-current-workable--official-option-2).

1. Local: `pnpm ops:pack`  
2. hPanel → **app.perfumeaura.com** → Deploy Web App → **Settings and redeploy**  
3. Upload zip · set **Entry file** `apps/ops/server.js` · build `echo prebuilt-standalone` · env · **Save and redeploy**  
4. SSL on if not already  
5. Neon: migrate + MAIN seed + `seed:owner` (see Pre-flight)  
6. Smoke `/login` + `/api/auth/get-session` (not 500) + owner sign-in  

### Path G — GitHub auto-deploy (goal only — **do not attempt today**)

**Blocked:** shared Node monorepo source build → esbuild **EACCES**.  
**Not** Advanced → Git (that is marketing Path M only).  
**Do not** connect GitHub source build or retry failed Path G deploys until a build is proven green on this plan. Use Path Z.

Historical target fields (reference only, not a runbook):

- Framework Next.js · Node 20 · monorepo root · install/build that Hostinger can exec without EACCES  
- Entry still **`apps/ops/server.js`** after standalone layout exists  
- Same hPanel env as Path Z  

Until Path G is green, **do not** rely on `git push` alone for ops — marketing classic Git (**Path M**) still auto-deploys independently. See [AGENTS.md GitHub → Hostinger](../AGENTS.md#github--hostinger-official-dual-flow).

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
# expect 403 (.htaccess forbid) — not 200 with monorepo source
curl -sI https://perfumeaura.com/.gitignore | head -1
# expect 403
```

Root `index.html` + `styles.css` are interim marketing mirrors only.

## Smoke test (production)

1. `https://app.perfumeaura.com/login` loads over HTTPS  
2. Owner login works  
3. Dashboard metrics load  
4. Create product → receive stock → low stock list  
5. Concurrent oversell remains enforced (already covered by integration test against Neon)

## Rollback

- **Path Z:** keep prior `dist/perfume-aura-standalone_*.zip` · re-upload · same entry `apps/ops/server.js` · redeploy  
- Path G (when live): redeploy previous Git commit on the Node Web App  
- Or disable the Node site temporarily; marketing remains independent  

## Status board

| Step | Status |
|------|--------|
| Code ready | Done |
| Tests (unit + concurrent) | Done |
| `pnpm ops:pack` (materialize + sharp siblings + smoke) | Done (re-pack after pack fixes) |
| Hostinger entry `apps/ops/server.js` + official zip | Done (build completed; re-upload after re-pack) |
| `https://app.perfumeaura.com/login` Next HTML | Done (HTTP 200) — **shell only**, not full auth |
| Marketing monorepo HTTP deny (`.htaccess`) | Done (403 on `/apps/ops/*`) — push updated `.htaccess` via Path M |
| Neon prod + migrate + MAIN seed + hPanel `DATABASE_URL` | **You** |
| hPanel `BETTER_AUTH_*` + `PORT`/`NODE_ENV` (no zip bake) | **You** |
| Owner seed on prod (`seed:owner`, password ≥12) | **You** |
| `/api/auth/get-session` not 500 + owner can sign in | **You** (needs env + seed) |
| Root `/` session redirect (needs DB/auth env) | Blocked until env |
| GitHub auto-deploy ops (Path G) | Blocked — do not attempt; use Path Z |
| Rotate API token if ever in `/tmp` | **You** |

Login **200** ≠ owner can sign in. Re-check after env + seed: `curl -sI https://app.perfumeaura.com/login` and `curl -s https://app.perfumeaura.com/api/auth/get-session`.
