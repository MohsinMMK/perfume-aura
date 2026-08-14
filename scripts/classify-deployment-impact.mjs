import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SHARED_RUNTIME_PATHS = new Set([
  ".node-version",
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "tsconfig.json",
]);

function isMarkdown(changedPath) {
  return changedPath.toLowerCase().endsWith(".md");
}

function startsWithAny(changedPath, prefixes) {
  return prefixes.some((prefix) => changedPath.startsWith(prefix));
}

export function classifyDeploymentImpact(changedPaths) {
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) {
    return {
      shouldPublish: true,
      publishOps: true,
      publishStorefront: true,
      opsMigrationBlocked: true,
    };
  }

  let publishOps = false;
  let publishStorefront = false;
  let opsMigrationBlocked = false;

  for (const changedPath of changedPaths) {
    if (typeof changedPath !== "string" || changedPath.length === 0) {
      publishOps = true;
      publishStorefront = true;
      opsMigrationBlocked = true;
      continue;
    }
    if (isMarkdown(changedPath)) {
      continue;
    }
    if (
      startsWithAny(changedPath, [
        "packages/db/drizzle/",
        "packages/db/sql/",
      ])
    ) {
      publishOps = true;
      publishStorefront = true;
      opsMigrationBlocked = true;
      continue;
    }
    if (
      SHARED_RUNTIME_PATHS.has(changedPath) ||
      startsWithAny(changedPath, [
        ".github/workflows/ops-pack.yml",
        "packages/",
        "scripts/extract-hostinger-ops-zip.py",
        "scripts/verify-hostinger-ops-deploy-tree.mjs",
      ])
    ) {
      publishOps = true;
      publishStorefront = true;
      continue;
    }
    if (
      startsWithAny(changedPath, [
        "apps/ops/",
        "deploy/ops-vps/",
        "scripts/ops-runtime-deps/",
        "scripts/pack-ops-standalone.sh",
      ])
    ) {
      publishOps = true;
      continue;
    }
    if (
      startsWithAny(changedPath, [
        "apps/storefront/",
        "scripts/pack-storefront-standalone.sh",
      ])
    ) {
      publishStorefront = true;
      continue;
    }

    // Unknown non-documentation paths fail open toward verification and
    // fail closed toward deployment scope: rebuild both surfaces.
    publishOps = true;
    publishStorefront = true;
  }

  return {
    shouldPublish: publishOps || publishStorefront,
    publishOps,
    publishStorefront,
    opsMigrationBlocked,
  };
}

function boolean(value) {
  return value ? "true" : "false";
}

function runSelfTests() {
  assert.deepEqual(classifyDeploymentImpact([]), {
    shouldPublish: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: true,
  });
  assert.deepEqual(classifyDeploymentImpact([""]), {
    shouldPublish: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: true,
  });
  assert.deepEqual(classifyDeploymentImpact([null]), {
    shouldPublish: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: true,
  });
  assert.deepEqual(classifyDeploymentImpact(["docs/CURRENT_STATE.md"]), {
    shouldPublish: false,
    publishOps: false,
    publishStorefront: false,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(classifyDeploymentImpact(["apps/ops/app/page.tsx"]), {
    shouldPublish: true,
    publishOps: true,
    publishStorefront: false,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(
    classifyDeploymentImpact(["apps/storefront/app/page.tsx"]),
    {
      shouldPublish: true,
      publishOps: false,
      publishStorefront: true,
      opsMigrationBlocked: false,
    },
  );
  assert.deepEqual(classifyDeploymentImpact(["packages/ui/src/button.tsx"]), {
    shouldPublish: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(
    classifyDeploymentImpact(["packages/db/drizzle/0011_next_release.sql"]),
    {
      shouldPublish: true,
      publishOps: true,
      publishStorefront: true,
      opsMigrationBlocked: true,
    },
  );
  assert.deepEqual(
    classifyDeploymentImpact(["packages/db/sql/ops-runtime-grants.sql"]),
    {
      shouldPublish: true,
      publishOps: true,
      publishStorefront: true,
      opsMigrationBlocked: true,
    },
  );
  assert.deepEqual(classifyDeploymentImpact(["unknown-runtime.json"]), {
    shouldPublish: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: false,
  });
  process.stdout.write("deployment-impact self-test ok\n");
}

function readNullDelimitedPaths() {
  return readFileSync(0)
    .toString("utf8")
    .split("\0")
    .filter((changedPath) => changedPath.length > 0);
}

const command = process.argv[2];

if (command === "self-test") {
  runSelfTests();
} else if (command === "--stdin0") {
  const impact = classifyDeploymentImpact(readNullDelimitedPaths());
  process.stdout.write(
    [
      `should_publish=${boolean(impact.shouldPublish)}`,
      `publish_ops=${boolean(impact.publishOps)}`,
      `publish_storefront=${boolean(impact.publishStorefront)}`,
      `ops_migration_blocked=${boolean(impact.opsMigrationBlocked)}`,
    ].join("\n") + "\n",
  );
} else {
  throw new Error("Usage: classify-deployment-impact.mjs self-test|--stdin0");
}
