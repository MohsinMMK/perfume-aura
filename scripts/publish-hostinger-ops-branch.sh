#!/usr/bin/env bash
# Publish a verified Hostinger deploy tree to a generated orphan branch.
#
# Release semantics:
# - Deploy branch is replaced as a single orphan commit with force-with-lease.
# - Deployed source commits are monotonic: previous artifact-manifest
#   source.commit must be an ancestor of the candidate source commit.
# - Running release may finish after newer main commits land; newer run deploys
#   afterward. Publisher does NOT require equality with current main tip.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_BRANCH="hostinger-ops-production"
DEFAULT_REMOTE="origin"

# Overridable no-op hook for in-process self-tests only.
# Production never reads env for commands; hook stays a bash function.
publish_race_hook() {
  local _phase="${1:-}"
  :
}

usage() {
  cat <<'EOF'
usage:
  bash scripts/publish-hostinger-ops-branch.sh \
    --tree <verified-deploy-tree> \
    --commit <40-char-source-sha> \
    [--surface ops|storefront] \
    [--branch hostinger-ops-production] \
    [--remote origin] \
    [--repository-url <git-url>]

  bash scripts/publish-hostinger-ops-branch.sh self-test
EOF
}

is_full_sha() {
  [[ "$1" =~ ^[0-9a-f]{40}$ ]]
}

copy_http_extraheader_into() {
  local publish_dir="$1"
  local source_key value
  source_key="$(
    git -C "$ROOT" config --get-regexp '^http\.https://github\.com/\.extraheader$' 2>/dev/null \
      | awk '{print $1}' \
      | head -n 1 \
      || true
  )"
  if [[ -z "$source_key" ]]; then
    return 0
  fi
  value="$(git -C "$ROOT" config --get "$source_key" || true)"
  if [[ -z "$value" ]]; then
    return 0
  fi
  # Copy authorization extraheader without printing the token value.
  git -C "$publish_dir" config "$source_key" "$value"
}

remote_ref_sha() {
  local repository_url="$1"
  local ref_name="$2"
  git ls-remote "$repository_url" "$ref_name" 2>/dev/null \
    | awk '{print $1}' \
    | head -n 1 \
    || true
}

# Read artifact-manifest.json source.commit from an existing deploy-branch tip.
read_deployed_source_commit() {
  local repository_url="$1"
  local branch="$2"
  local observed_sha="$3"
  local work_dir tip previous

  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/perfume-aura-deploy-manifest.XXXXXX")"
  if ! (
    set -euo pipefail
    git -C "$work_dir" init --bare >/dev/null 2>&1
    # Fetch only the orphan deploy tip (one commit, full tree).
    git -C "$work_dir" fetch --depth=1 --no-tags "$repository_url" \
      "+refs/heads/${branch}:refs/heads/${branch}" >/dev/null 2>&1
    tip="$(git -C "$work_dir" rev-parse "refs/heads/${branch}")"
    if [[ "$tip" != "$observed_sha" ]]; then
      echo "ERROR: deploy branch tip moved during ancestry inspection" >&2
      exit 1
    fi
    git -C "$work_dir" show "${tip}:artifact-manifest.json" >"$work_dir/artifact-manifest.json"
  ); then
    rm -rf -- "$work_dir"
    return 1
  fi

  if ! previous="$(
    node - "$work_dir/artifact-manifest.json" <<'NODE'
const fs = require("node:fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const commit = String(manifest?.source?.commit ?? "").trim().toLowerCase();
if (!/^[0-9a-f]{40}$/.test(commit)) {
  process.stderr.write("ERROR: deploy branch artifact-manifest source.commit invalid\n");
  process.exit(2);
}
process.stdout.write(commit);
NODE
  )"; then
    rm -rf -- "$work_dir"
    return 1
  fi
  rm -rf -- "$work_dir"
  printf '%s\n' "$previous"
}

