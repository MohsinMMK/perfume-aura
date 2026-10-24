#!/usr/bin/env bash
set -euo pipefail
original=${SSH_ORIGINAL_COMMAND:-}
if [[ "$original" == probe ]]; then
  echo perfume-aura-database-release-ready
  exit 0
fi
[[ "$original" =~ ^release\ ([0-9a-f]{40})\ (sha256:[0-9a-f]{64})$ ]] || {
  echo 'Only an exact database release command is allowed.' >&2
  exit 2
}
exec sudo -n /usr/local/libexec/perfume-aura-database-release-root "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
