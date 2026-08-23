#!/usr/bin/env node
/**
 * Fail-closed verifier for a Hostinger prebuilt deploy tree.
 * Used before publishing generated ops and storefront production branches.
 *
 * Critical runtime paths (entry, aliases, sharp) must be real materialized
 * files/dirs. Safe internal relative pnpm store symlinks may remain.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FULL_SHA = /^[0-9a-f]{40}$/;
// Uncompressed deploy trees are larger than the 50MB zip cap; keep headroom.
const MAX_TREE_BYTES = 120_000_000;
const MAX_FILE_BYTES = 40_000_000;
const MAX_SYMLINK_HOPS = 40;

/** @type {{ path: string, kind: "file" | "directory", nonempty?: boolean }[]} */
const COMMON_REQUIRED_ENTRIES = [
  { path: "package.json", kind: "file", nonempty: true },
  { path: "artifact-manifest.json", kind: "file", nonempty: true },
  { path: "runtime-package-lock.json", kind: "file", nonempty: true },
];

const SURFACE_CONFIG = {
  ops: {
    application: "@perfume-aura/ops",
    appRoot: "apps/ops",
    entry: "apps/ops/server.js",
    requiredDirectories: ["apps/ops/.next/node_modules"],
  },
  storefront: {
    application: "@perfume-aura/storefront",
    appRoot: "apps/storefront",
    entry: "apps/storefront/server.js",
    requiredDirectories: ["apps/storefront/public"],
  },
};

function normalizeSurface(raw) {
  const surface = String(raw ?? "ops").trim().toLowerCase();
  if (!Object.hasOwn(SURFACE_CONFIG, surface)) {
    fail(`surface must be ops or storefront: ${surface}`);
  }
  return surface;
}

function requiredEntriesForSurface(surface) {
  const config = SURFACE_CONFIG[surface];
  const appRoot = config.appRoot;
  return [
    ...COMMON_REQUIRED_ENTRIES,
    { path: config.entry, kind: "file", nonempty: true },
    { path: `${appRoot}/.next/static`, kind: "directory" },
    ...config.requiredDirectories.map((entryPath) => ({
      path: entryPath,
      kind: "directory",
    })),
    { path: `${appRoot}/node_modules/next/package.json`, kind: "file", nonempty: true },
    { path: `${appRoot}/node_modules/sharp/package.json`, kind: "file", nonempty: true },
    { path: `${appRoot}/node_modules/@img/sharp-linux-x64`, kind: "directory" },
    {
      path: `${appRoot}/node_modules/@img/sharp-libvips-linux-x64`,
      kind: "directory",
    },
  ];
}

const ALLOWED_TOP_LEVEL = new Set([
  "apps",
  "package.json",
  "pnpm-lock.yaml",
  "artifact-manifest.json",
  "runtime-package-lock.json",
  "README.hostinger.txt",
  "node_modules",
]);

function fail(message) {
  throw new Error(message);
}

function normalizeCommit(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!FULL_SHA.test(value)) {
    fail(`invalid expected commit: ${String(raw ?? "")}`);
  }
  return value;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/**
 * Match or exceed packer secret refusal at scripts/pack-ops-standalone.sh.
 * Case-insensitive basename checks for credential-shaped files.
 * Operates on path strings only — never follows links.
 */
export function isForbiddenDeployPath(relPath) {
  const normalized = String(relPath ?? "")
    .split(path.sep)
    .join("/")
    .replace(/^\.\/+/, "");
  if (!normalized) return false;

  const parts = normalized.split("/").filter(Boolean);
  const lowerParts = parts.map((part) => part.toLowerCase());
  const basename = lowerParts[lowerParts.length - 1] ?? "";

  if (lowerParts.includes(".git") || normalized.includes("/.git/")) {
    return true;
  }
  if (lowerParts.includes(".neon") || normalized.includes("/.neon/")) {
    return true;
  }

  if (
    basename === ".env" ||
    basename === ".envrc" ||
    basename === ".neon" ||
    basename.startsWith(".env.")
  ) {
    return true;
  }

  if (
    basename === "id_rsa" ||
    basename === "id_ed25519" ||
    basename.endsWith(".pem") ||
    basename.endsWith(".key")
  ) {
    return true;
  }

  if (basename.includes("credentials") && basename.endsWith(".json")) {
    return true;
  }

  if (basename.startsWith("service-account") && basename.endsWith(".json")) {
    return true;
  }

  if (
    basename.includes("owner-production") ||
    basename === ".env.owner-production" ||
    basename === ".env.local"
  ) {
    return true;
  }

  return false;
}

