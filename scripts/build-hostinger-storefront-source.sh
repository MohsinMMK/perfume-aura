#!/usr/bin/env bash
# Build a self-contained storefront tree from a Hostinger Git checkout.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED_PNPM="11.25.0"
EXPECTED_SHARP="0.35.3"
OUTPUT_DIR="$ROOT/.hostinger/storefront"
RUNTIME_DEPS_DIR="$ROOT/scripts/ops-runtime-deps"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

verify_repository_contract() {
  node - <<'NODE'
const assert = require("node:assert/strict");
const fs = require("node:fs");
const rootPackage = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(rootPackage.packageManager, "pnpm@11.25.0");
assert.equal(rootPackage.scripts.build, "corepack pnpm hostinger:build:storefront");
assert.equal(
  rootPackage.scripts["hostinger:build:storefront"],
  "bash scripts/build-hostinger-storefront-source.sh",
);
const nextConfig = fs.readFileSync("apps/storefront/next.config.ts", "utf8");
assert.match(nextConfig, /output:\s*["']standalone["']/);
assert.match(nextConfig, /STANDALONE_SOURCE_COMMIT/);
NODE

  local forbidden_tracked
  forbidden_tracked="$(
    git ls-files -z | while IFS= read -r -d '' tracked_path; do
      case "$(basename "$tracked_path")" in
        .env|.env.local|.env.production|*.pem|*.key|*credentials*.json|service-account*.json)
          printf '%s\n' "$tracked_path"
          ;;
      esac
    done
  )"
  [[ -z "$forbidden_tracked" ]] || fail "secret-shaped tracked files found: $forbidden_tracked"
}

if [[ "${1:-}" == "self-test" ]]; then
  verify_repository_contract
  echo "hostinger-storefront-source self-test ok"
  exit 0
fi
[[ $# -eq 0 ]] || fail "Usage: build-hostinger-storefront-source.sh [self-test]"

verify_repository_contract
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == "24" ]] || fail "Hostinger storefront build requires Node 24.x"
[[ "$(corepack pnpm@"$EXPECTED_PNPM" --version)" == "$EXPECTED_PNPM" ]] || fail "Hostinger storefront build requires pnpm $EXPECTED_PNPM"
[[ "$(node -p 'process.platform')" == "linux" ]] || fail "Hostinger storefront output must be built on Linux"
[[ "$(node -p 'process.arch')" == "x64" ]] || fail "Hostinger storefront output must target linux/x64"
node -e 'const report=process.report?.getReport();if(!report?.header?.glibcVersionRuntime)process.exit(1)' || fail "Hostinger storefront output requires glibc"
[[ -f "$RUNTIME_DEPS_DIR/package.json" && -f "$RUNTIME_DEPS_DIR/package-lock.json" ]] || fail "locked Sharp runtime inputs are missing"

SOURCE_COMMIT="$(git rev-parse HEAD)"
[[ "$SOURCE_COMMIT" =~ ^[0-9a-f]{40}$ ]] || fail "Git checkout does not have a full source commit"
PROVIDER_TRACKED_DRIFT="$(git status --porcelain --untracked-files=no)"
if [[ "$ROOT" == */hbuilds/source/repository &&
      "${NPM_CONFIG_IGNORE_SCRIPTS:-}" == "true" &&
      "$PROVIDER_TRACKED_DRIFT" == " M pnpm-lock.yaml" ]]; then
  echo "==> Restoring pnpm 11 lockfile syntax after Hostinger's pnpm 10 preinstall"
  git restore --source=HEAD --worktree -- pnpm-lock.yaml
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "tracked source files are dirty before the Hostinger build"
fi

echo "==> Installing the locked pnpm workspace"
corepack pnpm@"$EXPECTED_PNPM" install --frozen-lockfile
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "frozen install changed tracked source files"

echo "==> Building @perfume-aura/storefront from $SOURCE_COMMIT"
NEXT_PHASE=phase-production-build \
STOREFRONT_URL="${STOREFRONT_URL:-https://perfumeaura.com}" \
CUSTOMER_AUTH_URL="${CUSTOMER_AUTH_URL:-https://perfumeaura.com}" \
STOREFRONT_CUSTOMER_AUTH_ENABLED="${STOREFRONT_CUSTOMER_AUTH_ENABLED:-false}" \
STOREFRONT_PREVIEW_CATALOG="${STOREFRONT_PREVIEW_CATALOG:-false}" \
STOREFRONT_PUBLIC_RELEASE="${STOREFRONT_PUBLIC_RELEASE:-false}" \
STOREFRONT_CHECKOUT_RELEASE_APPROVED="${STOREFRONT_CHECKOUT_RELEASE_APPROVED:-false}" \
STOREFRONT_INQUIRIES_ENABLED="${STOREFRONT_INQUIRIES_ENABLED:-false}" \
STANDALONE_SOURCE_COMMIT="$SOURCE_COMMIT" \
  corepack pnpm@"$EXPECTED_PNPM" --filter @perfume-aura/storefront build

