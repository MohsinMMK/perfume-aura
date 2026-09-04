#!/usr/bin/env bash
set -euo pipefail
original=${SSH_ORIGINAL_COMMAND:-}
if [[ "$original" == probe ]]; then
  echo perfume-aura-storefront-deploy-ready
  exit 0
fi
[[ "$original" =~ ^deploy\ ([0-9a-f]{40})\ (sha256:[0-9a-f]{64})$ ]] || {
  echo 'Only an exact storefront deploy command is allowed.' >&2
  exit 2
}
exec sudo -n /usr/local/libexec/perfume-aura-storefront-deploy-root "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
