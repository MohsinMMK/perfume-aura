import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

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
console.log("storefront VPS contract ok");