# Ensure previous deployed source is an ancestor of the candidate source commit.
assert_source_ancestry() {
  local repository_url="$1"
  local previous_source="$2"
  local candidate_source="$3"
  local work_dir

  if [[ "$previous_source" == "$candidate_source" ]]; then
    # Same source republish is allowed (idempotent).
    return 0
  fi

  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/perfume-aura-source-ancestry.XXXXXX")"
  if ! (
    set -euo pipefail
    git -C "$work_dir" init --bare >/dev/null 2>&1
    # Fetch main history (source-of-truth lineage).
    git -C "$work_dir" fetch --no-tags "$repository_url" \
      "+refs/heads/main:refs/heads/main" >/dev/null 2>&1
    # Best-effort explicit fetches when commits are not on fetched main tip path.
    git -C "$work_dir" fetch --no-tags "$repository_url" \
      "$previous_source" "$candidate_source" >/dev/null 2>&1 || true

    if ! git -C "$work_dir" cat-file -e "${previous_source}^{commit}" 2>/dev/null; then
      echo "ERROR: previous deployed source commit not found in source history: ${previous_source}" >&2
      exit 1
    fi
    if ! git -C "$work_dir" cat-file -e "${candidate_source}^{commit}" 2>/dev/null; then
      echo "ERROR: candidate source commit not found in source history: ${candidate_source}" >&2
      exit 1
    fi
    if ! git -C "$work_dir" merge-base --is-ancestor "$previous_source" "$candidate_source"; then
      echo "ERROR: refusing deploy-source regression: ${previous_source} is not an ancestor of ${candidate_source}" >&2
      exit 1
    fi
  ); then
    rm -rf -- "$work_dir"
    return 1
  fi
  rm -rf -- "$work_dir"
  return 0
}

publish_tree() {
  local tree_root="$1"
  local source_commit="$2"
  local branch="$3"
  local remote="$4"
  local repository_url="${5:-}"
  local surface="${6:-ops}"
  local observed_sha work_root tree_copy publish_dir tree_sha commit_sha
  local previous_source

  if [[ ! -d "$tree_root" ]]; then
    echo "ERROR: deploy tree not found: $tree_root" >&2
    return 1
  fi
  source_commit="$(printf '%s' "$source_commit" | tr 'A-F' 'a-f')"
  if ! is_full_sha "$source_commit"; then
    echo "ERROR: source commit must be a 40-character lowercase SHA" >&2
    return 1
  fi
  if [[ "$surface" != "ops" && "$surface" != "storefront" ]]; then
    echo "ERROR: surface must be ops or storefront" >&2
    return 1
  fi

  # Explicit status checks: callers may invoke this function inside conditionals
  # where bash disables set -e inside the function body.
  if ! node "$ROOT/scripts/verify-hostinger-ops-deploy-tree.mjs" \
    "$tree_root" "$source_commit" --surface "$surface"; then
    return 1
  fi

  if [[ -z "$repository_url" ]]; then
    if ! repository_url="$(git -C "$ROOT" remote get-url "$remote")"; then
      echo "ERROR: cannot resolve remote URL for ${remote}" >&2
      return 1
    fi
  fi

  observed_sha="$(remote_ref_sha "$repository_url" "refs/heads/$branch")"
  if [[ -n "$observed_sha" ]] && ! is_full_sha "$observed_sha"; then
    echo "ERROR: remote branch SHA malformed" >&2
    return 1
  fi

  # Monotonic deploy-source guard: never publish an older/non-descendant source
  # over a newer already-published source. First publish has no previous tip.
  if [[ -n "$observed_sha" ]]; then
    if ! previous_source="$(read_deployed_source_commit "$repository_url" "$branch" "$observed_sha")"; then
      return 1
    fi
    if ! assert_source_ancestry "$repository_url" "$previous_source" "$source_commit"; then
      return 1
    fi
  fi

  publish_race_hook "after-lease-capture" "$repository_url" "$branch" "$source_commit" "$observed_sha"

  work_root="$(mktemp -d "${TMPDIR:-/tmp}/perfume-aura-hostinger-publish.XXXXXX")"
  tree_copy="$work_root/tree"
  publish_dir="$work_root/git"
  mkdir -p "$tree_copy" "$publish_dir"

  cleanup_publish() {
    rm -rf -- "$work_root"
  }

  if ! (
    set -euo pipefail
    cp -R "$tree_root"/. "$tree_copy"/

    git -C "$publish_dir" init --initial-branch="$branch" >/dev/null
    git -C "$publish_dir" config user.name "perfume-aura-ci"
    git -C "$publish_dir" config user.email "ci@users.noreply.github.com"
    git -C "$publish_dir" config commit.gpgsign false
    copy_http_extraheader_into "$publish_dir"

    git -C "$publish_dir" --work-tree="$tree_copy" add -A
    if git -C "$publish_dir" --work-tree="$tree_copy" diff --cached --quiet; then
      echo "ERROR: publish tree produced empty git index" >&2
      exit 1
    fi

    tree_sha="$(git -C "$publish_dir" write-tree)"
    commit_sha="$(
      git -C "$publish_dir" commit-tree "$tree_sha" \
        -m "deploy(${surface}): hostinger prebuilt ${source_commit}"
    )"
    git -C "$publish_dir" update-ref "refs/heads/$branch" "$commit_sha"
    git -C "$publish_dir" remote add publish "$repository_url"

    publish_race_hook "before-push" "$repository_url" "$branch" "$source_commit" "$observed_sha"

    if [[ -n "$observed_sha" ]]; then
      if ! git -C "$publish_dir" push \
        --force-with-lease="refs/heads/${branch}:${observed_sha}" \
        publish "HEAD:refs/heads/${branch}"; then
        echo "ERROR: force-with-lease rejected for ${branch}" >&2
        exit 1
      fi
    else
      if ! git -C "$publish_dir" push publish "HEAD:refs/heads/${branch}"; then
        echo "ERROR: initial push failed for ${branch}" >&2
        exit 1
      fi
    fi

    echo "published ${branch} surface=${surface} source=${source_commit} commit=${commit_sha}"
  ); then
    cleanup_publish
    return 1
  fi

  cleanup_publish
  return 0
}

