#!/usr/bin/env bash
# Publish marketing static surface to monorepo root for Hostinger Path M.
#
# Why root copies exist:
#   Hostinger classic Git deploys the whole GitHub repo into public_html.
#   "Root directory" in hPanel is the SERVER destination (public_html), not a
#   repo subdirectory filter. Apex must therefore serve index.html/styles.css
#   from the repository root until artifact-only CI lands.
#
# Source of truth (edit only here):
#   apps/marketing/index.html
#   apps/marketing/styles.css
#   apps/marketing/.htaccess
#
# Publish outputs (do not hand-edit):
#   ./index.html
#   ./styles.css
#   ./.htaccess
#
# Usage:
#   pnpm marketing:sync    # write publish outputs
#   pnpm marketing:check   # fail if publish surface drifts from source
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/apps/marketing"

mode="${1:-sync}"

need=(
  "$SRC/index.html"
  "$SRC/styles.css"
  "$SRC/.htaccess"
)

for f in "${need[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: missing marketing source: $f" >&2
    exit 1
  fi
done

publish_pairs=(
  "$SRC/index.html:$ROOT/index.html"
  "$SRC/styles.css:$ROOT/styles.css"
  "$SRC/.htaccess:$ROOT/.htaccess"
)

check_drift() {
  local src dest base
  local drift=0
  for pair in "${publish_pairs[@]}"; do
    src="${pair%%:*}"
    dest="${pair##*:}"
    base="$(basename "$src")"
    if [[ ! -f "$dest" ]]; then
      echo "DRIFT: missing publish file $dest (run pnpm marketing:sync)" >&2
      drift=1
      continue
    fi
    if ! diff -q "$src" "$dest" >/dev/null; then
      echo "DRIFT: $base — edit apps/marketing/$base then pnpm marketing:sync" >&2
      drift=1
    fi
  done
  if [[ "$drift" -ne 0 ]]; then
    echo "marketing publish surface out of sync with apps/marketing" >&2
    exit 1
  fi
  echo "marketing:check ok (index.html, styles.css, .htaccess)"
}

sync_publish() {
  local src dest
  for pair in "${publish_pairs[@]}"; do
    src="${pair%%:*}"
    dest="${pair##*:}"
    cp "$src" "$dest"
    echo "  published $(basename "$dest")"
  done
  # Local artifact preview (not committed; dist/ is gitignored)
  mkdir -p "$SRC/dist"
  cp "$SRC/index.html" "$SRC/styles.css" "$SRC/.htaccess" "$SRC/dist/"
  echo "  apps/marketing/dist/ refreshed (local/CI artifact preview)"
  echo "marketing:sync ok — Path M root publish surface updated"
}

case "$mode" in
  sync) sync_publish ;;
  check) check_drift ;;
  *)
    echo "Usage: $0 [sync|check]" >&2
    exit 2
    ;;
esac
