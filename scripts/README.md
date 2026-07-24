# Scripts

Automation entrypoints for the monorepo. Prefer `pnpm <script>` from repo root.

| Script | pnpm | Purpose |
|--------|------|---------|
| `sync-marketing.sh` | `marketing:sync` / `marketing:check` | Publish `apps/marketing` → repo root for Hostinger Path M |
| `pack-ops-standalone.sh` | `ops:pack` | Build Path Z zip for Hostinger Node Web App |
| `deploy-ops-hostinger.sh` | `ops:deploy` | Path B: upload zip via Hostinger `from-archive` API |

## Conventions

- **Shell only** for deploy packaging (Hostinger-facing). Keep bash portable (`set -euo pipefail`).
- **No secrets** in scripts or artifacts. Refuse `.env` in ops pack.
- **Source of truth** lives under `apps/*` / `packages/*`. Scripts publish or pack; they do not become a second app tree.

## Marketing publish model

```text
apps/marketing/*   ← edit here only
        │
        ▼  pnpm marketing:sync
repo root index.html + styles.css + .htaccess
        │
        ▼  Hostinger classic Git (whole repo → public_html)
perfumeaura.com
```

## Ops pack + Path B CI model

```text
pnpm ops:pack   (local or GitHub Actions ubuntu)
        │
        ▼  dist/perfume-aura-standalone_YYYYMMDD.zip  (≤50MB API limit)
        │
        ├── artifact on Actions (always)
        └── optional: HOSTINGER_API_TOKEN → pnpm ops:deploy
                    POST …/nodejs/builds/from-archive
                    entry apps/ops/server.js · build echo prebuilt-standalone
```

Workflow: `.github/workflows/ops-pack.yml`  
Secret (repo → Settings → Secrets): `HOSTINGER_API_TOKEN`  
Optional: `HOSTINGER_USERNAME`, `HOSTINGER_OPS_DOMAIN`
