#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const buildRoot = path.join(repositoryRoot, "apps/storefront/.next");
const manifestsRoot = path.join(buildRoot, "server/app");

const clientJavaScriptBudgets = new Map([
  ["/account/sign-in/page", 235_000],
  ["/cart/page", 218_000],
  ["/checkout/page", 233_500],
  ["/page", 226_500],
  ["/products/[slug]/page", 240_000],
  ["/search/page", 235_000],
  ["/shop/page", 220_000],
]);

async function findClientReferenceManifests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return findClientReferenceManifests(entryPath);
      }
      return entry.isFile() &&
        entry.name.endsWith("_client-reference-manifest.js")
        ? [entryPath]
        : [];
    }),
  );
  return nested.flat();
}

function parseManifestAssignment(source, file) {
  const assignmentPattern =
    /globalThis\.__RSC_MANIFEST\[("(?:[^"\\]|\\.)*")\]\s*=\s*/g;
  let assignment;
  let match;
  while ((match = assignmentPattern.exec(source)) !== null) {
    assignment = match;
  }
  if (!assignment) {
    throw new Error(`Unsupported client reference manifest: ${file}`);
  }

  const route = JSON.parse(assignment[1]);
  const serializedManifest = source
    .slice(assignment.index + assignment[0].length)
    .trim()
    .replace(/;$/, "");

  return [route, JSON.parse(serializedManifest)];
}

async function measureRoute(route, manifest) {
  const chunks = [
    ...new Set(
      Object.values(manifest.clientModules ?? {})
        .flatMap((module) => module.chunks ?? [])
        .filter((chunk) => chunk.endsWith(".js")),
    ),
  ].sort();

  const measuredChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const relativePath = chunk.replace(/^\/_next\//, "");
      const file = path.join(buildRoot, relativePath);
      return {
        file: chunk,
        bytes: (await stat(file)).size,
      };
    }),
  );

  return {
    route,
    clientJavaScriptBytes: measuredChunks.reduce(
      (total, chunk) => total + chunk.bytes,
      0,
    ),
    chunks: measuredChunks,
  };
}

function assertClientJavaScriptBudgets(routes) {
  const routesByName = new Map(routes.map((route) => [route.route, route]));
  const failures = [];

  for (const [routeName, budget] of clientJavaScriptBudgets) {
    const route = routesByName.get(routeName);
    if (!route) {
      failures.push(`${routeName}: missing route measurement`);
    } else if (route.clientJavaScriptBytes > budget) {
      failures.push(
        `${routeName}: ${route.clientJavaScriptBytes} bytes exceeds ${budget}-byte budget`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Storefront client JavaScript budget failed:\n${failures.join("\n")}`,
    );
  }

  console.log(
    `Storefront client JavaScript budgets passed (${clientJavaScriptBudgets.size} routes).`,
  );
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(
      "Build storefront first. Default output is deterministic route client-JavaScript JSON; --assert-budgets verifies guarded commerce routes.",
    );
    return;
  }

  let files;
  try {
    files = await findClientReferenceManifests(manifestsRoot);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        "Storefront build artifacts are missing. Run `pnpm build:storefront` first.",
      );
    }
    throw error;
  }

  if (files.length === 0) {
    throw new Error(
      "Storefront client-reference manifests are missing. Run `pnpm build:storefront` first.",
    );
  }

  const routes = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, "utf8");
      const [route, manifest] = parseManifestAssignment(source, file);
      return measureRoute(route, manifest);
    }),
  );
  routes.sort((left, right) => left.route.localeCompare(right.route));

  if (process.argv.includes("--assert-budgets")) {
    assertClientJavaScriptBudgets(routes);
    return;
  }

  console.log(
    JSON.stringify(
      {
        schemaVersion: 1,
        routes,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
