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
6. **A-record-at-GoDaddy deprecation / dual-DNS flows do not apply** while Path A (Hostinger NS) is active.

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
   └── Nameservers (this domain — Path A)
         lunar.dns-parking.com
         solar.dns-parking.com
              └── Hostinger DNS zone (authoritative)
                       └── A @ → 82.112.232.17  (hosting plan IPv4)
                       └── CNAME www → perfumeaura.com
                              └── Hostinger hosting
                                       public_html
                                            ▲
                                            │ official Git auto-deploy
                                       GitHub main
                                       (this repo)
```

## DNS (official Hostinger method — Path A)

### Nameservers (set at GoDaddy) — this domain

**Authoritative values for `perfumeaura.com` (use these):**

```text
lunar.dns-parking.com
solar.dns-parking.com
```

Confirm in hPanel **Check guide** if Hostinger ever shows different values for this domain; always use the **exact** panel values for this site.

Generic Hostinger defaults sometimes documented as `ns1.dns-parking.com` / `ns2.dns-parking.com` — **not** the pair currently set for perfumeaura.com. Do not thrash between pairs without a Hostinger panel reason.

### Glue IPs (only if a registrar demands NS IP addresses)

```text
lunar.dns-parking.com → 172.64.52.30   (and IPv6 as published)
solar.dns-parking.com → 172.64.53.84
```

(Older generic pair glue, if ever needed: `ns1.dns-parking.com` → `162.159.24.201`, `ns2.dns-parking.com` → `162.159.25.42`.)

### Why nameservers (not GoDaddy A records) by default

Hostinger recommends **Option 1 — change nameservers** for external domains so:

- Hostinger manages the DNS zone to the hosting IP
- DNS, SSL, email records, and hosting stay manageable in one place (hPanel)

**Option 2 — A records at the registrar** is only for cases where nameservers cannot be changed (e.g. some CDN setups). **Not** the default for this project. Do not run Option 2 while Hostinger NS are active.

### Expected zone after Hostinger allows DNS edits

| Type | Name | Value | Purpose |
|------|------|--------|---------|
| **A** | `@` | **`82.112.232.17`** | Root → hosting (from hPanel Check guide / Plan details) |
| **CNAME** | `www` | `perfumeaura.com` | www → apex |
| **MX** / **TXT** | `@` | As needed | Email / verification (optional) |

Re-confirm IP from:

> hPanel → Websites → perfumeaura.com → Dashboard → Hosting plan → **Plan details** → Website details → **IP address**  
> or hPanel **Check guide** (“Connect via DNS records” shows the A value).

Do **not** invent other IPs from sibling sites on the same account.

### After NS change

- Allow up to **24 hours** for Hostinger validation + global propagation.
- Disable **DNSSEC** at GoDaddy if enabled (can block NS changes).
- Hostinger may show **“Domain not connected”** / **“Domain not pointing to Hostinger”** until detection completes — even when public WHOIS/`dig NS` already show Hostinger NS.
- If WHOIS already shows Hostinger NS and authoritative servers return **SOA**, but hPanel still blocks **Add record** or API returns **Domain not found**: wait longer, use **Check guide / Live DNS Checkup**, then **Hostinger support** — do **not** transfer the domain and do **not** thrash nameservers.
- Known status (as of 2026-07-20): NS `lunar`/`solar` **propagated**; zone may exist (SOA) while panel/API still refuse writes until Hostinger marks the domain as pointing. A `@` may still be empty until records can be saved.

### Verification commands

```bash
dig NS perfumeaura.com +short
# expect: lunar.dns-parking.com / solar.dns-parking.com

dig A perfumeaura.com +short
# expect: 82.112.232.17 (after zone A record is live)

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
| Order / plan | Business hosting (`order_id` `1008392140`; same account may host other sites) |
| Hosting IPv4 (this site) | **`82.112.232.17`** (from Hostinger Check guide) |

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

After the domain resolves publicly (A record live):

1. hPanel → site dashboard → **SSL**
2. Install free certificate for `perfumeaura.com` and `www.perfumeaura.com`

## Repository layout

```text
AGENTS.md                      ← this file (agent/project rules)
README.md
docs/DEPLOY.md                 ← human-oriented deploy guide (same stack)
docs/HOSTINGER_SUPPORT_DNS.md  ← Path A DNS steps + support paste text
index.html                     ← site entry (deployed)
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
| Using sibling-site IPs as this site’s A record | Wrong target; use Plan details / Check guide only |

## Agent workflow preferences

1. **Read** `docs/DEPLOY.md`, `docs/HOSTINGER_SUPPORT_DNS.md`, and this file before changing hosting/DNS advice.
2. **Ship code** via commits to `main` only when the user wants it live; Hostinger auto-deploy is the release path.
3. For DNS issues: verify WHOIS NS, public `dig`, Hostinger zone, then hPanel Live DNS Checkup — not random A-record hacks at GoDaddy.
4. Prefer small, clear commits and keep the coming soon page **single viewport / no page scroll** until the full site replaces it.
5. Do not claim the site is “live” until `https://perfumeaura.com` resolves and returns this project’s content.
6. Hostinger MCP / API (if configured) may list websites and DNS zones; use them for verification. DNS write operations only after the zone is writable and only with official defaults (A `@` → plan IP, CNAME `www` → apex). If API returns **Domain not found**, do not invent workarounds that break Path A — wait or escalate to Hostinger support.

## Success criteria

- [ ] `https://perfumeaura.com` serves this site (coming soon, then full product)
- [ ] `git push origin main` updates Hostinger without manual upload
- [ ] Domain still registered only at GoDaddy
- [ ] DNS managed only at Hostinger (nameserver method: `lunar` / `solar`)
- [ ] A `@` → `82.112.232.17` (or current Plan details IP) publicly resolvable
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
- [docs/HOSTINGER_SUPPORT_DNS.md](docs/HOSTINGER_SUPPORT_DNS.md) — Path A DNS + support paste
