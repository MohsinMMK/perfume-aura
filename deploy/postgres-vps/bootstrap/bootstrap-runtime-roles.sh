#!/usr/bin/env bash

# Creates/rotates the three restricted runtime roles only after the full Drizzle
# migration set is present, then invokes the existing exact grant scripts.
#
# Required environment:
#   DATABASE_URL_DIRECT
#   POSTGRES_OWNER_PASSWORD_FILE
#   OPS_RUNTIME_PASSWORD_FILE
#   STOREFRONT_RUNTIME_PASSWORD_FILE
#   STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE
#   PGBOUNCER_OPS_USERLIST_FILE
#   PGBOUNCER_STOREFRONT_USERLIST_FILE
#   SELF_HOSTED_DATABASE_TARGET_HOST
#   SELF_HOSTED_DATABASE_BOOTSTRAP_ACK=bootstrap-self-hosted-target
#   POSTGRES_COMPOSE_ENV_FILE
#   PERFUME_AURA_TRUSTED_NODE=/absolute/root-owned/node
#   PERFUME_AURA_BOOTSTRAP_GIT_ORIGIN=https://github.com/MohsinMMK/perfume-aura.git
#   PERFUME_AURA_BOOTSTRAP_GIT_COMMIT=<exact-40-character-reviewed-commit>
# Optional environment:
#   POSTGRES_DATABASE (default perfume_aura)
#   POSTGRES_OWNER_ROLE (default perfume_aura_owner)
#   OPS_RUNTIME_ROLE (default ops_runtime)
#   STOREFRONT_RUNTIME_ROLE (default storefront_runtime)
#   STOREFRONT_PAYMENT_FINALIZER_ROLE (default storefront_payment_finalizer)
#   PERFUME_AURA_REPOSITORY_ROOT (auto-detected for a source checkout)
#   ALLOW_LOOPBACK_SELF_HOSTED_DATABASE_TARGET=root-controlled-vps-loopback-owner-port

set -Eeuo pipefail

# Root must never resolve bootstrap tools through an operator-controlled PATH.
# A Node binary outside these system locations is still supported through the
# explicit absolute PERFUME_AURA_TRUSTED_NODE path, which is verified below.
readonly trusted_system_path='/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
PATH="$trusted_system_path"
export PATH

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

database_name="${POSTGRES_DATABASE:-perfume_aura}"
owner_role="${POSTGRES_OWNER_ROLE:-perfume_aura_owner}"
ops_runtime_role="${OPS_RUNTIME_ROLE:-ops_runtime}"
storefront_runtime_role="${STOREFRONT_RUNTIME_ROLE:-storefront_runtime}"
storefront_payment_finalizer_role="${STOREFRONT_PAYMENT_FINALIZER_ROLE:-storefront_payment_finalizer}"

readonly role_name_pattern='^[a-z][a-z0-9_]{0,62}$'
readonly loopback_target_ack='root-controlled-vps-loopback-owner-port'
readonly canonical_repository_origin='https://github.com/MohsinMMK/perfume-aura.git'

fail() {
  printf 'bootstrap-runtime-roles: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command is unavailable: $1"
}

require_name() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ $role_name_pattern ]] || fail "$label must match $role_name_pattern"
}

read_secret_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "required secret file is missing: $path"
  [[ -r "$path" ]] || fail "required secret file is unreadable: $path"

  local value
  value="$(<"$path")"
  [[ -n "$value" ]] || fail "required secret file is empty: $path"
  printf '%s' "$value"
}

# Role names alone do not isolate capabilities when the same password can
# authenticate more than one login role through the public pooler. Compare
# values only in memory and report labels, never secret material.
require_distinct_secret_values() {
  local left_label="$1"
  local left_value="$2"
  local right_label="$3"
  local right_value="$4"

  [[ "$left_value" != "$right_value" ]] \
    || fail "runtime database passwords must be distinct: $left_label and $right_label"
}

require_absolute_clean_path() {
  local label="$1"
  local path="$2"

  [[ "$path" == /* ]] || fail "$label must use an absolute path"
  [[ "$path" != *'//' && "$path" != *'/./'* && "$path" != */. && "$path" != *'/../'* && "$path" != */.. ]] \
    || fail "$label must not contain path traversal or duplicate separators"
}

read_root_owned_metadata() {
  local label="$1"
  local path="$2"
  local kind="$3"
  local metadata
  local owner
  local mode

  if [[ "$kind" == "directory" ]]; then
    [[ -d "$path" && ! -L "$path" ]] || fail "$label must be a non-symlink directory: $path"
  else
    [[ -f "$path" && ! -L "$path" ]] || fail "$label must be a non-symlink regular file: $path"
  fi

  metadata="$(stat --format='%u:%a' -- "$path")" || fail "cannot inspect $label: $path"
  owner="${metadata%%:*}"
  mode="${metadata##*:}"
  [[ "$owner" == "0" ]] || fail "$label must be owned by root: $path"
  [[ "$mode" =~ ^[0-7]{3,4}$ ]] || fail "$label has an invalid mode: $path"
  printf '%s' "$mode"
}

