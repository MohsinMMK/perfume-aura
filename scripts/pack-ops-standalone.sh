#!/usr/bin/env bash
# Pack Next.js standalone output for Hostinger Node.js Web App (prebuilt zip).
# Why: Hostinger shared Node fails monorepo/esbuild builds (EACCES). Ship prebuilt.
#
# Layout (zip root = Hostinger extract root):
#   apps/ops/server.js          ← ENTRY
#   apps/ops/.next/static/      ← required assets
#   apps/ops/node_modules/      ← materialized next + siblings (no symlink dependency)
#   node_modules/.pnpm/         ← full standalone store
#   package.json                ← build: echo prebuilt-standalone (no deps)
#
# Never bake .env into the zip. Set secrets in hPanel only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="${STANDALONE_STAMP:-$(date +%Y%m%d)}"
OUT_DIR="${STANDALONE_OUT_DIR:-$ROOT/dist}"
STAGE="$OUT_DIR/perfume-aura-standalone-stage"
ZIP_NAME="perfume-aura-standalone_${STAMP}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

echo "==> Building @perfume-aura/ops (standalone)…"
pnpm --filter @perfume-aura/ops build

STANDALONE="$ROOT/apps/ops/.next/standalone"
STATIC="$ROOT/apps/ops/.next/static"
PUBLIC_DIR="$ROOT/apps/ops/public"
SERVER_JS="$STANDALONE/apps/ops/server.js"

if [[ ! -f "$SERVER_JS" ]]; then
  echo "ERROR: missing $SERVER_JS — standalone output incomplete" >&2
  exit 1
fi

echo "==> Staging zip contents…"
rm -rf "$STAGE"
mkdir -p "$STAGE"
# Copy standalone tree (keeps apps/ops/server.js layout Hostinger entry expects)
cp -R "$STANDALONE"/. "$STAGE"/

# Next standalone does not include static assets or public/ — required at runtime
mkdir -p "$STAGE/apps/ops/.next"
rm -rf "$STAGE/apps/ops/.next/static"
cp -R "$STATIC" "$STAGE/apps/ops/.next/static"

if [[ -d "$PUBLIC_DIR" ]] && [[ -n "$(ls -A "$PUBLIC_DIR" 2>/dev/null || true)" ]]; then
  rm -rf "$STAGE/apps/ops/public"
  cp -R "$PUBLIC_DIR" "$STAGE/apps/ops/public"
else
  mkdir -p "$STAGE/apps/ops/public"
fi

# ---------------------------------------------------------------------------
# Materialize apps/ops/node_modules (real dirs).
# Zip without -y / Hostinger extract often drop pnpm symlinks → orphan next.
# Copy next + every sibling from the pnpm next@* neighborhood so
# require('next') and require('@swc/helpers') resolve under apps/ops.
# ---------------------------------------------------------------------------
echo "==> Materializing apps/ops/node_modules (portable, no symlink dependency)…"
NEXT_NM=""
shopt -s nullglob
for d in "$STAGE/node_modules/.pnpm"/next@*/node_modules; do
  if [[ -d "$d/next" ]]; then
    NEXT_NM="$d"
    break
  fi
done
shopt -u nullglob

if [[ -z "$NEXT_NM" ]]; then
  echo "ERROR: cannot find node_modules/.pnpm/next@*/node_modules in stage" >&2
  exit 1
fi

rm -rf "$STAGE/apps/ops/node_modules"
mkdir -p "$STAGE/apps/ops/node_modules"

# Copy package trees as real directories (pnpm uses relative symlinks that break when relocated).
copy_real() {
  local src="$1" dest="$2"
  local resolved
  if [[ -L "$src" ]]; then
    resolved="$(cd "$(dirname "$src")" && realpath "$(basename "$src")" 2>/dev/null || readlink -f "$src" 2>/dev/null || true)"
    if [[ -z "$resolved" || ! -e "$resolved" ]]; then
      # macOS fallback
      resolved="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$src")"
    fi
    src="$resolved"
  fi
  if [[ -d "$src" ]]; then
    rm -rf "$dest"
    mkdir -p "$dest"
    # -L follow symlinks inside package so nested deps are real files too
    cp -RL "$src"/. "$dest"/
  elif [[ -f "$src" ]]; then
    rm -f "$dest"
    cp -L "$src" "$dest"
  else
    echo "WARN: skip missing $1" >&2
  fi
}

