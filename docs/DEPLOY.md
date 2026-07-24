# Deploy guide — Perfume Aura (official stack)

| Field | Value |
|-------|--------|
| Updated | 2026-07-24 |
| Ops checklist | [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md) |
| DNS support | [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md) |
| Ops pack | `pnpm ops:pack` → Path Z prebuilt zip |
| Agent rules | [AGENTS.md](../AGENTS.md) — Path M / G / Z |

This document describes the **production-correct** way this project is hosted. Follow it for every future change.

## Dual websites (monorepo)

| Site | Path in repo | Hostinger product | Official GitHub flow | Domain |
|------|----------------|-------------------|----------------------|--------|
| **Marketing** | `apps/marketing` (+ root mirror interim) | Classic **Git** → `public_html` | **Path M** — Advanced → Git → GitHub OAuth | perfumeaura.com |
| **Ops** | `apps/ops` (Next.js) | **Node.js Web App** | **Path G** GitHub (preferred) · **Path Z** zip (current) | app.perfumeaura.com |

Official docs:

- Classic Git (marketing): https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/
- Node.js Web App (ops): https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

Hostinger Node sources (official order): **(1) GitHub** · **(2) zip upload** · **(3) Connector**.  
Classic Git is **not** for Next.js. Do not put the ops app into marketing `public_html`.

