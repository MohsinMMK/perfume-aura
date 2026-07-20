# AGENTS.md — Perfume Aura

Instructions for AI agents and developers working on this repository.

## Project identity

| Field | Value |
|-------|--------|
| Brand / site | **Perfume Aura** |
| Production domain | **perfumeaura.com** |
| GitHub repo | https://github.com/MohsinMMK/perfume-aura |
| Default branch | **`main`** |
| Current phase | Static **coming soon** page (foundation for full custom site later) |
| Stack (now) | Static HTML + CSS — **no build step** |

## Non-negotiable hosting rules

1. **Domain registration stays at GoDaddy.** Do **not** transfer the domain to Hostinger (avoids re-paying for a year already purchased).
2. **Hosting is on Hostinger** (web/cloud Business plan). Website files live under Hostinger `public_html`.
3. **Source of truth for code is GitHub.** Deploy only via Hostinger’s **official Git integration** (not ad-hoc FTP/zip as the long-term path).
4. **Official DNS method is Hostinger nameservers** at the registrar (GoDaddy). Prefer this over inventing A records at GoDaddy while Hostinger NS are active.
5. Prefer Hostinger’s documented workflows. Waiting up to **24 hours** for DNS validation/propagation is acceptable. Do not thrash nameservers or dual-manage DNS.

## Ownership split

| Concern | Provider | Where to manage |
|--------|----------|-----------------|
| Domain registration & renewal | **GoDaddy** | GoDaddy Domain Portfolio |
| Nameservers | Set at **GoDaddy** → Hostinger values | GoDaddy → DNS → Nameservers |
| DNS zone (A, CNAME, MX, TXT) | **Hostinger** | hPanel → Domains → DNS |
| Website files, SSL, Git deploy | **Hostinger** | hPanel → Websites → perfumeaura.com |
| Source code | **GitHub** | `MohsinMMK/perfume-aura` |

**Critical rule:** While nameservers point to Hostinger, **do not** edit A/CNAME records in GoDaddy — they are ignored. Edit DNS only in Hostinger.

## Architecture

```text
GoDaddy (owns perfumeaura.com — renewal only)
   └── Nameservers
         ns1.dns-parking.com
         ns2.dns-parking.com
              └── Hostinger DNS zone (authoritative)
                       └── A @ → Hostinger hosting IPv4
                       └── www → CNAME/A as Hostinger configures
                              └── Hostinger hosting
                                       public_html
                                            ▲
                                            │ official Git auto-deploy
                                       GitHub main
                                       (this repo)
```

## DNS (official Hostinger method)

### Nameservers (set at GoDaddy)

```text
ns1.dns-parking.com
ns2.dns-parking.com
```

Confirm in hPanel if Hostinger ever shows different values for this domain; always use **exact** panel values.

Glue IPs (only if a registrar demands NS IP addresses):

```text
ns1.dns-parking.com → 162.159.24.201
ns2.dns-parking.com → 162.159.25.42
```

### Why nameservers (not GoDaddy A records) by default

Hostinger recommends **Option 1 — change nameservers** for external domains so:

- Hostinger auto-configures the DNS zone to the hosting IP
- DNS, SSL, email records, and hosting stay manageable in one place (hPanel)

**Option 2 — A records at the registrar** is only for cases where nameservers cannot be changed (e.g. some CDN setups). Not the default for this project.

### Expected zone after Hostinger activates DNS

| Type | Name | Value | Purpose |
|------|------|--------|---------|
| **A** | `@` | Hosting plan **IPv4** (from Plan details) | Root → server |
| **CNAME** or **A** | `www` | domain or same IP | `www` subdomain |
| **MX** / **TXT** | `@` | As needed | Email / verification (optional) |

Do **not** invent IP addresses. Read the real IP from:

> hPanel → Websites → perfumeaura.com → Dashboard → Hosting plan → **Plan details** → Website details → **IP address**

### After NS change

- Allow up to **24 hours** for Hostinger validation + global propagation.
- Disable **DNSSEC** at GoDaddy if enabled (can block NS changes).
- Hostinger may show “Domain not connected” until detection completes.
- If WHOIS already shows Hostinger NS but the zone is still empty / API says “not pointing”, wait or use hPanel **Check guide / Live DNS Checkup**; after ~24h contact Hostinger support — do not transfer the domain.

### Verification commands

```bash
dig NS perfumeaura.com +short
# expect: ns1.dns-parking.com / ns2.dns-parking.com

dig A perfumeaura.com +short
# expect: same IPv4 as Hostinger Plan details

curl -sI -L https://perfumeaura.com | head
```

