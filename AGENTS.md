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
| **Hostinger marketing** | [Classic Git docs](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/) | Advanced → Git → GitHub OAuth → `public_html` (static only). |
| **Hostinger ops** | [Node.js Web App docs](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) · [docs/OPS_DEPLOY_CHECKLIST.md](docs/OPS_DEPLOY_CHECKLIST.md) | **Node.js Web App** only (never classic Git). Official sources: **(1) GitHub** auto-build, **(2) zip upload**, **(3) Hostinger Connector**. **Current:** prebuilt zip via `pnpm ops:pack` until monorepo GitHub build works on shared Node. |
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
| Domain on plan | `perfumeaura.com` (marketing) + `app.perfumeaura.com` (ops Node) |
| Vhost type | addon (both) |
| Hosting username | `u602723373` |
| Marketing web root | `/home/u602723373/domains/perfumeaura.com/public_html` |
| Ops web root | `/home/u602723373/domains/app.perfumeaura.com/public_html` (build) · runtime under `…/nodejs/` |
| Order / plan | Business hosting (`order_id` `1008392140`; same account may host other sites) |
| Client id | `1017729554` |
| Hosting IPv4 (historical Check guide) | **`82.112.232.17`** — public apex may show multi-A / CDN (`hstgr`) now; re-check Plan details |
| Ops login URL | **https://app.perfumeaura.com/login** |
| Marketing URL | **https://perfumeaura.com** (coming soon) |

### Two websites (do not merge)

| Site | Domain | Hostinger product | Official deploy source | Everyday trigger |
|------|--------|-------------------|------------------------|------------------|
| Marketing | `perfumeaura.com` | Classic **Git** → `public_html` | GitHub `main` (OAuth) | `git push origin main` |
| Ops | `app.perfumeaura.com` | **Node.js Web App** | GitHub (preferred) **or** zip upload **or** Connector | See paths below |

Classic Git **cannot** run Next.js. Never put ops into marketing `public_html` as the app runtime.

## GitHub → Hostinger (official dual flow)

**Source of truth:** GitHub repo **`MohsinMMK/perfume-aura`** branch **`main`**.  
Hostinger never becomes the long-term code store. Prefer GitHub-linked deploy over FTP.

Official Hostinger docs:

| Product | Doc |
|---------|-----|
| Marketing classic Git | https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/ |
| Ops Node.js Web App | https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/ |
| DNS Path A (nameservers) | https://www.hostinger.com/support/1863967-how-to-point-a-domain-to-hostinger/ |

Hostinger Node.js Web App accepts **three** official sources (in doc order):

1. **GitHub integration** — auto build on every push (preferred long-term)
2. **Upload compressed (.zip)** — prebuilt or source archive
3. **Hostinger Connector** — IDE-linked deploy (optional; not default for this repo)

```text
                    GitHub main (MohsinMMK/perfume-aura)
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
  Marketing website              Ops Node.js Web App
  Advanced → Git                 Deploy Web App / Node.js
  (classic Git product)          (NOT Advanced → Git)
          │                             │
          ▼                             ├── Path G: GitHub OAuth (official preferred)
  public_html static                    ├── Path Z: zip upload (current workable)
  + root .htaccess                      └── Path C: Connector (optional IDE)
```

### Why GitHub path (benefits agents must know)

| Benefit | Detail |
|---------|--------|
| Push = deploy | No manual zip/FTP for each change when auto-deploy on |
| One source of truth | `main` commit = what Hostinger pulls/builds |
| Rollback | Redeploy prior commit / previous successful build |
| Less drift | Avoids “which zip is live?” |
| Official happy path | Hostinger leads with GitHub for both classic Git and Node Web Apps |

Zip remains valid official **option #2** when remote monorepo build cannot run (see Path Z).

---

### Path M — Marketing classic Git (live / official)

**Product:** Advanced → **Git** on `perfumeaura.com` only.  
**Not** Node.js Web App. Static HTML/CSS (and PHP-style) only.

#### One-time setup (hPanel)

1. Websites → **perfumeaura.com** → **Dashboard**
2. **Advanced** → **Git**
3. **Continue with GitHub** (OAuth) → authorize Hostinger
4. Repository: **`MohsinMMK/perfume-aura`**
5. Branch: **`main`**
6. Root directory: **`public_html`**
7. **Deploy**
8. Enable **auto-deployment**

