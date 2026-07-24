#!/usr/bin/env bash
# Path B — deploy prebuilt ops standalone zip to Hostinger Node Web App via official API.
#
# Uses: POST /api/hosting/v1/accounts/{user}/websites/{domain}/nodejs/builds/from-archive
# Overrides force Path Z settings (no monorepo source build on shared Node):
#   entry_file=apps/ops/server.js
#   build_script=echo prebuilt-standalone
#   node_version=20
#
# Required env:
#   HOSTINGER_API_TOKEN   — hPanel API token (never commit)
# Optional env:
#   HOSTINGER_USERNAME    — default u602723373
#   HOSTINGER_OPS_DOMAIN  — default app.perfumeaura.com
#   OPS_ZIP               — path to zip (default: newest dist/perfume-aura-standalone_*.zip)
#   HOSTINGER_API_BASE    — default https://developers.hostinger.com
#   POLL_SECONDS          — default 15
#   POLL_MAX              — default 40 (~10 min)
#
# Usage:
#   HOSTINGER_API_TOKEN=… pnpm ops:deploy
#   HOSTINGER_API_TOKEN=… OPS_ZIP=dist/….zip bash scripts/deploy-ops-hostinger.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_BASE="${HOSTINGER_API_BASE:-https://developers.hostinger.com}"
USERNAME="${HOSTINGER_USERNAME:-u602723373}"
DOMAIN="${HOSTINGER_OPS_DOMAIN:-app.perfumeaura.com}"
POLL_SECONDS="${POLL_SECONDS:-15}"
POLL_MAX="${POLL_MAX:-40}"
# Hostinger from-archive hard limit
MAX_BYTES=$((50 * 1024 * 1024))

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "ERROR: HOSTINGER_API_TOKEN is required" >&2
  exit 1
fi

if [[ -n "${OPS_ZIP:-}" ]]; then
  ZIP_PATH="$OPS_ZIP"
else
  ZIP_PATH="$(ls -1t "$ROOT"/dist/perfume-aura-standalone_*.zip 2>/dev/null | head -1 || true)"
fi

if [[ -z "$ZIP_PATH" || ! -f "$ZIP_PATH" ]]; then
  echo "ERROR: no ops zip found. Run pnpm ops:pack first or set OPS_ZIP=…" >&2
  exit 1
fi

BYTES="$(wc -c < "$ZIP_PATH" | tr -d ' ')"
if [[ "$BYTES" -gt "$MAX_BYTES" ]]; then
  echo "ERROR: zip is ${BYTES} bytes > Hostinger 50MB from-archive limit" >&2
  exit 1
fi

echo "==> Deploy Path Z zip → Hostinger Node"
echo "    zip:    $ZIP_PATH ($BYTES bytes)"
echo "    user:   $USERNAME"
echo "    domain: $DOMAIN"
echo "    entry:  apps/ops/server.js"
echo "    build:  echo prebuilt-standalone"

AUTH_HDR=( -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" -H "Accept: application/json" )
URL="${API_BASE}/api/hosting/v1/accounts/${USERNAME}/websites/${DOMAIN}/nodejs/builds/from-archive"

# Multipart upload + Path Z overrides
RESP_FILE="$(mktemp)"
HTTP_CODE="$(
  curl -sS -o "$RESP_FILE" -w '%{http_code}' \
    "${AUTH_HDR[@]}" \
    -X POST "$URL" \
    -F "archive=@${ZIP_PATH};type=application/zip" \
    -F "entry_file=apps/ops/server.js" \
    -F "build_script=echo prebuilt-standalone" \
    -F "node_version=20" \
    -F "package_manager=pnpm" \
    -F "root_directory=./"
)"

echo "    HTTP $HTTP_CODE"
python3 - <<'PY' "$RESP_FILE"
import json,sys
path=sys.argv[1]
raw=open(path,encoding="utf-8").read().strip()
print(raw[:2000] if raw else "(empty body)")
try:
    data=json.loads(raw) if raw else {}
except json.JSONDecodeError:
    sys.exit(0)
# common shapes: {uuid}, {data:{uuid}}, {build:{uuid}}
uid=None
if isinstance(data, dict):
    uid=data.get("uuid") or data.get("id")
    for k in ("data","build","result"):
        v=data.get(k)
        if isinstance(v, dict):
            uid=uid or v.get("uuid") or v.get("id")
if uid:
    open("/tmp/pa-build-uuid.txt","w",encoding="utf-8").write(str(uid))
    print(f"BUILD_UUID={uid}")
PY

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" && "$HTTP_CODE" != "202" ]]; then
  echo "ERROR: from-archive deploy failed (HTTP $HTTP_CODE)" >&2
  exit 1
fi

BUILD_UUID=""
if [[ -f /tmp/pa-build-uuid.txt ]]; then
  BUILD_UUID="$(cat /tmp/pa-build-uuid.txt)"
  rm -f /tmp/pa-build-uuid.txt
fi

if [[ -z "$BUILD_UUID" ]]; then
  echo "WARN: no build uuid in response — check hPanel Node builds manually" >&2
  rm -f "$RESP_FILE"
  exit 0
fi

echo "==> Polling build $BUILD_UUID …"
LIST_URL="${API_BASE}/api/hosting/v1/accounts/${USERNAME}/websites/${DOMAIN}/nodejs/builds"
LOGS_URL="${API_BASE}/api/hosting/v1/accounts/${USERNAME}/websites/${DOMAIN}/nodejs/builds/${BUILD_UUID}/logs"
RESTART_URL="${API_BASE}/api/hosting/v1/accounts/${USERNAME}/websites/${DOMAIN}/nodejs/server/restart"

for i in $(seq 1 "$POLL_MAX"); do
  sleep "$POLL_SECONDS"
  STATE_JSON="$(curl -sS "${AUTH_HDR[@]}" "$LIST_URL?per_page=20" || true)"
  STATE="$(
    python3 - <<'PY' "$STATE_JSON" "$BUILD_UUID"
import json,sys
raw,uid=sys.argv[1],sys.argv[2]
try:
    data=json.loads(raw)
except Exception:
    print("unknown"); raise SystemExit
items=data if isinstance(data,list) else data.get("data") or data.get("builds") or data.get("items") or []
if isinstance(items, dict):
    items=items.get("data") or items.get("items") or []
state="unknown"
for it in items or []:
    if not isinstance(it, dict):
        continue
    if str(it.get("uuid") or it.get("id") or "")==uid:
        state=str(it.get("state") or it.get("status") or "unknown")
        break
print(state)
PY
  )"
  echo "    poll $i/$POLL_MAX state=$STATE"
  case "$STATE" in
    completed|success|succeeded)
      echo "==> Build completed"
      curl -sS -X POST "${AUTH_HDR[@]}" -H "Content-Type: application/json" \
        -d '{}' "$RESTART_URL" >/dev/null || true
      echo "    restart requested"
      echo "    smoke: https://${DOMAIN}/login"
      rm -f "$RESP_FILE"
      exit 0
      ;;
    failed|error)
      echo "ERROR: build failed — tail logs:" >&2
      curl -sS "${AUTH_HDR[@]}" "$LOGS_URL" | tail -c 4000 >&2 || true
      rm -f "$RESP_FILE"
      exit 1
      ;;
  esac
done

echo "ERROR: build still not finished after polling" >&2
curl -sS "${AUTH_HDR[@]}" "$LOGS_URL" | tail -c 2000 >&2 || true
rm -f "$RESP_FILE"
exit 1
