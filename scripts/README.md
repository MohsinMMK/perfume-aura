# Scripts

Automation entrypoints for the monorepo. Prefer `pnpm <script>` from repo root.

| Script | pnpm | Purpose |
|--------|------|---------|
| `sync-marketing.sh` | `marketing:sync` / `marketing:check` | Publish `apps/marketing` → repo root for Hostinger Path M |
| `pack-ops-standalone.sh` | `ops:pack` | Build verified standalone runtime for generated Path B branch and emergency Path Z ZIP |

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
pnpm ops:pack   (exact Node 24.18.0 + npm 11.16.0 + pnpm 11.1.3)
        │
        ▼  dist/perfume-aura-standalone_<stamp>.zip
            ├── .zip.sha256
            └── .manifest.json
        │
        ├── one 14-day Actions artifact (also emergency Path Z source)
        └── re-verify + safe extract
                    │
                    ▼  orphan branch hostinger-ops-production
                    │
                    ▼  Hostinger Node GitHub App
                    Node 24.x · entry apps/ops/server.js
                    no build command (prebuilt branch)
```

Workflow: `.github/workflows/ops-pack.yml`

The package job runs for pull requests, `main`, and manual runs only after the
same workflow's quality and PostgreSQL 16 integration jobs pass. Upload is
separately limited to `main` push or `main`-targeted manual runs. The packer
verifies exact Node/npm/pnpm/Next/Sharp/PostCSS versions, installs the Linux x64
glibc Sharp tree using official `npm ci --ignore-scripts` from the committed
narrow lock, verifies that lock hash, and starts the extracted server against
disposable PostgreSQL. It checks `/login`, readiness, auth session health, and
one real `/_next/static/…` asset with bounded requests.

ZIP, checksum, and manifest candidates remain in a unique hidden workspace
inside `dist`; every failure cleans that workspace. Existing final names are
refused, and validated sidecars then the ZIP are atomically renamed only after
all gates pass. A clean tree defaults to the short commit stamp; dirty local
packs receive a unique timestamp/PID suffix.

The workflow keeps default `contents: read`; only the publication job receives
`contents: write` to update `hostinger-ops-production` with force-with-lease.
It stores no Hostinger credentials. Hostinger watches that generated branch,
and the optional live job polls `/api/health/version` for the exact source SHA.
Production branch auto-deployment was recovered from plan-wide NPROC exhaustion
and exact-SHA verified again 2026-08-01; API, MCP, and Connector deployment
remain unsupported.
