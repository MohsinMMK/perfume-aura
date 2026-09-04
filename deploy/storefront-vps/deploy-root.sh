#!/usr/bin/env bash
# Root-owned forced-command target. Never install writable by the deploy user.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
umask 077
[[ $EUID -eq 0 && $# -eq 2 && "$1" =~ ^[0-9a-f]{40}$ && "$2" =~ ^sha256:[0-9a-f]{64}$ ]] || {
  echo 'Invalid storefront deploy identity.' >&2
  exit 2
}
source_sha=$1
image="ghcr.io/mohsinmmk/perfume-aura-storefront@$2"
stack=/srv/khanect/stacks/perfume-aura-storefront/compose.yaml
state=/srv/khanect/data/perfume-aura-storefront
runtime_env=/etc/khanect/perfume-aura-storefront.env
test -f "$stack"
test "$(stat -c '%U:%a' "$runtime_env")" = root:600
install -d -m 0700 "$state"
exec 9>"$state/deploy.lock"
flock -w 900 9
docker pull "$image"
test "$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$source_sha"
# Run only the immutable image and no runtime secrets while checking provenance.
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --user 10001:10001 --memory 256m --cpus 0.5 --pids-limit 64 \
  --entrypoint node "$image" -e '
const assert = require("node:assert/strict");
const m = require("/app/source-manifest.json");
assert.equal(m.application, "@perfume-aura/storefront");
assert.equal(m.source.commit, process.argv[1]);
assert.equal(m.source.dirty, false);
assert.equal(m.secretsIncluded, false);
' "$source_sha"
candidate=$(mktemp "$state/candidate.XXXXXX")
trap 'rm -f "$candidate"' EXIT
printf 'PERFUME_AURA_STOREFRONT_IMAGE=%s\nPERFUME_AURA_STOREFRONT_SOURCE_SHA=%s\n' "$image" "$source_sha" > "$candidate"
compose() {
  docker compose --env-file "$1" -f "$stack" up -d --pull never --wait --wait-timeout 150
}
if ! compose "$candidate"; then
  echo 'Candidate unhealthy; restoring the last accepted storefront image.' >&2
  if [[ -f "$state/current.env" ]]; then
    compose "$state/current.env" || { echo 'Storefront recovery needs operator attention.' >&2; exit 3; }
  else
    docker compose --env-file "$candidate" -f "$stack" stop app || {
      echo 'Rejected storefront candidate could not be stopped; operator attention required.' >&2
      exit 3
    }
  fi
  exit 1
fi
if [[ -f "$state/current.env" ]]; then
  cp "$state/current.env" "$state/previous.env"
fi
mv "$candidate" "$state/current.env"
echo "Storefront healthy: $source_sha $2"