require_root_owned_nonwritable_directory_chain() {
  local label="$1"
  local directory="$2"
  local mode

  require_absolute_clean_path "$label" "$directory"
  while true; do
    mode="$(read_root_owned_metadata "$label parent directory" "$directory" directory)"
    (( (8#$mode & 8#022) == 0 )) \
      || fail "$label parent directory must not be writable by group/other: $directory"
    [[ "$directory" == "/" ]] && break
    directory="$(dirname -- "$directory")"
  done
}

require_root_owned_private_file() {
  local label="$1"
  local path="$2"
  local mode

  require_absolute_clean_path "$label" "$path"
  require_root_owned_nonwritable_directory_chain "$label" "$(dirname -- "$path")"
  mode="$(read_root_owned_metadata "$label" "$path" file)"
  (( (8#$mode & 8#077) == 0 )) || fail "$label must not be readable or writable by group/other: $path"
}

require_root_owned_private_directory() {
  local label="$1"
  local path="$2"
  local mode

  require_absolute_clean_path "$label" "$path"
  require_root_owned_nonwritable_directory_chain "$label" "$path"
  mode="$(read_root_owned_metadata "$label" "$path" directory)"
  (( (8#$mode & 8#077) == 0 )) || fail "$label must not be accessible by group/other: $path"
}

require_root_owned_nonwritable_file() {
  local label="$1"
  local path="$2"
  local mode

  require_absolute_clean_path "$label" "$path"
  require_root_owned_nonwritable_directory_chain "$label" "$(dirname -- "$path")"
  mode="$(read_root_owned_metadata "$label" "$path" file)"
  (( (8#$mode & 8#022) == 0 )) \
    || fail "$label must not be writable by group/other: $path"
}

require_root_owned_nonwritable_dependency_tree() {
  local repository_root="$1"
  local dependency_root
  local entry
  local entry_mode
  local entry_owner
  local resolved_target

  for dependency_root in \
    "$repository_root/node_modules" \
    "$repository_root/packages/db/node_modules"; do
    require_absolute_clean_path "reviewed dependency tree" "$dependency_root"
    [[ -d "$dependency_root" && ! -L "$dependency_root" ]] \
      || fail "reviewed dependency tree must be a non-symlink directory: $dependency_root"
    find "$dependency_root" -xdev -print0 >/dev/null \
      || fail "cannot enumerate reviewed dependency tree: $dependency_root"

    while IFS= read -r -d '' entry; do
      if [[ -L "$entry" ]]; then
        resolved_target="$(realpath -e -- "$entry")" \
          || fail "reviewed dependency symlink is broken: $entry"
        [[ "$resolved_target" == "$repository_root/"* ]] \
          || fail "reviewed dependency symlink escapes the repository: $entry"
        continue
      fi

      if [[ ! -d "$entry" && ! -f "$entry" ]]; then
        fail "reviewed dependency tree contains an unsupported file type: $entry"
      fi
      IFS=: read -r entry_owner entry_mode < <(stat --format='%u:%a' -- "$entry") \
        || fail "cannot inspect reviewed dependency: $entry"
      [[ "$entry_owner" == "0" ]] \
        || fail "reviewed dependency must be owned by root: $entry"
      [[ "$entry_mode" =~ ^[0-7]{3,4}$ ]] \
        || fail "reviewed dependency has an invalid mode: $entry"
      (( (8#$entry_mode & 8#022) == 0 )) \
        || fail "reviewed dependency must not be writable by group/other: $entry"
    done < <(find "$dependency_root" -xdev -print0)
  done
}

read_compose_target_identity() {
  POSTGRES_COMPOSE_ENV_FILE="$POSTGRES_COMPOSE_ENV_FILE" "$trusted_node" --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const fail = (message) => {
  process.stderr.write(`bootstrap compose identity guard: ${message}\n`);
  process.exit(1);
};

const envFile = process.env.POSTGRES_COMPOSE_ENV_FILE;
if (!envFile) fail("POSTGRES_COMPOSE_ENV_FILE is required");

const requiredKeys = new Set([
  "POSTGRES_DATABASE",
  "POSTGRES_OWNER_ROLE",
  "POSTGRES_OWNER_LOOPBACK_PORT",
]);
const values = new Map();

for (const [index, rawLine] of readFileSync(envFile, "utf8").split(/\r?\n/).entries()) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
  if (!match) continue;

  const [, key, rawValue] = match;
  if (!requiredKeys.has(key)) continue;
  if (values.has(key)) fail(`${key} is declared more than once (line ${index + 1})`);

  let value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!value || value.includes("${") || value.includes("\n")) {
    fail(`${key} must be a literal non-empty identity value (line ${index + 1})`);
  }
  values.set(key, value);
}

for (const key of requiredKeys) {
  if (!values.has(key)) fail(`${key} is required in the root-owned Compose environment file`);
}

const databaseName = values.get("POSTGRES_DATABASE");
const ownerRole = values.get("POSTGRES_OWNER_ROLE");
const loopbackPort = values.get("POSTGRES_OWNER_LOOPBACK_PORT");
if (!/^[a-z][a-z0-9_]{0,62}$/.test(databaseName)) fail("POSTGRES_DATABASE is not a safe PostgreSQL identifier");
if (!/^[a-z][a-z0-9_]{0,62}$/.test(ownerRole)) fail("POSTGRES_OWNER_ROLE is not a safe PostgreSQL identifier");
if (!/^(?:[1-9][0-9]{0,4})$/.test(loopbackPort) || Number(loopbackPort) > 65535) {
  fail("POSTGRES_OWNER_LOOPBACK_PORT must be a valid TCP port");
}

process.stdout.write(`${databaseName}\t${ownerRole}\t${loopbackPort}`);
NODE
}

read_compose_secret_file_path() {
  local secret_key="$1"

  POSTGRES_COMPOSE_ENV_FILE="$POSTGRES_COMPOSE_ENV_FILE" \
  COMPOSE_SECRET_KEY="$secret_key" \
  "$trusted_node" --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const fail = (message) => {
  process.stderr.write(`bootstrap compose secret guard: ${message}\n`);
  process.exit(1);
};

const envFile = process.env.POSTGRES_COMPOSE_ENV_FILE;
const targetKey = process.env.COMPOSE_SECRET_KEY;
if (!envFile || !targetKey) fail("compose environment file and secret key are required");

let resolvedValue;
for (const [index, rawLine] of readFileSync(envFile, "utf8").split(/\r?\n/).entries()) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
  if (!match || match[1] !== targetKey) continue;
  if (resolvedValue !== undefined) fail(`${targetKey} is declared more than once (line ${index + 1})`);

  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!value || value.includes("${") || /[\r\n\t]/.test(value)) {
    fail(`${targetKey} must be a literal file path (line ${index + 1})`);
  }
  resolvedValue = value;
}

if (resolvedValue === undefined) fail(`${targetKey} is required in the root-owned Compose environment file`);
process.stdout.write(resolvedValue);
NODE
}

verify_reviewed_repository_root() {
  local candidate="$1"
  local actual_origin
  local actual_commit
  local expected_bootstrap_directory
  local tracked_relative_path
  local tracked_path

  require_absolute_clean_path "PERFUME_AURA_REPOSITORY_ROOT" "$candidate"
  require_root_owned_nonwritable_directory_chain "reviewed repository checkout" "$candidate"
  require_root_owned_nonwritable_directory_chain "reviewed Git metadata" "$candidate/.git"
  require_root_owned_nonwritable_file "reviewed package manifest" "$candidate/package.json"
  require_root_owned_nonwritable_file "reviewed lockfile" "$candidate/pnpm-lock.yaml"
  require_root_owned_nonwritable_file "reviewed Compose artifact" "$candidate/deploy/postgres-vps/compose.yaml"
  require_root_owned_nonwritable_file "reviewed role bootstrap artifact" "$candidate/deploy/postgres-vps/bootstrap/bootstrap-runtime-roles.sh"
  require_root_owned_nonwritable_file "reviewed runtime role SQL artifact" "$candidate/deploy/postgres-vps/bootstrap/runtime-roles.sql"
  require_root_owned_nonwritable_file "reviewed PgBouncer userlist SQL artifact" "$candidate/deploy/postgres-vps/bootstrap/pgbouncer-userlist.sql"
  require_root_owned_nonwritable_file "reviewed payment settlement migration" "$candidate/packages/db/drizzle/0017_storefront_sale_settlement.sql"
  require_root_owned_nonwritable_file "reviewed ops grant artifact" "$candidate/packages/db/sql/ops-runtime-grants.sql"
  require_root_owned_nonwritable_file "reviewed storefront grant artifact" "$candidate/packages/db/sql/storefront-runtime-grants.sql"
  require_root_owned_nonwritable_file "reviewed storefront payment finalizer grant artifact" "$candidate/packages/db/sql/storefront-payment-finalizer-grants.sql"
  expected_bootstrap_directory="$(cd -- "$candidate/deploy/postgres-vps/bootstrap" && pwd -P)"
  [[ "$script_dir" == "$expected_bootstrap_directory" ]] \
    || fail "bootstrap script must execute from the exact reviewed checkout artifact"

  git -C "$candidate" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || fail "PERFUME_AURA_REPOSITORY_ROOT is not a Git worktree"
  actual_origin="$(git -C "$candidate" remote get-url origin)" \
    || fail "reviewed repository checkout does not define origin"
  [[ "$actual_origin" == "$PERFUME_AURA_BOOTSTRAP_GIT_ORIGIN" ]] \
    || fail "reviewed repository origin does not match PERFUME_AURA_BOOTSTRAP_GIT_ORIGIN"
  actual_commit="$(git -C "$candidate" rev-parse --verify HEAD^{commit})" \
    || fail "reviewed repository HEAD is not a commit"
  [[ "$actual_commit" == "$PERFUME_AURA_BOOTSTRAP_GIT_COMMIT" ]] \
    || fail "reviewed repository HEAD does not match PERFUME_AURA_BOOTSTRAP_GIT_COMMIT"
  [[ -z "$(git -C "$candidate" status --porcelain=v1 --untracked-files=all)" ]] \
    || fail "reviewed repository checkout must be clean before root runs migrations"

  while IFS= read -r -d '' tracked_relative_path; do
    tracked_path="$candidate/$tracked_relative_path"
    require_root_owned_nonwritable_file "reviewed tracked artifact" "$tracked_path"
  done < <(git -C "$candidate" ls-files -z)
}

resolve_repository_root() {
  local candidate
  local candidates=()

  if [[ -n "${PERFUME_AURA_REPOSITORY_ROOT:-}" ]]; then
    candidates+=("$PERFUME_AURA_REPOSITORY_ROOT")
  else
    candidates+=(
      "$(cd -- "$script_dir/../../.." && pwd -P)"
      "$(cd -- "$script_dir/.." && pwd -P)"
    )
  fi

  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate/package.json" \
      && -d "$candidate/packages/db" \
      && -f "$candidate/packages/db/drizzle/0017_storefront_sale_settlement.sql" \
      && -f "$candidate/packages/db/sql/ops-runtime-grants.sql" \
      && -f "$candidate/packages/db/sql/storefront-runtime-grants.sql" \
      && -f "$candidate/packages/db/sql/storefront-payment-finalizer-grants.sql" ]]; then
      verify_reviewed_repository_root "$candidate"
      cd -- "$candidate" && pwd -P
      return
    fi
  done

  fail "PERFUME_AURA_REPOSITORY_ROOT must identify a reviewed repository checkout"
}

validate_direct_target() {
  DATABASE_URL_DIRECT="$DATABASE_URL_DIRECT" \
  POSTGRES_DATABASE="$database_name" \
  POSTGRES_OWNER_ROLE="$owner_role" \
  SELF_HOSTED_DATABASE_TARGET_HOST="$SELF_HOSTED_DATABASE_TARGET_HOST" \
  POSTGRES_OWNER_LOOPBACK_PORT="$postgres_owner_loopback_port" \
  ALLOW_LOOPBACK_SELF_HOSTED_DATABASE_TARGET="${ALLOW_LOOPBACK_SELF_HOSTED_DATABASE_TARGET:-}" \
  LOOPBACK_TARGET_ACK="$loopback_target_ack" \
  "$trusted_node" --input-type=module <<'NODE'
const fail = (message) => {
  process.stderr.write(`bootstrap target guard: ${message}\n`);
  process.exit(1);
};

const normalizeHost = (value) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/^\[|\]$/g, "")
  .replace(/\.$/, "");

const raw = process.env.DATABASE_URL_DIRECT?.trim();
if (!raw) fail("DATABASE_URL_DIRECT is required");

let databaseUrl;
try {
  databaseUrl = new URL(raw);
} catch {
  fail("DATABASE_URL_DIRECT must be a valid PostgreSQL URL");
}

if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") {
  fail("DATABASE_URL_DIRECT must use postgres:// or postgresql://");
}
if (databaseUrl.password) {
  fail("DATABASE_URL_DIRECT must not contain a password; use POSTGRES_OWNER_PASSWORD_FILE instead");
}
if (databaseUrl.search) {
  fail("DATABASE_URL_DIRECT must not contain query parameters");
}

const host = normalizeHost(databaseUrl.hostname);
const expectedHost = normalizeHost(process.env.SELF_HOSTED_DATABASE_TARGET_HOST);
if (!host || !expectedHost) fail("SELF_HOSTED_DATABASE_TARGET_HOST is required");
if (/[:/@?]/.test(expectedHost) || expectedHost.includes("://")) {
  fail("SELF_HOSTED_DATABASE_TARGET_HOST must be a hostname only");
}
if (host !== expectedHost) fail("DATABASE_URL_DIRECT host must exactly match SELF_HOSTED_DATABASE_TARGET_HOST");
if (host.endsWith(".neon.tech")) fail("DATABASE_URL_DIRECT must not target Neon");
if (host.includes("pooler") || host.includes("pgbouncer") || (databaseUrl.port || "5432") === "6432") {
  fail("DATABASE_URL_DIRECT must be a direct PostgreSQL target, not a pooler");
}

const loopback = host === "localhost" || host === "::1" || host.startsWith("127.");
if (!loopback) {
  fail("DATABASE_URL_DIRECT must use the VPS root-controlled loopback owner listener");
}
if (process.env.ALLOW_LOOPBACK_SELF_HOSTED_DATABASE_TARGET !== process.env.LOOPBACK_TARGET_ACK) {
  fail("loopback target requires the exact ALLOW_LOOPBACK_SELF_HOSTED_DATABASE_TARGET acknowledgement");
}
if ((databaseUrl.port || "5432") !== process.env.POSTGRES_OWNER_LOOPBACK_PORT) {
  fail("DATABASE_URL_DIRECT port must exactly match POSTGRES_OWNER_LOOPBACK_PORT in the Compose environment");
}

let databaseName;
let roleName;
try {
  databaseName = decodeURIComponent(databaseUrl.pathname).replace(/^\/+/, "");
  roleName = decodeURIComponent(databaseUrl.username);
} catch {
  fail("DATABASE_URL_DIRECT contains invalid encoded database identity");
}
if (databaseName !== process.env.POSTGRES_DATABASE) {
  fail("DATABASE_URL_DIRECT database must exactly match POSTGRES_DATABASE");
}
if (roleName !== process.env.POSTGRES_OWNER_ROLE) {
  fail("DATABASE_URL_DIRECT role must exactly match POSTGRES_OWNER_ROLE");
}
NODE
}

validate_started_compose_target() {
  local running_services
  local published_owner_listener

  running_services="$(docker compose --env-file "$POSTGRES_COMPOSE_ENV_FILE" --file "$compose_file" ps --status running --services)" \
    || fail "could not inspect the reviewed postgres service state"
  [[ $'\n'"$running_services"$'\n' == *$'\npostgres\n'* ]] \
    || fail "the reviewed postgres service is not running"
  published_owner_listener="$(docker compose --env-file "$POSTGRES_COMPOSE_ENV_FILE" --file "$compose_file" port postgres 5432)" \
    || fail "the reviewed postgres service is not running with its loopback owner listener"
  [[ "$published_owner_listener" == "127.0.0.1:$postgres_owner_loopback_port" ]] \
    || fail "the running postgres service owner listener does not match the reviewed Compose loopback target"
}

validate_runtime_principal_ownership() {
  local runtime_principal_ownership_verification

  # Existing runtime role names are only safe to reuse when they do not own any
  # object. PostgreSQL ownership survives GRANT/REVOKE, so a reused owner can
  # retain DDL and table powers even after the reviewed grant matrices run.
  # pg_shdepend covers database-local object ownership; database and tablespace
  # ownership are cluster-wide catalogs and need explicit checks as well.
  runtime_principal_ownership_verification="$(psql --no-psqlrc -X -qAt \
    --set=ON_ERROR_STOP=1 \
    --set=ops_runtime_role="$ops_runtime_role" \
    --set=storefront_runtime_role="$storefront_runtime_role" \
    --set=storefront_payment_finalizer_role="$storefront_payment_finalizer_role" \
    "$DATABASE_URL_DIRECT" <<'SQL'
WITH selected_runtime_principals(role_name) AS (
  VALUES
    (:'ops_runtime_role'::name),
    (:'storefront_runtime_role'::name),
    (:'storefront_payment_finalizer_role'::name)
),
existing_runtime_principals AS (
  SELECT roles.oid, selected_runtime_principals.role_name
  FROM selected_runtime_principals
  INNER JOIN pg_roles AS roles ON roles.rolname = selected_runtime_principals.role_name
),
database_ownership AS (
  SELECT 1
  FROM pg_database AS database
  INNER JOIN existing_runtime_principals AS runtime ON runtime.oid = database.datdba
),
tablespace_ownership AS (
  SELECT 1
  FROM pg_tablespace AS tablespace
  INNER JOIN existing_runtime_principals AS runtime ON runtime.oid = tablespace.spcowner
),
database_object_ownership AS (
  SELECT 1
  FROM pg_shdepend AS dependency
  INNER JOIN existing_runtime_principals AS runtime ON runtime.oid = dependency.refobjid
  WHERE dependency.refclassid = 'pg_authid'::regclass
    AND dependency.deptype = 'o'
)
SELECT
  NOT EXISTS (SELECT 1 FROM database_ownership)
  AND NOT EXISTS (SELECT 1 FROM tablespace_ownership)
  AND NOT EXISTS (SELECT 1 FROM database_object_ownership);
SQL
)"

  [[ "$runtime_principal_ownership_verification" == "t" ]] \
    || fail "runtime principals must be new or own no cluster/database objects before bootstrap"
}

[[ "$(id -u)" == "0" ]] || fail "must run from a root-controlled session before changing roles or pooler secrets"
require_command psql
require_command docker
require_command git
require_command find
require_command realpath
[[ -n "${PERFUME_AURA_TRUSTED_NODE:-}" ]] \
  || fail "PERFUME_AURA_TRUSTED_NODE is required"
require_absolute_clean_path "PERFUME_AURA_TRUSTED_NODE" "$PERFUME_AURA_TRUSTED_NODE"
trusted_node="$(realpath -e -- "$PERFUME_AURA_TRUSTED_NODE")" \
  || fail "PERFUME_AURA_TRUSTED_NODE cannot be resolved"
require_root_owned_nonwritable_file "PERFUME_AURA_TRUSTED_NODE" "$trusted_node"
[[ -n "${DATABASE_URL_DIRECT:-}" ]] || fail "DATABASE_URL_DIRECT is required"
[[ -n "${POSTGRES_OWNER_PASSWORD_FILE:-}" ]] || fail "POSTGRES_OWNER_PASSWORD_FILE is required"
[[ -n "${OPS_RUNTIME_PASSWORD_FILE:-}" ]] || fail "OPS_RUNTIME_PASSWORD_FILE is required"
[[ -n "${STOREFRONT_RUNTIME_PASSWORD_FILE:-}" ]] || fail "STOREFRONT_RUNTIME_PASSWORD_FILE is required"
[[ -n "${STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE:-}" ]] || fail "STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE is required"
[[ -n "${PGBOUNCER_OPS_USERLIST_FILE:-}" ]] || fail "PGBOUNCER_OPS_USERLIST_FILE is required"
[[ -n "${PGBOUNCER_STOREFRONT_USERLIST_FILE:-}" ]] || fail "PGBOUNCER_STOREFRONT_USERLIST_FILE is required"
[[ -n "${SELF_HOSTED_DATABASE_TARGET_HOST:-}" ]] || fail "SELF_HOSTED_DATABASE_TARGET_HOST is required"
[[ "${SELF_HOSTED_DATABASE_BOOTSTRAP_ACK:-}" == "bootstrap-self-hosted-target" ]] || fail "SELF_HOSTED_DATABASE_BOOTSTRAP_ACK must acknowledge the self-hosted target"
[[ -n "${POSTGRES_COMPOSE_ENV_FILE:-}" ]] || fail "POSTGRES_COMPOSE_ENV_FILE is required"
[[ "${PERFUME_AURA_BOOTSTRAP_GIT_ORIGIN:-}" == "$canonical_repository_origin" ]] \
  || fail "PERFUME_AURA_BOOTSTRAP_GIT_ORIGIN must exactly match the canonical Perfume Aura origin"
[[ "${PERFUME_AURA_BOOTSTRAP_GIT_COMMIT:-}" =~ ^[0-9a-f]{40}$ ]] \
  || fail "PERFUME_AURA_BOOTSTRAP_GIT_COMMIT must be an exact 40-character lowercase commit SHA"
require_root_owned_private_file "POSTGRES_COMPOSE_ENV_FILE" "$POSTGRES_COMPOSE_ENV_FILE"
require_root_owned_private_file "POSTGRES_OWNER_PASSWORD_FILE" "$POSTGRES_OWNER_PASSWORD_FILE"
require_root_owned_private_file "OPS_RUNTIME_PASSWORD_FILE" "$OPS_RUNTIME_PASSWORD_FILE"
require_root_owned_private_file "STOREFRONT_RUNTIME_PASSWORD_FILE" "$STOREFRONT_RUNTIME_PASSWORD_FILE"
require_root_owned_private_file "STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE" "$STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE"

require_name "POSTGRES_DATABASE" "$database_name"
require_name "POSTGRES_OWNER_ROLE" "$owner_role"
require_name "OPS_RUNTIME_ROLE" "$ops_runtime_role"
require_name "STOREFRONT_RUNTIME_ROLE" "$storefront_runtime_role"
require_name "STOREFRONT_PAYMENT_FINALIZER_ROLE" "$storefront_payment_finalizer_role"
[[ "$owner_role" != "$ops_runtime_role" ]] || fail "POSTGRES_OWNER_ROLE must differ from OPS_RUNTIME_ROLE"
[[ "$owner_role" != "$storefront_runtime_role" ]] || fail "POSTGRES_OWNER_ROLE must differ from STOREFRONT_RUNTIME_ROLE"
[[ "$owner_role" != "$storefront_payment_finalizer_role" ]] \
  || fail "POSTGRES_OWNER_ROLE must differ from STOREFRONT_PAYMENT_FINALIZER_ROLE"
[[ "$ops_runtime_role" != "$storefront_runtime_role" ]] || fail "runtime roles must be distinct"
[[ "$ops_runtime_role" != "$storefront_payment_finalizer_role" ]] || fail "runtime roles must be distinct"
[[ "$storefront_runtime_role" != "$storefront_payment_finalizer_role" ]] || fail "runtime roles must be distinct"
[[ "$PGBOUNCER_OPS_USERLIST_FILE" != "$PGBOUNCER_STOREFRONT_USERLIST_FILE" ]] || fail "PgBouncer userlist files must be distinct"

repo_root="$(resolve_repository_root)"
require_root_owned_nonwritable_dependency_tree "$repo_root"
migration_runner="$(realpath -e -- "$repo_root/packages/db/node_modules/drizzle-kit/bin.cjs")" \
  || fail "reviewed Drizzle migration runner is missing"
[[ "$migration_runner" == "$repo_root/"* ]] \
  || fail "reviewed Drizzle migration runner escapes the repository"
require_root_owned_nonwritable_file "reviewed Drizzle migration runner" "$migration_runner"
compose_file="$repo_root/deploy/postgres-vps/compose.yaml"
[[ -f "$compose_file" ]] || fail "self-hosted PostgreSQL Compose file is missing from the reviewed repository checkout"
compose_identity="$(read_compose_target_identity)" || fail "could not read target identity from POSTGRES_COMPOSE_ENV_FILE"
IFS=$'\t' read -r compose_database_name compose_owner_role postgres_owner_loopback_port <<<"$compose_identity"
[[ "$database_name" == "$compose_database_name" ]] || fail "POSTGRES_DATABASE must exactly match the root-owned Compose environment"
[[ "$owner_role" == "$compose_owner_role" ]] || fail "POSTGRES_OWNER_ROLE must exactly match the root-owned Compose environment"
[[ "$database_name" == "perfume_aura" ]] || fail "POSTGRES_DATABASE must remain perfume_aura while the reviewed PgBouncer database maps are fixed"

compose_superuser_password_file="$(read_compose_secret_file_path POSTGRES_SUPERUSER_PASSWORD_FILE)"
compose_ops_userlist_file="$(read_compose_secret_file_path PGBOUNCER_OPS_USERLIST_FILE)"
compose_storefront_userlist_file="$(read_compose_secret_file_path PGBOUNCER_STOREFRONT_USERLIST_FILE)"
compose_tls_ca_file="$(read_compose_secret_file_path PGBOUNCER_TLS_CA_FILE)"
compose_tls_server_cert_file="$(read_compose_secret_file_path PGBOUNCER_TLS_SERVER_CERT_FILE)"
compose_tls_server_key_file="$(read_compose_secret_file_path PGBOUNCER_TLS_SERVER_KEY_FILE)"
compose_pgbackrest_config_file="$(read_compose_secret_file_path PGBACKREST_CONFIG_FILE)"
compose_pgadmin_password_file="$(read_compose_secret_file_path PGADMIN_PASSWORD_FILE)"

[[ "$POSTGRES_OWNER_PASSWORD_FILE" == "$compose_superuser_password_file" ]] \
  || fail "POSTGRES_OWNER_PASSWORD_FILE must exactly match POSTGRES_SUPERUSER_PASSWORD_FILE in Compose"
[[ "$PGBOUNCER_OPS_USERLIST_FILE" == "$compose_ops_userlist_file" ]] \
  || fail "PGBOUNCER_OPS_USERLIST_FILE must exactly match the Compose secret source"
[[ "$PGBOUNCER_STOREFRONT_USERLIST_FILE" == "$compose_storefront_userlist_file" ]] \
  || fail "PGBOUNCER_STOREFRONT_USERLIST_FILE must exactly match the Compose secret source"

require_root_owned_private_file "POSTGRES_SUPERUSER_PASSWORD_FILE" "$compose_superuser_password_file"
require_root_owned_private_file "PGBOUNCER_OPS_USERLIST_FILE" "$compose_ops_userlist_file"
require_root_owned_private_file "PGBOUNCER_STOREFRONT_USERLIST_FILE" "$compose_storefront_userlist_file"
require_root_owned_private_file "PGBOUNCER_TLS_CA_FILE" "$compose_tls_ca_file"
require_root_owned_private_file "PGBOUNCER_TLS_SERVER_CERT_FILE" "$compose_tls_server_cert_file"
require_root_owned_private_file "PGBOUNCER_TLS_SERVER_KEY_FILE" "$compose_tls_server_key_file"
require_root_owned_private_file "PGBACKREST_CONFIG_FILE" "$compose_pgbackrest_config_file"
require_root_owned_private_file "PGADMIN_PASSWORD_FILE" "$compose_pgadmin_password_file"
validate_direct_target
validate_started_compose_target

owner_database_password="$(read_secret_file "$POSTGRES_OWNER_PASSWORD_FILE")"
OPS_RUNTIME_PASSWORD="$(read_secret_file "$OPS_RUNTIME_PASSWORD_FILE")"
STOREFRONT_RUNTIME_PASSWORD="$(read_secret_file "$STOREFRONT_RUNTIME_PASSWORD_FILE")"
STOREFRONT_PAYMENT_FINALIZER_PASSWORD="$(read_secret_file "$STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE")"

require_distinct_secret_values \
  "POSTGRES_OWNER_PASSWORD_FILE" "$owner_database_password" \
  "OPS_RUNTIME_PASSWORD_FILE" "$OPS_RUNTIME_PASSWORD"
require_distinct_secret_values \
  "POSTGRES_OWNER_PASSWORD_FILE" "$owner_database_password" \
  "STOREFRONT_RUNTIME_PASSWORD_FILE" "$STOREFRONT_RUNTIME_PASSWORD"
require_distinct_secret_values \
  "POSTGRES_OWNER_PASSWORD_FILE" "$owner_database_password" \
  "STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE" "$STOREFRONT_PAYMENT_FINALIZER_PASSWORD"
require_distinct_secret_values \
  "OPS_RUNTIME_PASSWORD_FILE" "$OPS_RUNTIME_PASSWORD" \
  "STOREFRONT_RUNTIME_PASSWORD_FILE" "$STOREFRONT_RUNTIME_PASSWORD"
require_distinct_secret_values \
  "OPS_RUNTIME_PASSWORD_FILE" "$OPS_RUNTIME_PASSWORD" \
  "STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE" "$STOREFRONT_PAYMENT_FINALIZER_PASSWORD"
require_distinct_secret_values \
  "STOREFRONT_RUNTIME_PASSWORD_FILE" "$STOREFRONT_RUNTIME_PASSWORD" \
  "STOREFRONT_PAYMENT_FINALIZER_PASSWORD_FILE" "$STOREFRONT_PAYMENT_FINALIZER_PASSWORD"

export PGPASSWORD="$owner_database_password"
unset owner_database_password
export OPS_RUNTIME_PASSWORD STOREFRONT_RUNTIME_PASSWORD STOREFRONT_PAYMENT_FINALIZER_PASSWORD
temporary_userlist_files=()

cleanup() {
  unset PGPASSWORD OPS_RUNTIME_PASSWORD STOREFRONT_RUNTIME_PASSWORD STOREFRONT_PAYMENT_FINALIZER_PASSWORD
  for temporary_userlist_file in "${temporary_userlist_files[@]}"; do
    rm -f -- "$temporary_userlist_file"
  done
}
trap cleanup EXIT

connected_target_identity="$(psql --no-psqlrc -X -qAt "$DATABASE_URL_DIRECT" -c "SELECT current_database() || E'|' || current_user || E'|' || CASE WHEN current_setting('server_version_num')::integer BETWEEN 170000 AND 179999 THEN 'postgres17' ELSE 'unexpected-postgres-version' END")"
[[ "$connected_target_identity" == "$database_name|$owner_role|postgres17" ]] \
  || fail "direct owner connection did not reach the exact reviewed PostgreSQL 17 database and owner role"

validate_runtime_principal_ownership

printf 'Applying pending Drizzle migrations through the direct owner connection...\n'
(
  cd "$repo_root/packages/db"
  "$trusted_node" "$migration_runner" migrate --config "$repo_root/packages/db/drizzle.config.ts"
)

expected_migration_count="$(find "$repo_root/packages/db/drizzle" -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d '[:space:]')"
actual_migration_count="$(psql --no-psqlrc -X -qAt "$DATABASE_URL_DIRECT" -c 'SELECT count(*) FROM drizzle.__drizzle_migrations')"
[[ "$actual_migration_count" == "$expected_migration_count" ]] || fail "migration journal count $actual_migration_count does not match source migration count $expected_migration_count"

printf 'Bootstrapping distinct runtime roles after migrations=%s...\n' "$actual_migration_count"
role_output="$(psql --no-psqlrc -X -qAt \
  --set=ON_ERROR_STOP=1 \
  --set=database_name="$database_name" \
  --set=owner_role="$owner_role" \
  --set=ops_runtime_role="$ops_runtime_role" \
  --set=storefront_runtime_role="$storefront_runtime_role" \
  --set=storefront_payment_finalizer_role="$storefront_payment_finalizer_role" \
  "$DATABASE_URL_DIRECT" \
  --file "$script_dir/runtime-roles.sql")"

expected_role_output=$'f|f|f|f|f|f|f|t|t\nf|f|f|f|f|f|f|t|t\nf|f|f|f|f|f|f|t|t'
[[ "$role_output" == "$expected_role_output" ]] || fail "runtime role hardening or membership verification failed"

registry_verification="$(psql --no-psqlrc -X -qAt \
  --set=ON_ERROR_STOP=1 \
  --set=ops_runtime_role="$ops_runtime_role" \
  --set=storefront_runtime_role="$storefront_runtime_role" \
  --set=storefront_payment_finalizer_role="$storefront_payment_finalizer_role" \
  "$DATABASE_URL_DIRECT" <<'SQL'
WITH expected(role_name, capability) AS (
  VALUES
    (:'ops_runtime_role'::name, 'ops'::text),
    (:'storefront_runtime_role'::name, 'storefront'::text),
    (:'storefront_payment_finalizer_role'::name, 'payment_finalizer'::text)
),
actual AS (
  SELECT role_name, capability
  FROM public.runtime_capability_roles
),
table_privileges(privilege) AS (
  VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
         ('REFERENCES'), ('TRIGGER')
)
SELECT
  (SELECT count(*) FROM actual) = 3
  AND NOT EXISTS (
    (SELECT role_name, capability FROM actual
     EXCEPT
     SELECT role_name, capability FROM expected)
    UNION ALL
    (SELECT role_name, capability FROM expected
     EXCEPT
     SELECT role_name, capability FROM actual)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM expected
    CROSS JOIN table_privileges
    WHERE has_table_privilege(
      expected.role_name,
      'public.runtime_capability_roles',
      table_privileges.privilege
    )
  );
SQL
)"
[[ "$registry_verification" == "t" ]] \
  || fail "runtime capability registry mappings or privileges failed verification"

apply_grants() {
  local role_name="$1"
  local grants_file="$2"
  local label="$3"
  local drift_output

  drift_output="$(psql --no-psqlrc -X -qAt \
    --set=ON_ERROR_STOP=1 \
    --set=runtime_role="$role_name" \
    "$DATABASE_URL_DIRECT" \
    --file "$grants_file")"
  [[ -z "$drift_output" ]] || fail "$label grant script reported privilege drift"
}

apply_grants "$ops_runtime_role" "$repo_root/packages/db/sql/ops-runtime-grants.sql" "ops"
apply_grants "$storefront_runtime_role" "$repo_root/packages/db/sql/storefront-runtime-grants.sql" "storefront"
apply_grants "$storefront_payment_finalizer_role" "$repo_root/packages/db/sql/storefront-payment-finalizer-grants.sql" "storefront payment finalizer"

write_pgbouncer_userlist() {
  local userlist_file="$1"
  shift
  local role_names=("$@")
  local userlist_directory
  local userlist_temp
  local userlist_count

  userlist_directory="$(dirname -- "$userlist_file")"
  require_root_owned_private_directory "PgBouncer secret directory" "$userlist_directory"
  [[ ! -L "$userlist_file" ]] || fail "refusing to replace a symbolic-link PgBouncer userlist"
  [[ ! -d "$userlist_file" ]] || fail "PgBouncer userlist path must be a file: $userlist_file"
  userlist_temp="$(mktemp "$userlist_directory/.pgbouncer-userlist.XXXXXX")"
  temporary_userlist_files+=("$userlist_temp")
  chmod 0600 "$userlist_temp"

  : > "$userlist_temp"
  for role_name in "${role_names[@]}"; do
    psql --no-psqlrc -X -qAt \
      --set=ON_ERROR_STOP=1 \
      --set=runtime_role="$role_name" \
      "$DATABASE_URL_DIRECT" \
      --file "$script_dir/pgbouncer-userlist.sql" >> "$userlist_temp"
  done

  userlist_count="$(wc -l < "$userlist_temp" | tr -d '[:space:]')"
  [[ "$userlist_count" == "${#role_names[@]}" ]] || fail "refusing to install an incomplete PgBouncer SCRAM userlist"
  install -o root -g root -m 0600 "$userlist_temp" "$userlist_file"
  cmp --silent -- "$userlist_temp" "$userlist_file" || fail "PgBouncer userlist installation verification failed"
  require_root_owned_private_file "PgBouncer userlist" "$userlist_file"
}

write_pgbouncer_userlist "$PGBOUNCER_OPS_USERLIST_FILE" "$ops_runtime_role"
write_pgbouncer_userlist "$PGBOUNCER_STOREFRONT_USERLIST_FILE" \
  "$storefront_runtime_role" "$storefront_payment_finalizer_role"

printf 'Validating the rendered Compose target before loading separate PgBouncer SCRAM userlists...\n'
docker compose --env-file "$POSTGRES_COMPOSE_ENV_FILE" --file "$compose_file" config --quiet

printf 'Recreating PgBouncer services during the planned maintenance window to load separate SCRAM userlists...\n'
docker compose --env-file "$POSTGRES_COMPOSE_ENV_FILE" --file "$compose_file" \
  up --detach --no-deps --force-recreate pgbouncer-ops pgbouncer-external
for pooler_service in pgbouncer-ops pgbouncer-external; do
  docker compose --env-file "$POSTGRES_COMPOSE_ENV_FILE" --file "$compose_file" \
    ps --status running --services | grep -Fx "$pooler_service" >/dev/null \
    || fail "$pooler_service did not enter the running state after userlist rotation"
done

printf 'Runtime roles, exact grant scripts, separate PgBouncer SCRAM userlists, and pooler reload are verified.\n'
