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
| **Hostinger ops** | [Node.js Web App docs](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) · [docs/OPERATIONS.md](docs/OPERATIONS.md) | **Node.js Web App** only (never classic Git). Hostinger documents GitHub, ZIP, and Connector sources, but this repo currently supports only a prebuilt `pnpm ops:pack` ZIP manually uploaded in hPanel. |
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

- Locked stack and shadcn workflow: [docs/STACK.md](docs/STACK.md)
- Engineering contracts: [docs/ENGINEERING.md](docs/ENGINEERING.md)
- Production operations: [docs/OPERATIONS.md](docs/OPERATIONS.md)

## Project identity

| Field | Value |
|-------|--------|
| Brand / site | **Perfume Aura** |
| Production domain | **perfumeaura.com** (marketing) · **app.perfumeaura.com** (ops) |
| GitHub repo | https://github.com/MohsinMMK/perfume-aura |
| Default branch | **`main`** |
| Current phase | Product inventory-to-finance implemented; production ops cutover and owner login verified 2026-07-27; SMTP reset and trusted-proxy proof remain pending |
| Stack | **pnpm monorepo** · marketing static · ops **Next.js 16.2.11** + **TypeScript 7.0.2** on Hostinger Node **24.x** via Path Z |
| Docs | [index](docs/README.md) · [product](docs/PRODUCT.md) · [engineering](docs/ENGINEERING.md) · [operations](docs/OPERATIONS.md) · [roadmap](docs/ROADMAP.md) · [stack](docs/STACK.md) |

## Monorepo layout

```text
apps/marketing     # brand static SOURCE OF TRUTH (edit here)
apps/ops           # Next.js internal ops (inventory → finance)
packages/ui|db|validators
scripts/           # marketing sync + ops pack
docs/              # six current product/engineering/operations documents
index.html + styles.css + .htaccess  # Path M publish surface (pnpm marketing:sync)
```

Root publish files are **generated** from `apps/marketing` via `pnpm marketing:sync` — do not hand-edit. Hostinger classic Git deploys whole repo → `public_html` (hPanel root dir = server dest, not monorepo subfolder filter). Long-term: artifact-only marketing.

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
                       └── apex → Hostinger CDN ALIAS and/or plan A (see live zone)
                       └── www  → Hostinger CDN / apex
                       └── app  → Node Web App target
                              └── Hostinger hosting
                                       public_html (marketing Path M)
                                       app Node runtime (ops Path Z/G)
                                            ▲
                                       GitHub main (source of truth)
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

Prefer **live hPanel zone** over hardcoded historical values. As of 2026-07-21 DEPLOY snapshot, apex may be **ALIAS → `*.cdn.hstgr.net`** (CDN), not a bare plan A.

| Type | Name | Value | Purpose |
|------|------|--------|---------|
| **ALIAS** or **A** | `@` | CDN target **or** plan IPv4 from panel | Root → Hostinger |
| **CNAME** | `www` | CDN www target or apex | www |
| **MX** / **TXT** | `@` | As needed | Email / verification (optional) |

Historical plan IPv4 (Check guide only): **`82.112.232.17`**. Do **not** force this A record if live zone already uses Hostinger CDN ALIAS.

Re-confirm from:

> hPanel → Domains → DNS (authoritative zone) · Plan details / Check guide

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
# expect: Hostinger/CDN edge IPs and/or plan IP — match live hPanel zone, not a forced historical A

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
| Marketing URL | **https://perfumeaura.com** (collection preview; no ordering) |

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
  + root .htaccess                      └── Path C: Connector (unproven here)
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
# Edit apps/marketing/* only, then:
pnpm marketing:sync   # publish root index.html + styles.css + .htaccess
git add apps/marketing index.html styles.css .htaccess
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

### Path G — Ops Node via GitHub (goal only — **do not attempt today**)

**Product:** `app.perfumeaura.com` → **Node.js Web App** → source **GitHub**.
**Not** Advanced → Git on the ops domain. Classic Git cannot start Next.

Docs: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

#### Path G status (agents: re-verify)

