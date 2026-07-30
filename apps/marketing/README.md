# `@perfume-aura/marketing`

Public brand and collection preview for **perfumeaura.com**.

## Ownership (edit vs publish)

| Path | Role | Edit? |
|------|------|-------|
| `apps/marketing/index.html` | Page markup | **Yes — source of truth** |
| `apps/marketing/styles.css` | Page styles | **Yes — source of truth** |
| `apps/marketing/.htaccess` | SEC-7 fail-closed public allowlist for classic Git | **Yes — source of truth** |
| `apps/marketing/assets/` | Optimized public imagery | **Yes — source of truth** |
| `apps/marketing/source-assets/` | Original artwork; not published | **Yes — source archive only** |
| `apps/marketing/DESIGN.md` | Brand design contract | **Yes — source only; HTTP-denied** |
| `scripts/sync-marketing.sh` | Publish/check workflow | **Yes — keep with marketing changes** |
| repo root `index.html` / `styles.css` / `.htaccess` / `assets/` | Path M publish surface | **No — run `pnpm marketing:sync`** |
| `apps/marketing/dist/` | Local/CI artifact preview | Generated (gitignored via root `dist`) |

## Why root copies exist

Hostinger **classic Git** deploys the **whole GitHub repo** into `public_html`.  
hPanel “Root directory” is the **server destination** (`public_html`), not “deploy only this monorepo folder.”

Until artifact-only CI publishes just this package, apex HTML, CSS, and public assets must live at the **repository root**.

## Commands

```bash
# After editing files in this package:
pnpm marketing:sync

# CI / pre-push drift gate:
pnpm marketing:check

# Focused workflow safety checks (symlink rejection, parity, prune):
bash scripts/sync-marketing.sh self-test

# Local static preview
npx serve apps/marketing
# or: npx serve apps/marketing/dist  (after sync)
```

## Deploy (Path M)

```bash
pnpm marketing:sync
git add apps/marketing index.html styles.css .htaccess assets scripts/sync-marketing.sh
git commit -m "marketing: …"
git push origin main
```

Hostinger Advanced → Git auto-deploys `main` → `public_html`.

SEC-7: root `.htaccess` is fail-closed. Only `/`, `/index.html`, `/styles.css`, and `/assets/*` are public. `DESIGN.md`, `source-assets/`, monorepo trees, docs, data, Graphify output, lockfiles, and secrets must return **403**.

## Package boundary

- **Static only** — no Node runtime, no Neon, no auth secrets.
- **Not** the ops app. Ops = `apps/ops` → Hostinger **Node.js Web App** (Path Z/G).
- Future full marketing site still owns this package; root publish surface stays generated.
- This preview is not a live storefront. Ordering, pricing, delivery, payment, and final public product names remain unpublished.