STANDALONE="$ROOT/apps/storefront/.next/standalone"
APP_ROOT="$STANDALONE/apps/storefront"
[[ -f "$APP_ROOT/server.js" ]] || fail "standalone storefront server.js is missing"
[[ -d "$ROOT/apps/storefront/.next/static" ]] || fail "storefront static output is missing"

WORK_DIR="$(mktemp -d "$ROOT/.hostinger-storefront-build.XXXXXX")"
STAGE="$WORK_DIR/stage"
SHARP_TMP="$WORK_DIR/sharp"
SERVER_PID=""
cleanup() {
  local status=$?
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf -- "$WORK_DIR"
  exit "$status"
}
trap cleanup EXIT HUP INT TERM
mkdir -p "$STAGE" "$SHARP_TMP"

# Hostinger moves the selected output directory after the build, so materialize
# pnpm links and make the standalone tree independent from the checkout.
while IFS= read -r -d '' traced_link; do
  [[ -e "$traced_link" ]] || rm -f -- "$traced_link"
done < <(find "$STANDALONE" -type l -print0)
cp -RL "$STANDALONE"/. "$STAGE"/
mkdir -p "$STAGE/apps/storefront/.next"
rm -rf -- "$STAGE/apps/storefront/.next/static" "$STAGE/apps/storefront/public"
cp -R "$ROOT/apps/storefront/.next/static" "$STAGE/apps/storefront/.next/static"
cp -R "$ROOT/apps/storefront/public" "$STAGE/apps/storefront/public"

NEXT_NEIGHBORHOOD=""
while IFS= read -r candidate; do
  if [[ -f "$candidate/next/package.json" ]]; then
    NEXT_NEIGHBORHOOD="$candidate"
    break
  fi