Full dual-flow write-up for agents: **[AGENTS.md — GitHub → Hostinger](../AGENTS.md#github--hostinger-official-dual-flow)**.

### Path M — Marketing (GitHub classic Git)

**Edit** only `apps/marketing/` (`index.html`, `styles.css`, `.htaccess`).  
**Publish** to monorepo root (Hostinger serves repo root in `public_html`):

```bash
pnpm marketing:sync   # copies source → root index.html, styles.css, .htaccess
git add apps/marketing index.html styles.css .htaccess
git commit -m "marketing: …"
git push origin main  # Hostinger Advanced → Git auto-deploy → public_html
```

Drift gate: `pnpm marketing:check` (CI on `main` / PRs). Do not hand-edit root HTML/CSS/htaccess.

### Ops deploy

Full step-by-step + live account snapshot: **[OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)**.

#### Path G — GitHub on Node Web App (goal only — **do not attempt today**)

**Status: blocked.** Shared Node monorepo source build → esbuild **EACCES**.  
Do **not** connect GitHub source build or thrash failed Path G deploys until unblocked. Use **Path Z** only.

When (and only when) a monorepo/source build has been proven green on this Hostinger plan, reconnect GitHub on the Node Web App. Until then, ignore Path G field recipes elsewhere — they are historical targets, not runnable steps.

#### Path Z — Prebuilt zip (current workable / official option #2)

1. Local: `pnpm ops:pack` → `dist/perfume-aura-standalone_*.zip`  
   - **Primary portability:** materialized real dirs under `apps/ops/node_modules` (`next`, `@swc/helpers`, `react`, linux `sharp` + siblings)  
   - `zip -y` is secondary (preserves remaining symlinks); do not hand-zip standalone without materialize  
   - Smoke gate: extract zip → `require('next')` + `require('sharp')` + `.next/static` from `apps/ops` must pass  
   - Keep extracted `node_modules` on the server (root `package.json` empty deps = install no-op; clean wipe breaks boot)  
2. hPanel → **app.perfumeaura.com** → Deploy Web App → **Settings and redeploy**  
3. Upload zip · Framework Other · Node **20.x** · Root `./`  
4. Build: `echo prebuilt-standalone` · **Entry file:** `apps/ops/server.js` · Output empty  
5. Env in **hPanel only** (never bake `.env` into zip): [ENV.md](./ENV.md) — include `PORT=3000`, `NODE_ENV=production`, `NEXT_PUBLIC_BETTER_AUTH_URL`  
6. **Save and redeploy** · restart Node if offered  
7. **Neon go-live (required for real login — not optional):**  
   ```bash
   DATABASE_URL_DIRECT=… pnpm db:migrate
   DATABASE_URL=… pnpm --filter @perfume-aura/db seed
   DATABASE_URL=… BETTER_AUTH_SECRET=… BETTER_AUTH_URL=https://app.perfumeaura.com \
     OWNER_EMAIL=… OWNER_PASSWORD=… pnpm --filter @perfume-aura/ops seed:owner
   ```  
8. Smoke:  
   - `https://app.perfumeaura.com/login` → Next HTML (200)  
   - `https://app.perfumeaura.com/api/auth/get-session` → **not** 500  
   - Owner can sign in  

Full field table + status board: [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md).

#### Path B — CI artifact (autonomous pack + optional API deploy)

Goal: stop local-only pack. GitHub Actions builds the same Path Z zip on every ops-related push to `main`.

1. Workflow: [`.github/workflows/ops-pack.yml`](../.github/workflows/ops-pack.yml) → `pnpm ops:pack` on `ubuntu-latest`
2. Artifact: **ops-standalone-zip** (Actions → run → Artifacts), retention 14 days
3. Optional auto-deploy: set repo secret **`HOSTINGER_API_TOKEN`** (hPanel → API)
   - Job calls `scripts/deploy-ops-hostinger.sh` → official `…/nodejs/builds/from-archive`
   - Overrides: entry `apps/ops/server.js`, build `echo prebuilt-standalone`, Node 20
   - Zip must stay **≤ 50MB** (Hostinger API limit)
4. Without the secret: download artifact and upload in hPanel (same as local Path Z)
5. Runtime env / Neon migrate / `seed:owner` still hPanel + human (never bake into zip)

```bash
# Local equivalent of CI deploy step:
pnpm ops:pack
HOSTINGER_API_TOKEN=… pnpm ops:deploy
```


**Forbidden deploy artifacts**

- Flat zip with root `server.js` / `entry.cjs` (missing monorepo layout → `Cannot find module 'next'`)  
- Hand-zip of `.next/standalone` without `pnpm ops:pack` materialize  
- Any zip containing `.env` / secrets  
- Whole monorepo into marketing `public_html` **without** root `.htaccess` deny rules (Path M still deploys whole tree; deny is required mitigate)  
- Classic Git as ops **runtime** (wrong Hostinger product)  
- `rm -rf node_modules && pnpm i` on Hostinger after Path Z extract  

### Marketing deploy safety

- Prefer future CI that uploads **only** marketing static files (artifact-only).  
- Today: root publish surface = generated from `apps/marketing` via `pnpm marketing:sync` (includes `.htaccess`).  
- Classic Git still pulls the **whole monorepo** into `public_html`. Root **`.htaccess`** denies `/apps`, `/packages`, `/docs`, lockfiles, `*.md`, `.git`, `.env`, `.gitignore` (SEC-7 mitigate).  
- After deploy verify:

```bash
curl -sI -o /dev/null -w "%{http_code}\n" https://perfumeaura.com/apps/ops/package.json   # expect 403 (.htaccess [F,L])
curl -sI -o /dev/null -w "%{http_code}\n" https://perfumeaura.com/.gitignore               # expect 403
curl -sI -o /dev/null -w "%{http_code}\n" https://perfumeaura.com/                          # 200
```

## Ownership split

| Concern | Provider | Where you manage it |
|--------|----------|---------------------|
| Domain registration & renewal | **GoDaddy** | GoDaddy Domain Portfolio |
| DNS zone (A, CNAME, ALIAS, MX, TXT) | **Hostinger** | hPanel → Domains → DNS |
| Marketing files, SSL, classic Git | **Hostinger** | hPanel → Websites → perfumeaura.com |
| Ops Node app | **Hostinger** | hPanel → Websites → app (Node Web App) |
| Source code | **GitHub** | https://github.com/MohsinMMK/perfume-aura |
| Database | **Neon** | Neon console |

**Do not transfer the domain to Hostinger** unless you later choose to. Registration stays at GoDaddy to avoid re-paying for a year you already own.

## Architecture

```text
GoDaddy (domain ownership)
   └── Nameservers → lunar.dns-parking.com / solar.dns-parking.com
            └── Hostinger DNS zone
                     ├── apex → Hostinger (A to plan IP and/or ALIAS CDN)
                     ├── www  → Hostinger CDN / apex
                     └── app  → Node website target (when ops exists)
                              ├── perfumeaura.com public_html  ← marketing static
                              └── app.perfumeaura.com nodejs/ ← Next.js ops
```

## DNS (official method: nameservers — Path A)

Hostinger’s recommended method for domains registered elsewhere is **change nameservers at the registrar**, not hand-editing A records at GoDaddy.

### At GoDaddy (nameservers only)

1. Domain → **DNS** → **Nameservers** → **Change** → **Custom**  
2. Set exactly (confirm in hPanel Check guide if Hostinger shows different values):  

```text
lunar.dns-parking.com
solar.dns-parking.com
```

3. Save. Wait up to **24 hours** for validation + global propagation.  
4. While Hostinger NS are active, **do not** edit A/CNAME records in GoDaddy — they are ignored.  

### At Hostinger (zone records)

Historical plan IP (Check guide): **`82.112.232.17`**.

**As of 2026-07-21 live zone** (may evolve with Hostinger CDN):

| Type | Name | Example value | Purpose |
|------|------|---------------|---------|
| ALIAS | `@` | `perfumeaura.com.cdn.hstgr.net` | Apex via Hostinger CDN |
| CNAME | `www` | `www.perfumeaura.com.cdn.hstgr.net` | www via CDN |
| MX / TXT | `@` | Hostinger mail / SPF | Email |
| CNAME or A | `app` | **from Node Web App panel** | Ops (add when site exists) |

If Hostinger instead shows classic **A `@` → plan IP**, that is also valid Path A—prefer panel defaults for this domain.

Re-check IP / CDN target via Plan details / Check guide.

If hPanel shows **“Domain not pointing”** or **Domain not found**, wait or contact support — do not thrash nameservers. See [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md).

### Checks

```bash
dig NS perfumeaura.com +short
# expect: lunar.dns-parking.com / solar.dns-parking.com

dig A perfumeaura.com +short
# expect: Hostinger/CDN edge IPs or plan IP

dig A app.perfumeaura.com +short
# after ops DNS: Node target

curl -sI -L https://perfumeaura.com | head
curl -sI https://perfumeaura.com/apps/ops/package.json | head -1   # expect 403
```

Propagation: https://dnschecker.org/#NS/perfumeaura.com

### Optional

- Disable **DNSSEC** at GoDaddy if enabled (can block NS changes).  

## Git → Hostinger (marketing classic Git)

Hostinger docs: [Deploy a Git repository](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/)

### One-time setup in hPanel

1. Websites → **perfumeaura.com** → **Dashboard**  
2. **Advanced** → **Git**  
3. **Continue with GitHub** → authorize Hostinger  
4. Repository: **`MohsinMMK/perfume-aura`**  
5. Branch: **`main`**  
6. Root directory: **`public_html`**  
7. **Deploy**  
8. Confirm **auto-deployment** is enabled  

### Everyday deploy (marketing)

```bash
pnpm marketing:sync   # if apps/marketing changed
git add .
git commit -m "Describe your change"
git push origin main
```

Hostinger pulls `main` into `public_html`. No FTP for normal updates.

### Manual redeploy

hPanel → Advanced → Git → **Redeploy**

## SSL

After the domain resolves publicly:

1. hPanel → site dashboard → **SSL**  
2. Marketing: free cert for `perfumeaura.com` and `www.perfumeaura.com`  
3. Ops: free cert for `app.perfumeaura.com`  

## Local preview

```bash
# Marketing
npx serve apps/marketing
# or open apps/marketing/index.html

# Ops
pnpm dev:ops
# http://localhost:3000
```

## Anti-patterns

| Avoid | Why |
|-------|-----|
| Transfer domain to Hostinger “to fix DNS” | Extra cost; not required |
| A records only at GoDaddy while Hostinger NS are set | Ignored |
| Thrashing nameservers | Resets validation |
| Website Builder / Horizons for this repo | No official Git path for this stack |
| Classic Git for Next.js ops | Wrong product; broken runtime |
| Whole monorepo into `public_html` without `.htaccess` deny | Leaks ops source / secrets risk (Path M still uses whole tree + deny) |
| Vercel production | Hostinger-only policy |

## Related

- [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)  
- [ENV.md](./ENV.md)  
- [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md)  
- [AGENTS.md](../AGENTS.md)  
- [README.md](../README.md)  