Supported on web/cloud. **Not** for Website Builder / Horizons / Agency Git path.

#### Everyday workflow

```bash
pnpm marketing:sync   # if apps/marketing changed — keep root index.html/styles.css mirrors
git add .
git commit -m "Describe the change"
git push origin main
```

Hostinger pulls `main` into `public_html`. No FTP for normal updates.

#### Manual redeploy

hPanel → perfumeaura.com → Advanced → Git → **Redeploy**

#### Marketing safety (SEC-7)

Classic Git currently deploys **whole monorepo** into `public_html`. Root **`.htaccess`** must deny `/apps`, `/packages`, `/docs`, lockfiles, `*.md`.  
Verify after push: `curl -sI https://perfumeaura.com/apps/ops/package.json` → **403**.  
Long-term: artifact-only marketing (static files only).

---

### Path G — Ops Node via GitHub (official preferred / goal)

**Product:** `app.perfumeaura.com` → **Node.js Web App** → source **GitHub**.  
**Not** Advanced → Git on the ops domain. Classic Git cannot start Next.

Docs: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

#### One-time setup (hPanel)

1. Websites → **app.perfumeaura.com** → **Dashboard** → **Node.js** / **Deploy Web App**
2. Choose **GitHub** (not “Upload files” if Path G is unblocked)
3. **Continue with GitHub** → authorize → repo **`MohsinMMK/perfume-aura`** → branch **`main`**
4. Configure build settings (adjust when monorepo build is proven on Hostinger):

| Field | Target value |
|-------|----------------|
| Framework | **Next.js** or **Other** |
| Node | **20.x** |
| Root directory | monorepo-aware path Hostinger accepts (often `./` or `apps/ops` — **confirm in panel**) |
| Build command | what Hostinger can execute without EACCES (ideal: workspace build; **blocked today** on shared Node) |
| Output / entry | Next standalone entry once build produces it — e.g. **`apps/ops/server.js`** after standalone layout |
| Env vars | Same hPanel list as Path Z (`DATABASE_URL`, `BETTER_AUTH_*`, …) |

5. Save → first deploy → enable auto-deploy on push if offered
6. Smoke: `https://app.perfumeaura.com/login` + `/api/auth/get-session` not 500

#### Everyday workflow (when Path G green)

```bash
git push origin main
# Hostinger Node app pulls + builds + restarts
```

#### Path G status (agents: re-verify)

| State | Detail |
|-------|--------|
| **Blocked today** | Hostinger shared Node monorepo **source build** hits esbuild **EACCES** / broken `pnpm` PATH |
| **Do not force** | Repeated failed GitHub source builds waste time; switch to Path Z |
| **Unblock later** | Hostinger fixes shared exec, or CI builds artifact Hostinger GitHub/zip consumes, or slim single-package deploy |
| **Success criteria row** | “Ops Path B/G Git auto-deploy” stays unchecked until push alone serves Next + auth |

---

### Path Z — Ops Node via prebuilt zip (current workable / official option #2)

Use while Path G monorepo build is blocked. Still a **Node.js Web App** on `app.perfumeaura.com` — not classic Git.

```bash
pnpm ops:pack
# → dist/perfume-aura-standalone_YYYYMMDD.zip
```

