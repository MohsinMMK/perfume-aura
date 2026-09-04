import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const prefix = "deploy/storefront-vps/";
const compose = readFileSync(`${prefix}compose.yaml`, "utf8");
for (const contract of [
  "127.0.0.1:3031:3000", "read_only: true", "no-new-privileges:true",
  "mem_limit: 768m", "pids_limit: 256", "max-size: \"10m\"",
  "/etc/khanect/perfume-aura-storefront.env", "b.commit!==process.env.EXPECTED_SOURCE_SHA",
]) assert.ok(compose.includes(contract), `missing isolation contract: ${contract}`);
assert.doesNotMatch(compose, /docker.sock|privileged:|3020:|perfume-aura-ops.env/);
for (const flag of ["CUSTOMER_AUTH_ENABLED", "INQUIRIES_ENABLED", "PREVIEW_CATALOG", "PUBLIC_RELEASE", "CHECKOUT_RELEASE_APPROVED"])
  assert.ok(compose.includes(`STOREFRONT_${flag}: "false"`));

const sshCommand = `${prefix}deploy-ssh.sh`;
for (const command of ["", "bash", "deploy main latest", "probe; id", `deploy ${"a".repeat(40)} sha256:${"b".repeat(64)} extra`, `deploy ${"a".repeat(40)} sha256:${"b".repeat(64)}\nid`]) {
  const result = spawnSync("bash", [sshCommand], { env: { ...process.env, SSH_ORIGINAL_COMMAND: command }, encoding: "utf8" });
  assert.equal(result.status, 2, `must reject ${JSON.stringify(command)}`);
}
const probe = spawnSync("bash", [sshCommand], { env: { ...process.env, SSH_ORIGINAL_COMMAND: "probe" }, encoding: "utf8" });
assert.equal(probe.status, 0);
assert.equal(probe.stdout.trim(), "perfume-aura-storefront-deploy-ready");
const root = readFileSync(`${prefix}deploy-root.sh`, "utf8");
for (const contract of ["flock -w 900", "--network none", "m.source.dirty, false", 'compose "$state/current.env"', "--wait --wait-timeout 150"])
  assert.ok(root.includes(contract), `missing root deployment contract: ${contract}`);
assert.doesNotMatch(root, /eval |source \"|docker (system|volume) prune|perfume-aura-ops/);
const rejectedCandidate = root.match(/if ! compose "\$candidate"; then\n[\s\S]*?\nfi/);
assert.ok(rejectedCandidate, "candidate failure branch must exist");
// Execute the real failure branch with harmless command doubles, never Docker.
for (const hasAcceptedImage of [false, true]) {
  const state = mkdtempSync(join(tmpdir(), "storefront-rejection-test-"));
  try {
    if (hasAcceptedImage) writeFileSync(join(state, "current.env"), "fixture\n");
    const result = spawnSync("bash", ["-c", `
      set -euo pipefail
      state=$1
      candidate=candidate-fixture
      stack=compose-fixture
      compose() { printf 'compose:%s\\n' "$1"; [[ "$1" != "$candidate" ]]; }
      docker() { printf 'docker:%s\\n' "$*"; }
      ${rejectedCandidate[0]}
    `, "test", state], { encoding: "utf8" });
    assert.equal(result.status, 1);
    if (hasAcceptedImage) {
      assert.ok(result.stdout.includes(`compose:${state}/current.env`));
      assert.doesNotMatch(result.stdout, /docker:/);
    } else {
      assert.match(result.stdout, /docker:compose --env-file candidate-fixture -f compose-fixture stop app/);
    }
  } finally {
    rmSync(state, { recursive: true });
  }
}
console.log("storefront VPS contract ok");
