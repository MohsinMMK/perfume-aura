# AGENTS.md — Perfume Aura

Instructions for AI agents and developers working on this repository.

## Non-negotiable: official tooling only (STRICT)

Agents and developers **must** use **official documented install/setup paths** for every stack piece. Do **not** hand-roll alternatives “to save time.”

| Area | Official source | Required method |
|------|-----------------|-----------------|
| **shadcn/ui** | https://ui.shadcn.com/docs · https://ui.shadcn.com/docs/monorepo | CLI only: `pnpm dlx shadcn@latest …`. Components live in `packages/ui`. Add from app: `pnpm dlx shadcn@latest add <name> -c apps/ops -y`. **Never** hand-copy registry components as the primary install path. **Never** dump UI into `apps/ops/components/ui` when monorepo aliases point at `@perfume-aura/ui`. |
| **Next.js** | https://nextjs.org/docs | App Router patterns from current docs (`create-next-app` / official upgrades). |
| **Better Auth** | https://better-auth.com/docs | Official Next.js + Drizzle adapter install. |
| **Drizzle** | https://orm.drizzle.team/docs | Official schema / kit / Neon or `pg` guides. |
| **Neon** | https://neon.com/docs | Official connection strings + drivers. |
| **Hostinger marketing** | Hostinger classic Git docs | Advanced → Git → `public_html` for static only. |
| **Hostinger ops** | Hostinger Node.js Web App docs | Deploy Web App for Next.js — **not** classic Git. |
| **pnpm workspaces** | https://pnpm.io/workspaces | Root `pnpm-workspace.yaml` + `workspace:*` deps. |

### shadcn monorepo rules (this repo)

1. **Base UI package:** `packages/ui` (`@perfume-aura/ui`).
2. **App config:** `apps/ops/components.json` aliases `ui` / `utils` → `@perfume-aura/ui/…`.
3. **Package config:** `packages/ui/components.json` matches style (`base-luma`), `baseColor` (`taupe`), `iconLibrary` (`hugeicons`).
4. **Preset (locked):** `b23PPibQOI` — luma / taupe / hugeicons / IBM Plex Sans + Raleway / radius small.  
   Verify: `pnpm dlx shadcn@latest preset resolve -c apps/ops` must print code `b23PPibQOI` with **no fallbacks**.  
   Apply: `pnpm dlx shadcn@latest apply b23PPibQOI -c apps/ops -y`.
5. **Monorepo CSS path (required for preset resolve):**  
   `apps/ops/components.json` → `"tailwind.css": "../../packages/ui/src/globals.css"`  
   Tokens live only in `packages/ui/src/globals.css`. Do **not** move them solely into `apps/ops/app/globals.css` or `preset resolve` will fall back to neutral/default radius.
6. **Add components only when used (official CLI only):**
   ```bash
   pnpm dlx shadcn@latest add button -c apps/ops -y
   # overwrite when upgrading a component:
   pnpm dlx shadcn@latest add button -c apps/ops -y -o
   ```
   Do **not** bulk-install unused registry components “for later.” Install with CLI when a screen needs them.
7. **Dry-run before large adds:** `pnpm dlx shadcn@latest add … -c apps/ops --dry-run` — expect files under `packages/ui/src/…`.
8. **Forbidden:** inventing custom Button/Input as a substitute for shadcn; skipping CLI because “files already exist”; installing shadcn only inside `apps/ops` without monorepo package; re-pointing CSS away from `packages/ui` without re-checking `preset resolve`; keeping unused registry files as inventory.
9. **App-specific compositions** (sidebar shell, product forms) stay in `apps/ops/components/` and **import** from `@perfume-aura/ui/components/*`.

### If official CLI conflicts with monorepo

1. Fix `components.json` aliases (official monorepo pattern).
2. Re-run CLI.
3. Do **not** permanently switch to manual component paste.

### Official agent skills (project-level)

Installed under `.agents/skills/` via `pnpm dlx skills add …` (lockfile: `skills-lock.json`). Prefer these over ad-hoc community skills.

| Vendor | Skills | Source |
|--------|--------|--------|
| **shadcn** | `shadcn`, `migrate-radix-to-base` | `shadcn/ui` |
| **Better Auth** | `better-auth-best-practices`, `email-and-password-best-practices`, `better-auth-security-best-practices` | `better-auth/skills` |
| **Neon** | `neon`, `neon-postgres`, `neon-postgres-branches` | `neondatabase/agent-skills` |
| **Vercel (React/Next patterns only)** | `vercel-react-best-practices`, `vercel-composition-patterns` | `vercel-labs/agent-skills` |

