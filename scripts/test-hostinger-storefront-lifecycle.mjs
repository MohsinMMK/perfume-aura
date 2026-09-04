import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Execute the actual launch statement against a tiny server fixture. Checking
// $! against Node's own PID catches wrapper-shell leaks without a Next build.
const builder = await readFile(new URL("./build-hostinger-storefront-source.sh", import.meta.url), "utf8");
const launch = builder.split("\n").find((line) => line.startsWith('(cd "$STAGE" && '));
assert.ok(launch, "missing Hostinger smoke launch statement");
const workDirectory = await mkdtemp(path.join(tmpdir(), "perfume-aura-smoke-lifecycle-"));
let serverPid;
try {
  await mkdir(path.join(workDirectory, "apps/storefront"), { recursive: true });
  await writeFile(path.join(workDirectory, "apps/storefront/server.js"), `
const fs = require("node:fs");
fs.writeFileSync(process.env.SMOKE_PID_FILE, String(process.pid));
setInterval(() => {}, 1000);
`);
  const shell = spawn("bash", ["-c", `
set -eu
${launch}
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true' EXIT
for attempt in {1..100}; do
  if [[ -s "$SMOKE_PID_FILE" ]]; then break; fi
  sleep 0.05
done
[[ -s "$SMOKE_PID_FILE" ]]
actual_pid="$(cat "$SMOKE_PID_FILE")"
if [[ "$SERVER_PID" != "$actual_pid" ]]; then
  echo "smoke wrapper PID $SERVER_PID does not own Node PID $actual_pid" >&2
  kill "$actual_pid" 2>/dev/null || true
  exit 1
fi
kill "$SERVER_PID"
wait "$SERVER_PID" 2>/dev/null || true
if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "smoke server survived cleanup" >&2
  exit 1
fi
`], {
    env: {
      ...process.env,
      STAGE: workDirectory,
      WORK_DIR: workDirectory,
      PORT: "0",
      SMOKE_PID_FILE: path.join(workDirectory, "server.pid"),
    },
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 10000,
  });
  let diagnostic = "";
  shell.stderr.setEncoding("utf8");
  shell.stderr.on("data", (chunk) => { diagnostic += chunk; });
  const code = await new Promise((resolve, reject) => {
    shell.once("error", reject);
    shell.once("close", resolve);
  });
  serverPid = Number(await readFile(path.join(workDirectory, "server.pid"), "utf8"));
  assert.equal(code, 0, diagnostic || "smoke lifecycle shell failed");
  assert.throws(() => process.kill(serverPid, 0), { code: "ESRCH" }, "smoke server must be gone");
  console.log("hostinger-storefront smoke lifecycle ok");
} finally {
  if (Number.isInteger(serverPid) && serverPid > 0) {
    try { process.kill(serverPid, "SIGTERM"); } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  await rm(workDirectory, { recursive: true, force: true });
}
