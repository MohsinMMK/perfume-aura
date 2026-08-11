#!/usr/bin/env bash
# Build and verify a prebuilt standalone storefront archive for Hostinger's
# Node.js Web App product. Secrets stay in hPanel; the archive is fail-closed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED_NODE="24.6.0"
EXPECTED_NPM="11.5.1"
EXPECTED_PNPM="10.32.1"
MAX_ARCHIVE_BYTES="50000000"
RUNTIME_DEPS_DIR="$ROOT/scripts/ops-runtime-deps"

[[ "$(node -p 'process.versions.node')" == "$EXPECTED_NODE" ]] || { echo "ERROR: storefront archive requires Node $EXPECTED_NODE" >&2; exit 1; }
[[ "$(npm --version)" == "$EXPECTED_NPM" ]] || { echo "ERROR: storefront archive requires npm $EXPECTED_NPM" >&2; exit 1; }
[[ "$(pnpm --version)" == "$EXPECTED_PNPM" ]] || { echo "ERROR: storefront archive requires pnpm $EXPECTED_PNPM" >&2; exit 1; }
[[ -f "$RUNTIME_DEPS_DIR/package-lock.json" && -f "$RUNTIME_DEPS_DIR/package.json" ]] || { echo "ERROR: locked Linux sharp runtime inputs are missing" >&2; exit 1; }

SOURCE_COMMIT="${STANDALONE_SOURCE_COMMIT:-$(git rev-parse HEAD)}"
[[ "$SOURCE_COMMIT" =~ ^[0-9a-f]{40,64}$ ]] || { echo "ERROR: invalid source commit" >&2; exit 1; }
if [[ -n "$(git status --porcelain)" ]]; then
  SOURCE_DIRTY=true
  STAMP="${SOURCE_COMMIT:0:12}-dirty-$(date -u +%Y%m%dT%H%M%SZ)-$$"
else
  SOURCE_DIRTY=false
  STAMP="${SOURCE_COMMIT:0:12}"
fi
OUT_DIR="${STANDALONE_OUT_DIR:-$ROOT/dist}"
ZIP_PATH="$OUT_DIR/perfume-aura-storefront_${STAMP}.zip"
CHECKSUM_PATH="$ZIP_PATH.sha256"
MANIFEST_PATH="${ZIP_PATH%.zip}.manifest.json"
for target in "$ZIP_PATH" "$CHECKSUM_PATH" "$MANIFEST_PATH"; do
  [[ ! -e "$target" ]] || { echo "ERROR: refusing to overwrite $target" >&2; exit 1; }
done

mkdir -p "$OUT_DIR"
WORK_DIR="$(mktemp -d "$OUT_DIR/.storefront-pack.XXXXXX")"
STAGE="$WORK_DIR/stage"
EXTRACTED="$WORK_DIR/extracted"
SHARP_TMP="$WORK_DIR/sharp"
SERVER_PID=""
cleanup() {
  local status=$?
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; fi
  [[ -d "$WORK_DIR" ]] && rm -rf -- "$WORK_DIR"
  if [[ "$status" -ne 0 ]]; then rm -f -- "$ZIP_PATH" "$CHECKSUM_PATH" "$MANIFEST_PATH"; fi
  exit "$status"
}
trap cleanup EXIT HUP INT TERM
mkdir -p "$STAGE" "$EXTRACTED" "$SHARP_TMP"

echo "==> Building @perfume-aura/storefront standalone"
NEXT_PHASE=phase-production-build \
STOREFRONT_URL=https://perfumeaura.com \
CUSTOMER_AUTH_URL=https://perfumeaura.com \
STOREFRONT_PREVIEW_CATALOG=false \
STANDALONE_SOURCE_COMMIT="$SOURCE_COMMIT" \
  pnpm --filter @perfume-aura/storefront build

STANDALONE="$ROOT/apps/storefront/.next/standalone"
APP_ROOT="$STANDALONE/apps/storefront"
[[ -f "$APP_ROOT/server.js" ]] || { echo "ERROR: standalone server.js missing" >&2; exit 1; }
[[ -d "$ROOT/apps/storefront/.next/static" ]] || { echo "ERROR: storefront static output missing" >&2; exit 1; }

echo "==> Materializing standalone tree"
cp -RL "$STANDALONE"/. "$STAGE"/
mkdir -p "$STAGE/apps/storefront/.next"
rm -rf "$STAGE/apps/storefront/.next/static"
cp -R "$ROOT/apps/storefront/.next/static" "$STAGE/apps/storefront/.next/static"
rm -rf "$STAGE/apps/storefront/public"
cp -R "$ROOT/apps/storefront/public" "$STAGE/apps/storefront/public"

