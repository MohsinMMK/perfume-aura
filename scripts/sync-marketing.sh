#!/usr/bin/env bash
# Publish marketing static surface to monorepo root for Hostinger Path M.
#
# Why root copies exist:
#   Hostinger classic Git deploys the whole GitHub repo into public_html.
#   "Root directory" in hPanel is the SERVER destination (public_html), not a
#   repo subdirectory filter. Apex must therefore serve index.html/styles.css
#   from the repository root until artifact-only CI lands.
#
# Source of truth (edit only here):
#   apps/marketing/index.html
#   apps/marketing/styles.css
#   apps/marketing/.htaccess
#   apps/marketing/assets/
#
# Publish outputs (do not hand-edit):
#   ./index.html
#   ./styles.css
#   ./.htaccess
#   ./assets/
#
# Usage:
#   pnpm marketing:sync    # write publish outputs
#   pnpm marketing:check   # fail if publish surface drifts from source
#   pnpm marketing:sync --self-test  # focused negative/parity checks
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
SRC="$ROOT/apps/marketing"

mode="${1:-sync}"
if [[ "${2:-}" == "--self-test" || "${1:-}" == "--self-test" ]]; then
  mode="self-test"
fi

need_files=(
  "$SRC/index.html"
  "$SRC/styles.css"
  "$SRC/.htaccess"
)

die() {
  echo "ERROR: $*" >&2
  exit 1
}

is_symlink() {
  [[ -L "$1" ]]
}

canonical_path() {
  local path="$1"
  if [[ ! -e "$path" && ! -L "$path" ]]; then
    die "cannot resolve missing path: $path"
  fi
  if command -v realpath >/dev/null 2>&1; then
    realpath "$path"
    return 0
  fi
  python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$path"
}

