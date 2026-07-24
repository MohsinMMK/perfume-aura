# `@perfume-aura/marketing`

Public brand site for **perfumeaura.com** (coming soon → full marketing later).

## Ownership (edit vs publish)

| Path | Role | Edit? |
|------|------|-------|
| `apps/marketing/index.html` | Page markup | **Yes — source of truth** |
| `apps/marketing/styles.css` | Page styles | **Yes — source of truth** |
| `apps/marketing/.htaccess` | SEC-7 deny rules for classic Git | **Yes — source of truth** |
| repo root `index.html` / `styles.css` / `.htaccess` | Path M publish surface | **No — run `pnpm marketing:sync`** |
| `apps/marketing/dist/` | Local/CI artifact preview | Generated (gitignored via root `dist`) |

## Why root copies exist

Hostinger **classic Git** deploys the **whole GitHub repo** into `public_html`.  
hPanel “Root directory” is the **server destination** (`public_html`), not “deploy only this monorepo folder.”

Until artifact-only CI publishes just this package, apex HTML/CSS must live at the **repository root**.

## Commands

```bash
# After editing files in this package:
pnpm marketing:sync

# CI / pre-push drift gate:
pnpm marketing:check

# Local static preview
npx serve apps/marketing
# or: npx serve apps/marketing/dist  (after sync)
```

## Deploy (Path M)

```bash
pnpm marketing:sync
git add apps/marketing index.html styles.css .htaccess
git commit -m "marketing: …"
git push origin main
```

Hostinger Advanced → Git auto-deploys `main` → `public_html`.  
SEC-7: `.htaccess` must 403 `/apps`, `/packages`, `/docs`, lockfiles, `*.md`, etc.

## Package boundary

- **Static only** — no Node runtime, no Neon, no auth secrets.
- **Not** the ops app. Ops = `apps/ops` → Hostinger **Node.js Web App** (Path Z/G).
- Future full marketing site still owns this package; root publish surface stays generated.