/**
 * Manifest requiredPaths must be safe relative posix-ish paths contained in tree.
 */
export function assertSafeRelativePath(rawPath) {
  if (typeof rawPath !== "string" || rawPath.trim() === "") {
    fail("manifest requiredPaths entry must be a non-empty string");
  }
  const value = rawPath.trim();
  if (value !== rawPath) {
    fail(`manifest requiredPaths entry has surrounding whitespace: ${rawPath}`);
  }
  if (value.startsWith("/") || value.startsWith("\\")) {
    fail(`manifest requiredPaths entry must be relative: ${value}`);
  }
  if (value.includes("\\")) {
    fail(`manifest requiredPaths entry must use forward slashes: ${value}`);
  }
  if (value.includes("\0")) {
    fail("manifest requiredPaths entry contains NUL");
  }
  const segments = value.split("/");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") {
      fail(`manifest requiredPaths entry has unsafe segment: ${value}`);
    }
  }
  return value;
}

export function assertRelativeSymlinkTarget(target) {
  if (typeof target !== "string" || target === "") {
    fail("symlink target must be a non-empty string");
  }
  if (target.includes("\0")) {
    fail("symlink target contains NUL");
  }
  if (target.startsWith("/") || target.startsWith("\\")) {
    fail(`symlink target must be relative: ${target}`);
  }
  if (target.includes("\\")) {
    fail(`symlink target uses backslash: ${target}`);
  }
  const parts = path.posix.normalize(target).split("/");
  // normalize may collapse; still reject empty.
  if (target === "" || parts.length === 0) {
    fail("symlink target empty after normalize");
  }
  for (const part of PurePosixParts(target)) {
    if (part === "" || part === ".") {
      fail(`symlink target has unsafe segment: ${target}`);
    }
  }
  return target;
}

function PurePosixParts(target) {
  // Keep `..` parts for join-time resolution; only flag empty / `.`.
  return String(target).split("/");
}

/**
 * Resolve a relative symlink target against the link's directory as pure path.
 * Returns posix relative path from root, or throws if escapes.
 */
/**
 * True when candidate is root or a path inside root.
 * Uses realpath on existing prefixes so macOS /var vs /private/var matches.
 */
export function isPathInsideRoot(rootAbs, candidateAbs) {
  const rootReal = realpathSync(path.resolve(rootAbs));
  const candidateResolved = path.resolve(candidateAbs);

  let candidateComparable = candidateResolved;
  // Realpath the longest existing prefix, then re-join remainder.
  let probe = candidateResolved;
  const remainder = [];
  while (probe !== path.dirname(probe)) {
    try {
      if (existsSync(probe) || lstatExists(probe)) {
        candidateComparable = path.join(realpathSync(probe), ...remainder.reverse());
        break;
      }
    } catch {
      // continue walking up
    }
    remainder.push(path.basename(probe));
    probe = path.dirname(probe);
    if (probe === path.dirname(probe)) {
      candidateComparable = candidateResolved;
      break;
    }
  }

  const rel = path.relative(rootReal, candidateComparable);
  if (rel === "") return true;
  if (path.isAbsolute(rel)) return false;
  const first = rel.split(path.sep)[0];
  return first !== "..";
}

