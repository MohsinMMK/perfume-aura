# Scripts

Automation entrypoints for the monorepo. Prefer `pnpm <script>` from repo root.

| Script | pnpm | Purpose |
|--------|------|---------|
| `sync-marketing.sh` | `marketing:sync` / `marketing:check` | Publish `apps/marketing` → repo root for Hostinger Path M |
| `pack-ops-standalone.sh` | `ops:pack` | Build Path Z zip for Hostinger Node Web App |

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

## Ops pack + Path B artifact model

```text
pnpm ops:pack   (Node 24.18.0 locally or GitHub Actions ubuntu)
        │
        ▼  dist/perfume-aura-standalone_YYYYMMDD.zip
        │
        └── artifact on Actions
                    │
                    ▼  manual hPanel Node Web App ZIP upload
                    Node 24.x · entry apps/ops/server.js
                    build echo prebuilt-standalone
```

Workflow: `.github/workflows/ops-pack.yml`  

The workflow packages and uploads an Actions artifact only. It has no provider
credentials and cannot report a Hostinger deployment. API, Connector, or
GitHub-source deployment must be separately proven before this repo supports it.