Propagation map: https://dnschecker.org/#NS/perfumeaura.com

## Hostinger website details (known account state)

| Field | Value |
|-------|--------|
| Domain on plan | `perfumeaura.com` |
| Vhost type | addon |
| Hosting username | `u602723373` |
| Web root | `/home/u602723373/domains/perfumeaura.com/public_html` |
| Order / plan | Business hosting (same account may also host other sites) |

## Git → Hostinger (official deploy)

Docs: https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/

### One-time setup (hPanel)

1. Websites → **perfumeaura.com** → **Dashboard**
2. **Advanced** → **Git**
3. **Continue with GitHub** (OAuth) → authorize Hostinger
4. Repository: **`MohsinMMK/perfume-aura`**
5. Branch: **`main`**
6. Root directory: **`public_html`**
7. **Deploy**
8. Enable **auto-deployment**

Supported for static HTML/PHP-style sites on web/cloud. **Not** for Hostinger Website Builder / Horizons / Agency Git path.

### Everyday workflow

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

Hostinger pulls `main` into `public_html`. No FTP for normal updates.

### Manual redeploy

hPanel → Advanced → Git → **Redeploy**

## SSL

After the domain resolves publicly:

1. hPanel → site dashboard → **SSL**
2. Install free certificate for `perfumeaura.com` and `www.perfumeaura.com`

## Repository layout

```text
AGENTS.md          ← this file (agent/project rules)
README.md
docs/DEPLOY.md     ← human-oriented deploy guide (same stack)
index.html         ← site entry (deployed)
styles.css
```

Deploy root = repository root (files land in `public_html` as-is).

### Future stack note

Classic Hostinger Git for HTML deploys **repo files as-is** (no `npm run build`). If the project later uses Vite/Next/Node:

- Use Hostinger’s **Node.js** Git deploy path, or
- CI that builds and deploys output, or
- a deploy branch that only contains built assets

Update this file when that happens.

## Anti-patterns (do not do)

| Avoid | Why |
|-------|-----|
| Transfer domain to Hostinger “to fix DNS” | Unnecessary cost; keep GoDaddy registration |
| Edit A/CNAME at GoDaddy while Hostinger NS are set | Records ignored; dual management confusion |
| Invent DNS before Hostinger validates the zone | Zone empty / “not pointing” until activation |
| Long-term FTP/zip instead of Git | Breaks official GitHub workflow |
| Website Builder / Horizons for this repo | No official Git integration |
| Changing nameservers repeatedly | Resets propagation / validation |
| Committing secrets (API tokens, passwords) | Rotate any token that was ever shared in chat |

## Agent workflow preferences

1. **Read** `docs/DEPLOY.md` and this file before changing hosting/DNS advice.
2. **Ship code** via commits to `main` only when the user wants it live; Hostinger auto-deploy is the release path.
3. For DNS issues: verify WHOIS NS, public `dig`, Hostinger zone, then hPanel Live DNS Checkup — not random A-record hacks.
4. Prefer small, clear commits and keep the coming soon page **single viewport / no page scroll** until the full site replaces it.
5. Do not claim the site is “live” until `https://perfumeaura.com` resolves and returns this project’s content.
6. Hostinger MCP / API (if configured in the agent environment) may list websites and DNS zones; use them for verification. DNS write operations only after the zone is active and only in line with official defaults.

## Success criteria

- [ ] `https://perfumeaura.com` serves this site (coming soon, then full product)
- [ ] `git push origin main` updates Hostinger without manual upload
- [ ] Domain still registered only at GoDaddy
- [ ] DNS managed only at Hostinger (nameserver method)
- [ ] SSL valid on apex and `www`

## Official references

- https://www.hostinger.com/support/1863967-how-to-point-a-domain-to-hostinger/
- https://www.hostinger.com/in/tutorials/how-to-point-domain-to-hostinger/
- https://www.hostinger.com/support/1583247-where-can-i-find-hostinger-nameservers/
- https://www.hostinger.com/support/4407303-where-can-i-find-a-record/
- https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/
- https://www.hostinger.com/support/1583300-how-to-fix-your-domain-is-not-pointing-to-hostinger-error/
- https://www.hostinger.com/support/4410579-how-to-manage-the-dns-zone-on-godaddy/

## Related docs in repo

- [README.md](README.md) — quick start
- [docs/DEPLOY.md](docs/DEPLOY.md) — full deploy guide
