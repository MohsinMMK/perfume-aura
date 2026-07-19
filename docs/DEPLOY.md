# Deploy guide — Perfume Aura (official stack)

This document describes the **production-correct** way this project is hosted. Follow it for every future change.

## Ownership split

| Concern | Provider | Where you manage it |
|--------|----------|---------------------|
| Domain registration & renewal | **GoDaddy** | GoDaddy Domain Portfolio |
| DNS zone (A, CNAME, MX, TXT) | **Hostinger** | hPanel → Domains → DNS |
| Website files, SSL, Git | **Hostinger** | hPanel → Websites → perfumeaura.com |
| Source code | **GitHub** | https://github.com/MohsinMMK/perfume-aura |

**Do not transfer the domain to Hostinger** unless you later choose to. Registration stays at GoDaddy to avoid re-paying for a year you already own.

## Architecture

```text
GoDaddy (domain ownership)
   └── Nameservers → ns1.dns-parking.com / ns2.dns-parking.com
            └── Hostinger DNS zone
                     └── A @ → Hostinger hosting IP
                              └── public_html  ← Git deploy from GitHub main
```

## DNS (official method: nameservers)

Hostinger’s recommended method for domains registered elsewhere is **change nameservers at the registrar**, not hand-editing A records at GoDaddy.

### At GoDaddy (nameservers only)

1. Domain → **DNS** → **Nameservers** → **Change** → **Custom**
2. Set exactly (confirm in hPanel if Hostinger shows different values):

```text
ns1.dns-parking.com
ns2.dns-parking.com
```

3. Save. Wait up to **24 hours** for validation + global propagation.
4. While Hostinger NS are active, **do not** edit A/CNAME records in GoDaddy — they are ignored.

### At Hostinger (after NS are detected)

Hostinger auto-creates the zone (including the correct **A** record for your hosting IP) once:

1. The domain is added as a website on the hosting plan, and  
2. Nameservers are validated.

Typical records after activation:

| Type | Name | Value | Purpose |
|------|------|--------|---------|
| A | `@` | Hosting plan IPv4 | Root domain → server |
| CNAME or A | `www` | domain / same IP | www subdomain |

### Find hosting IP (verification only)

hPanel → Websites → **Dashboard** → Hosting plan → **Plan details** → Website details → **IP address**.

Use this IP to verify the A record after propagation. Only use it at GoDaddy if you switch to the alternative “A record” method (not our default).

### Checks that mean “DNS is ready”

```bash
dig NS perfumeaura.com +short
# expect: ns1.dns-parking.com / ns2.dns-parking.com

dig A perfumeaura.com +short
# expect: same IPv4 as Plan details
```

Also: hPanel “Domain not connected” warning should clear; DNS zone in Hostinger should list records (not empty).

### Optional

- Disable **DNSSEC** at GoDaddy if enabled (can block NS changes).
- Propagation: https://dnschecker.org/#NS/perfumeaura.com

## Git → Hostinger (official workflow)

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

### Everyday deploy

```bash
git add .
git commit -m "Describe your change"
git push origin main
```

Hostinger pulls `main` into `public_html` automatically. No FTP for normal updates.

### Manual redeploy

hPanel → Advanced → Git → **Redeploy** (when you need an immediate refresh without a new commit).

## SSL

After the domain resolves:

1. hPanel → site dashboard → **SSL**
2. Install free certificate for `perfumeaura.com` and `www.perfumeaura.com`

## Repo layout (static HTML)

Deployed as-is from repository root into `public_html`:

```text
index.html
styles.css
README.md
docs/DEPLOY.md
```

When you later add a build step (Vite/Next/etc.), switch to Hostinger’s **Node.js** Git path or deploy a build output branch — do not assume classic HTML Git deploy runs `npm build`.

## Anti-patterns

- Transferring the domain “just to make DNS work”
- Editing GoDaddy A records while Hostinger nameservers are set
- Using zip/FTP as the long-term deploy path
- Using Website Builder / Horizons for this GitHub project (no Git integration)
- Changing nameservers repeatedly (restarts propagation)

## Success criteria

- [ ] `https://perfumeaura.com` shows this site
- [ ] `git push origin main` updates Hostinger without manual upload
- [ ] Domain still registered only at GoDaddy
- [ ] DNS managed only at Hostinger

## References

- https://www.hostinger.com/support/1863967-how-to-point-a-domain-to-hostinger/
- https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/
- https://www.hostinger.com/support/1583247-where-can-i-find-hostinger-nameservers/
- https://www.hostinger.com/support/4407303-where-can-i-find-a-record/
- https://www.hostinger.com/support/1583300-how-to-fix-your-domain-is-not-pointing-to-hostinger-error/