for pkg in "$NEXT_NM"/*; do
  [[ -e "$pkg" ]] || continue
  base="$(basename "$pkg")"
  copy_real "$pkg" "$STAGE/apps/ops/node_modules/$base"
done

# Hoist anything else next may need from pnpm root node_modules
if [[ -d "$STAGE/node_modules/.pnpm/node_modules" ]]; then
  for pkg in "$STAGE/node_modules/.pnpm/node_modules"/*; do
    [[ -e "$pkg" ]] || continue
    base="$(basename "$pkg")"
    if [[ ! -e "$STAGE/apps/ops/node_modules/$base" ]]; then
      copy_real "$pkg" "$STAGE/apps/ops/node_modules/$base"
    fi
  done
fi

# @swc/helpers must expose package exports (not a dangling symlink)
if [[ ! -f "$STAGE/apps/ops/node_modules/@swc/helpers/package.json" ]]; then
  # pnpm nests as @swc/helpers under @swc/
  if [[ -e "$STAGE/apps/ops/node_modules/@swc/helpers" ]]; then
    :
  else
    SWC_SRC="$(ls -d "$STAGE/node_modules/.pnpm"/@swc+helpers@*/node_modules/@swc/helpers 2>/dev/null | head -1)"
    if [[ -n "$SWC_SRC" ]]; then
      mkdir -p "$STAGE/apps/ops/node_modules/@swc"
      copy_real "$SWC_SRC" "$STAGE/apps/ops/node_modules/@swc/helpers"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Hostinger runs Linux x64. Local Mac standalone only ships darwin sharp.
# ---------------------------------------------------------------------------
TARGET_OS="${STANDALONE_TARGET_OS:-linux}"
TARGET_CPU="${STANDALONE_TARGET_CPU:-x64}"
TARGET_LIBC="${STANDALONE_TARGET_LIBC:-glibc}"
SHARP_VERSION="${STANDALONE_SHARP_VERSION:-0.34.5}"
echo "==> Installing sharp@${SHARP_VERSION} for ${TARGET_OS}/${TARGET_CPU}/${TARGET_LIBC}…"
SHARP_TMP="$(mktemp -d)"
(
  cd "$SHARP_TMP"
  npm install --omit=dev --no-package-lock \
    --os="$TARGET_OS" --cpu="$TARGET_CPU" --libc="$TARGET_LIBC" \
    "sharp@${SHARP_VERSION}" >/dev/null
)
SHARP_SRC="$SHARP_TMP/node_modules/sharp"
IMG_SRC="$SHARP_TMP/node_modules/@img"
if [[ ! -d "$SHARP_SRC" ]]; then
  echo "ERROR: sharp install failed" >&2
  rm -rf "$SHARP_TMP"
  exit 1
fi

copy_sharp_into() {
  local dest_nm="$1"
  mkdir -p "$dest_nm"
  rm -rf "$dest_nm/sharp"
  cp -R "$SHARP_SRC" "$dest_nm/sharp"
  if [[ -d "$IMG_SRC" ]]; then
    mkdir -p "$dest_nm/@img"
    local pkg base
    shopt -s nullglob
    for pkg in "$IMG_SRC"/sharp-linux-* "$IMG_SRC"/sharp-libvips-linux-* "$IMG_SRC"/colour; do
      base="$(basename "$pkg")"
      rm -rf "$dest_nm/@img/$base"
      cp -R "$pkg" "$dest_nm/@img/$base"
    done
    shopt -u nullglob
  fi
}

# Place linux sharp where Next and Hostinger cwd resolve modules
copy_sharp_into "$STAGE/apps/ops/node_modules"
copy_sharp_into "$STAGE/node_modules"
shopt -s nullglob
for nm in \
  "$STAGE/node_modules/.pnpm/node_modules" \
  "$STAGE/node_modules/.pnpm"/next@*/node_modules \
  "$STAGE/node_modules/.pnpm"/sharp@*/node_modules
do
  [[ -d "$nm" ]] || continue
  copy_sharp_into "$nm"