export function resolveSymlinkTargetFrom(linkRelPosix, target, rootAbs) {
  assertRelativeSymlinkTarget(target);
  const linkAbs = path.resolve(rootAbs, linkRelPosix);
  const parentAbs = path.dirname(linkAbs);
  const joined = path.resolve(parentAbs, target);
  if (!isPathInsideRoot(rootAbs, joined)) {
    fail(`symlink escapes tree root: ${linkRelPosix} -> ${target}`);
  }
  const rootReal = realpathSync(path.resolve(rootAbs));
  // Prefer relative display path from real root when possible.
  let rel;
  try {
    rel = path.relative(rootReal, realpathSync(path.dirname(joined)));
    rel = path.join(rel, path.basename(joined));
  } catch {
    rel = path.relative(path.resolve(rootAbs), joined);
  }
  return rel.split(path.sep).join("/");
}

/**
 * Follow symlink chain with lstat/readlink only. Final real path must exist
 * inside root. Detects loops and hop limits.
 */
export function assertSymlinkChainInsideRoot(rootAbs, linkAbs, linkRel) {
  let current = path.resolve(linkAbs);
  /** @type {Set<string>} */
  const seen = new Set();
  let hops = 0;

  while (true) {
    let st;
    try {
      st = lstatSync(current);
    } catch {
      fail(`dangling symlink: ${linkRel}`);
    }
    if (!st.isSymbolicLink()) {
      // Final non-link node must exist and stay inside root.
      let finalReal;
      try {
        finalReal = realpathSync(current);
      } catch {
        fail(`dangling symlink final target: ${linkRel}`);
      }
      if (!isPathInsideRoot(rootAbs, finalReal)) {
        fail(`symlink final target escapes tree root: ${linkRel}`);
      }
      return finalReal;
    }

    const key = current;
    if (seen.has(key)) {
      fail(`symlink loop: ${linkRel}`);
    }
    seen.add(key);
    hops += 1;
    if (hops > MAX_SYMLINK_HOPS) {
      fail(`symlink hop limit exceeded: ${linkRel}`);
    }

    let target;
    try {
      target = readlinkSync(current);
    } catch {
      fail(`unreadable symlink: ${linkRel}`);
    }
    assertRelativeSymlinkTarget(target);

    const next = path.resolve(path.dirname(current), target);
    if (!isPathInsideRoot(rootAbs, next)) {
      fail(`symlink escapes tree root: ${linkRel} -> ${target}`);
    }
    current = next;
  }
}

function assertEntryType(root, relPath, kind, options = {}) {
  const abs = path.join(root, relPath);
  if (!existsSync(abs)) {
    fail(`missing required path: ${relPath}`);
  }
  const stat = lstatSync(abs);
  if (stat.isSymbolicLink()) {
    fail(`required path must not be a symlink: ${relPath}`);
  }
  if (kind === "file") {
    if (!stat.isFile()) {
      fail(`required path must be a regular file: ${relPath}`);
    }
    if (options.nonempty && stat.size < 1) {
      fail(`required file is empty: ${relPath}`);
    }
    return;
  }
  if (kind === "directory") {
    if (!stat.isDirectory()) {
      fail(`required path must be a directory: ${relPath}`);
    }
  }
}

/**
 * Walk tree without following symlinks. Records symlink entries but does not
 * descend through them.
 */
function walkTree(root) {
  /** @type {{ abs: string, rel: string, stat: import('node:fs').Stats }[]} */
  const entries = [];
  /** @type {string[]} */
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const names = readdirSync(current, { withFileTypes: false });
    for (const name of names) {
      const abs = path.join(current, name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      const stat = lstatSync(abs);
      entries.push({ abs, rel, stat });
      if (stat.isSymbolicLink()) {
        continue;
      }
      if (stat.isDirectory()) {
        stack.push(abs);
      }
    }
  }
  return entries;
}

function resolveContainedPath(root, relPath) {
  const safe = assertSafeRelativePath(relPath);
  const abs = path.resolve(root, safe);
  const rootResolved = path.resolve(root);
  const rel = path.relative(rootResolved, abs);
  if (
    rel.startsWith("..") ||
    path.isAbsolute(rel) ||
    rel.split(path.sep).includes("..")
  ) {
    fail(`manifest requiredPaths escapes tree root: ${relPath}`);
  }
  return { abs, rel: rel.split(path.sep).join("/"), safe };
}

