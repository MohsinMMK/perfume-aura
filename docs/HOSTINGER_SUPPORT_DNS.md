# Path A — Hostinger DNS (lunar / solar nameservers)

| Field | Value |
|-------|--------|
| Updated | 2026-07-22 |
| Domain | perfumeaura.com |
| Goal | Keep DNS on Hostinger. Do **not** use A-record-at-GoDaddy while Path A is active. |

## Step 1 — GoDaddy nameservers

Set **exactly**:

```text
lunar.dns-parking.com
solar.dns-parking.com
```

1. GoDaddy Domain Portfolio → **perfumeaura.com**  
2. **DNS** → **Nameservers** → **Change Nameservers**  
3. Custom / “I’ll use my own nameservers”  
4. Save  

Do **not** add A/CNAME records in GoDaddy while Hostinger NS are active (they are ignored).

## Step 2 — Wait for propagation

```bash
dig NS perfumeaura.com +short
# expect: lunar.dns-parking.com / solar.dns-parking.com
```

## Step 3 — Hostinger DNS records

hPanel → **Domains** → **perfumeaura.com** → **DNS records**.

### Classic Path A target (plan IP)

| Type | Name | Value | TTL |
|------|------|--------|-----|
| **A** | `@` | `82.112.232.17` | 300 |
| **CNAME** | `www` | `perfumeaura.com` | 300 |

Plan IP from Hostinger Check guide historically: **82.112.232.17**. Re-confirm in Plan details if Hostinger rotates IPs.

### Live zone note (2026-07-21)

Hostinger may provision **CDN ALIAS** instead of raw A:

| Type | Name | Observed content |
|------|------|------------------|
| ALIAS | `@` | `perfumeaura.com.cdn.hstgr.net` |
| CNAME | `www` | `www.perfumeaura.com.cdn.hstgr.net` |
| MX / TXT | `@` | Hostinger mail / SPF / DMARC |

Both classic A and CDN ALIAS are valid **Path A** (zone still Hostinger-managed). Prefer whatever hPanel Check guide shows for this site. Do not fight CDN records unless marketing fails to resolve.

### Ops subdomain

| Type | Name | Value |
|------|------|--------|
| CNAME or A | `app` | **Exact target from Node Web App / Check guide** |

Add only after the Node site exists. See [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md).

If you see **Domain not pointing to Hostinger** or **Domain not found** when adding records, wait for Hostinger detection (up to 24h) or contact support. Optionally retry **Reset DNS records** once the zone is provisioned.

## Step 4 — Verify

```bash
dig NS perfumeaura.com +short
dig A perfumeaura.com +short
curl -sI -L https://perfumeaura.com | head
```

Then install SSL for apex + `www` (and `app` when ready).

## Paste into Hostinger chat (if panel blocks DNS edit)

```
Domain: perfumeaura.com
Registrar: GoDaddy (keeping registration; please do NOT transfer)
Hosting: Business plan, order 1008392140, username u602723373, website type addon
Web root: /home/u602723373/domains/perfumeaura.com/public_html
Nameservers already set at GoDaddy (propagated):
  lunar.dns-parking.com
  solar.dns-parking.com
WHOIS + public DNS confirm Hostinger NS. DNSSEC is unsigned.
Authoritative NS return SOA (zone can exist) but hPanel blocks adding records
with “Domain not pointing to Hostinger” / Domain not found.

Request: Mark the domain as pointing and enable DNS zone editing so we can manage:
  apex (A or ALIAS per your CDN defaults)
  CNAME www
  and later CNAME/A app for Node Web App app.perfumeaura.com
Do not transfer the domain.
```

## Notes

- A-record deprecation flow does **not** apply on Path A.  
- Do **not** transfer the domain to Hostinger.  
- Sibling site IPs on the same account must **not** be used as this site’s A target without panel confirmation.  
- Related: [DEPLOY.md](./DEPLOY.md), [AGENTS.md](../AGENTS.md).  