done < <(find "$STAGE/node_modules/.pnpm" -mindepth 2 -maxdepth 2 -type d -path '*/next@*/node_modules' | sort)
[[ -n "$NEXT_NEIGHBORHOOD" ]] || fail "Next dependency neighborhood is missing"
mkdir -p "$STAGE/apps/storefront/node_modules"
for dependency in "$NEXT_NEIGHBORHOOD"/*; do
  [[ -e "$dependency" ]] || continue
  dependency_name="$(basename "$dependency")"
  rm -rf -- "$STAGE/apps/storefront/node_modules/$dependency_name"
  cp -RL "$dependency" "$STAGE/apps/storefront/node_modules/$dependency_name"
done
if [[ -d "$STAGE/node_modules/.pnpm/node_modules" ]]; then
  for dependency in "$STAGE/node_modules/.pnpm/node_modules"/*; do
    [[ -e "$dependency" ]] || continue
    dependency_name="$(basename "$dependency")"
    if [[ ! -e "$STAGE/apps/storefront/node_modules/$dependency_name" ]]; then
      cp -RL "$dependency" "$STAGE/apps/storefront/node_modules/$dependency_name"
    fi
  done
fi

echo "==> Installing the locked Linux x64/glibc Sharp runtime"
cp "$RUNTIME_DEPS_DIR/package.json" "$SHARP_TMP/package.json"
cp "$RUNTIME_DEPS_DIR/package-lock.json" "$SHARP_TMP/package-lock.json"
(
  cd "$SHARP_TMP"
  npm ci --omit=dev --ignore-scripts --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc >/dev/null
)
[[ "$(node -p "require('$SHARP_TMP/node_modules/sharp/package.json').version")" == "$EXPECTED_SHARP" ]] || fail "locked Sharp version mismatch"

while IFS= read -r -d '' traced_sharp_platform_directory; do
  rm -rf -- "$traced_sharp_platform_directory"
done < <(
  find "$STAGE" -type d \
    \( -name 'sharp-*-*' -o -name 'sharp-libvips-*-*' \
       -o -name '@img+sharp-*@*' -o -name '@img+sharp-libvips-*@*' \) \
    -prune -print0
)
for destination in "$STAGE/apps/storefront/node_modules" "$STAGE/node_modules"; do
  mkdir -p "$destination"
  rm -rf -- "$destination/sharp" "$destination/@img"
  cp -R "$SHARP_TMP/node_modules/sharp" "$destination/sharp"
  mkdir -p "$destination/@img"
  for runtime_package in sharp-linux-x64 sharp-libvips-linux-x64 colour; do
    runtime_source="$SHARP_TMP/node_modules/@img/$runtime_package"
    [[ -e "$runtime_source" ]] || fail "locked Sharp runtime is missing $runtime_package"
    cp -R "$runtime_source" "$destination/@img/$runtime_package"
  done
  for dependency_name in detect-libc semver; do
    if [[ -e "$SHARP_TMP/node_modules/$dependency_name" ]]; then
      rm -rf -- "$destination/$dependency_name"
      cp -R "$SHARP_TMP/node_modules/$dependency_name" "$destination/$dependency_name"
    fi
  done
done

node - "$STAGE" "$EXPECTED_SHARP" <<'NODE'
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const [stage, expectedSharp] = process.argv.slice(2);
const requireFromServer = createRequire(path.join(stage, "apps/storefront/server.js"));
const sharp = requireFromServer("sharp");
assert.equal(sharp.versions.sharp, expectedSharp);
assert.ok(sharp.versions.vips, "Sharp did not load its Linux libvips runtime");
NODE

cat > "$STAGE/package.json" <<'JSON'
{
  "name": "perfume-aura-storefront-hostinger-source",
  "private": true,
  "engines": { "node": ">=24.6.0 <25" },
  "scripts": { "start": "node apps/storefront/server.js" }
}
JSON

node - "$STAGE/source-manifest.json" "$SOURCE_COMMIT" "$EXPECTED_PNPM" "$EXPECTED_SHARP" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const [outputPath, commit, pnpmVersion, sharpVersion] = process.argv.slice(2);
const requireFromServer = createRequire(path.join(path.dirname(outputPath), "apps/storefront/server.js"));
const manifest = {
  schemaVersion: 1,
  application: "@perfume-aura/storefront",
  source: { type: "git", commit, dirty: false },
  runtime: {
    node: process.versions.node,
    pnpm: pnpmVersion,
    next: requireFromServer("next/package.json").version,
    sharp: sharpVersion,
    target: { os: "linux", cpu: "x64", libc: "glibc" },
  },
  entry: "apps/storefront/server.js",
  secretsIncluded: false,
};
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

find "$STAGE" -type f -name '*.map' -delete
while IFS= read -r -d '' bin_directory; do rm -rf -- "$bin_directory"; done < <(find "$STAGE" -type d -name '.bin' -print0)
if find "$STAGE" -type l -print -quit | grep -q .; then fail "Hostinger output contains symlinks"; fi
FORBIDDEN_OUTPUT="$(find "$STAGE" -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o -name '*credentials*.json' -o -name 'service-account*.json' \) -print)"
[[ -z "$FORBIDDEN_OUTPUT" ]] || fail "secret-shaped files found in Hostinger output"
for required_path in apps/storefront/server.js apps/storefront/.next/static apps/storefront/public apps/storefront/node_modules/next/package.json apps/storefront/node_modules/sharp/package.json apps/storefront/node_modules/@img/sharp-linux-x64 apps/storefront/node_modules/@img/sharp-libvips-linux-x64 source-manifest.json; do
  [[ -e "$STAGE/$required_path" ]] || fail "Hostinger output is missing $required_path"
done

PORT="$(node -e 'const net=require("node:net");const server=net.createServer();server.listen(0,"127.0.0.1",()=>{console.log(server.address().port);server.close()})')"
(cd "$STAGE" && NODE_ENV=production HOSTNAME=127.0.0.1 PORT="$PORT" node apps/storefront/server.js > "$WORK_DIR/server.log" 2>&1) &
SERVER_PID=$!
for _ in {1..40}; do
  if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/" >/dev/null; then break; fi
  sleep 0.25
done
curl -fsS --max-time 5 "http://127.0.0.1:$PORT/" >/dev/null || { cat "$WORK_DIR/server.log" >&2; fail "Hostinger storefront smoke failed"; }
node - "http://127.0.0.1:$PORT" "$SOURCE_COMMIT" <<'NODE'
const assert = require("node:assert/strict");
const [baseUrl, commit] = process.argv.slice(2);
Promise.all([fetch(`${baseUrl}/api/health/version`), fetch(`${baseUrl}/`)]).then(async ([version, root]) => {
  assert.equal(version.status, 200);
  assert.deepEqual(await version.json(), { status: "ok", commit });
  assert.equal(root.status, 200);
  assert.match(await root.text(), new RegExp(`data-perfume-aura-release=["']${commit}["']`));
}).catch((error) => { console.error(error); process.exitCode = 1; });
NODE
STATIC_ASSET="$(find "$STAGE/apps/storefront/.next/static" -type f -print -quit)"
[[ -n "$STATIC_ASSET" ]] || fail "Hostinger storefront output has no static asset"
STATIC_PATH="${STATIC_ASSET#"$STAGE/apps/storefront/.next/static/"}"
curl -fsS --max-time 5 "http://127.0.0.1:$PORT/_next/static/$STATIC_PATH" >/dev/null
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "Hostinger build changed tracked source files"

mkdir -p "$(dirname "$OUTPUT_DIR")"
rm -rf -- "$OUTPUT_DIR"
mv "$STAGE" "$OUTPUT_DIR"
echo "hostinger-storefront-source: passed source=$SOURCE_COMMIT output=.hostinger/storefront"