export function verifyHostingerDeployTree(
  treeRoot,
  expectedCommitRaw,
  surfaceRaw = "ops",
) {
  const root = path.resolve(treeRoot);
  const expectedCommit = normalizeCommit(expectedCommitRaw);
  const surface = normalizeSurface(surfaceRaw);
  const config = SURFACE_CONFIG[surface];
  const requiredEntries = requiredEntriesForSurface(surface);

  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    fail(`deploy tree root missing: ${root}`);
  }

  for (const required of requiredEntries) {
    assertEntryType(root, required.path, required.kind, {
      nonempty: required.nonempty === true,
    });
  }

  const top = readdirSync(root);
  for (const name of top) {
    if (!ALLOWED_TOP_LEVEL.has(name)) {
      fail(`unexpected top-level path: ${name}`);
    }
    if (isForbiddenDeployPath(name)) {
      fail(`forbidden path in deploy tree: ${name}`);
    }
  }

  const packageJson = readJson(path.join(root, "package.json"));
  if (
    packageJson.dependencies &&
    Object.keys(packageJson.dependencies).length > 0
  ) {
    fail("root package.json must have empty dependencies");
  }
  if (
    packageJson.devDependencies &&
    Object.keys(packageJson.devDependencies).length > 0
  ) {
    fail("root package.json must have empty devDependencies");
  }
  const scripts = packageJson.scripts ?? {};
  if (scripts.build !== "echo prebuilt-standalone") {
    fail('root package.json build script must be "echo prebuilt-standalone"');
  }
  if (
    scripts.postinstall != null &&
    scripts.postinstall !== "echo skip-postinstall"
  ) {
    fail("root package.json postinstall must be no-op or absent");
  }
  if (scripts.start !== `node ${config.entry}`) {
    fail(`root package.json start script must be "node ${config.entry}"`);
  }

  const internalManifest = readJson(path.join(root, "artifact-manifest.json"));
  if (internalManifest?.schemaVersion !== 2) {
    fail("artifact-manifest schemaVersion must be 2");
  }
  if (internalManifest?.application !== config.application) {
    fail(`artifact-manifest application must be ${config.application}`);
  }
  if (internalManifest?.source?.commit !== expectedCommit) {
    fail(
      `artifact-manifest source.commit mismatch: expected ${expectedCommit}`,
    );
  }
  if (internalManifest?.source?.dirty !== false) {
    fail("artifact-manifest source.dirty must be false");
  }
  if (internalManifest?.entry !== config.entry) {
    fail(`artifact-manifest entry must be ${config.entry}`);
  }
  const runtimeLock = internalManifest?.runtimeDependencyLock;
  if (
    runtimeLock?.source !== "scripts/ops-runtime-deps/package-lock.json" ||
    runtimeLock?.artifact !== "runtime-package-lock.json" ||
    !/^[0-9a-f]{64}$/.test(String(runtimeLock?.sha256 ?? ""))
  ) {
    fail("artifact-manifest runtime dependency lock contract is invalid");
  }
  const runtimeLockSha256 = createHash("sha256")
    .update(readFileSync(path.join(root, "runtime-package-lock.json")))
    .digest("hex");
  if (runtimeLockSha256 !== runtimeLock.sha256) {
    fail("runtime-package-lock.json checksum mismatch");
  }
  if (!Array.isArray(internalManifest?.requiredPaths)) {
    fail("artifact-manifest requiredPaths missing");
  }
  for (const required of internalManifest.requiredPaths) {
    const { abs, safe } = resolveContainedPath(root, required);
    if (!lstatExists(abs)) {
      fail(`manifest-required path missing: ${safe}`);
    }
    const stat = lstatSync(abs);
    if (stat.isSymbolicLink()) {
      fail(`manifest-required path must not be a symlink: ${safe}`);
    }
    const known = requiredEntries.find((entry) => entry.path === safe);
    if (known) {
      assertEntryType(root, safe, known.kind, {
        nonempty: known.nonempty === true,
      });
    } else if (!stat.isFile() && !stat.isDirectory()) {
      fail(`manifest-required path has unsupported type: ${safe}`);
    }
  }

  const entries = walkTree(root);
  let totalBytes = 0;
  let symlinkCount = 0;

  for (const entry of entries) {
    // Path-string scans never follow links.
    if (isForbiddenDeployPath(entry.rel)) {
      fail(`forbidden path in deploy tree: ${entry.rel}`);
    }
    if (entry.rel.endsWith(".map")) {
      fail(`source map forbidden in deploy tree: ${entry.rel}`);
    }

    if (entry.stat.isSymbolicLink()) {
      symlinkCount += 1;
      let target;
      try {
        target = readlinkSync(entry.abs);
      } catch {
        fail(`unreadable symlink: ${entry.rel}`);
      }
      assertRelativeSymlinkTarget(target);
      resolveSymlinkTargetFrom(entry.rel, target, root);
      assertSymlinkChainInsideRoot(root, entry.abs, entry.rel);
      continue;
    }

    if (entry.stat.isFile()) {
      if (entry.stat.size > MAX_FILE_BYTES) {
        fail(`file exceeds size limit: ${entry.rel}`);
      }
      totalBytes += entry.stat.size;
    }
  }

  if (totalBytes > MAX_TREE_BYTES) {
    fail(`deploy tree exceeds size limit (${totalBytes} bytes)`);
  }

  // Static assets must exist for Hostinger SSR (real files, not via link descent).
  const staticRoot = path.join(root, config.appRoot, ".next/static");
  const staticEntries = walkTree(staticRoot).filter((e) => e.stat.isFile());
  if (staticEntries.length < 1) {
    fail(`${config.appRoot}/.next/static contains no files`);
  }

  return {
    ok: true,
    surface,
    commit: expectedCommit,
    files: entries.filter((e) => e.stat.isFile()).length,
    symlinks: symlinkCount,
    bytes: totalBytes,
  };
}

