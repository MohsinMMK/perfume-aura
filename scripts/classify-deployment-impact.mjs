import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

export function requiresProductionPublish(changedPaths) {
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) {
    return true;
  }

  return changedPaths.some((changedPath) => {
    return typeof changedPath !== "string" || !changedPath.endsWith(".md");
  });
}

function runSelfTests() {
  assert.equal(requiresProductionPublish([]), true);
  assert.equal(requiresProductionPublish(["docs/CURRENT_STATE.md"]), false);
  assert.equal(
    requiresProductionPublish(["README.md", "apps/ops/README.md"]),
    false,
  );
  assert.equal(
    requiresProductionPublish(["docs/CURRENT_STATE.md", "package.json"]),
    true,
  );
  assert.equal(requiresProductionPublish(["docs/release.json"]), true);
  process.stdout.write("deployment-impact self-test ok\n");
}

function readNullDelimitedPaths() {
  const rawPaths = readFileSync(0);
  return rawPaths
    .toString("utf8")
    .split("\0")
    .filter((changedPath) => changedPath.length > 0);
}

const command = process.argv[2];

if (command === "self-test") {
  runSelfTests();
} else if (command === "--stdin0") {
  process.stdout.write(
    `${requiresProductionPublish(readNullDelimitedPaths()) ? "true" : "false"}\n`,
  );
} else {
  throw new Error("Usage: classify-deployment-impact.mjs self-test|--stdin0");
}
