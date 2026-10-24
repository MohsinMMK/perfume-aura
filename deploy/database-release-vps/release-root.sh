#!/usr/bin/env bash
# Root-owned forced-command target. Never install writable by the release user.
# Owner credentials stay in the root-only env file and reach only the container.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
umask 077
[[ $EUID -eq 0 && $# -eq 2 && "$1" =~ ^[0-9a-f]{40}$ && "$2" =~ ^sha256:[0-9a-f]{64}$ ]] || {
  echo 'Invalid database release identity.' >&2
  exit 2
}
source_sha=$1
image="ghcr.io/mohsinmmk/perfume-aura-database-release@$2"
release_env=/etc/khanect/perfume-aura-database-release.env
state=/srv/khanect/data/perfume-aura-database-release
backups="$state/backups"
keep_backups=10
test "$(stat -c '%U:%a' "$release_env")" = root:600
install -d -m 0700 "$state" "$backups"
exec 9>"$state/release.lock"
flock -w 1800 9
docker pull --quiet "$image" >/dev/null
test "$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$source_sha"
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --user 10001:10001 --memory 128m --pids-limit 32 --entrypoint node "$image" -e '
const assert = require("node:assert/strict");
const m = require("/app/source-manifest.json");
assert.equal(m.application, "@perfume-aura/database-release");
assert.equal(m.source.commit, process.argv[1]);
assert.equal(m.source.dirty, false);
assert.equal(m.secretsIncluded, false);
' "$source_sha"
# Host networking reaches either a remote provider or the loopback-only owner
# port of the self-hosted cluster; the container still has no capabilities.
release() {
  docker run --rm --network host --read-only --cap-drop ALL --security-opt no-new-privileges \
    --user 10001:10001 --memory 512m --cpus 1 --pids-limit 64 --tmpfs /tmp:rw,noexec,nosuid,size=16m \
    --env-file "$release_env" "$image" "$@"
}
plan=$(release plan)
printf '%s\n' "$plan"
pending=$(printf '%s\n' "$plan" | sed -n 's/^pending=\([0-9][0-9]*\)$/\1/p')
[[ "$pending" =~ ^[0-9]+$ ]]
if (( pending > 0 )); then
  dump="$backups/$(date -u +%Y%m%dT%H%M%SZ)-${source_sha:0:12}.dump"
  # A failed dump must not leave partial production data behind.
  trap 'rm -f -- "$dump.partial"' EXIT
  release backup > "$dump.partial"
  test -s "$dump.partial"
  mv "$dump.partial" "$dump"
  trap - EXIT
  echo "Pre-release backup: $(basename "$dump") ($(stat -c %s "$dump") bytes)"
  # Bounded retention of this runner's own dumps only.
  find "$backups" -maxdepth 1 -type f -name '*.dump' -printf '%T@ %p\n' | sort -rn |
    tail -n +$((keep_backups + 1)) | cut -d' ' -f2- | xargs -r rm -f --
fi
release release
printf 'DATABASE_RELEASE_SOURCE_SHA=%s\nDATABASE_RELEASE_IMAGE=%s\n' "$source_sha" "$image" > "$state/last-release.env"
echo "Database release accepted: $source_sha $2"