# Hostinger extraction cannot rely on pnpm's relative-link topology. Hoist the
# complete sibling set used by Next into the app-local resolver boundary.
NEXT_NEIGHBORHOOD=""
while IFS= read -r candidate; do
  if [[ -f "$candidate/next/package.json" ]]; then NEXT_NEIGHBORHOOD="$candidate"; break; fi
done < <(find "$STAGE/node_modules/.pnpm" -mindepth 2 -maxdepth 2 -type d -path '*/next@*/node_modules' | sort)
[[ -n "$NEXT_NEIGHBORHOOD" ]] || { echo "ERROR: Next dependency neighborhood missing" >&2; exit 1; }
mkdir -p "$STAGE/apps/storefront/node_modules"
for dependency in "$NEXT_NEIGHBORHOOD"/*; do
  [[ -e "$dependency" ]] || continue
  name="$(basename "$dependency")"
  rm -rf "$STAGE/apps/storefront/node_modules/$name"
  cp -RL "$dependency" "$STAGE/apps/storefront/node_modules/$name"
done
if [[ -d "$STAGE/node_modules/.pnpm/node_modules" ]]; then
  for dependency in "$STAGE/node_modules/.pnpm/node_modules"/*; do
    [[ -e "$dependency" ]] || continue
    name="$(basename "$dependency")"
    if [[ ! -e "$STAGE/apps/storefront/node_modules/$name" ]]; then cp -RL "$dependency" "$STAGE/apps/storefront/node_modules/$name"; fi
  done
fi

echo "==> Installing locked Linux x64 sharp runtime"
cp "$RUNTIME_DEPS_DIR/package.json" "$SHARP_TMP/package.json"
cp "$RUNTIME_DEPS_DIR/package-lock.json" "$SHARP_TMP/package-lock.json"
(cd "$SHARP_TMP" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc >/dev/null)
for destination in "$STAGE/apps/storefront/node_modules" "$STAGE/node_modules"; do
  mkdir -p "$destination"
  rm -rf "$destination/sharp" "$destination/@img"
  cp -R "$SHARP_TMP/node_modules/sharp" "$destination/sharp"
  mkdir -p "$destination/@img"
  for runtime_package in sharp-linux-x64 sharp-libvips-linux-x64 colour; do
    runtime_source="$SHARP_TMP/node_modules/@img/$runtime_package"
    [[ -e "$runtime_source" ]] || { echo "ERROR: locked Sharp runtime is missing $runtime_package" >&2; exit 1; }
    cp -R "$runtime_source" "$destination/@img/$runtime_package"
  done
  for dependency in detect-libc semver; do
    if [[ -e "$SHARP_TMP/node_modules/$dependency" ]]; then rm -rf "$destination/$dependency"; cp -R "$SHARP_TMP/node_modules/$dependency" "$destination/$dependency"; fi
  done
done
cp "$RUNTIME_DEPS_DIR/package-lock.json" "$STAGE/runtime-package-lock.json"

cat > "$STAGE/package.json" <<'JSON'
{
  "name": "perfume-aura-storefront-standalone",
  "private": true,
  "engines": { "node": ">=24.6.0 <25" },
  "dependencies": {},
  "scripts": {
    "build": "echo prebuilt-standalone",
    "postinstall": "echo skip-postinstall",
    "start": "node apps/storefront/server.js"
  }
}
JSON
cat > "$STAGE/pnpm-lock.yaml" <<'LOCK'
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
cat > "$STAGE/README.hostinger.txt" <<'TXT'
Perfume Aura Storefront — Hostinger prebuilt standalone

Source: upload this ZIP to the Node.js Web App for perfumeaura.com
Node: 24.x
Framework: Other
Root directory: ./
Build command: echo prebuilt-standalone
Output directory: leave empty
Entry file: apps/storefront/server.js

Keep the extracted node_modules tree. Configure database, customer auth,
Cashfree, OAuth, and SMTP values only in Hostinger's environment store.
Do not connect this app to the blocked monorepo source-build route.
TXT

node - "$STAGE/artifact-manifest.json" "$SOURCE_COMMIT" "$SOURCE_DIRTY" <<'NODE'
const fs = require("node:fs");
const [output, commit, dirty] = process.argv.slice(2);
const manifest = {
  schemaVersion: 1,
  application: "@perfume-aura/storefront",
  source: { commit, dirty: dirty === "true" },
  runtime: { node: process.versions.node, target: { os: "linux", cpu: "x64", libc: "glibc" } },
  entry: "apps/storefront/server.js",
  requiredPaths: [
    "apps/storefront/server.js",
    "apps/storefront/.next/static",
    "apps/storefront/public",
    "apps/storefront/node_modules/next/package.json",
    "apps/storefront/node_modules/sharp/package.json",
    "apps/storefront/node_modules/@img/sharp-linux-x64",
    "apps/storefront/node_modules/@img/sharp-libvips-linux-x64"
  ],
  secretsIncluded: false
};
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

find "$STAGE" -type f -name '*.map' -delete
while IFS= read -r -d '' bin_dir; do rm -rf "$bin_dir"; done < <(find "$STAGE" -type d -name '.bin' -print0)
if find "$STAGE" -type l -print -quit | grep -q .; then echo "ERROR: staged tree contains symlinks" >&2; exit 1; fi
FORBIDDEN="$(find "$STAGE" -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o -name '*credentials*.json' -o -name 'service-account*.json' \) -print)"
[[ -z "$FORBIDDEN" ]] || { echo "ERROR: secret-shaped files found in stage" >&2; echo "$FORBIDDEN" >&2; exit 1; }
for required in apps/storefront/server.js apps/storefront/.next/static apps/storefront/public apps/storefront/node_modules/next/package.json apps/storefront/node_modules/sharp/package.json apps/storefront/node_modules/@img/sharp-linux-x64 apps/storefront/node_modules/@img/sharp-libvips-linux-x64; do
  [[ -e "$STAGE/$required" ]] || { echo "ERROR: missing $required" >&2; exit 1; }
done

echo "==> Compressing and validating archive"
(cd "$STAGE" && zip -qry "$ZIP_PATH" .)
ARCHIVE_BYTES="$(wc -c < "$ZIP_PATH" | tr -d ' ')"
[[ "$ARCHIVE_BYTES" -le "$MAX_ARCHIVE_BYTES" ]] || { echo "ERROR: archive exceeds Hostinger 50MB limit" >&2; exit 1; }
python3 - "$ZIP_PATH" "$EXTRACTED" <<'PY'
import os, pathlib, stat, sys, zipfile
archive, destination = sys.argv[1:]
root = pathlib.Path(destination).resolve()
with zipfile.ZipFile(archive) as z:
    for item in z.infolist():
        path = pathlib.PurePosixPath(item.filename)
        if path.is_absolute() or ".." in path.parts:
            raise SystemExit(f"unsafe archive path: {item.filename}")
        if stat.S_ISLNK(item.external_attr >> 16):
            raise SystemExit(f"symlink entry refused: {item.filename}")
    z.extractall(root)
PY
for required in apps/storefront/server.js apps/storefront/.next/static apps/storefront/public artifact-manifest.json; do
  [[ -e "$EXTRACTED/$required" ]] || { echo "ERROR: extracted smoke missing $required" >&2; exit 1; }
done

PORT="$(python3 - <<'PY'
import socket
s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()
PY
)"
(cd "$EXTRACTED" && NODE_ENV=production HOSTNAME=127.0.0.1 PORT="$PORT" node apps/storefront/server.js > "$WORK_DIR/server.log" 2>&1) &
SERVER_PID=$!
for _ in {1..40}; do
  if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/" >/dev/null; then break; fi
  sleep 0.25
done
curl -fsS --max-time 5 "http://127.0.0.1:$PORT/" >/dev/null || { cat "$WORK_DIR/server.log" >&2; exit 1; }
STATIC_ASSET="$(find "$EXTRACTED/apps/storefront/.next/static" -type f -print -quit)"
[[ -n "$STATIC_ASSET" ]] || { echo "ERROR: no static asset found" >&2; exit 1; }
STATIC_PATH="${STATIC_ASSET#"$EXTRACTED/apps/storefront/.next/static"/}"
curl -fsS --max-time 5 "http://127.0.0.1:$PORT/_next/static/$STATIC_PATH" >/dev/null
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

if command -v sha256sum >/dev/null 2>&1; then SHA256="$(sha256sum "$ZIP_PATH" | awk '{print $1}')"; else SHA256="$(shasum -a 256 "$ZIP_PATH" | awk '{print $1}')"; fi
printf '%s  %s\n' "$SHA256" "$(basename "$ZIP_PATH")" > "$CHECKSUM_PATH"
node - "$MANIFEST_PATH" "$SOURCE_COMMIT" "$SOURCE_DIRTY" "$ZIP_PATH" "$SHA256" "$ARCHIVE_BYTES" <<'NODE'
const fs = require("node:fs");
const [output, commit, dirty, archive, sha256, bytes] = process.argv.slice(2);
fs.writeFileSync(output, `${JSON.stringify({ schemaVersion: 1, application: "@perfume-aura/storefront", source: { commit, dirty: dirty === "true" }, archive: { file: archive.split("/").pop(), bytes: Number(bytes), sha256 }, entry: "apps/storefront/server.js", extractedSmoke: "passed" }, null, 2)}\n`);
NODE
echo "storefront-artifact: passed"
echo "$ZIP_PATH"
