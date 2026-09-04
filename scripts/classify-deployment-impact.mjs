import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SHARED_RUNTIME_PATHS = new Set([
  ".node-version",
  ".nvmrc",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "tsconfig.json",
]);

const DEPLOYMENT_TOOLING_PATHS = new Set([
  ".gitignore",
  "scripts/build-hostinger-storefront-source.sh",
  "scripts/classify-deployment-impact.mjs",
  "scripts/deploy-hostinger-storefront-archive.mjs",
  "scripts/pack-storefront-standalone.sh",
  "scripts/verify-ci-workflow.mjs",
]);

function isMarkdown(changedPath) {
  return changedPath.toLowerCase().endsWith(".md");
}

function startsWithAny(changedPath, prefixes) {
  return prefixes.some((prefix) => changedPath.startsWith(prefix));
}

export function classifyDeploymentImpact(
  changedPaths,
  { rootPackageRuntimeChanged = true } = {},
) {
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) {
    return {
      shouldValidate: true,
      shouldPublish: true,
      validateOps: true,
      validateStorefront: true,
      publishOps: true,
      publishStorefront: true,
      opsMigrationBlocked: true,
    };
  }

  let publishOps = false;
  let publishStorefront = false;
  let validateOps = false;
  let validateStorefront = false;
  let opsMigrationBlocked = false;

  for (const changedPath of changedPaths) {
    if (typeof changedPath !== "string" || changedPath.length === 0) {
      publishOps = true;
      publishStorefront = true;
      validateOps = true;
      validateStorefront = true;
      opsMigrationBlocked = true;
      continue;
    }
    if (isMarkdown(changedPath)) {
      continue;
    }
    if (
      changedPath.startsWith(".github/workflows/") ||
      DEPLOYMENT_TOOLING_PATHS.has(changedPath) ||
      (changedPath === "package.json" && !rootPackageRuntimeChanged)
    ) {
      validateOps = true;
      validateStorefront = true;
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
      validateOps = true;
      validateStorefront = true;
      opsMigrationBlocked = true;
      continue;
    }
    if (
      SHARED_RUNTIME_PATHS.has(changedPath) ||
      startsWithAny(changedPath, [
        "packages/",
        "scripts/extract-hostinger-ops-zip.py",
        "scripts/verify-hostinger-ops-deploy-tree.mjs",
      ])
    ) {
      publishOps = true;
      publishStorefront = true;
      validateOps = true;
      validateStorefront = true;
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
      validateOps = true;
      continue;
    }
    if (
      startsWithAny(changedPath, [
        "apps/storefront/",
      ])
    ) {
      publishStorefront = true;
      validateStorefront = true;
      continue;
    }

    // Unknown non-documentation paths fail open toward verification and
    // fail closed toward deployment scope: rebuild both surfaces.
    publishOps = true;
    publishStorefront = true;
    validateOps = true;
    validateStorefront = true;
  }

  return {
    shouldValidate: validateOps || validateStorefront,
    shouldPublish: publishOps || publishStorefront,
    validateOps,
    validateStorefront,
    publishOps,
    publishStorefront,
    opsMigrationBlocked,
  };
}

