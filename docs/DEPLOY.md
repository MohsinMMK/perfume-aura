# Deploy guide — Perfume Aura (official stack)

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Ops checklist | [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md) |
| DNS support | [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md) |

This document describes the **production-correct** way this project is hosted. Follow it for every future change.

## Dual websites (monorepo)

| Site | Path in repo | Hostinger product | Domain |
|------|----------------|-------------------|--------|
| **Marketing** | `apps/marketing` (+ root mirror interim) | Classic **Git** → `public_html` | perfumeaura.com |
| **Ops** | `apps/ops` (Next.js) | **Node.js Web App** | app.perfumeaura.com |

Official Node guide: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

Classic Git is **not** for Next.js. Do not put the ops app into marketing `public_html`.

### Ops deploy

Full step-by-step + live account snapshot: **[OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)**.

1. hPanel → **Add Website** → **Deploy Web App** (Node.js)  
2. Import GitHub monorepo · branch `main`  
3. Framework: Next.js · Node 20/22  
4. Root: monorepo root or `apps/ops` (see checklist fallbacks)  
5. Build: `pnpm --filter @perfume-aura/ops build`  
6. Start: `next start` (port 3000)  
7. Env: [ENV.md](./ENV.md) / `apps/ops/.env.example`  
8. Domain `app.perfumeaura.com` · SSL · DNS in **Hostinger zone only**  

### Marketing deploy safety

- Prefer CI that uploads **only** marketing static files.  
- Until CI exists, root `index.html` / `styles.css` keep classic Git working (`pnpm marketing:sync`).  
- After deploy: `https://perfumeaura.com/apps/ops/package.json` must be **404**.  

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
curl -sI https://perfumeaura.com/apps/ops/package.json | head -1   # expect 404
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
| Whole monorepo into `public_html` | Leaks ops source / secrets risk |
| Vercel production | Hostinger-only policy |

## Related

- [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md)  
- [ENV.md](./ENV.md)  
- [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md)  
- [AGENTS.md](../AGENTS.md)  
- [README.md](../README.md)  