**Do not** install or follow Vercel **deploy** skills for production — hosting is Hostinger only.  
**Neon stock path:** use `pg` Pool + Drizzle interactive transactions — not `neon-http` for ledger writes.  
Restore: `pnpm dlx skills experimental_install` (from `skills-lock.json`).

### Docs pointers

- Locked stack: [docs/stack-research/RECOMMENDATION.md](docs/stack-research/RECOMMENDATION.md)
- shadcn workflow: [docs/stack-research/agents/ui-shadcn-stack.md](docs/stack-research/agents/ui-shadcn-stack.md)

## Project identity

| Field | Value |
|-------|--------|
| Brand / site | **Perfume Aura** |
| Production domain | **perfumeaura.com** (marketing) · **app.perfumeaura.com** (ops, planned) |
| GitHub repo | https://github.com/MohsinMMK/perfume-aura |
| Default branch | **`main`** |
| Current phase | Monorepo: marketing coming soon + ops app scaffold (inventory next) |
| Stack | **pnpm monorepo** · marketing static · ops **Next.js 16** on Hostinger Node |
| Specs | [docs/README.md](docs/README.md) · [PRD](docs/PRD.md) · [TRD](docs/TRD.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [ROADMAP](docs/ROADMAP.md) |

## Monorepo layout

```text
apps/marketing     # public brand (coming soon)
apps/ops           # Next.js internal ops (inventory → finance)
packages/ui        # shadcn base UI
packages/db        # Drizzle + Neon
packages/validators
docs/              # PRD, TRD, stack-research
```

Root `index.html` + `styles.css` are **interim mirrors** of marketing for classic Hostinger Git until CI publishes only `apps/marketing`.

## Non-negotiable hosting rules

1. **Domain registration stays at GoDaddy.** Do **not** transfer the domain to Hostinger (avoids re-paying for a year already purchased).
2. **Hosting is on Hostinger** (Business plan). **Two website types:**
   - Marketing: classic Git → `public_html` (static only)
   - Ops: **Node.js Web App** (Next.js) — **not** classic Git into public_html
3. **Source of truth for code is GitHub.** Prefer official Hostinger Git / Node GitHub integration (not ad-hoc FTP as the long-term path).
4. **Official DNS method is Hostinger nameservers** at the registrar (GoDaddy). Prefer this over inventing A records at GoDaddy while Hostinger NS are active.
5. Prefer Hostinger’s documented workflows. Waiting up to **24 hours** for DNS validation/propagation is acceptable. Do not thrash nameservers or dual-manage DNS.
6. **A-record-at-GoDaddy deprecation / dual-DNS flows do not apply** while Path A (Hostinger NS) is active.
7. **Do not use Vercel as production host** for this project (Hostinger-only policy).
8. **Never deploy whole monorepo** (apps/ops source, .env, packages/db) into marketing `public_html`.

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
AGENTS.md
README.md
package.json / pnpm-workspace.yaml
apps/marketing/                ← brand coming soon
apps/ops/                      ← Next.js ops (Hostinger Node)
packages/ui|db|validators
docs/   # full index: docs/README.md (PRD, TRD, ARCHITECTURE, phases, deploy, stack-research)
index.html + styles.css        ← interim marketing mirror for classic Git
```

### Deploy notes

- **Marketing:** classic Git still points at repo; keep root marketing entry until artifact-only CI.
- **Ops:** Hostinger **Node.js Web App** with monorepo root/filter `apps/ops`. See [docs/DEPLOY.md](docs/DEPLOY.md).
- **Never** use classic Git alone for Next.js ops.

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
- [docs/README.md](docs/README.md) — **documentation index**
- [docs/ROADMAP.md](docs/ROADMAP.md) — phases 0–4
- [docs/PHASE1_STATUS.md](docs/PHASE1_STATUS.md) — inventory MVP status
- [docs/OPS_DEPLOY_CHECKLIST.md](docs/OPS_DEPLOY_CHECKLIST.md) — `app.perfumeaura.com` go-live
- [docs/DEPLOY.md](docs/DEPLOY.md) — dual Hostinger deploy
- [docs/HOSTINGER_SUPPORT_DNS.md](docs/HOSTINGER_SUPPORT_DNS.md) — Path A DNS + support paste
- [docs/ENV.md](docs/ENV.md) · [docs/SECURITY.md](docs/SECURITY.md) · [docs/TESTING.md](docs/TESTING.md)
- [docs/PHASE2_INVOICING.md](docs/PHASE2_INVOICING.md) · [docs/PHASE3_PAYMENTS.md](docs/PHASE3_PAYMENTS.md) · [docs/PHASE4_FINANCE.md](docs/PHASE4_FINANCE.md)
