#!/usr/bin/env bash
# Pack Next.js standalone output for Hostinger Node.js Web App (prebuilt zip).
# Why: Hostinger shared Node fails monorepo/esbuild builds (EACCES). Ship prebuilt.
#
# Layout (zip root = Hostinger extract root):
#   apps/ops/server.js          ← ENTRY
#   apps/ops/.next/static/      ← required assets
#   apps/ops/node_modules/      ← materialized next + siblings (PRIMARY portability fix)
#   node_modules/.pnpm/         ← full standalone store
#   package.json                ← build: echo prebuilt-standalone (empty deps)
#
# Hostinger-safe boot depends on materializing real dirs under apps/ops/node_modules.
# zip -y is secondary (preserves any remaining symlinks); do not treat -y alone as the fix.
#
# Never bake .env into the zip. Set secrets in hPanel only.
# Do not wipe extracted node_modules on the server (empty root deps = install no-op).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED_NODE_VERSION="24.18.0"
EXPECTED_NPM_VERSION="11.16.0"
EXPECTED_PNPM_VERSION="11.1.3"
EXPECTED_NEXT_VERSION="16.2.11"
EXPECTED_SHARP_VERSION="0.35.3"
EXPECTED_POSTCSS_VERSION="8.5.22"
MAX_ARCHIVE_BYTES="50000000"
RUNTIME_DEPS_DIR="$ROOT/scripts/ops-runtime-deps"
RUNTIME_DEPS_PACKAGE="$RUNTIME_DEPS_DIR/package.json"
RUNTIME_DEPS_LOCK="$RUNTIME_DEPS_DIR/package-lock.json"

sha256_file() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
  else
    shasum -a 256 "$path" | awk '{print $1}'
  fi
}

CURRENT_NODE_VERSION="$(node -p 'process.versions.node')"
if [[ "$CURRENT_NODE_VERSION" != "$EXPECTED_NODE_VERSION" ]]; then
  echo "ERROR: ops archive must be built with Node ${EXPECTED_NODE_VERSION}; found ${CURRENT_NODE_VERSION}" >&2
  exit 1
fi
CURRENT_NPM_VERSION="$(npm --version)"
if [[ "$CURRENT_NPM_VERSION" != "$EXPECTED_NPM_VERSION" ]]; then
  echo "ERROR: ops archive must use npm ${EXPECTED_NPM_VERSION}; found ${CURRENT_NPM_VERSION}" >&2
  exit 1
fi
CURRENT_PNPM_VERSION="$(pnpm --version)"
if [[ "$CURRENT_PNPM_VERSION" != "$EXPECTED_PNPM_VERSION" ]]; then
  echo "ERROR: ops archive must be built with pnpm ${EXPECTED_PNPM_VERSION}; found ${CURRENT_PNPM_VERSION}" >&2
  exit 1
fi
if [[ ! -f "$RUNTIME_DEPS_PACKAGE" || ! -f "$RUNTIME_DEPS_LOCK" ]]; then
  echo "ERROR: committed Sharp runtime package and package-lock.json are required" >&2
  exit 1
fi
RUNTIME_DEPS_LOCK_SHA256="$(sha256_file "$RUNTIME_DEPS_LOCK")"

# Derive archive runtime versions from Next's installed dependency graph. The
# targeted pnpm overrides remain the source of truth; the pack must not drift.
RESOLVED_NEXT_VERSION="$(
  cd "$ROOT/apps/ops"
  node -p "require('next/package.json').version"
)"
RESOLVED_SHARP_VERSION="$(
  cd "$ROOT/apps/ops"
  node -e "const fs = require('node:fs'); const path = require('node:path'); const { createRequire } = require('node:module'); const fromNext = createRequire(require.resolve('next/package.json')); let dir = path.dirname(fromNext.resolve('sharp')); while (dir !== path.dirname(dir)) { const manifest = path.join(dir, 'package.json'); if (fs.existsSync(manifest)) { const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8')); if (pkg.name === 'sharp') { process.stdout.write(pkg.version); process.exit(0); } } dir = path.dirname(dir); } throw new Error('cannot locate sharp package.json from Next.js dependency graph')"
)"
RESOLVED_POSTCSS_VERSION="$(
  cd "$ROOT/apps/ops"
  node -e "const { createRequire } = require('node:module'); const fromNext = createRequire(require.resolve('next/package.json')); process.stdout.write(fromNext('postcss/package.json').version)"
)"

if [[ "$RESOLVED_NEXT_VERSION" != "$EXPECTED_NEXT_VERSION" ]]; then
  echo "ERROR: expected next@${EXPECTED_NEXT_VERSION}; resolved ${RESOLVED_NEXT_VERSION}" >&2
  exit 1
fi
if [[ "$RESOLVED_SHARP_VERSION" != "$EXPECTED_SHARP_VERSION" ]]; then
  echo "ERROR: expected Next.js to resolve sharp@${EXPECTED_SHARP_VERSION}; resolved ${RESOLVED_SHARP_VERSION}" >&2
  exit 1
fi
if [[ "$RESOLVED_POSTCSS_VERSION" != "$EXPECTED_POSTCSS_VERSION" ]]; then
  echo "ERROR: expected Next.js to resolve postcss@${EXPECTED_POSTCSS_VERSION}; resolved ${RESOLVED_POSTCSS_VERSION}" >&2
  exit 1
fi