| State | Detail |
|-------|--------|
| **Blocked today** | Hostinger shared Node monorepo **source build** hits esbuild **EACCES** / broken `pnpm` PATH |
| **Do not force** | Do **not** connect GitHub source build or thrash failed deploys; use **Path Z** |
| **Unblock later** | Hostinger fixes shared exec, or CI builds artifact Hostinger GitHub/zip consumes, or slim single-package deploy |
| **Success criteria row** | “Ops Path G Git auto-deploy” stays unchecked until push alone serves Next + auth |

#### When (only when) Path G is proven green

1. hPanel → **app.perfumeaura.com** → Node.js Web App → **GitHub** (not Upload)
2. Repo **`MohsinMMK/perfume-aura`** · `main`
3. Use panel-proven install/build that does **not** hit EACCES; entry still **`apps/ops/server.js`** after standalone layout
4. Same hPanel env as Path Z · smoke `/login` + `/api/auth/get-session` not 500

Everyday then: `git push origin main`. Until green, **ignore** any Path G field table as a runnable recipe.

---

### Path B — CI artifact (packaging only)

- Workflow: `.github/workflows/ops-pack.yml` → exact Node `24.18.0`, quality
  and PostgreSQL 16 integration gates → `pnpm ops:pack` on Ubuntu
- Package/native/server/static-asset smoke runs for pull requests, `main`
  pushes, and manual runs; only a `main` push or a manual run explicitly
  targeting `main` may upload the 14-day deploy-shaped artifact
- Artifact: `ops-standalone-<12-character-commit>` with ZIP, SHA-256 sidecar,
  and runtime/source manifest; 14-day retention
- Packaging starts only after the same workflow's quality and complete
  integration jobs pass; no test suite may skip for a missing database URL
- The workflow has no provider credentials and no deploy job
- Download all three files, verify checksum/manifest, retain the prior
  production-known-good artifact, and manually upload the ZIP in hPanel using
  the Path Z fields
- A green artifact job is **not** a Hostinger deployment

### Path Z — Ops Node via prebuilt zip (current workable / official option #2)

Use while Path G monorepo build is blocked. Still a **Node.js Web App** on `app.perfumeaura.com` — not classic Git.

```bash
pnpm ops:pack
# clean tree → dist/perfume-aura-standalone_<12-character-commit>.zip
# dirty tree → unique <commit>-dirty-<UTC>-<pid> suffix
```

