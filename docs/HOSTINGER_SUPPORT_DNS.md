# Path A — Hostinger DNS (lunar / solar nameservers)

## Goal

Keep DNS on Hostinger. Do **not** use the A-record-at-GoDaddy flow while Path A is active.

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

hPanel → **Domains** → **perfumeaura.com** → **DNS records**:

| Type | Name | Value | TTL |
|------|------|--------|-----|
| **A** | `@` | `82.112.232.17` | 300 |
| **CNAME** | `www` | `perfumeaura.com` | 300 |

If you see **Domain not pointing to Hostinger** or **Domain not found** when adding, wait for Hostinger detection (up to 24h) or contact support. Optionally retry **Reset DNS records** once the zone is provisioned.

## Step 4 — Verify

```bash
dig A perfumeaura.com +short
# expect: 82.112.232.17

curl -sI -L https://perfumeaura.com | head
```

Then install SSL for apex + `www`.

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

Request: Mark the domain as pointing and enable DNS zone editing so we can set:
  A @ → 82.112.232.17
  CNAME www → perfumeaura.com
Do not transfer the domain.
```

## Notes

- Plan IP from Hostinger Check guide: **82.112.232.17**
- A-record deprecation flow does **not** apply on Path A
- Do **not** transfer the domain to Hostinger