SOURCE_COMMIT="${STANDALONE_SOURCE_COMMIT:-$(git rev-parse HEAD)}"
if [[ ! "$SOURCE_COMMIT" =~ ^[0-9a-f]{40,64}$ ]]; then
  echo "ERROR: source commit must be a full Git commit hash; found ${SOURCE_COMMIT}" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  SOURCE_DIRTY="true"
else
  SOURCE_DIRTY="false"
fi

if [[ -n "${STANDALONE_STAMP:-}" ]]; then
  STAMP="$STANDALONE_STAMP"
elif [[ "$SOURCE_DIRTY" == "false" ]]; then
  STAMP="${SOURCE_COMMIT:0:12}"
else
  STAMP="${SOURCE_COMMIT:0:12}-dirty-$(date -u +%Y%m%dT%H%M%SZ)-$$"
fi
if [[ ! "$STAMP" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]] || [[ "$STAMP" == *".."* ]]; then
  echo "ERROR: STANDALONE_STAMP must be a filename-safe token (1-64 letters, numbers, dots, underscores, or hyphens; no '..')" >&2
  exit 1
fi
OUT_DIR="${STANDALONE_OUT_DIR:-$ROOT/dist}"
ZIP_NAME="perfume-aura-standalone_${STAMP}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"
CHECKSUM_PATH="${ZIP_PATH}.sha256"
MANIFEST_PATH="${ZIP_PATH%.zip}.manifest.json"

refuse_existing_outputs() {
  local path
  for path in "$MANIFEST_PATH" "$CHECKSUM_PATH" "$ZIP_PATH"; do
    if [[ -e "$path" ]]; then
      echo "ERROR: refusing to overwrite existing artifact output: $path" >&2
      return 1
    fi
  done
}

mkdir -p "$OUT_DIR"
refuse_existing_outputs

WORK_DIR="$(mktemp -d "$OUT_DIR/.perfume-aura-ops-pack.XXXXXX")"
STAGE="$WORK_DIR/stage"
VERIFY="$WORK_DIR/verify"
CANDIDATE_DIR="$WORK_DIR/output"
CANDIDATE_ZIP_PATH="$CANDIDATE_DIR/$ZIP_NAME"
CANDIDATE_CHECKSUM_PATH="$CANDIDATE_DIR/${ZIP_NAME}.sha256"
CANDIDATE_MANIFEST_PATH="$CANDIDATE_DIR/${ZIP_NAME%.zip}.manifest.json"
SHARP_TMP="$WORK_DIR/sharp-runtime"
SMOKE_LOG="$WORK_DIR/server-smoke.log"
SMOKE_PID=""
PUBLISHED_MANIFEST="false"
PUBLISHED_CHECKSUM="false"
PUBLISHED_ZIP="false"
PUBLISH_COMPLETE="false"

cleanup_pack() {
  local status=$?
  trap - EXIT HUP INT TERM
  if [[ -n "$SMOKE_PID" ]] && kill -0 "$SMOKE_PID" 2>/dev/null; then
    kill "$SMOKE_PID" 2>/dev/null || true
    wait "$SMOKE_PID" 2>/dev/null || true
  fi
  if [[ "$PUBLISH_COMPLETE" != "true" ]]; then
    [[ "$PUBLISHED_ZIP" == "true" ]] && rm -f -- "$ZIP_PATH"
    [[ "$PUBLISHED_CHECKSUM" == "true" ]] && rm -f -- "$CHECKSUM_PATH"
    [[ "$PUBLISHED_MANIFEST" == "true" ]] && rm -f -- "$MANIFEST_PATH"
  fi
  if [[ -d "$WORK_DIR" ]]; then
    rm -rf -- "$WORK_DIR"
  fi
  exit "$status"
}
trap cleanup_pack EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir -p "$STAGE" "$VERIFY" "$CANDIDATE_DIR"

echo "==> Building @perfume-aura/ops (standalone)…"
# The production build must not inherit a local .env auth origin or secret.
# This known random poison value overrides .env.local for the build process.
# The auth resolver intentionally ignores it during NEXT_PHASE and creates its
# own per-process ephemeral secret; staging fails if this canary is serialized.
BUILD_ONLY_AUTH_SECRET="$(
  node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64'))"
)"
BETTER_AUTH_URL="https://app.perfumeaura.com" \
BETTER_AUTH_SECRET="$BUILD_ONLY_AUTH_SECRET" \
  pnpm --filter @perfume-aura/ops build

STANDALONE="$ROOT/apps/ops/.next/standalone"
STATIC="$ROOT/apps/ops/.next/static"
PUBLIC_DIR="$ROOT/apps/ops/public"
SERVER_JS="$STANDALONE/apps/ops/server.js"

if [[ ! -f "$SERVER_JS" ]]; then
  echo "ERROR: missing $SERVER_JS — standalone output incomplete" >&2
  exit 1
fi

if [[ ! -d "$STATIC" ]]; then
  echo "ERROR: missing $STATIC — run a full next build first" >&2
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

# Next's standalone trace can omit its build-time PostCSS package. Materialize
# the exact dependency selected from Next's reviewed graph so the archive smoke
# can prove the patched version without relying on the build machine.
POSTCSS_MANIFEST="$(
  cd "$ROOT/apps/ops"
  node -e "const { createRequire } = require('node:module'); const fromNext = createRequire(require.resolve('next/package.json')); process.stdout.write(fromNext.resolve('postcss/package.json'))"
)"
POSTCSS_PACKAGE_DIR="${POSTCSS_MANIFEST%/package.json}"
POSTCSS_NM="${POSTCSS_PACKAGE_DIR%/postcss}"
if [[ ! -d "$POSTCSS_PACKAGE_DIR" ]]; then
  echo "ERROR: cannot find resolved postcss@${RESOLVED_POSTCSS_VERSION} package directory" >&2
  exit 1