done
shopt -u nullglob
rm -rf "$SHARP_TMP"

# Drop darwin natives from the tree (wrong ABI + bloat)
while IFS= read -r -d '' d; do
  rm -rf "$d"
done < <(find "$STAGE/node_modules" "$STAGE/apps/ops/node_modules" -type d \( -name '*darwin*' -o -name '*Darwin*' \) -print0 2>/dev/null)

# Strip install bait: nested ops package.json must not list workspace:* deps
cat > "$STAGE/apps/ops/package.json" << 'OPSPKG'
{
  "name": "perfume-aura-ops-standalone-app",
  "private": true,
  "scripts": {
    "start": "node server.js"
  }
}
OPSPKG

# Hostinger helper package.json — empty deps so install is a no-op
cat > "$STAGE/package.json" << 'PKG'
{
  "name": "perfume-aura-ops-standalone",
  "private": true,
  "scripts": {
    "build": "echo prebuilt-standalone",
    "start": "node apps/ops/server.js",
    "postinstall": "echo skip-postinstall"
  }
}
PKG

# Minimal lock so pnpm install does not try to fetch monorepo workspace
cat > "$STAGE/pnpm-lock.yaml" << 'LOCK'
lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  '.':
    dependencies: {}
    devDependencies: {}
packages: {}
LOCK

cat > "$STAGE/README.hostinger.txt" << 'TXT'
Hostinger Node.js Web App — prebuilt standalone (Perfume Aura ops)

Settings and redeploy:
  Source: upload this zip
  Framework: Other (or Next.js)
  Node: 20.x
  Root directory: ./
  Build command: echo prebuilt-standalone
  Package manager: pnpm (or npm)
  Output directory: (leave empty)
  Entry file: apps/ops/server.js

Required env (hPanel only — never bake into zip):
  DATABASE_URL=<Neon pooled production>
  BETTER_AUTH_SECRET=<openssl rand -base64 32>
  BETTER_AUTH_URL=https://app.perfumeaura.com
  NEXT_PUBLIC_BETTER_AUTH_URL=https://app.perfumeaura.com
  NODE_ENV=production
  PORT=3000

Do NOT use root entry.cjs / flat server.js experiments.
Smoke: https://app.perfumeaura.com/login
TXT

# Forbid secrets in stage
if find "$STAGE" -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' \) 2>/dev/null | grep -q .; then
  echo "ERROR: env/secret files found in stage — refuse to pack" >&2
  find "$STAGE" -type f \( -name '.env' -o -name '.env.*' \) 2>/dev/null || true
  exit 1
fi

echo "==> Stage smoke (require next from apps/ops)…"
(
  cd "$STAGE/apps/ops"
  test -f server.js
  test -d node_modules/next
  test -d .next/static
  node -e "require('next'); require('next/dist/shared/lib/constants'); console.log('stage-smoke: next ok')"
)

echo "==> Zipping → $ZIP_PATH"
mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"
(
  cd "$STAGE"
  # -y store symlinks as symlinks when present; tree is mostly real dirs after materialize
  zip -qry "$ZIP_PATH" .
)

echo "==> Zip extract smoke…"
VERIFY="$(mktemp -d)"
unzip -q "$ZIP_PATH" -d "$VERIFY"
if unzip -l "$ZIP_PATH" | grep -E '(^|/)\.env(\.|$)|(^|/)entry\.cjs$'; then
  echo "ERROR: zip contains .env or entry.cjs (forbidden)" >&2
  rm -rf "$VERIFY"
  exit 1
fi
(
  cd "$VERIFY/apps/ops"
  test -f server.js
  test -d node_modules/next
  node -e "require('next'); require('next/dist/shared/lib/constants'); console.log('zip-smoke: next ok')"
)
rm -rf "$VERIFY"

# Cleanup stage (keep zip only)
rm -rf "$STAGE"

BYTES="$(wc -c < "$ZIP_PATH" | tr -d ' ')"
echo "==> Done: $ZIP_PATH ($BYTES bytes)"
echo "    Entry file: apps/ops/server.js"
echo "    Build cmd:  echo prebuilt-standalone"
ls -lh "$ZIP_PATH"