path_inside_root() {
  local candidate="$1"
  local root_canon="$2"
  case "$candidate" in
    "$root_canon"|"$root_canon"/*) return 0 ;;
    *) return 1 ;;
  esac
}

assert_inside_repo() {
  local path="$1"
  local label="${2:-path}"
  local resolved root_canon
  root_canon="$(canonical_path "$ROOT")"
  resolved="$(canonical_path "$path")"
  if ! path_inside_root "$resolved" "$root_canon"; then
    die "$label escapes repository root: $path -> $resolved"
  fi
}

assert_source_root_safe() {
  local root_canon src_canon expected
  root_canon="$(canonical_path "$ROOT")"
  if is_symlink "$ROOT/apps" || is_symlink "$ROOT/apps/marketing" || is_symlink "$SRC"; then
    die "refusing symlink marketing source root: $SRC"
  fi
  if [[ ! -d "$SRC" ]]; then
    die "missing marketing source root: $SRC"
  fi
  src_canon="$(canonical_path "$SRC")"
  expected="$root_canon/apps/marketing"
  if [[ "$src_canon" != "$expected" ]]; then
    die "marketing source root must resolve to $expected (got $src_canon)"
  fi
}

assert_regular_file() {
  local path="$1"
  local label="${2:-file}"
  if [[ ! -e "$path" ]]; then
    die "missing $label: $path"
  fi
  if is_symlink "$path"; then
    die "refusing symlink $label: $path"
  fi
  if [[ ! -f "$path" ]]; then
    die "expected regular $label: $path"
  fi
  assert_inside_repo "$path" "$label"
}

assert_real_dir() {
  local path="$1"
  local label="${2:-directory}"
  if [[ ! -e "$path" ]]; then
    die "missing $label: $path"
  fi
  if is_symlink "$path"; then
    die "refusing symlink $label: $path"
  fi
  if [[ ! -d "$path" ]]; then
    die "expected directory $label: $path"
  fi
  assert_inside_repo "$path" "$label"
}

assert_asset_tree_safe() {
  local root_dir="$1"
  local path
  assert_real_dir "$root_dir" "asset directory"
  while IFS= read -r -d '' path; do
    if is_symlink "$path"; then
      die "refusing symlink in asset tree: $path"
    fi
    assert_inside_repo "$path" "asset path"
  done < <(find "$root_dir" -mindepth 1 -print0)
}

assert_publish_destination_safe() {
  local dest="$1"
  case "$dest" in
    "$ROOT"/index.html|"$ROOT"/styles.css|"$ROOT"/.htaccess|"$ROOT"/assets|"$SRC"/dist) ;;
    *) die "refusing unexpected publish destination: $dest" ;;
  esac
  if [[ -e "$dest" ]] && is_symlink "$dest"; then
    die "refusing symlink publish destination: $dest"
  fi
  if [[ -e "$dest" ]]; then
    assert_inside_repo "$dest" "publish destination"
  else
    assert_inside_repo "$(dirname "$dest")" "publish destination parent"
  fi
}

assert_sources() {
  local f
  assert_source_root_safe
  for f in "${need_files[@]}"; do
    assert_regular_file "$f" "marketing source file"
  done
  assert_asset_tree_safe "$SRC/assets"
}

publish_pairs=(
  "$SRC/index.html:$ROOT/index.html"
  "$SRC/styles.css:$ROOT/styles.css"
  "$SRC/.htaccess:$ROOT/.htaccess"
)

check_drift() {
  local src dest base
  local drift=0
  assert_sources
  for pair in "${publish_pairs[@]}"; do
    src="${pair%%:*}"
    dest="${pair##*:}"
    base="$(basename "$src")"
    assert_publish_destination_safe "$dest"
    if [[ ! -f "$dest" ]]; then
      echo "DRIFT: missing publish file $dest (run pnpm marketing:sync)" >&2
      drift=1
      continue
    fi
    if is_symlink "$dest"; then
      echo "DRIFT: publish file is a symlink $dest" >&2
      drift=1
      continue
    fi
    if ! diff -q "$src" "$dest" >/dev/null; then
      echo "DRIFT: $base — edit apps/marketing/$base then pnpm marketing:sync" >&2
      drift=1
    fi
  done
  if [[ ! -d "$ROOT/assets" ]]; then
    echo "DRIFT: missing publish directory $ROOT/assets (run pnpm marketing:sync)" >&2
    drift=1
  elif is_symlink "$ROOT/assets"; then
    echo "DRIFT: publish assets directory is a symlink" >&2
    drift=1
  else
    assert_asset_tree_safe "$ROOT/assets"
    if ! diff -qr "$SRC/assets" "$ROOT/assets" >/dev/null; then
      echo "DRIFT: assets — edit apps/marketing/assets then pnpm marketing:sync" >&2
      drift=1
    fi
  fi
  if [[ -e "$SRC/source-assets" ]]; then
    if [[ -e "$ROOT/source-assets" ]]; then
      echo "DRIFT: source-assets leaked to repository root" >&2
      drift=1
    fi
    if [[ -e "$SRC/dist/source-assets" ]]; then
      echo "DRIFT: source-assets leaked into apps/marketing/dist" >&2
      drift=1
    fi
  fi
  if [[ "$drift" -ne 0 ]]; then
    echo "marketing publish surface out of sync with apps/marketing" >&2
    exit 1
  fi
  echo "marketing:check ok (index.html, styles.css, .htaccess, assets/)"
}

sync_publish() {
  local src dest base exit_code
  assert_sources
  stage="$(mktemp -d "$ROOT/.marketing-sync.XXXXXX")"
  previous="$stage/previous"
  backup_started=0
  publish_committed=0

  cleanup_stage() {
    exit_code=$?
    set +e
    if [[ "$backup_started" -eq 1 && "$publish_committed" -ne 1 ]]; then
      rm -rf "$ROOT/assets" "$SRC/dist"
      [[ -d "$previous/assets" ]] && cp -R "$previous/assets" "$ROOT/assets"
      [[ -d "$previous/dist" ]] && cp -R "$previous/dist" "$SRC/dist"
      for pair in "${publish_pairs[@]}"; do
        dest="${pair##*:}"
        base="$(basename "$dest")"
        rm -f "$dest"
        [[ -f "$previous/$base" ]] && cp "$previous/$base" "$dest"
      done
      backup_started=0
    fi
    rm -rf "$stage"
    return "$exit_code"
  }
  trap cleanup_stage EXIT HUP INT TERM

  mkdir -p "$stage/publish" "$stage/dist" "$previous"
  for pair in "${publish_pairs[@]}"; do
    src="${pair%%:*}"
    dest="${pair##*:}"
    base="$(basename "$src")"
    assert_publish_destination_safe "$dest"
    # Copy file contents only; never preserve source symlinks.
    cp -f "$src" "$stage/publish/$base"
    cp -f "$src" "$stage/dist/$base"
    if is_symlink "$stage/publish/$base" || is_symlink "$stage/dist/$base"; then
      die "staged publish copy became a symlink: $base"
    fi
  done

  mkdir -p "$stage/publish/assets" "$stage/dist/assets"
  # Copy asset contents only; reject any symlink entry before/while copying.
  while IFS= read -r -d '' path; do
    rel="${path#"$SRC/assets/"}"
    if is_symlink "$path"; then
      die "refusing symlink asset source: $path"
    fi
    if [[ -d "$path" ]]; then
      mkdir -p "$stage/publish/assets/$rel" "$stage/dist/assets/$rel"
    elif [[ -f "$path" ]]; then
      mkdir -p "$stage/publish/assets/$(dirname "$rel")" "$stage/dist/assets/$(dirname "$rel")"
      cp -f "$path" "$stage/publish/assets/$rel"
      cp -f "$path" "$stage/dist/assets/$rel"
    else
      die "unsupported asset entry: $path"
    fi
  done < <(find "$SRC/assets" -mindepth 1 -print0)

  assert_asset_tree_safe "$stage/publish/assets"
  assert_asset_tree_safe "$stage/dist/assets"

  if [[ -e "$ROOT/assets" && ! -d "$ROOT/assets" ]]; then
    die "publish path is not a directory: $ROOT/assets"
  fi
  if [[ -e "$SRC/dist" && ! -d "$SRC/dist" ]]; then
    die "preview path is not a directory: $SRC/dist"
  fi
  if [[ -e "$ROOT/assets" ]] && is_symlink "$ROOT/assets"; then
    die "refusing symlink publish destination: $ROOT/assets"
  fi
  if [[ -e "$SRC/dist" ]] && is_symlink "$SRC/dist"; then
    die "refusing symlink preview destination: $SRC/dist"
  fi

  # Snapshot current outputs before replacement so any ordinary failure or
  # handled signal restores the complete prior publish surface.
  [[ -d "$ROOT/assets" ]] && cp -R "$ROOT/assets" "$previous/assets"
  [[ -d "$SRC/dist" ]] && cp -R "$SRC/dist" "$previous/dist"
  for pair in "${publish_pairs[@]}"; do
    dest="${pair##*:}"
    base="$(basename "$dest")"
    [[ -f "$dest" ]] && cp "$dest" "$previous/$base"
  done
  backup_started=1

  rm -rf "$ROOT/assets"
  mv "$stage/publish/assets" "$ROOT/assets"
  for pair in "${publish_pairs[@]}"; do
    dest="${pair##*:}"
    base="$(basename "$dest")"
    mv -f "$stage/publish/$base" "$dest"
  done

  rm -rf "$SRC/dist"
  mv "$stage/dist" "$SRC/dist"
  publish_committed=1

  # Ensure source archive never ships with publish surfaces.
  rm -rf "$ROOT/source-assets" "$SRC/dist/source-assets"

  echo "  published assets/"
  for pair in "${publish_pairs[@]}"; do
    echo "  published $(basename "${pair##*:}")"
  done
  echo "  apps/marketing/dist/ refreshed (local/CI artifact preview)"
  echo "marketing:sync ok — Path M root publish surface updated"
}

run_self_tests() {
  local work script_copy rc first second
  work="$(mktemp -d "$ROOT/.marketing-selftest.XXXXXX")"
  cleanup_self_test() {
    rm -rf "$work"
  }
  trap cleanup_self_test EXIT HUP INT TERM

  mkdir -p "$work/repo/apps/marketing/assets" "$work/repo/scripts" "$work/outside"
  printf 'outside-secret\n' > "$work/outside/secret.txt"
  printf '<html>ok</html>\n' > "$work/repo/apps/marketing/index.html"
  printf 'body{}\n' > "$work/repo/apps/marketing/styles.css"
  printf 'Require all granted\n' > "$work/repo/apps/marketing/.htaccess"
  printf 'asset\n' > "$work/repo/apps/marketing/assets/ok.txt"
  cp "$ROOT/scripts/sync-marketing.sh" "$work/repo/scripts/sync-marketing.sh"
  chmod +x "$work/repo/scripts/sync-marketing.sh"
  script_copy="$work/repo/scripts/sync-marketing.sh"

  # Baseline sync/check must pass on a clean tree.
  bash "$script_copy" sync >/dev/null
  bash "$script_copy" check >/dev/null

  # Deterministic repeat sync.
  first="$(find "$work/repo/assets" -type f -print0 | sort -z | xargs -0 shasum | shasum | awk '{print $1}')"
  bash "$script_copy" sync >/dev/null
  second="$(find "$work/repo/assets" -type f -print0 | sort -z | xargs -0 shasum | shasum | awk '{print $1}')"
  [[ "$first" == "$second" ]] || die "self-test: repeated sync was not deterministic"

  # Source/root/dist parity.
  diff -q "$work/repo/apps/marketing/index.html" "$work/repo/index.html" >/dev/null
  diff -q "$work/repo/apps/marketing/styles.css" "$work/repo/styles.css" >/dev/null
  diff -q "$work/repo/apps/marketing/.htaccess" "$work/repo/.htaccess" >/dev/null
  diff -qr "$work/repo/apps/marketing/assets" "$work/repo/assets" >/dev/null
  diff -qr "$work/repo/apps/marketing/assets" "$work/repo/apps/marketing/dist/assets" >/dev/null

  # Reject symlinked required source file.
  mv "$work/repo/apps/marketing/index.html" "$work/repo/apps/marketing/index.html.real"
  ln -s "$work/outside/secret.txt" "$work/repo/apps/marketing/index.html"
  rc=0
  bash "$script_copy" sync >/dev/null 2>"$work/err-source-file" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test: expected failure for symlink source file"
  grep -qi 'symlink' "$work/err-source-file" || die "self-test: symlink source file diagnostic missing"
  rm -f "$work/repo/apps/marketing/index.html"
  mv "$work/repo/apps/marketing/index.html.real" "$work/repo/apps/marketing/index.html"

  # Reject symlink inside assets.
  ln -s "$work/outside/secret.txt" "$work/repo/apps/marketing/assets/evil.txt"
  rc=0
  bash "$script_copy" sync >/dev/null 2>"$work/err-asset" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test: expected failure for symlink asset"
  grep -qi 'symlink' "$work/err-asset" || die "self-test: symlink asset diagnostic missing"
  rm -f "$work/repo/apps/marketing/assets/evil.txt"

  # Reject symlink publish destination.
  rm -rf "$work/repo/assets"
  ln -s "$work/outside" "$work/repo/assets"
  rc=0
  bash "$script_copy" sync >/dev/null 2>"$work/err-dest" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test: expected failure for symlink publish destination"
  grep -qi 'symlink' "$work/err-dest" || die "self-test: symlink destination diagnostic missing"
  rm -f "$work/repo/assets"
  bash "$script_copy" sync >/dev/null

  # Stale asset pruning.
  printf 'stale\n' > "$work/repo/assets/stale.txt"
  bash "$script_copy" sync >/dev/null
  [[ ! -e "$work/repo/assets/stale.txt" ]] || die "self-test: stale asset was not pruned"

  # source-assets must not publish.
  mkdir -p "$work/repo/apps/marketing/source-assets"
  printf 'master\n' > "$work/repo/apps/marketing/source-assets/master.png"
  bash "$script_copy" sync >/dev/null
  [[ ! -e "$work/repo/source-assets" ]] || die "self-test: source-assets leaked to root"
  [[ ! -e "$work/repo/apps/marketing/dist/source-assets" ]] || die "self-test: source-assets leaked to dist"

  # Reject ancestor symlink that relocates apps/marketing outside the repo.
  rm -rf "$work/repo/apps/marketing"
  mkdir -p "$work/outside/fake-marketing/assets"
  printf '<html>leaked</html>\n' > "$work/outside/fake-marketing/index.html"
  printf 'body{color:red}\n' > "$work/outside/fake-marketing/styles.css"
  printf 'Require all granted\n' > "$work/outside/fake-marketing/.htaccess"
  printf 'outside-asset\n' > "$work/outside/fake-marketing/assets/leak.txt"
  printf 'outside-secret\n' > "$work/outside/secret.txt"
  ln -s "$work/outside/fake-marketing" "$work/repo/apps/marketing"
  rc=0
  bash "$script_copy" sync >/dev/null 2>"$work/err-ancestor" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test: expected failure for ancestor symlink marketing root"
  grep -Eiq 'symlink|escapes|source root' "$work/err-ancestor" || die "self-test: ancestor symlink diagnostic missing"
  [[ ! -e "$work/repo/assets/leak.txt" ]] || die "self-test: ancestor symlink published external asset"
  if [[ -f "$work/repo/index.html" ]] && grep -q 'leaked' "$work/repo/index.html"; then
    die "self-test: ancestor symlink published external HTML"
  fi
  rm -f "$work/repo/apps/marketing"

  echo "marketing:self-test ok (parity, deterministic sync, symlink rejects, ancestor boundary, prune, source-assets exclusion)"
  cleanup_self_test
  trap - EXIT HUP INT TERM
}

case "$mode" in
  sync) sync_publish ;;
  check) check_drift ;;
  self-test) run_self_tests ;;
  *)
    echo "Usage: $0 [sync|check|self-test]" >&2
    exit 2
    ;;
esac
