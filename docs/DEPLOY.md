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
   └── Nameservers → lunar.dns-parking.com / solar.dns-parking.com
            └── Hostinger DNS zone
                     └── A @ → 82.112.232.17
                     └── CNAME www → perfumeaura.com
                              └── public_html  ← Git deploy from GitHub main
```

## DNS (official method: nameservers — Path A)

Hostinger’s recommended method for domains registered elsewhere is **change nameservers at the registrar**, not hand-editing A records at GoDaddy.

### At GoDaddy (nameservers only)

1. Domain → **DNS** → **Nameservers** → **Change** → **Custom**
2. Set exactly (confirm in hPanel Check guide if Hostinger shows different values for this domain):

```text
lunar.dns-parking.com
solar.dns-parking.com
```

3. Save. Wait up to **24 hours** for validation + global propagation.
4. While Hostinger NS are active, **do not** edit A/CNAME records in GoDaddy — they are ignored.

### At Hostinger (after NS are detected and DNS edit is allowed)

Set (or confirm) these records:

| Type | Name | Value | Purpose |
|------|------|--------|---------|
| A | `@` | `82.112.232.17` | Root domain → hosting |
| CNAME | `www` | `perfumeaura.com` | www subdomain |

Re-check IP via Plan details / Check guide if Hostinger changes plan IP.

If hPanel shows **“Domain not pointing”** or **Domain not found** when adding records, wait for detection (up to 24h) or contact Hostinger support — do not thrash nameservers or transfer the domain. See [HOSTINGER_SUPPORT_DNS.md](HOSTINGER_SUPPORT_DNS.md).

### Find hosting IP

hPanel → Websites → **Dashboard** → Hosting plan → **Plan details** → Website details → **IP address**, or the A value shown in **Check guide**.

### Checks that mean “DNS is ready”

```bash
dig NS perfumeaura.com +short
# expect: lunar.dns-parking.com / solar.dns-parking.com

dig A perfumeaura.com +short
# expect: 82.112.232.17
```

Also: hPanel “Domain not connected” warning should clear; DNS zone in Hostinger should list the A/CNAME records.

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

Hostinger pulls `main` into `public_html`. No FTP for normal updates.

### Manual redeploy

hPanel → Advanced → Git → **Redeploy**

## SSL

After the domain resolves publicly:

1. hPanel → site dashboard → **SSL**
2. Install free certificate for `perfumeaura.com` and `www.perfumeaura.com`

## Local preview

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Anti-patterns

| Avoid | Why |
|-------|-----|
| Transfer domain to Hostinger “to fix DNS” | Extra cost; not required |
| A records only at GoDaddy while Hostinger NS are set | Ignored |
| Thrashing nameservers | Resets validation |
| Website Builder / Horizons for this repo | No official Git path for this stack |

## Related

- [AGENTS.md](../AGENTS.md) — full agent rules and account details
- [HOSTINGER_SUPPORT_DNS.md](HOSTINGER_SUPPORT_DNS.md) — Path A steps + support paste
- [README.md](../README.md) — quick start
