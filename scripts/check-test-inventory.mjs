import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path, { matchesGlob } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const ignoredDirectories = new Set([
  ".agents",
  ".claude",
  ".codex",
  ".git",
  ".next",
  ".pi",
  ".pi-subagents",
  ".playwright-cli",
  "dist",
  "node_modules",
]);

const suites = [
  {
    packageRoot: "apps/storefront",
    unitGlob: "lib/**/!(*.integration).test.ts",
    integrationGlob: "lib/**/*.integration.test.ts",
    integrationCommand: 'tsx --test "lib/**/*.integration.test.ts"',
  },
  {
    packageRoot: "apps/ops",
    unitGlob: "lib/**/!(*.integration).test.ts",
    integrationGlob: "lib/**/*.integration.test.ts",
    integrationCommand: 'tsx --test "lib/**/*.integration.test.ts"',
  },
  {
    packageRoot: "packages/db",
    unitGlob: "src/**/!(*.integration).test.ts",
    integrationGlob: "src/**/*.integration.test.ts",
    integrationCommand:
      'tsx --test --test-concurrency=1 "src/**/*.integration.test.ts"',
  },
];

async function discoverTests(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      tests.push(...(await discoverTests(absolutePath, relativePath)));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      tests.push(relativePath);
    }
  }

  return tests;
}

for (const suite of suites) {
  const manifest = JSON.parse(
    await readFile(
      path.join(repositoryRoot, suite.packageRoot, "package.json"),
      "utf8",
    ),
  );
  assert.equal(
    manifest.scripts["test:unit"],
    `tsx --test "${suite.unitGlob}"`,
    `${suite.packageRoot} must use its quoted Node 24 unit discovery glob`,
  );
  assert.equal(
    manifest.scripts["test:integration"],
    suite.integrationCommand,
    `${suite.packageRoot} must use its quoted Node 24 integration discovery glob and required concurrency`,
  );
}

const testFiles = await discoverTests(repositoryRoot);
assert.ok(testFiles.length > 0, "repository test inventory must not be empty");

let unitCount = 0;
let integrationCount = 0;

for (const testFile of testFiles) {
  const matches = [];

  for (const suite of suites) {
    if (!testFile.startsWith(`${suite.packageRoot}/`)) {
      continue;
    }

    const packageRelativePath = testFile.slice(suite.packageRoot.length + 1);
    if (matchesGlob(packageRelativePath, suite.unitGlob)) {
      matches.push("unit");
    }
    if (matchesGlob(packageRelativePath, suite.integrationGlob)) {
      matches.push("integration");
    }
  }

  assert.equal(
    matches.length,
    1,
    `${testFile} must belong to exactly one supported unit/integration suite`,
  );

  const expectedSuite = testFile.endsWith(".integration.test.ts")
    ? "integration"
    : "unit";
  assert.equal(
    matches[0],
    expectedSuite,
    `${testFile} has an unsupported test naming convention`,
  );

  if (matches[0] === "integration") {
    integrationCount += 1;
  } else {
    unitCount += 1;
  }
}

console.log(
  `test-inventory: ${testFiles.length} files assigned exactly once (${unitCount} unit, ${integrationCount} integration)`,
);