export function verifyHostingerOpsDeployTree(treeRoot, expectedCommitRaw) {
  return verifyHostingerDeployTree(treeRoot, expectedCommitRaw, "ops");
}

function lstatExists(abs) {
  try {
    lstatSync(abs);
    return true;
  } catch {
    return false;
  }
}

function writeMinimalValidTree(root, commit, surface = "ops") {
  const config = SURFACE_CONFIG[normalizeSurface(surface)];
  const appRoot = config.appRoot;
  const requiredDirs = [
    `${appRoot}/.next/static/chunks`,
    ...config.requiredDirectories,
    `${appRoot}/node_modules/next`,
    `${appRoot}/node_modules/sharp`,
    `${appRoot}/node_modules/@img/sharp-linux-x64`,
    `${appRoot}/node_modules/@img/sharp-libvips-linux-x64`,
  ];
  for (const dir of requiredDirs) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  writeFileSync(path.join(root, config.entry), "console.log('ok')\n");
  writeFileSync(
    path.join(root, `${appRoot}/.next/static/chunks/main.js`),
    "export default 1\n",
  );
  writeFileSync(
    path.join(root, `${appRoot}/node_modules/next/package.json`),
    JSON.stringify({ name: "next", version: "16.3.2" }),
  );
  writeFileSync(
    path.join(root, `${appRoot}/node_modules/sharp/package.json`),
    JSON.stringify({ name: "sharp", version: "0.35.3" }),
  );
  writeFileSync(
    path.join(root, `${appRoot}/node_modules/@img/sharp-linux-x64/index.js`),
    "module.exports = {}\n",
  );
  writeFileSync(
    path.join(
      root,
      `${appRoot}/node_modules/@img/sharp-libvips-linux-x64/index.js`,
    ),
    "module.exports = {}\n",
  );
  const runtimeLockContents = "{}\n";
  writeFileSync(
    path.join(root, "runtime-package-lock.json"),
    runtimeLockContents,
  );
  writeFileSync(
    path.join(root, "README.hostinger.txt"),
    "Hostinger prebuilt deploy tree\n",
  );
  writeFileSync(
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
          start: `node ${config.entry}`,
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(root, "artifact-manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        application: config.application,
        source: { commit, dirty: false },
        runtimeDependencyLock: {
          source: "scripts/ops-runtime-deps/package-lock.json",
          artifact: "runtime-package-lock.json",
          sha256: createHash("sha256")
            .update(runtimeLockContents)
            .digest("hex"),
        },
        entry: config.entry,
        requiredPaths: [
          "package.json",
          "runtime-package-lock.json",
          config.entry,
          `${appRoot}/.next/static`,
          ...config.requiredDirectories,
          `${appRoot}/node_modules/next/package.json`,
          `${appRoot}/node_modules/sharp/package.json`,
          `${appRoot}/node_modules/@img/sharp-linux-x64`,
          `${appRoot}/node_modules/@img/sharp-libvips-linux-x64`,
        ],
      },
      null,
      2,
    )}\n`,
  );
}

function selfTest() {
  const commit = "a".repeat(40);
  assert.equal(normalizeSurface("ops"), "ops");
  assert.equal(normalizeSurface("storefront"), "storefront");
  assert.throws(() => normalizeSurface("constructor"), /surface must be/);
  assert.throws(
    () => main(["/tmp/missing", commit, "--surface"]),
    /--surface requires a value/,
  );
  const base = mkdtempSync(path.join(tmpdir(), "perfume-aura-deploy-tree-"));
  try {
    const valid = path.join(base, "valid");
    writeMinimalValidTree(valid, commit);
    // Safe internal relative symlink (pnpm-style) must be accepted.
    mkdirSync(path.join(valid, "node_modules/.pnpm/real@1/node_modules/real"), {
      recursive: true,
    });
    writeFileSync(
      path.join(
        valid,
        "node_modules/.pnpm/real@1/node_modules/real/package.json",
      ),
      JSON.stringify({ name: "real", version: "1.0.0" }),
    );
    mkdirSync(path.join(valid, "node_modules/.pnpm/node_modules"), {
      recursive: true,
    });
    symlinkSync(
      "../real@1/node_modules/real",
      path.join(valid, "node_modules/.pnpm/node_modules/real"),
    );
    const ok = verifyHostingerOpsDeployTree(valid, commit);
    assert.equal(ok.commit, commit);
    assert.ok(ok.files > 0);

    const storefront = path.join(base, "storefront");
    writeMinimalValidTree(storefront, commit, "storefront");
    const storefrontOk = verifyHostingerDeployTree(
      storefront,
      commit,
      "storefront",
    );
    assert.equal(storefrontOk.surface, "storefront");
    assert.equal(storefrontOk.commit, commit);

    const wrongApplication = path.join(base, "wrong-application");
    writeMinimalValidTree(wrongApplication, commit, "storefront");
    const wrongApplicationManifestPath = path.join(
      wrongApplication,
      "artifact-manifest.json",
    );
    const wrongApplicationManifest = readJson(wrongApplicationManifestPath);
    wrongApplicationManifest.application = "@perfume-aura/ops";
    writeFileSync(
      wrongApplicationManifestPath,
      `${JSON.stringify(wrongApplicationManifest)}\n`,
    );
    assert.throws(
      () => verifyHostingerDeployTree(wrongApplication, commit, "storefront"),
      /application must be @perfume-aura\/storefront/,
    );
    assert.ok(ok.symlinks >= 1);

    const mismatch = path.join(base, "mismatch");
    writeMinimalValidTree(mismatch, commit);
    assert.throws(
      () => verifyHostingerOpsDeployTree(mismatch, "b".repeat(40)),
      /source\.commit mismatch/,
    );

    // Secret filename matrix
    for (const [label, rel] of [
      [".env", ".env"],
      [".env.local", ".env.local"],
      [".envrc", ".envrc"],
      [".neon", "apps/ops/.neon/config"],
      ["pem", "apps/ops/private.pem"],
      ["key", "apps/ops/server.key"],
      ["credentials json", "apps/ops/my-credentials.json"],
      ["service account", "apps/ops/service-account-prod.json"],
      ["owner production", "apps/ops/.env.owner-production"],
    ]) {
      const secret = path.join(base, `secret-${label.replace(/\W+/g, "-")}`);
      writeMinimalValidTree(secret, commit);
      const target = path.join(secret, rel);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, "SECRET=1\n");
      assert.throws(
        () => verifyHostingerOpsDeployTree(secret, commit),
        /forbidden path|unexpected top-level/,
        `expected reject for ${label}`,
      );
    }

    // Wrong type: server.js as directory
    const wrongType = path.join(base, "wrong-type");
    writeMinimalValidTree(wrongType, commit);
    rmSync(path.join(wrongType, "apps/ops/server.js"));
    mkdirSync(path.join(wrongType, "apps/ops/server.js"));
    assert.throws(
      () => verifyHostingerOpsDeployTree(wrongType, commit),
      /must be a regular file: apps\/ops\/server\.js/,
    );

    // Empty server.js
    const emptyServer = path.join(base, "empty-server");
    writeMinimalValidTree(emptyServer, commit);
    writeFileSync(path.join(emptyServer, "apps/ops/server.js"), "");
    assert.throws(
      () => verifyHostingerOpsDeployTree(emptyServer, commit),
      /required file is empty: apps\/ops\/server\.js/,
    );

    // Required path as symlink must fail
    const reqLink = path.join(base, "req-link");
    writeMinimalValidTree(reqLink, commit);
    rmSync(path.join(reqLink, "apps/ops/server.js"));
    writeFileSync(path.join(reqLink, "apps/ops/server-real.js"), "ok\n");
    symlinkSync("server-real.js", path.join(reqLink, "apps/ops/server.js"));
    assert.throws(
      () => verifyHostingerOpsDeployTree(reqLink, commit),
      /required path must not be a symlink: apps\/ops\/server\.js/,
    );

    // Absolute symlink rejected
    const absLink = path.join(base, "abs-link");
    writeMinimalValidTree(absLink, commit);
    symlinkSync("/tmp", path.join(absLink, "apps/ops/evil-link"));
    assert.throws(
      () => verifyHostingerOpsDeployTree(absLink, commit),
      /symlink target must be relative|escapes tree root/,
    );

    // Outside relative symlink rejected (three hops from apps/ops leave tree root).
    const outLink = path.join(base, "out-link");
    writeMinimalValidTree(outLink, commit);
    symlinkSync("../../../outside", path.join(outLink, "apps/ops/escape-link"));
    assert.throws(
      () => verifyHostingerOpsDeployTree(outLink, commit),
      /escapes tree root/,
    );

    // Dangling relative symlink rejected
    const dang = path.join(base, "dangling");
    writeMinimalValidTree(dang, commit);
    symlinkSync("missing-target", path.join(dang, "apps/ops/dangling-link"));
    assert.throws(
      () => verifyHostingerOpsDeployTree(dang, commit),
      /dangling symlink/,
    );

    // Loop rejected
    const loop = path.join(base, "loop");
    writeMinimalValidTree(loop, commit);
    symlinkSync("b-link", path.join(loop, "apps/ops/a-link"));
    symlinkSync("a-link", path.join(loop, "apps/ops/b-link"));
    assert.throws(
      () => verifyHostingerOpsDeployTree(loop, commit),
      /symlink loop/,
    );

    // Manifest traversal
    const traversal = path.join(base, "traversal");
    writeMinimalValidTree(traversal, commit);
    const manifestPath = path.join(traversal, "artifact-manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.requiredPaths = [...manifest.requiredPaths, "../outside.txt"];
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    assert.throws(
      () => verifyHostingerOpsDeployTree(traversal, commit),
      /unsafe segment|escapes tree root|must be relative/,
    );

    // Absolute required path
    const absolute = path.join(base, "absolute");
    writeMinimalValidTree(absolute, commit);
    const absManifestPath = path.join(absolute, "artifact-manifest.json");
    const absManifest = JSON.parse(readFileSync(absManifestPath, "utf8"));
    absManifest.requiredPaths = ["/etc/passwd"];
    writeFileSync(absManifestPath, `${JSON.stringify(absManifest, null, 2)}\n`);
    assert.throws(
      () => verifyHostingerOpsDeployTree(absolute, commit),
      /must be relative/,
    );

    // Manifest path wrong type (static as file)
    const manifestType = path.join(base, "manifest-type");
    writeMinimalValidTree(manifestType, commit);
    rmSync(path.join(manifestType, "apps/ops/.next/static"), {
      recursive: true,
      force: true,
    });
    writeFileSync(path.join(manifestType, "apps/ops/.next/static"), "not-dir\n");
    assert.throws(
      () => verifyHostingerOpsDeployTree(manifestType, commit),
      /must be a directory: apps\/ops\/\.next\/static/,
    );

    const badPkg = path.join(base, "bad-pkg");
    writeMinimalValidTree(badPkg, commit);
    writeFileSync(
      path.join(badPkg, "package.json"),
      JSON.stringify({
        name: "x",
        dependencies: { next: "1.0.0" },
        scripts: { build: "echo prebuilt-standalone" },
      }),
    );
    assert.throws(
      () => verifyHostingerOpsDeployTree(badPkg, commit),
      /empty dependencies/,
    );

    const unexpected = path.join(base, "unexpected");
    writeMinimalValidTree(unexpected, commit);
    writeFileSync(path.join(unexpected, "README.md"), "nope\n");
    assert.throws(
      () => verifyHostingerOpsDeployTree(unexpected, commit),
      /unexpected top-level path/,
    );

    // HOSTINGER.txt is not the pack name — reject unless we add it to allowlist.
    // Pack uses README.hostinger.txt which is already allowed via writeMinimalValidTree.
    const wrongReadme = path.join(base, "wrong-readme");
    writeMinimalValidTree(wrongReadme, commit);
    writeFileSync(path.join(wrongReadme, "HOSTINGER.txt"), "nope\n");
    assert.throws(
      () => verifyHostingerOpsDeployTree(wrongReadme, commit),
      /unexpected top-level path: HOSTINGER\.txt/,
    );

    // Helper unit checks
    assert.equal(isForbiddenDeployPath("private.pem"), true);
    assert.equal(isForbiddenDeployPath("server.KEY"), true);
    assert.equal(isForbiddenDeployPath("service-account-prod.json"), true);
    assert.equal(isForbiddenDeployPath("foo-credentials-bar.json"), true);
    assert.equal(isForbiddenDeployPath("apps/ops/server.js"), false);
    assert.throws(() => assertSafeRelativePath("../x"), /unsafe segment/);
    assert.throws(() => assertSafeRelativePath("/abs"), /must be relative/);
    assert.throws(() => assertSafeRelativePath("a\\b"), /forward slashes/);
    assert.throws(() => assertSafeRelativePath(""), /non-empty/);
    assert.throws(() => assertRelativeSymlinkTarget("/tmp/x"), /relative/);
    assert.throws(() => assertRelativeSymlinkTarget(""), /non-empty/);

    console.log("verify-hostinger-ops-deploy-tree self-test ok");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

function main(argv) {
  if (argv[0] === "self-test") {
    selfTest();
    return;
  }
  if (argv.length < 2) {
    fail(
      "usage: node scripts/verify-hostinger-ops-deploy-tree.mjs <tree-root> <expected-commit> [--surface ops|storefront]\n" +
        "   or: node scripts/verify-hostinger-ops-deploy-tree.mjs self-test",
    );
  }
  let surface = "ops";
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--surface") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        fail("--surface requires a value");
      }
      surface = value;
      index += 1;
    } else {
      fail(`unknown argument: ${argv[index]}`);
    }
  }
  const result = verifyHostingerDeployTree(argv[0], argv[1], surface);
  console.log(
    `deploy-tree ok surface=${result.surface} commit=${result.commit} files=${result.files} symlinks=${result.symlinks} bytes=${result.bytes}`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    process.exitCode = 1;
  }
}