Then hPanel **Settings and redeploy** (or Hostinger MCP deploy) with entry **`apps/ops/server.js`**. Full table: [Ops deploy](#ops-deploy-hostinger-node--critical-for-agents) below and [docs/OPS_DEPLOY_CHECKLIST.md](docs/OPS_DEPLOY_CHECKLIST.md).

| When to use Path Z | When to leave Path Z |
|--------------------|----------------------|
| Need ops live now | Path G GitHub build green end-to-end |
| Monorepo `next build` fails on Hostinger | CI ships proven artifact Hostinger can start without local pack |

**Forbidden:** flat `entry.cjs` / root-only `server.js` zips; baking `.env` into zip; classic Git for ops.

---

### Path C — Hostinger Connector (optional)

Official IDE path (Cursor / VS Code / Windsurf → Hostinger). Not required for this repo. Prefer Path G or Z so deploy stays reproducible from GitHub/`pnpm ops:pack`.

---

### Agent deploy decision tree

```text
Marketing change?
  → Path M: commit + git push origin main (+ marketing:sync if needed)

Ops change?
  → Path G unblocked (last GitHub Node build green)?
       yes → commit + git push origin main; watch Node deploy logs
       no  → Path Z: pnpm ops:pack → upload/MCP deploy → entry apps/ops/server.js
  → Always: hPanel env + Neon migrate/seed before claiming login works
```

### SSL

After domains resolve:

1. hPanel → each site dashboard → **SSL**
2. Free cert for `perfumeaura.com`, `www.perfumeaura.com`, and `app.perfumeaura.com`

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

- **Marketing (Path M):** classic GitHub → `public_html`. Root `index.html` / `styles.css` via `pnpm marketing:sync`. Root **`.htaccess`** denies HTTP to `/apps`, `/packages`, `/docs`, lockfiles, `*.md` (SEC-7 mitigate). Prefer artifact-only CI later.
- **Ops preferred (Path G):** Node.js Web App **GitHub** source — auto build on push. **Blocked today** on shared Node monorepo build (esbuild **EACCES**).
- **Ops current (Path Z):** `pnpm ops:pack` prebuilt zip → Node Web App upload/MCP. See [docs/DEPLOY.md](docs/DEPLOY.md) · [docs/OPS_DEPLOY_CHECKLIST.md](docs/OPS_DEPLOY_CHECKLIST.md).
- **Never** use classic Git (Advanced → Git) as the **runtime** for Next.js ops.

## Ops deploy (Hostinger Node) — critical for agents

**Default today = Path Z** (zip). **Goal = Path G** (GitHub). Both use the same Node Web App + hPanel env. Details: [GitHub → Hostinger](#github--hostinger-official-dual-flow).

### Pack (local — Path Z)

```bash
pnpm ops:pack
# → dist/perfume-aura-standalone_YYYYMMDD.zip
```

Script: [`scripts/pack-ops-standalone.sh`](scripts/pack-ops-standalone.sh)

| Behavior | Detail |
|----------|--------|
| Layout | Monorepo standalone: entry **`apps/ops/server.js`** |
| Modules | **Materializes** `apps/ops/node_modules` (real dirs) so unzip without symlinks still resolves `next` / `@swc/helpers` |
| Zip | `zip -qry` (symlink-safe when present) |
| Smoke | Stage + extract must `require('next')` from `apps/ops` or pack **fails** |
| Secrets | **Never** bake `.env` into zip (pack refuses if found) |
| Sharp | Linux x64 glibc natives for Hostinger |

### hPanel / MCP deploy settings (exact)

| Field | Value |
|-------|--------|
| Domain | `app.perfumeaura.com` |
| Source | Upload `dist/perfume-aura-standalone_*.zip` |
| Framework | Other (or Next.js) |
| Node | **20.x** |
| Root directory | `./` |
| Build command | **`echo prebuilt-standalone`** (not `pnpm run build` on Hostinger) |
| Output directory | *(empty)* |
| **Entry file** | **`apps/ops/server.js`** |

**Forbidden artifacts:** flat zip with root `server.js` / `entry.cjs` (~9MB experiments) → `Cannot find module 'next'`. Always use current `pnpm ops:pack` output (~40MB+).

### Hostinger MCP / API (Docker gateway)

Pi MCP server name: **`hostinger`**. Config often routes through **Docker MCP Toolkit** (`docker mcp gateway` + profile `servers` + image `hostinger-mcp-server`).

| Item | Detail |
|------|--------|
| Docker must be running | `docker info` OK before connect |
| API token secret | Docker secret `docker/mcp/hostinger-mcp-server.api_token` → env **`APITOKEN`** in container |
| If Pi `mcp({ connect: "hostinger" })` flakes | Use CLI: `docker mcp tools call --gateway-arg '--profile=servers' <tool> …` |
| Tool names (CLI) | **Unprefixed:** `hosting_listWebsitesV1`, `hosting_deployJsApplication`, `hosting_listJsDeployments`, `hosting_showJsDeploymentLogs` |
| Tool names (Pi list) | Often `hostinger_hosting_*` — same tools |
| Auth failures | `Unauthenticated` → token expired/missing in Docker MCP secrets; user must refresh API token in hPanel |
| File paths for deploy | MCP container **cannot** see arbitrary host paths; copy zip to a shared path or upload via Hostinger files API + TUS (see prior session pattern) |

**Useful API paths** (Bearer token, base `https://developers.hostinger.com`):

| Action | Method / path |
|--------|----------------|
| List sites | `GET /api/hosting/v1/websites?domain=app.perfumeaura.com` |
| Upload creds | `POST /api/hosting/v1/files/upload-urls` body `{ username, domain }` → TUS upload |
| Build settings | `GET …/accounts/{user}/websites/{domain}/nodejs/builds/settings/from-archive?archive_path=ops.zip` |
| Trigger build | `POST …/accounts/{user}/websites/{domain}/nodejs/builds` |
| List builds | `GET …/nodejs/builds` |
| Build logs | `GET …/nodejs/builds/{uuid}/logs` |
| **Restart Node** | `POST …/nodejs/server/restart` body `{}` → `{ "message": "Request accepted" }` |

Username for this account: **`u602723373`**. Archive on server often named `ops.zip` under site files.

Hostinger may still run `pnpm install` on deploy; pack root `package.json` has **empty deps** + `postinstall: echo skip-postinstall` so install is a no-op.

### Ops auth / owner login (do not invent)

| Fact | Detail |
|------|--------|
| Public sign-up | **Disabled** (`disableSignUp: true`) |
| Owner seed | `pnpm --filter @perfume-aura/ops seed:owner` with `OWNER_EMAIL` + `OWNER_PASSWORD` + `DATABASE_URL` + `BETTER_AUTH_SECRET` |
| Local creds | Live in **`apps/ops/.env.local`** only (gitignored). Read file if user asks — **do not guess** |
| Local DB | `.env.local` `DATABASE_URL` is typically **localhost** — owner exists only on that DB after local seed |
| Prod login | Needs hPanel env + owner seeded on **Neon prod**. Same email/password as local **only if** prod was seeded with them |
| Prod auth down | `/api/auth/*` **500** if `BETTER_AUTH_SECRET` / `DATABASE_URL` missing on Hostinger → UI often shows “Invalid email or password” |
| Login URL | https://app.perfumeaura.com/login (shell SSR + client form; wait for hydrate) |
| Root `/` on ops | Calls `getSession()` → **500** without working DB/auth env; use `/login` |

**Required hPanel env (ops Node app) — never commit:**

```text
DATABASE_URL=<Neon pooled production>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://app.perfumeaura.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.perfumeaura.com
NODE_ENV=production
PORT=3000
```

Then migrate + seed against prod (human provides Neon URLs):

```bash
DATABASE_URL_DIRECT=… pnpm db:migrate
DATABASE_URL=… BETTER_AUTH_SECRET=… BETTER_AUTH_URL=https://app.perfumeaura.com \
  OWNER_EMAIL=… OWNER_PASSWORD=… pnpm --filter @perfume-aura/ops seed:owner
```

### Marketing leak (SEC-7)

Classic Git deploys **entire repo** into marketing `public_html`. Without deny rules, `https://perfumeaura.com/apps/ops/package.json` was **200**.

- Mitigate: root **`.htaccess`** → **403** on `/apps`, `/packages`, `/docs`, lockfiles, `*.md`.
- Verify: `curl -sI -o /dev/null -w '%{http_code}\n' https://perfumeaura.com/apps/ops/package.json` → **403** (or 404).
- Long-term: artifact-only marketing deploy (static files only).

### Known live status (agents: re-verify, do not assume green)

| Check | Last known |
|-------|------------|
| `https://perfumeaura.com` | 200 coming soon |
| Marketing monorepo HTTP | 403 via `.htaccess` |
| `https://app.perfumeaura.com/login` | Next 200 (page exists) |
| `https://app.perfumeaura.com/` | Often 500 until session/DB env OK |
| `/api/auth/*` on prod | 500 until hPanel secrets + Neon |
| Owner login on prod | Fails until prod seed + env |
| Ops Path G (GitHub Node auto-build) | **Blocked** (esbuild EACCES) — use Path Z zip |

## Anti-patterns (do not do)

| Avoid | Why |
|-------|-----|
| Transfer domain to Hostinger “to fix DNS” | Unnecessary cost; keep GoDaddy registration |
| Edit A/CNAME at GoDaddy while Hostinger NS are set | Records ignored; dual management confusion |
| Invent DNS before Hostinger validates the zone | Zone empty / “not pointing” until activation |
| Long-term FTP instead of **Path M** GitHub for marketing | Breaks official classic Git workflow |
| Classic Git (Advanced → Git) as ops **runtime** | Wrong product; Next needs Node.js Web App |
| Treating Path Z zip as “unofficial” | Zip is Hostinger official source #2; Path G is preferred when build works |
| Forcing Path G while monorepo build EACCES | Wastes deploys; use Path Z until unblocked |
| Flat ops zip (`entry.cjs` / root `server.js` only) | Breaks `require('next')`; use `pnpm ops:pack` monorepo layout |
| `zip` without materializing / symlink-safe pack | Orphan `next` → missing `@swc/helpers` / `react` |
| Hostinger source `pnpm build` for monorepo ops (Path G today) | esbuild **EACCES** on shared Node |
| Baking `.env` into deploy zip | Secret leak; pack must refuse |
| Guessing `OWNER_EMAIL` / `OWNER_PASSWORD` | Read `apps/ops/.env.local` only if user needs them; never invent |
| Claiming prod login works without Neon + hPanel env + seed | Localhost DB ≠ prod |
| Whole monorepo in marketing `public_html` without `.htaccess` | SEC-7 source leak |
| Website Builder / Horizons for this repo | No official Git integration |
| Changing nameservers repeatedly | Resets propagation / validation |
| Committing secrets (API tokens, passwords) | Rotate any token that was ever shared in chat or left in `/tmp` |
| Leaving Hostinger API tokens in `/tmp` | Rotate token; use Docker MCP secret store only |
| Using sibling-site IPs as this site’s A record | Wrong target; use Plan details / Check guide only |
| Vercel as production host | Hostinger-only policy |

## Agent workflow preferences

1. **Read** this file, `docs/DEPLOY.md`, `docs/OPS_DEPLOY_CHECKLIST.md`, `docs/HOSTINGER_SUPPORT_DNS.md`, `docs/ENV.md` before hosting/ops deploy work.
2. **Ship via GitHub:** marketing always **Path M** (`git push origin main`). Ops: **Path G** if last Node GitHub build green; else **Path Z** (`pnpm ops:pack` + Node upload/MCP). Never classic Git for ops runtime.
3. For DNS issues: verify WHOIS NS, public `dig`, Hostinger zone, then hPanel Live DNS Checkup — not random A-record hacks at GoDaddy.
4. Prefer small, clear commits and keep the coming soon page **single viewport / no page scroll** until the full site replaces it.
5. Do not claim marketing “live” until `https://perfumeaura.com` serves this project; do not claim ops “live” until `/login` works **and** auth API is not 500 **and** owner can sign in against Neon prod.
6. **Hostinger MCP:** prefer Docker gateway tools when Pi connect flakes. Ensure Docker Desktop is running. List/deploy/restart via documented tools above. DNS writes only after zone writable; official defaults only. If API returns **Domain not found** / **Unauthenticated**, fix token or wait — do not thrash Path A NS.
7. **Ops debug order:** public curl `/login` → `/api/auth/get-session` → latest `hosting_listJsDeployments` entry_file + logs → `nodejs/server/restart` → hPanel env present? → owner seeded on **that** `DATABASE_URL`?
8. **Never print** full `DATABASE_URL` / API tokens in chat logs when avoidable; mask hosts. User-requested owner password from local `.env.local` is allowed when they ask for login creds explicitly.

## Success criteria

- [x] `https://perfumeaura.com` serves coming soon (marketing)
- [x] Marketing monorepo paths denied over HTTP (`.htaccess` 403) — still prefer artifact-only later
- [x] `https://app.perfumeaura.com/login` serves Next login shell
- [ ] Ops hPanel env (Neon `DATABASE_URL` + `BETTER_AUTH_*`) set
- [ ] Prod migrate + owner `seed:owner` against Neon
- [ ] Owner can sign in on prod (not “invalid password” from auth 500)
- [ ] `git push origin main` updates marketing Hostinger without manual upload
- [ ] Domain still registered only at GoDaddy
- [ ] DNS managed only at Hostinger (nameserver method: `lunar` / `solar`)
- [ ] Apex DNS matches current Plan details / CDN (do not hardcode stale IP forever)
- [ ] SSL valid on apex, `www`, and `app`
- [ ] Ops Path G GitHub auto-deploy (preferred; Path Z zip is current workable)

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