Then manually upload it in hPanel **Settings and redeploy** with Hostinger Node
24.x and entry **`apps/ops/server.js`**. Full table:
[Ops deploy](#ops-deploy-hostinger-node--critical-for-agents) below and
[docs/OPERATIONS.md](docs/OPERATIONS.md).

| When to use Path Z | When to leave Path Z |
|--------------------|----------------------|
| Need ops live now | Path G GitHub build green end-to-end |
| Monorepo `next build` fails on Hostinger | CI ships proven artifact Hostinger can start without local pack |

**Forbidden:** flat `entry.cjs` / root-only `server.js` zips; baking `.env` into zip; classic Git for ops.

---

### Path C — Hostinger Connector (not supported yet)

Hostinger documents this IDE path, but it is not proven for this repository.
Do not use it for production until it has an independent end-to-end validation
and the runbook is updated.

---

### Agent deploy decision tree

```text
Marketing change?
  → Path M: edit apps/marketing → pnpm marketing:sync → commit + git push origin main

Ops change?
  → Path B: push ops paths → Actions ops-pack (artifact)
  → Path Z manual: download artifact / local pnpm ops:pack → hPanel
  → Stop before API, MCP, Connector, or Path G deploy until separately proven
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
apps/marketing/                ← brand collection preview
apps/ops/                      ← Next.js ops (Hostinger Node)
packages/ui|db|validators
docs/   # six current documents; index: docs/README.md
index.html + styles.css + .htaccess  ← Path M publish surface (from apps/marketing)
scripts/sync-marketing.sh            ← marketing:sync / marketing:check
scripts/pack-ops-standalone.sh       ← ops:pack
```

### Deploy notes

- **Marketing (Path M):** classic GitHub → `public_html`. Edit `apps/marketing` → `pnpm marketing:sync` → commit root publish files. **`.htaccess`** denies monorepo trees (SEC-7). `pnpm marketing:check` in CI. Prefer artifact-only later.
- **Ops preferred (Path G):** Node.js Web App **GitHub** source — auto build on push. **Blocked today** on shared Node monorepo build (esbuild **EACCES**).
- **Ops current (Path Z):** `pnpm ops:pack` prebuilt ZIP → manual hPanel Node Web App upload. See [docs/OPERATIONS.md](docs/OPERATIONS.md).
- **Never** use classic Git (Advanced → Git) as the **runtime** for Next.js ops.

## Ops deploy (Hostinger Node) — critical for agents

**Default today = Path Z** (zip). **Goal = Path G** (GitHub). Both use the same Node Web App + hPanel env. Details: [GitHub → Hostinger](#github--hostinger-official-dual-flow).

### Pack (local — Path Z)

```bash
pnpm ops:pack
# clean tree → dist/perfume-aura-standalone_<12-character-commit>.zip
# dirty tree → unique <commit>-dirty-<UTC>-<pid> suffix
```

Script: [`scripts/pack-ops-standalone.sh`](scripts/pack-ops-standalone.sh)

| Behavior | Detail |
|----------|--------|
| Build runtime | Exact Node **24.18.0**, npm **11.16.0**, pnpm **11.1.3**; the pack script fails closed on drift |
| Layout | Monorepo standalone: entry **`apps/ops/server.js`** |
| Modules | **Materializes** `apps/ops/node_modules` and hashed `apps/ops/.next/node_modules/*` external aliases as real directories; Hostinger extraction does not reliably preserve their pnpm symlinks |
| Zip | `zip -qry` secondary; do not treat `-y` alone as the fix |
| Smoke | Stage + extract must verify Next/Sharp/static and dynamically import every generated Next external alias; the extracted server smoke must return `200` for login/readiness/auth and one real `/_next/static/…` asset when a disposable test DB is supplied |
| Secrets | **Never** bake `.env`/keys into zip (pack refuses) |
| Sharp | Linux x64 glibc subtree from committed `scripts/ops-runtime-deps/package-lock.json` via official `npm ci --ignore-scripts`; lock hash is recorded and verified |
| Publication | Candidate ZIP/sidecars live in a unique same-filesystem temporary workspace; failures clean it, existing final names are refused, and validated sidecars then ZIP are atomically renamed |
| Server | Keep extracted `node_modules` — empty root deps mean install is no-op; clean wipe breaks boot |

### hPanel manual ZIP settings (exact)

| Field | Value |
|-------|--------|
| Domain | `app.perfumeaura.com` |
| Source | Upload `dist/perfume-aura-standalone_*.zip` |
| Framework | Other (or Next.js) |
| Node | **24.x** |
| Root directory | `./` |
| Build command | **`echo prebuilt-standalone`** (not `pnpm run build` on Hostinger) |
| Output directory | *(empty)* |
| **Entry file** | **`apps/ops/server.js`** |

**Forbidden artifacts:** flat zip with root `server.js` / `entry.cjs` (~9MB experiments) → `Cannot find module 'next'`. Always use the current `pnpm ops:pack` output.

### Hostinger API / MCP / Connector boundary

The repository has no provider-deploy script and the packaging workflow has no
provider credentials or deploy job. Do not infer deployment from a green
Actions artifact.

- Current supported ops deployment: manually upload the `pnpm ops:pack` ZIP in
  hPanel using the exact settings above.
- API, MCP, Connector, and GitHub-source deployments are unsupported until each
  is separately proven end-to-end and documented.
- In Phase 07, the root operator may use authorized read-only provider evidence
  to resolve live state. Normal sub-agents must not mutate the provider.

Hostinger may still run `pnpm install` on deploy; pack root `package.json` has **empty deps** + `postinstall: echo skip-postinstall` so install is a no-op.

### Ops auth / owner login (do not invent)

| Fact | Detail |
|------|--------|
| Public sign-up | **Disabled** (`disableSignUp: true`) |
| Owner seed | `pnpm --filter @perfume-aura/ops seed:owner` with `OWNER_EMAIL` + `OWNER_PASSWORD` + `DATABASE_URL` + `BETTER_AUTH_SECRET` |
| Owner recovery | For an existing owner, use `pnpm --filter @perfume-aura/ops recover:owner` with its explicit confirmation gate; do not seed a duplicate |
| Local creds | Live in **`apps/ops/.env.local`** only (gitignored). Read file if user asks — **do not guess** |
| Local DB | `.env.local` `DATABASE_URL` is typically **localhost** — owner exists only on that DB after local seed |
| Production creds | Owner email/password live in **`apps/ops/.env.owner-production`** (gitignored, mode `0600`). Read it only when the user explicitly requests production login credentials; never copy the password into `AGENTS.md`, commits, logs, or deploy ZIPs |
| Prod login | **Verified 2026-07-27** against Neon production at https://app.perfumeaura.com/login; owner sign-in reached `/dashboard` and the core product pages |
| Prod auth down | `/api/auth/*` **500** if `BETTER_AUTH_SECRET` / `DATABASE_URL` is missing; login reports service unavailability separately from invalid credentials |
| Login URL | https://app.perfumeaura.com/login (shell SSR + client form; wait for hydrate) |
| Root `/` on ops | Calls `getOwnerSession()` → **500** without working DB/auth env; use `/login` |

**Required hPanel env (ops Node app) — never commit:**

```text
DATABASE_URL=<Neon pooled production runtime role>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://app.perfumeaura.com
BUSINESS_TIMEZONE=Asia/Karachi
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<Hostinger mailbox>
SMTP_PASSWORD=<mailbox password>
SMTP_FROM=<approved sender>
NODE_ENV=production
PORT=3000
```

For a new environment or production recovery, follow the Neon + Path Z cutover
in this **exact** order (human provides Neon URLs):

```text
bare runtime role (SQL, not Neon role API)
→ migrate through 0007 only
→ apply + verify runtime grants
→ Path Z deploy (pooled restricted DATABASE_URL)
→ expansion smoke (/login, /api/health/*, /api/auth/get-session)
→ reconcile zero → 0008 → re-verify grants
→ then seed:
```

```bash
# Follow docs/OPERATIONS.md exactly (do not seed before 0008 gate).
DATABASE_URL=… pnpm --filter @perfume-aura/db seed
DATABASE_URL=… BETTER_AUTH_SECRET=… BETTER_AUTH_URL=https://app.perfumeaura.com \
  OWNER_EMAIL=… OWNER_PASSWORD=… pnpm --filter @perfume-aura/ops seed:owner
# OWNER_PASSWORD 12–256 chars (matches auth)
```

### Marketing leak (SEC-7)

Classic Git deploys **entire repo** into marketing `public_html`. Without deny rules, `https://perfumeaura.com/apps/ops/package.json` was **200**.

- Mitigate: root **`.htaccess`** fail-closed allowlist serves only `/`, `/index.html`, `/styles.css`, and `/assets/*`; FilesMatch remains a secret-filename belt.
- Verify: `curl -sI -o /dev/null -w '%{http_code}\n' https://perfumeaura.com/apps/ops/package.json` → **403** (`.htaccess` `[F,L]`; 404 only if path absent).
- Long-term: artifact-only marketing deploy (static files only).

### Known live status (public probes re-verified 2026-07-30; re-check before acting)

This snapshot supersedes only the stale 2026-07-25 live-evidence table in
`docs/OPERATIONS.md`; its safety gates and recovery sequence remain
authoritative. Provider/database evidence otherwise retains the 2026-07-27 baseline.

| Check | Evidence |
|-------|----------|
| `https://perfumeaura.com` | 200 collection preview; auto-deploy from `main` verified 2026-07-30 |
| Marketing public allowlist | `/assets/favicon.svg` 200; repo source/data/Graphify/design paths 403 |
| TLS apex / www / app | valid |
| DNS NS | `lunar` / `solar`; apex ALIAS CDN |
| `https://app.perfumeaura.com/login` | 200 |
| `/api/auth/get-session` | 200 |
| `/api/health/live` · `/ready` | 200 / 200 |
| Active Hostinger deploy | **Node 24.x** Path Z, entry `apps/ops/server.js`; corrected package includes materialized `.next/node_modules` external aliases |
| Neon production | Main branch migrated through `0008`; nine-row journal/hash, restricted runtime role, grants, constraints, trigger, and zero reconciliation drift verified |
| Owner login on prod | **Verified** in the production browser; `/dashboard`, `/products`, `/customers`, `/invoices`, `/stock`, and `/finance` rendered |
| Password reset email | **Not verified** — SMTP hPanel variables/mailbox remain pending |
| Client-IP rate limiting | Shared-bucket fallback remains active until Hostinger trusted-proxy evidence is established |
| Ops Path G (GitHub Node auto-build) | **Blocked** (esbuild EACCES) — use Path Z zip |

Never infer continued production readiness from `/login` alone. Re-check
readiness, auth session, a real static asset, and an authenticated owner page
after every deploy or provider configuration change.

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
| Guessing `OWNER_EMAIL` / `OWNER_PASSWORD` | Read `apps/ops/.env.local` for local or `apps/ops/.env.owner-production` for production only when the user explicitly requests credentials; never invent or document the password here |
| Claiming prod login works without Neon + hPanel env + seed | Localhost DB ≠ prod |
| Whole monorepo in marketing `public_html` without `.htaccess` | SEC-7 source leak |
| Website Builder / Horizons for this repo | No official Git integration |
| Changing nameservers repeatedly | Resets propagation / validation |
| Committing secrets (API tokens, passwords) | Rotate any token that was ever shared in chat or left in `/tmp` |
| Leaving Hostinger API tokens in `/tmp` | Rotate token; use Docker MCP secret store only |
| Using sibling-site IPs as this site’s A record | Wrong target; use Plan details / Check guide only |
| Vercel as production host | Hostinger-only policy |

## Agent workflow preferences

1. **Read** this file and `docs/OPERATIONS.md` before hosting, DNS, database cutover, or ops deploy work.
2. **Search with Graphify first:** when answering questions about repository content, architecture, symbols, dependencies, or file relationships, query the existing graph in `graphify-out/` before broad file searches. Use `graphify query "<question>"`; use `graphify path` or `graphify explain` for focused traversal. Rebuild only when explicitly requested or when the graph is stale.
3. **Ship via GitHub:** marketing always **Path M** (`git push origin main`). Ops currently uses **Path Z** only: build with Node 24.18.0, then manually upload the ZIP in hPanel on Node 24.x. Path G requires separate proof and a runbook update. Never use classic Git for the ops runtime.
4. For DNS issues: verify WHOIS NS, public `dig`, Hostinger zone, then hPanel Live DNS Checkup — not random A-record hacks at GoDaddy.
5. Prefer small, clear commits. Keep the collection preview honest and fail-closed: no ordering, pricing, delivery, payment, or final public product-name claims before commerce gates pass.
6. Do not claim marketing “live” until `https://perfumeaura.com` serves this project; do not claim ops “live” until `/login` works **and** auth API is not 500 **and** owner can sign in against Neon prod.
7. **Provider tools:** normal sub-agents may prepare or inspect authorized read-only evidence only. Provider mutations remain root-operator Phase 07 work; repository automation must not deploy.
8. **Ops debug order:** public curl `/login` → `/api/auth/get-session` → hPanel deployment entry + logs → hPanel restart if authorized → env present? → owner seeded on **that** `DATABASE_URL`?
9. **Never print** full `DATABASE_URL`, API tokens, or owner passwords in routine logs or documentation. When the user explicitly requests credentials, read the correct gitignored file (`.env.local` for local, `.env.owner-production` for production) instead of guessing.

## Commerce catalog status (2026-07-30)

**Catalog foundation is complete; commerce launch is not complete.** Source records, mapping decisions, and verification live under [`data/catalog/`](data/catalog/) and [`docs/commerce/`](docs/commerce/). Run `pnpm commerce:verify` after every catalog or commerce-document change.

### Completed

- [x] Preserved 103 reviewed source products and generated 412 fail-closed launch variants.
- [x] Confirmed all 21 Signature Series names as exact in-house backend/frontend identities; external reference mapping is not applicable.
- [x] Confirmed every 10 ml variant is a tester; 30/50/100 ml variants are bottles.
- [x] Approved 48 inspired title references with evidence metadata and recorded future title policy: `Inspired by <owner-confirmed reference>`.
- [x] Added the 82-row evidence register at `docs/commerce/REFERENCE-MAPPINGS.md`, decision trail through COM-ADR-022, verifier gates, and scoped Graphify evidence.
- [x] Kept every public inspired title/slug blank and all 103 products plus 412 variants non-publishable.
- [x] Recorded fail-closed bottle-label/packaging policy: designer and inspired-reference names stay disabled until separate owner and India-counsel surface approval (COM-ADR-022). Product policy only; not legal clearance.

### Remaining before commerce publication

- [ ] Resolve 4 family-level mappings to exact product/flanker/concentration: `Cycus Flora`, `YSL-Y`, `CH 212 Men`, and `Baccarat`.
- [ ] Resolve 4 unsupported source names without guessing: `Green Creed`, `F Fabulous`, `Gucci Guilty EX`, and `Pawake`.
- [ ] Obtain owner/supplier confirmation for 26 additional inspired mappings.
- [ ] Replace or strengthen weak/blocked/gap evidence where durable official pages exist; `main_list:22` currently has an explicit evidence gap and `main_list:20` is strongest-available retailer evidence only.
- [ ] Complete India trademark/counsel review for inspired-reference display, Signature-name collision clearance, disclaimer wording/placement, and any future bottle/packaging surface change. Competitor behavior and a disclaimer are **not** legal clearance.
- [ ] Approve final public inspired titles/slugs only after exact mapping and legal gates pass.
- [ ] Supply sale facts: SKUs, prices, costs, opening stock, reorder levels, descriptions, images, and other product content.
- [ ] Define customer-facing policies and operational decisions: delivery/shipping, returns/refunds, taxes, payment methods, order handling, and support surfaces.
- [ ] Design and implement storefront, catalog browsing/search, product pages, cart, checkout, payments, customer/order flows, and commerce deployment.
- [ ] Run final catalog, legal, accessibility, security, payment, fulfillment, and production smoke reviews before publication.

**Publication gate:** do not infer readiness from mapping approval. No product becomes publishable until product data, legal, content, price/stock, policy, application, payment, and production-review gates all pass.

## Success criteria

- [x] `https://perfumeaura.com` serves collection preview (marketing) — verified 2026-07-30
- [x] Marketing fail-closed public allowlist serves assets and denies repo/source paths over HTTP — verified 2026-07-30
- [x] `https://app.perfumeaura.com/login` serves Next login — verified 2026-07-27
- [x] SSL valid on apex, `www`, and `app` — verified 2026-07-27
- [x] DNS managed only at Hostinger (nameserver method: `lunar` / `solar`) — verified 2026-07-27
- [x] Product phases 1–4 + hardening 00–06 implemented in repository code
- [x] Core ops hPanel env (`DATABASE_URL`, `BETTER_AUTH_*`, timezone, `NODE_ENV`, `PORT`) set on current artifact
- [x] Prod staged migrate through `0008`, runtime grant proof, MAIN seed, and owner credential recovery completed
- [x] Active Hostinger deploy on Node **24.x** with health routes present
- [x] Owner can sign in on prod and reach authenticated core pages
- [x] `/api/auth/get-session` and `/api/health/*` return 200 on prod
- [ ] SMTP mailbox/env and password-reset email smoke
- [ ] Trusted-proxy evidence and per-client IP rate-limit/restart proof
- [x] `git push origin main` updates marketing Hostinger without manual upload — verified 2026-07-30
- [ ] Domain still registered only at GoDaddy
- [ ] Ops Path G GitHub auto-deploy (preferred long-term; Path Z zip is current supported)

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
- [docs/README.md](docs/README.md) — documentation index
- [docs/PRODUCT.md](docs/PRODUCT.md) — behavior and workflows
- [docs/ENGINEERING.md](docs/ENGINEERING.md) — architecture, data, auth, development, tests
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — DNS, deploy, migration, recovery
- [docs/ROADMAP.md](docs/ROADMAP.md) — completed and pending work
- [docs/STACK.md](docs/STACK.md) — locked stack and tooling