function rootPackageRuntimeChangedBetweenRefs(baseRef, headRef) {
  const fullCommit = /^[0-9a-f]{40}$/;
  if (!fullCommit.test(baseRef) || !fullCommit.test(headRef)) {
    return true;
  }
  try {
    const readAt = (ref) => JSON.parse(execFileSync(
      "git",
      ["show", `${ref}:package.json`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ));
    const runtimeProjection = (packageJson) => {
      const { scripts: _scripts, name: _name, private: _private, description: _description, ...runtime } = packageJson;
      return runtime;
    };
    return JSON.stringify(runtimeProjection(readAt(baseRef))) !==
      JSON.stringify(runtimeProjection(readAt(headRef)));
  } catch {
    return true;
  }
}

function boolean(value) {
  return value ? "true" : "false";
}

function runSelfTests() {
  assert.deepEqual(classifyDeploymentImpact([]), {
    shouldValidate: true,
    shouldPublish: true,
    validateOps: true,
    validateStorefront: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: true,
  });
  assert.deepEqual(classifyDeploymentImpact([""]), {
    shouldValidate: true,
    shouldPublish: true,
    validateOps: true,
    validateStorefront: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: true,
  });
  assert.deepEqual(classifyDeploymentImpact([null]), {
    shouldValidate: true,
    shouldPublish: true,
    validateOps: true,
    validateStorefront: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: true,
  });
  assert.deepEqual(classifyDeploymentImpact(["docs/CURRENT_STATE.md"]), {
    shouldValidate: false,
    shouldPublish: false,
    validateOps: false,
    validateStorefront: false,
    publishOps: false,
    publishStorefront: false,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(classifyDeploymentImpact(["apps/ops/app/page.tsx"]), {
    shouldValidate: true,
    shouldPublish: true,
    validateOps: true,
    validateStorefront: false,
    publishOps: true,
    publishStorefront: false,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(
    classifyDeploymentImpact(["apps/storefront/app/page.tsx"]),
    {
      shouldValidate: true,
      shouldPublish: true,
      validateOps: false,
      validateStorefront: true,
      publishOps: false,
      publishStorefront: true,
      opsMigrationBlocked: false,
    },
  );
  assert.deepEqual(classifyDeploymentImpact(["packages/ui/src/button.tsx"]), {
    shouldValidate: true,
    shouldPublish: true,
    validateOps: true,
    validateStorefront: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(classifyDeploymentImpact([".github/workflows/codeql.yml"]), {
    shouldValidate: true,
    shouldPublish: false,
    validateOps: true,
    validateStorefront: true,
    publishOps: false,
    publishStorefront: false,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(
    classifyDeploymentImpact(["package.json"], {
      rootPackageRuntimeChanged: false,
    }),
    {
      shouldValidate: true,
      shouldPublish: false,
      validateOps: true,
      validateStorefront: true,
      publishOps: false,
      publishStorefront: false,
      opsMigrationBlocked: false,
    },
  );
  assert.deepEqual(
    classifyDeploymentImpact([
      ".github/workflows/ops-pack.yml",
      ".gitignore",
      "docs/OPERATIONS.md",
      "package.json",
      "scripts/build-hostinger-storefront-source.sh",
      "scripts/deploy-hostinger-storefront-archive.mjs",
      "scripts/pack-storefront-standalone.sh",
      "scripts/verify-ci-workflow.mjs",
    ], { rootPackageRuntimeChanged: false }),
    {
      shouldValidate: true,
      shouldPublish: false,
      validateOps: true,
      validateStorefront: true,
      publishOps: false,
      publishStorefront: false,
      opsMigrationBlocked: false,
    },
  );
  assert.deepEqual(
    classifyDeploymentImpact(["packages/db/drizzle/0011_next_release.sql"]),
    {
      shouldValidate: true,
      shouldPublish: true,
      validateOps: true,
      validateStorefront: true,
      publishOps: true,
      publishStorefront: true,
      opsMigrationBlocked: true,
    },
  );
  assert.deepEqual(
    classifyDeploymentImpact(["packages/db/sql/ops-runtime-grants.sql"]),
    {
      shouldValidate: true,
      shouldPublish: true,
      validateOps: true,
      validateStorefront: true,
      publishOps: true,
      publishStorefront: true,
      opsMigrationBlocked: true,
    },
  );
  assert.deepEqual(classifyDeploymentImpact(["unknown-runtime.json"]), {
    shouldValidate: true,
    shouldPublish: true,
    validateOps: true,
    validateStorefront: true,
    publishOps: true,
    publishStorefront: true,
    opsMigrationBlocked: false,
  });
  assert.deepEqual(
    classifyDeploymentImpact(normalizeNullDelimitedPaths("docs/CURRENT_STATE.md\0\n")),
    {
      shouldValidate: false,
      shouldPublish: false,
      validateOps: false,
      validateStorefront: false,
      publishOps: false,
      publishStorefront: false,
      opsMigrationBlocked: false,
    },
  );
  process.stdout.write("deployment-impact self-test ok\n");
}

export function normalizeNullDelimitedPaths(raw) {
  return raw
    .split("\0")
    .map((changedPath) => changedPath.replace(/[\r\n]+$/g, ""))
    .filter((changedPath) => changedPath.length > 0);
}

function readNullDelimitedPaths() {
  return normalizeNullDelimitedPaths(readFileSync(0).toString("utf8"));
}

function readRefArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === "self-test") {
    runSelfTests();
  } else if (command === "--stdin0") {
    const baseRef = readRefArgument("--base");
    const headRef = readRefArgument("--head");
    const impact = classifyDeploymentImpact(readNullDelimitedPaths(), {
      rootPackageRuntimeChanged: baseRef && headRef
        ? rootPackageRuntimeChangedBetweenRefs(baseRef, headRef)
        : true,
    });
    process.stdout.write(
      [
        `should_validate=${boolean(impact.shouldValidate)}`,
        `should_publish=${boolean(impact.shouldPublish)}`,
        `validate_ops=${boolean(impact.validateOps)}`,
        `validate_storefront=${boolean(impact.validateStorefront)}`,
        `publish_ops=${boolean(impact.publishOps)}`,
        `publish_storefront=${boolean(impact.publishStorefront)}`,
        `ops_migration_blocked=${boolean(impact.opsMigrationBlocked)}`,
      ].join("\n") + "\n",
    );
  } else {
    throw new Error("Usage: classify-deployment-impact.mjs self-test|--stdin0 [--base <sha> --head <sha>]");
  }
}
