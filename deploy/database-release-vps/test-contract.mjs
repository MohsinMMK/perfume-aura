import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const prefix = "deploy/database-release-vps/";
const sshCommand = `${prefix}release-ssh.sh`;
const valid = `release ${"a".repeat(40)} sha256:${"b".repeat(64)}`;
for (const command of ["", "bash", "release main latest", "probe; id", `deploy ${"a".repeat(40)} sha256:${"b".repeat(64)}`, `${valid} extra`, `${valid}\nid`]) {
  const result = spawnSync("bash", [sshCommand], { env: { ...process.env, SSH_ORIGINAL_COMMAND: command }, encoding: "utf8" });
  assert.equal(result.status, 2, `must reject ${JSON.stringify(command)}`);
}
const probe = spawnSync("bash", [sshCommand], { env: { ...process.env, SSH_ORIGINAL_COMMAND: "probe" }, encoding: "utf8" });
assert.equal(probe.status, 0);
assert.equal(probe.stdout.trim(), "perfume-aura-database-release-ready");

const root = readFileSync(`${prefix}release-root.sh`, "utf8");
for (const contract of [
  "flock -w 1800", "test \"$(stat -c '%U:%a' \"$release_env\")\" = root:600", "--network none",
  "m.source.dirty, false", "--cap-drop ALL", "--read-only", "--user 10001:10001",
  "--env-file \"$release_env\"", "release backup > \"$dump.partial\"", "test -s \"$dump.partial\"",
  "release release",
]) assert.ok(root.includes(contract), `missing database release contract: ${contract}`);
// Backups precede any write; the owner URL never reaches argv or the CI log.
assert.ok(root.indexOf("release backup") < root.indexOf("release release"));
assert.doesNotMatch(root, /eval |source "|\. "\$|docker (system|volume|image) prune|MIGRATION_DATABASE_URL|perfume-aura-(ops|storefront)\.env/);

const sudoers = readFileSync(`${prefix}sudoers`, "utf8");
assert.match(sudoers, /^perfume-database-release ALL=\(root\) NOPASSWD: \/usr\/local\/libexec\/perfume-aura-database-release-root \*$/m);
assert.equal(sudoers.trim().split("\n").length, 2);

const dockerfile = readFileSync(`${prefix}Dockerfile`, "utf8");
for (const from of dockerfile.matchAll(/^FROM (\S+)/gm)) {
  assert.ok(from[1] === "node-runtime" || /@sha256:[0-9a-f]{64}$/.test(from[1]), `unpinned base ${from[1]}`);
}
assert.match(dockerfile, /npm ci --omit=dev --ignore-scripts/);
assert.match(dockerfile, /^USER 10001:10001$/m);
assert.doesNotMatch(dockerfile, /COPY \. |COPY [^\n]*\.env/);

const runner = spawnSync("node", [`${prefix}runner/release.mjs`, "self-test"], { encoding: "utf8" });
assert.equal(runner.status, 0, runner.stderr);
console.log("database release VPS contract ok");