write_fixture_tree() {
  local root="$1"
  local commit="$2"
  node - "$root" "$commit" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const root = process.argv[2];
const commit = process.argv[3];
const dirs = [
  "apps/ops/.next/static/chunks",
  "apps/ops/.next/node_modules",
  "apps/ops/node_modules/next",
  "apps/ops/node_modules/sharp",
  "apps/ops/node_modules/@img/sharp-linux-x64",
  "apps/ops/node_modules/@img/sharp-libvips-linux-x64",
];
for (const dir of dirs) fs.mkdirSync(path.join(root, dir), { recursive: true });
fs.writeFileSync(path.join(root, "apps/ops/server.js"), `console.log('${commit.slice(0, 1)}')\n`);
fs.writeFileSync(path.join(root, "apps/ops/.next/static/chunks/main.js"), "export default 1\n");
fs.writeFileSync(
  path.join(root, "apps/ops/node_modules/next/package.json"),
  JSON.stringify({ name: "next", version: "16.2.11" }),
);
fs.writeFileSync(
  path.join(root, "apps/ops/node_modules/sharp/package.json"),
  JSON.stringify({ name: "sharp", version: "0.35.3" }),
);
fs.writeFileSync(path.join(root, "apps/ops/node_modules/@img/sharp-linux-x64/index.js"), "module.exports={}\n");
fs.writeFileSync(
  path.join(root, "apps/ops/node_modules/@img/sharp-libvips-linux-x64/index.js"),
  "module.exports={}\n",
);
const runtimeLockContents = "{}\n";
fs.writeFileSync(
  path.join(root, "runtime-package-lock.json"),
  runtimeLockContents,
);
fs.writeFileSync(
  path.join(root, "README.hostinger.txt"),
  "Hostinger prebuilt deploy tree\n",
);
fs.writeFileSync(
  path.join(root, "package.json"),
  `${JSON.stringify(
    {
      name: "perfume-aura-standalone",
      private: true,
      dependencies: {},
      devDependencies: {},
      scripts: {
        build: "echo prebuilt-standalone",
        postinstall: "echo skip-postinstall",
        start: "node apps/ops/server.js",
      },
    },
    null,
    2,
  )}\n`,
);
fs.writeFileSync(
  path.join(root, "artifact-manifest.json"),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      application: "@perfume-aura/ops",
      source: { commit, dirty: false },
      runtimeDependencyLock: {
        source: "scripts/ops-runtime-deps/package-lock.json",
        artifact: "runtime-package-lock.json",
        sha256: crypto
          .createHash("sha256")
          .update(runtimeLockContents)
          .digest("hex"),
      },
      entry: "apps/ops/server.js",
      requiredPaths: [
        "package.json",
        "runtime-package-lock.json",
        "apps/ops/server.js",
        "apps/ops/.next/static",
        "apps/ops/.next/node_modules",
        "apps/ops/node_modules/next/package.json",
        "apps/ops/node_modules/sharp/package.json",
        "apps/ops/node_modules/@img/sharp-linux-x64",
        "apps/ops/node_modules/@img/sharp-libvips-linux-x64",
      ],
    },
    null,
    2,
  )}\n`,
);
NODE
}

self_test() {
  local bare remote_url tree_a tree_b tree_c invalid branch
  local commit_a commit_b commit_c
  local count first_sha second_sha status main_work
  local race_err after_lease_sha recovered_sha deployed_source
  # Non-local so EXIT trap can still clean after function return under set -u.
  PUBLISH_SELF_TEST_BASE="$(mktemp -d "${TMPDIR:-/tmp}/perfume-aura-publish-self-test.XXXXXX")"
  bare="$PUBLISH_SELF_TEST_BASE/remote.git"
  tree_a="$PUBLISH_SELF_TEST_BASE/tree-a"
  tree_b="$PUBLISH_SELF_TEST_BASE/tree-b"
  tree_c="$PUBLISH_SELF_TEST_BASE/tree-c"
  invalid="$PUBLISH_SELF_TEST_BASE/invalid"
  main_work="$PUBLISH_SELF_TEST_BASE/main-work"
  branch="hostinger-ops-production"
  commit_a=""
  commit_b=""
  commit_c=""
  status=0

  cleanup_self_test() {
    rm -rf -- "${PUBLISH_SELF_TEST_BASE:-}"
    unset PUBLISH_SELF_TEST_BASE
  }
  trap cleanup_self_test EXIT

  git init --bare "$bare" >/dev/null
  remote_url="$bare"

  # Source history main A → B → C (lineage for ancestry checks).
  git clone "$remote_url" "$main_work" >/dev/null 2>&1
  git -C "$main_work" checkout -b main >/dev/null 2>&1
  git -C "$main_work" config user.name ci
  git -C "$main_work" config user.email ci@users.noreply.github.com
  echo A >"$main_work/a.txt"
  git -C "$main_work" add a.txt
  git -C "$main_work" commit -m A >/dev/null
  git -C "$main_work" push origin HEAD:refs/heads/main >/dev/null
  commit_a="$(git -C "$main_work" rev-parse HEAD)"

  echo B >"$main_work/b.txt"
  git -C "$main_work" add b.txt
  git -C "$main_work" commit -m B >/dev/null
  git -C "$main_work" push origin HEAD:refs/heads/main >/dev/null
  commit_b="$(git -C "$main_work" rev-parse HEAD)"

  echo C >"$main_work/c.txt"
  git -C "$main_work" add c.txt
  git -C "$main_work" commit -m C >/dev/null
  git -C "$main_work" push origin HEAD:refs/heads/main >/dev/null
  commit_c="$(git -C "$main_work" rev-parse HEAD)"

  mkdir -p "$tree_a" "$tree_b" "$tree_c" "$invalid"
  write_fixture_tree "$tree_a" "$commit_a"
  write_fixture_tree "$tree_b" "$commit_b"
  write_fixture_tree "$tree_c" "$commit_c"
  echo only >"$invalid/only.txt"

  # First publish A (no previous deploy tip).
  if ! publish_tree "$tree_a" "$commit_a" "$branch" "origin" "$remote_url"; then
    echo "ERROR: first publish of A failed" >&2
    status=1
  fi
  count="$(git --git-dir="$bare" rev-list --count "refs/heads/$branch")"
  if [[ "$count" != "1" ]]; then
    echo "ERROR: expected single commit after first publish" >&2
    status=1
  fi
  first_sha="$(git --git-dir="$bare" rev-parse "refs/heads/$branch")"

  # Publish descendant B.
  if ! publish_tree "$tree_b" "$commit_b" "$branch" "origin" "$remote_url"; then
    echo "ERROR: publish of B failed" >&2
    status=1
  fi
  count="$(git --git-dir="$bare" rev-list --count "refs/heads/$branch")"
  second_sha="$(git --git-dir="$bare" rev-parse "refs/heads/$branch")"
  if [[ "$count" != "1" || "$first_sha" == "$second_sha" ]]; then
    echo "ERROR: second publish did not replace single commit" >&2
    status=1
  fi
  deployed_source="$(
    git --git-dir="$bare" show "refs/heads/$branch:artifact-manifest.json" \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const m=JSON.parse(s);process.stdout.write(String(m.source.commit))})'
  )"
  if [[ "$deployed_source" != "$commit_b" ]]; then
    echo "ERROR: deploy branch manifest source is not B after second publish" >&2
    status=1
  fi

  # Regression: A after B must be rejected (B is not an ancestor of A).
  race_err="$(
    publish_tree "$tree_a" "$commit_a" "$branch" "origin" "$remote_url" 2>&1 \
      || true
  )"
  if [[ "$race_err" != *"refusing deploy-source regression"* ]]; then
    echo "ERROR: publish of A after B was not rejected by ancestry guard" >&2
    printf '%s\n' "$race_err" >&2
    status=1
  fi
  if [[ "$(git --git-dir="$bare" rev-parse "refs/heads/$branch")" != "$second_sha" ]]; then
    echo "ERROR: rejected A publish mutated deploy branch tip" >&2
    status=1
  fi

  # Invalid tree must fail closed.
  if publish_tree "$invalid" "$commit_b" "$branch" "origin" "$remote_url" >/dev/null 2>&1; then
    echo "ERROR: invalid tree publish unexpectedly succeeded" >&2
    status=1
  fi

  # Deterministic lease race through publish_tree: advance deploy branch after
  # lease capture, before push. force-with-lease must reject.
  # Hijack tip uses source A (ancestor of B) so recovery publish of B remains legal.
  publish_race_hook() {
    local phase="${1:-}"
    local repository_url="${2:-}"
    local branch_name="${3:-}"
    if [[ "$phase" != "after-lease-capture" ]]; then
      return 0
    fi
    local hijack="$PUBLISH_SELF_TEST_BASE/lease-hijack"
    rm -rf -- "$hijack"
    mkdir -p "$hijack"
    write_fixture_tree "$hijack" "$commit_a"
    git init --initial-branch=tmp "$hijack" >/dev/null
    git -C "$hijack" config user.name ci
    git -C "$hijack" config user.email ci@users.noreply.github.com
    git -C "$hijack" add -A
    git -C "$hijack" commit -m "lease-race" >/dev/null
    git -C "$hijack" remote add origin "$repository_url"
    git -C "$hijack" push --force origin "HEAD:refs/heads/${branch_name}" >/dev/null
  }
  race_err="$(
    publish_tree "$tree_b" "$commit_b" "$branch" "origin" "$remote_url" 2>&1 \
      || true
  )"
  if [[ "$race_err" != *"force-with-lease rejected"* && "$race_err" != *"failed to push"* && "$race_err" != *"rejected"* && "$race_err" != *"lease"* ]]; then
    echo "ERROR: publish_tree did not refuse deploy-branch lease race" >&2
    printf '%s\n' "$race_err" >&2
    status=1
  fi
  after_lease_sha="$(git --git-dir="$bare" rev-parse "refs/heads/$branch")"
  if [[ "$after_lease_sha" == "$second_sha" ]]; then
    echo "ERROR: lease-race hook did not move deploy branch" >&2
    status=1
  fi

  # Restore no-op hook (external env must not activate hooks).
  publish_race_hook() {
    local _phase="${1:-}"
    :
  }

  # Recovery: publish B over hijacked tip (source A → candidate B is legal).
  if ! publish_tree "$tree_b" "$commit_b" "$branch" "origin" "$remote_url"; then
    echo "ERROR: recovery publish of B after lease race failed" >&2
    status=1
  fi
  count="$(git --git-dir="$bare" rev-list --count "refs/heads/$branch")"
  recovered_sha="$(git --git-dir="$bare" rev-parse "refs/heads/$branch")"
  deployed_source="$(
    git --git-dir="$bare" show "refs/heads/$branch:artifact-manifest.json" \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const m=JSON.parse(s);process.stdout.write(String(m.source.commit))})'
  )"
  if [[ "$count" != "1" ]]; then
    echo "ERROR: expected single orphan commit after recovery" >&2
    status=1
  fi
  if [[ "$deployed_source" != "$commit_b" ]]; then
    echo "ERROR: final deploy branch manifest source is not B" >&2
    status=1
  fi
  if [[ -z "$recovered_sha" ]]; then
    echo "ERROR: missing recovered deploy tip" >&2
    status=1
  fi
  # commit_c remains on main only to prove A→B→C lineage exists for ancestry.
  if [[ -z "$commit_c" ]]; then
    echo "ERROR: missing source commit C in lineage fixture" >&2
    status=1
  fi

  if [[ "$status" -eq 0 ]]; then
    echo "publish-hostinger-ops-branch self-test ok"
  fi
  trap - EXIT
  cleanup_self_test
  return "$status"
}

main() {
  if [[ "${1:-}" == "self-test" ]]; then
    self_test
    return 0
  fi

  local tree="" commit="" branch="$DEFAULT_BRANCH" remote="$DEFAULT_REMOTE"
  local repository_url="" surface="ops"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tree)
        tree="${2:-}"
        shift 2
        ;;
      --commit)
        commit="${2:-}"
        shift 2
        ;;
      --surface)
        surface="${2:-}"
        shift 2
        ;;
      --branch)
        branch="${2:-}"
        shift 2
        ;;
      --remote)
        remote="${2:-}"
        shift 2
        ;;
      --repository-url)
        repository_url="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        return 0
        ;;
      *)
        echo "ERROR: unknown argument: $1" >&2
        usage >&2
        return 1
        ;;
    esac
  done

  if [[ -z "$tree" || -z "$commit" ]]; then
    usage >&2
    return 1
  fi

  publish_tree "$tree" "$commit" "$branch" "$remote" "$repository_url" "$surface"
}

main "$@"