fi
for pkg in "$POSTCSS_NM"/*; do
  [[ -e "$pkg" ]] || continue
  base="$(basename "$pkg")"
  if [[ "$base" == "postcss" || ! -e "$STAGE/apps/ops/node_modules/$base" ]]; then
    copy_real "$pkg" "$STAGE/apps/ops/node_modules/$base"
  fi
done

# ---------------------------------------------------------------------------
# Hostinger runs Linux x64. Local Mac standalone only ships darwin sharp.
# ---------------------------------------------------------------------------
TARGET_OS="${STANDALONE_TARGET_OS:-linux}"
TARGET_CPU="${STANDALONE_TARGET_CPU:-x64}"
TARGET_LIBC="${STANDALONE_TARGET_LIBC:-glibc}"
if [[ "$TARGET_OS" != "linux" || "$TARGET_CPU" != "x64" || "$TARGET_LIBC" != "glibc" ]]; then
  echo "ERROR: Hostinger archive target is fixed to linux/x64/glibc" >&2
  exit 1
fi
SHARP_VERSION="$RESOLVED_SHARP_VERSION"
echo "==> Installing locked sharp@${SHARP_VERSION} for ${TARGET_OS}/${TARGET_CPU}/${TARGET_LIBC}…"
mkdir -p "$SHARP_TMP"
cp "$RUNTIME_DEPS_PACKAGE" "$SHARP_TMP/package.json"
cp "$RUNTIME_DEPS_LOCK" "$SHARP_TMP/package-lock.json"
(
  cd "$SHARP_TMP"
  npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    --os="$TARGET_OS" --cpu="$TARGET_CPU" --libc="$TARGET_LIBC" \
    >/dev/null
)
SHARP_SRC="$SHARP_TMP/node_modules/sharp"
IMG_SRC="$SHARP_TMP/node_modules/@img"
if [[ ! -d "$SHARP_SRC" ]]; then
  echo "ERROR: locked sharp npm ci failed" >&2
  exit 1
fi

# sharp's npm tree puts runtime deps (semver, detect-libc, …) as siblings, not inside sharp/
copy_sharp_into() {
  local dest_nm="$1"
  local pkg base
  mkdir -p "$dest_nm"
  rm -rf "$dest_nm/sharp"
  cp -R "$SHARP_SRC" "$dest_nm/sharp"
  if [[ -d "$IMG_SRC" ]]; then
    mkdir -p "$dest_nm/@img"
    shopt -s nullglob
    for pkg in "$IMG_SRC"/sharp-linux-* "$IMG_SRC"/sharp-libvips-linux-* "$IMG_SRC"/colour; do
      base="$(basename "$pkg")"
      rm -rf "$dest_nm/@img/$base"
      cp -R "$pkg" "$dest_nm/@img/$base"
    done
    shopt -u nullglob
  fi
  # Sibling deps required by sharp package resolution
  shopt -s nullglob
  for pkg in "$SHARP_TMP/node_modules"/*; do
    base="$(basename "$pkg")"
    case "$base" in
      sharp|@img|.bin|.* ) continue ;;
    esac
    if [[ -d "$pkg" || -f "$pkg" ]]; then
      rm -rf "$dest_nm/$base"
      cp -R "$pkg" "$dest_nm/$base"
    fi
  done
  shopt -u nullglob
}

# Place linux sharp only where require resolves after chdir(apps/ops).
# Avoid cloning natives into every .pnpm path (blows past Hostinger 50MB API).
copy_sharp_into "$STAGE/apps/ops/node_modules"
# Optional root fallback if something resolves from zip root
if [[ ! -e "$STAGE/node_modules/sharp" ]]; then
  copy_sharp_into "$STAGE/node_modules"
fi
cp "$RUNTIME_DEPS_LOCK" "$STAGE/runtime-package-lock.json"

# Drop darwin natives (dirs, files, and broken symlink stubs)
echo "==> Stripping darwin sharp/native stubs…"
while IFS= read -r -d '' d; do
  rm -rf "$d"
done < <(find "$STAGE/node_modules" "$STAGE/apps/ops/node_modules" \
  \( -name '*darwin*' -o -name '*Darwin*' \) -print0 2>/dev/null)

# Remove broken symlinks left after darwin strip / pnpm relocate
while IFS= read -r -d '' link; do
  rm -f "$link"
done < <(find "$STAGE/node_modules" "$STAGE/apps/ops/node_modules" -type l ! -e -print0 2>/dev/null || true)

# Rewrite absolute build-machine paths baked into standalone manifests
echo "==> Scrubbing absolute build paths from standalone manifests…"
python3 - "$ROOT" "$STAGE" <<'PY'
import os, sys
root = os.path.abspath(sys.argv[1])
stage = sys.argv[2]
# Prefer relative monorepo root marker over machine path
replacements = [
    (root, "."),
    (root + os.sep, "./"),
]
targets = []
for dirpath, _, files in os.walk(os.path.join(stage, "apps", "ops")):
    for name in files:
        if name in ("server.js", "required-server-files.json") or name.endswith(".json"):
            path = os.path.join(dirpath, name)
            # Limit rewrite surface: server entry + required-server-files + next config dumps
            base = os.path.basename(path)
            if base in ("server.js", "required-server-files.json") or "required-server-files" in base:
                targets.append(path)
for path in targets:
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except (OSError, UnicodeDecodeError):
        continue
    orig = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  scrubbed paths in {os.path.relpath(path, stage)}")
# Fail closed if machine home path still present in entry/config
home_marker = os.path.expanduser("~")
for path in targets:
    try:
        with open(path, "r", encoding="utf-8") as f:
            body = f.read()
    except OSError:
        continue
    if home_marker in body or "/Users/" in body or "/home/" in body:
        # Allow only if not our monorepo root leftovers under common home prefixes
        if root in body or "/Users/" in body:
            # After replace, leftover /Users/ is still bad
            if "/Users/" in body or root in body:
                print(f"ERROR: absolute path still present in {path}", file=sys.stderr)
                sys.exit(1)
PY

# Strip install bait: nested ops package.json must not list workspace:* deps
cat > "$STAGE/apps/ops/package.json" << 'OPSPKG'
{
  "name": "perfume-aura-ops-standalone-app",
  "private": true,
  "engines": {
    "node": ">=24.18.0 <25"
  },
  "scripts": {
    "start": "node server.js"
  }
}
OPSPKG

# Hostinger helper package.json — empty deps so install is a no-op
# Keep extracted node_modules on the server; a clean wipe + install would empty the tree.
cat > "$STAGE/package.json" << 'PKG'
{
  "name": "perfume-aura-ops-standalone",
  "private": true,
  "engines": {
    "node": ">=24.18.0 <25"
  },
  "dependencies": {},
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
  Node: 24.x (archive built and validated with 24.18.0)
  Root directory: ./
  Build command: echo prebuilt-standalone
  Package manager: pnpm (or npm)
  Output directory: (leave empty)
  Entry file: apps/ops/server.js

IMPORTANT:
  - Keep the extracted node_modules tree. Root package.json has empty deps on purpose
    (install no-op). Do NOT rm -rf node_modules && pnpm i on the server.
  - Portability comes from materialized apps/ops/node_modules (real dirs), not zip -y alone.

Required env (hPanel only — never bake into zip):
  DATABASE_URL=<Neon pooled production>
  BETTER_AUTH_SECRET=<openssl rand -base64 32>
  BETTER_AUTH_URL=https://app.perfumeaura.com
  SMTP_HOST=smtp.hostinger.com
  SMTP_PORT=465
  SMTP_SECURE=true
  SMTP_USER=<Hostinger mailbox>
  SMTP_PASSWORD=<mailbox password>
  SMTP_FROM=<approved sender>
  BUSINESS_TIMEZONE=Asia/Karachi
  NODE_ENV=production
  PORT=3000

Phase 07 staged rollout (run from the reviewed repository, outside this zip):
  Read the direct URL without echoing it, then reuse the exported value:
  read -rsp "Neon direct migration URL: " DATABASE_URL_DIRECT; printf "\n"
  export DATABASE_URL_DIRECT
  1. Apply only expansions through 0007:
  pnpm --filter @perfume-aura/db migrate:through-auth-expansion
  2. Verify the journal boundary:
  psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
    "SELECT (SELECT count(*) FROM drizzle.__drizzle_migrations), hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784912984473"
  Expect exactly:
  8|49bede137e6fd29d1c87a84170502e4f4e1329ab36521a9e37d2fc5f3d5dfa7f|1784912984473
  3. Upload/redeploy this compatible archive; require /api/health/ready = 200
     and /api/auth/get-session to be non-500 while the write freeze remains.
  test "$(curl -sS --connect-timeout 5 --max-time 15 -o /dev/null -w '%{http_code}' \
    https://app.perfumeaura.com/api/health/ready)" = "200"
  test "$(curl -sS --connect-timeout 5 --max-time 15 -o /dev/null -w '%{http_code}' \
    https://app.perfumeaura.com/api/auth/get-session)" != "500"
  4. Reconcile; every returned count must be zero:
  psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 \
    -f packages/db/sql/phase02-reconciliation.sql
  5. With only 0008 pending, apply the full official journal:
  pnpm db:migrate
  6. Verify the final journal:
  psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -AtF '|' -c \
    "SELECT (SELECT count(*) FROM drizzle.__drizzle_migrations), hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = 1784913049848"
  Expect exactly:
  9|3f7d6d86e395cfc2e996cdfe81c0820bb93b4dfd7b6c7cebe78d8ee239e45e56|1784913049848
  7. Only now seed MAIN and the owner:
  DATABASE_URL='<Neon pooled production>' pnpm --filter @perfume-aura/db seed
  DATABASE_URL='<Neon pooled production>' \
    BETTER_AUTH_SECRET='<same hPanel runtime secret>' \
    BETTER_AUTH_URL=https://app.perfumeaura.com \
    OWNER_EMAIL=… OWNER_PASSWORD=… \
    pnpm --filter @perfume-aura/ops seed:owner
  unset DATABASE_URL_DIRECT

Do NOT use root entry.cjs / flat server.js experiments.
Smoke: https://app.perfumeaura.com/login
       https://app.perfumeaura.com/api/auth/get-session  (not 500)
TXT

# The in-archive manifest is intentionally created before compression. It
# identifies the reviewed runtime contract without containing secrets. The
# external manifest created after compression adds the archive byte size and
# checksum without introducing a checksum/self-reference cycle.
node - \
  "$STAGE/artifact-manifest.json" \
  "$SOURCE_COMMIT" \
  "$SOURCE_DIRTY" \
  "$CURRENT_NODE_VERSION" \
  "$CURRENT_NPM_VERSION" \
  "$CURRENT_PNPM_VERSION" \
  "$RESOLVED_NEXT_VERSION" \
  "$RESOLVED_SHARP_VERSION" \
  "$RESOLVED_POSTCSS_VERSION" \
  "$RUNTIME_DEPS_LOCK_SHA256" \
  "$TARGET_OS" \
  "$TARGET_CPU" \
  "$TARGET_LIBC" <<'NODE'
const fs = require("node:fs");

const [
  output,
  sourceCommit,
  sourceDirty,
  nodeVersion,
  npmVersion,
  pnpmVersion,
  nextVersion,
  sharpVersion,
  postcssVersion,
  runtimeLockSha256,
  targetOs,
  targetCpu,
  targetLibc,
] = process.argv.slice(2);

const manifest = {
  schemaVersion: 2,
  source: {
    commit: sourceCommit,
    dirty: sourceDirty === "true",
  },
  runtime: {
    node: nodeVersion,
    npm: npmVersion,
    pnpm: pnpmVersion,
    next: nextVersion,
    sharp: sharpVersion,
    postcss: postcssVersion,
    target: {
      os: targetOs,
      cpu: targetCpu,
      libc: targetLibc,
    },
  },
  runtimeDependencyLock: {
    source: "scripts/ops-runtime-deps/package-lock.json",
    artifact: "runtime-package-lock.json",
    sha256: runtimeLockSha256,
  },
  entry: "apps/ops/server.js",
  requiredPaths: [
    "package.json",
    "runtime-package-lock.json",
    "apps/ops/server.js",
    "apps/ops/.next/static",
    "apps/ops/node_modules/next/package.json",
    "apps/ops/node_modules/sharp/package.json",
    "apps/ops/node_modules/@img/sharp-linux-x64",
    "apps/ops/node_modules/@img/sharp-libvips-linux-x64",
  ],
  forbiddenContent: [
    ".env and credential files",
    "source maps",
    "absolute build-machine home paths",
    "local-agent workspaces",
    "flat entry.cjs experiments",
  ],
};

fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

# Production archives do not need source maps. Removing all of them eliminates
# a class of accidental build-time value disclosure and makes the archive
# contract explicit rather than relying on content heuristics.
find "$STAGE" -type f -name '*.map' -delete

# Forbid secrets / credential files in stage
SECRET_FIND="$(find "$STAGE" -type f \( \
  -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' \
  -o -name 'id_rsa' -o -name 'id_ed25519' -o -name '.envrc' \
  -o -name '*credentials*.json' -o -name 'service-account*.json' \
  -o -path '*/.neon/*' \
\) 2>/dev/null || true)"
if [[ -n "$SECRET_FIND" ]]; then
  echo "ERROR: secret/credential files found in stage — refuse to pack" >&2
  echo "$SECRET_FIND" >&2
  exit 1
fi

LOCAL_AGENT_FIND="$(find "$STAGE" -type d \( \
  -name '.agents' -o -name '.claude' -o -name '.codex' \
  -o -name '.pi' -o -name '.pi-subagents' -o -name '.playwright-cli' \
\) 2>/dev/null || true)"
if [[ -n "$LOCAL_AGENT_FIND" ]]; then
  echo "ERROR: local-agent folders found in stage — refuse to pack" >&2
  echo "$LOCAL_AGENT_FIND" >&2
  exit 1
fi

# A random per-pack canary proves no build-time auth secret was serialized into
# the deployable tree. Do this after all staged text files are created.
if LC_ALL=C grep -R -a -F -l -- "$BUILD_ONLY_AUTH_SECRET" "$STAGE" \
  >/dev/null 2>&1; then
  echo "ERROR: build-only auth canary was embedded in the staged archive" >&2
  exit 1
fi
echo "stage-secret-scan: build-only auth canary absent"
unset BUILD_ONLY_AUTH_SECRET

# Package-manager command shims are not needed by the prebuilt runtime and can
# embed absolute build-machine shebangs. Remove every nested .bin tree before
# enforcing the no-absolute-home-path archive contract.
while IFS= read -r -d '' bin_dir; do
  rm -rf "$bin_dir"
done < <(
  find "$STAGE/node_modules" "$STAGE/apps/ops/node_modules" \
    -type d -name '.bin' -print0 2>/dev/null
)

if LC_ALL=C grep -R -a -F -l -- "$ROOT" "$STAGE" >/dev/null 2>&1; then
  echo "ERROR: absolute repository path found in staged archive" >&2
  exit 1
fi

# Sharp is packed for TARGET_OS (linux on Hostinger). Local Mac cannot dlopen linux
# natives — so require('sharp') only when host matches target; otherwise verify tree.
smoke_package_versions() {
  local root="$1" label="$2"
  (
    cd "$root"
    node - "$EXPECTED_NEXT_VERSION" "$EXPECTED_SHARP_VERSION" "$EXPECTED_POSTCSS_VERSION" "$label" <<'NODE'
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");

const [expectedNext, expectedSharp, expectedPostcss, label] = process.argv.slice(2);
const nextVersion = require("next/package.json").version;
const fromNext = createRequire(require.resolve("next/package.json"));
const postcssVersion = fromNext("postcss/package.json").version;
let sharpRoot = path.dirname(require.resolve("sharp"));
let sharpVersion;
while (sharpRoot !== path.dirname(sharpRoot)) {
  const manifest = path.join(sharpRoot, "package.json");
  if (fs.existsSync(manifest)) {
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    if (pkg.name === "sharp") {
      sharpVersion = pkg.version;
      break;
    }
  }
  sharpRoot = path.dirname(sharpRoot);
}
if (!sharpVersion) {
  throw new Error(`${label}: cannot locate sharp package.json`);
}

const expected = {
  next: expectedNext,
  sharp: expectedSharp,
  postcss: expectedPostcss,
};
const actual = {
  next: nextVersion,
  sharp: sharpVersion,
  postcss: postcssVersion,
};

for (const name of Object.keys(expected)) {
  if (actual[name] !== expected[name]) {
    throw new Error(
      `${label}: expected ${name}@${expected[name]}, found ${actual[name]}`,
    );
  }
}

console.log(
  `${label}: package versions ok (next=${nextVersion}, sharp=${sharpVersion}, postcss=${postcssVersion})`,
);
NODE
  )
}

smoke_sharp_tree() {
  local root="$1" label="$2"
  local nm="$root/node_modules"
  test -f "$nm/sharp/package.json"
  test -d "$nm/semver" || test -f "$nm/semver/package.json"
  test -d "$nm/detect-libc" || test -f "$nm/detect-libc/package.json"
  # linux Hostinger target must ship @img linux binaries
  if [[ "$TARGET_OS" == "linux" ]]; then
    shopt -s nullglob
    local imgs=( "$nm"/@img/sharp-linux-* "$nm"/@img/sharp-libvips-linux-* )
    shopt -u nullglob
    if [[ "${#imgs[@]}" -lt 1 ]]; then
      echo "ERROR: ${label}: missing @img/sharp-linux-* natives for Hostinger" >&2
      return 1
    fi
  fi
  local host_os
  case "$(uname -s)" in
    Linux*) host_os=linux ;;
    Darwin*) host_os=darwin ;;
    *) host_os=other ;;
  esac
  if [[ "$host_os" == "$TARGET_OS" ]]; then
    (
      cd "$root"
      node -e "require('sharp'); console.log('${label}: sharp native ok')"
    )
  else
    echo "${label}: sharp tree ok (skip native require; host=${host_os} target=${TARGET_OS})"
  fi
}

echo "==> Stage smoke (next + sharp + static from apps/ops)…"
(
  cd "$STAGE/apps/ops"
  test -f server.js
  test -d node_modules/next
  test -d .next/static
  node -e "require('next'); require('next/dist/shared/lib/constants'); console.log('stage-smoke: next ok')"
)
smoke_package_versions "$STAGE/apps/ops" "stage-smoke"
smoke_sharp_tree "$STAGE/apps/ops" "stage-smoke"

echo "==> Pruning stage bloat for portable manual upload…"
# Safe deletes only — do not strip runtime .js/.node
find "$STAGE/node_modules" "$STAGE/apps/ops/node_modules" -type f \( \
  -name '*.map' -o -name '*.md' -o -name '*.markdown' \
  -o -name 'LICENSE' -o -name 'LICENSE.txt' -o -name 'LICENSE.md' \
  -o -name 'CHANGELOG' -o -name 'CHANGELOG.md' -o -name 'README.md' \
\) -delete 2>/dev/null || true
# Common non-runtime test/example trees inside dependencies
find "$STAGE/node_modules" "$STAGE/apps/ops/node_modules" -type d \( \
  -name 'test' -o -name 'tests' -o -name '__tests__' -o -name 'docs' \
  -o -name 'examples' -o -name 'example' -o -name '.github' \
\) -print0 2>/dev/null | while IFS= read -r -d '' d; do
  rm -rf "$d"
done || true

echo "==> Creating candidate archive in isolated workspace…"
(
  cd "$STAGE"
  # -y keeps remaining symlinks as links; primary portability = materialize above
  # -X removes host-specific extra fields from the archive.
  zip -qry9X "$CANDIDATE_ZIP_PATH" .
)

echo "==> Zip extract smoke…"
unzip -q "$CANDIDATE_ZIP_PATH" -d "$VERIFY"
ARCHIVE_PATHS="$(unzip -Z1 "$CANDIDATE_ZIP_PATH")"
if printf '%s\n' "$ARCHIVE_PATHS" | grep -E '(^|/)\.env(\.|$)|(^|/)\.envrc$|(^|/)entry\.cjs$|\.pem$|\.key$|\.map$|(^|/)id_rsa$|(^|/)id_ed25519$|(^|/)\.(agents|claude|codex|pi|pi-subagents|playwright-cli)(/|$)'; then
  echo "ERROR: zip contains forbidden secret/entry paths" >&2
  rm -rf "$VERIFY"
  exit 1
fi
if printf '%s\n' "$ARCHIVE_PATHS" | grep -E '/Users/|/home/[^/]+/Documents' >/dev/null; then
  # Soft warn: binary content can false-positive; hard-fail only entry manifests
  if grep -R -l -E '/Users/|/home/' "$VERIFY/apps/ops/server.js" \
      "$VERIFY/apps/ops/.next/required-server-files.json" 2>/dev/null | grep -q .; then
    echo "ERROR: zip entry still embeds absolute home paths" >&2
    rm -rf "$VERIFY"
    exit 1
  fi
fi
(
  cd "$VERIFY/apps/ops"
  test -f server.js
  test -d node_modules/next
  test -d .next/static
  # Prefer real dir (materialize); fail if next is a broken symlink
  if [[ -L node_modules/next ]] && [[ ! -e node_modules/next ]]; then
    echo "ERROR: apps/ops/node_modules/next is a broken symlink" >&2
    exit 1
  fi
  node -e "require('next'); require('next/dist/shared/lib/constants'); console.log('zip-smoke: next ok')"
)
smoke_package_versions "$VERIFY/apps/ops" "zip-smoke"
smoke_sharp_tree "$VERIFY/apps/ops" "zip-smoke"

BYTES="$(wc -c < "$CANDIDATE_ZIP_PATH" | tr -d ' ')"
if [[ "$BYTES" -gt "$MAX_ARCHIVE_BYTES" ]]; then
  echo "ERROR: archive is ${BYTES} bytes; Hostinger ceiling is ${MAX_ARCHIVE_BYTES} bytes" >&2
  rm -rf "$VERIFY"
  exit 1
fi

ARCHIVE_SHA256="$(sha256_file "$CANDIDATE_ZIP_PATH")"
printf '%s  %s\n' "$ARCHIVE_SHA256" "$ZIP_NAME" > "$CANDIDATE_CHECKSUM_PATH"
if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$CANDIDATE_DIR"
    sha256sum --check "$(basename "$CANDIDATE_CHECKSUM_PATH")"
  )
else
  (
    cd "$CANDIDATE_DIR"
    shasum -a 256 -c "$(basename "$CANDIDATE_CHECKSUM_PATH")"
  )
fi

node - \
  "$VERIFY/artifact-manifest.json" \
  "$CANDIDATE_MANIFEST_PATH" \
  "$ZIP_NAME" \
  "$BYTES" \
  "$ARCHIVE_SHA256" <<'NODE'
const fs = require("node:fs");

const [internalPath, outputPath, archiveFile, archiveBytes, archiveSha256] =
  process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(internalPath, "utf8"));
manifest.archive = {
  file: archiveFile,
  bytes: Number(archiveBytes),
  sha256: archiveSha256,
  checksumFile: `${archiveFile}.sha256`,
};
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

node - \
  "$VERIFY" \
  "$CANDIDATE_MANIFEST_PATH" \
  "$EXPECTED_NODE_VERSION" \
  "$EXPECTED_NPM_VERSION" \
  "$EXPECTED_PNPM_VERSION" \
  "$EXPECTED_NEXT_VERSION" \
  "$EXPECTED_SHARP_VERSION" \
  "$EXPECTED_POSTCSS_VERSION" \
  "$RUNTIME_DEPS_LOCK_SHA256" \
  "$SOURCE_COMMIT" \
  "$ZIP_NAME" \
  "$BYTES" \
  "$ARCHIVE_SHA256" <<'NODE'
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const [
  extractedRoot,
  externalManifestPath,
  expectedNode,
  expectedNpm,
  expectedPnpm,
  expectedNext,
  expectedSharp,
  expectedPostcss,
  expectedRuntimeLockSha256,
  expectedCommit,
  expectedArchive,
  expectedBytes,
  expectedSha256,
] = process.argv.slice(2);

const internal = JSON.parse(
  fs.readFileSync(path.join(extractedRoot, "artifact-manifest.json"), "utf8"),
);
const external = JSON.parse(fs.readFileSync(externalManifestPath, "utf8"));

assert.equal(internal.schemaVersion, 2);
assert.equal(internal.source.commit, expectedCommit);
assert.equal(typeof internal.source.dirty, "boolean");
assert.deepEqual(internal.runtime, {
  node: expectedNode,
  npm: expectedNpm,
  pnpm: expectedPnpm,
  next: expectedNext,
  sharp: expectedSharp,
  postcss: expectedPostcss,
  target: { os: "linux", cpu: "x64", libc: "glibc" },
});
assert.deepEqual(internal.runtimeDependencyLock, {
  source: "scripts/ops-runtime-deps/package-lock.json",
  artifact: "runtime-package-lock.json",
  sha256: expectedRuntimeLockSha256,
});
assert.equal(
  require("node:crypto")
    .createHash("sha256")
    .update(fs.readFileSync(path.join(extractedRoot, "runtime-package-lock.json")))
    .digest("hex"),
  expectedRuntimeLockSha256,
);
assert.equal(internal.entry, "apps/ops/server.js");
for (const required of internal.requiredPaths) {
  assert.ok(
    fs.existsSync(path.join(extractedRoot, required)),
    `manifest-required path missing: ${required}`,
  );
}
assert.deepEqual(external.source, internal.source);
assert.deepEqual(external.runtime, internal.runtime);
assert.deepEqual(
  external.runtimeDependencyLock,
  internal.runtimeDependencyLock,
);
assert.deepEqual(external.requiredPaths, internal.requiredPaths);
assert.deepEqual(external.archive, {
  file: expectedArchive,
  bytes: Number(expectedBytes),
  sha256: expectedSha256,
  checksumFile: `${expectedArchive}.sha256`,
});
console.log("zip-smoke: manifest and checksum metadata ok");
NODE

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  echo "==> Validating disposable PostgreSQL smoke target…"
  if ! TEST_DATABASE_URL="$TEST_DATABASE_URL" \
    pnpm --filter @perfume-aura/db exec tsx -e \
      'import { requireDisposableTestDatabaseUrl } from "./src/test-database-guard.ts"; requireDisposableTestDatabaseUrl();'; then
    echo "ERROR: refusing extracted-server smoke against an unsafe TEST_DATABASE_URL" >&2
    rm -rf "$VERIFY"
    exit 1
  fi
  echo "==> Starting extracted server against disposable PostgreSQL…"
  SMOKE_PORT="${STANDALONE_SMOKE_PORT:-3210}"
  if [[ ! "$SMOKE_PORT" =~ ^[0-9]+$ ]] || [[ "$SMOKE_PORT" -lt 1024 ]] || [[ "$SMOKE_PORT" -gt 65535 ]]; then
    echo "ERROR: STANDALONE_SMOKE_PORT must be an unprivileged TCP port" >&2
    exit 1
  fi
  SMOKE_AUTH_SECRET="$(
    node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64'))"
  )"
  (
    cd "$VERIFY"
    DATABASE_URL="$TEST_DATABASE_URL" \
    BETTER_AUTH_SECRET="$SMOKE_AUTH_SECRET" \
    BETTER_AUTH_URL="https://app.perfumeaura.com" \
    NEXT_PUBLIC_BETTER_AUTH_URL="https://app.perfumeaura.com" \
    BUSINESS_TIMEZONE="Asia/Karachi" \
    NODE_ENV="production" \
    HOSTNAME="127.0.0.1" \
    PORT="$SMOKE_PORT" \
      node apps/ops/server.js
  ) >"$SMOKE_LOG" 2>&1 &
  SMOKE_PID=$!

  SERVER_READY="false"
  for _ in $(seq 1 60); do
    if ! kill -0 "$SMOKE_PID" 2>/dev/null; then
      break
    fi
    if curl -fsS --connect-timeout 1 --max-time 3 \
      "http://127.0.0.1:${SMOKE_PORT}/api/health/live" >/dev/null 2>&1; then
      SERVER_READY="true"
      break
    fi
    sleep 1
  done
  if [[ "$SERVER_READY" != "true" ]]; then
    echo "ERROR: extracted server did not become ready" >&2
    sed -n '1,120p' "$SMOKE_LOG" >&2
    exit 1
  fi

  for path in /login /api/health/ready /api/auth/get-session; do
    if ! STATUS="$(
      curl -sS --connect-timeout 2 --max-time 5 -o /dev/null \
        -w '%{http_code}' "http://127.0.0.1:${SMOKE_PORT}${path}"
    )"; then
      echo "ERROR: standalone server smoke ${path} request failed" >&2
      sed -n '1,120p' "$SMOKE_LOG" >&2
      exit 1
    fi
    if [[ "$STATUS" != "200" ]]; then
      echo "ERROR: standalone server smoke ${path} returned ${STATUS}, expected 200" >&2
      sed -n '1,120p' "$SMOKE_LOG" >&2
      exit 1
    fi
    echo "server-smoke: ${path} -> ${STATUS}"
  done

  STATIC_ASSET_RELATIVE="$(
    cd "$VERIFY/apps/ops/.next/static"
    find . -type f -print | LC_ALL=C sort | sed -n '1p'
  )"
  if [[ -z "$STATIC_ASSET_RELATIVE" ]]; then
    echo "ERROR: standalone server smoke found no Next static asset" >&2
    exit 1
  fi
  STATIC_ASSET_PATH="/_next/static/${STATIC_ASSET_RELATIVE#./}"
  if ! STATUS="$(
    curl -sS --connect-timeout 2 --max-time 5 -o /dev/null \
      -w '%{http_code}' "http://127.0.0.1:${SMOKE_PORT}${STATIC_ASSET_PATH}"
  )"; then
    echo "ERROR: standalone static asset request failed: ${STATIC_ASSET_PATH}" >&2
    sed -n '1,120p' "$SMOKE_LOG" >&2
    exit 1
  fi
  if [[ "$STATUS" != "200" ]]; then
    echo "ERROR: standalone static asset ${STATIC_ASSET_PATH} returned ${STATUS}, expected 200" >&2
    sed -n '1,120p' "$SMOKE_LOG" >&2
    exit 1
  fi
  echo "server-smoke: ${STATIC_ASSET_PATH} -> ${STATUS}"

  kill "$SMOKE_PID" 2>/dev/null || true
  wait "$SMOKE_PID" 2>/dev/null || true
  SMOKE_PID=""
  unset SMOKE_AUTH_SECRET
elif [[ "${STANDALONE_REQUIRE_SERVER_SMOKE:-0}" == "1" ]]; then
  echo "ERROR: STANDALONE_REQUIRE_SERVER_SMOKE=1 requires TEST_DATABASE_URL" >&2
  exit 1
else
  echo "server-smoke: not requested (set guarded TEST_DATABASE_URL to enable)"
fi

# Publish only after every candidate gate passes. The workspace lives inside
# OUT_DIR, so each rename is atomic on the same filesystem. Sidecars are made
# visible first and the deployable ZIP last.
refuse_existing_outputs
mv "$CANDIDATE_MANIFEST_PATH" "$MANIFEST_PATH"
PUBLISHED_MANIFEST="true"
mv "$CANDIDATE_CHECKSUM_PATH" "$CHECKSUM_PATH"
PUBLISHED_CHECKSUM="true"
mv "$CANDIDATE_ZIP_PATH" "$ZIP_PATH"
PUBLISHED_ZIP="true"
PUBLISH_COMPLETE="true"

echo "==> Done: $ZIP_PATH ($BYTES bytes, sha256=$ARCHIVE_SHA256)"
echo "    Entry file: apps/ops/server.js"
echo "    Build cmd:  echo prebuilt-standalone"
echo "    Manifest:   $MANIFEST_PATH"
echo "    Checksum:   $CHECKSUM_PATH"
echo "    Keep server node_modules (do not clean-install empty root deps)"
ls -lh "$ZIP_PATH" "$CHECKSUM_PATH" "$MANIFEST_PATH"
