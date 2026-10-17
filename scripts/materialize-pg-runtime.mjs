import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Next traces can omit a conditional entrypoint or hoist another pg graph.
// Copy the exact locked runtime closure before relocating external aliases.
function materialize(sourceApp, destinationApp) {
  const allowed = fs.realpathSync(path.resolve(sourceApp, "../../node_modules"));
  const destination = path.join(fs.realpathSync(destinationApp), "node_modules");
  const copied = new Map();
  const within = (file, root) => file === root || file.startsWith(`${root}${path.sep}`);

  assert.ok(!within(destination, allowed), "pg runtime destination must not overwrite the installed source graph");

  function manifestFor(name, requireFrom) {
    assert.match(name, /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/, "invalid pg runtime package name");
    let directory = path.dirname(fs.realpathSync(requireFrom.resolve(name)));
    while (within(directory, allowed)) {
      const manifest = path.join(directory, "package.json");
      if (fs.existsSync(manifest)) {
        const metadata = JSON.parse(fs.readFileSync(manifest, "utf8"));
        if (metadata.name === name) return { directory, manifest, metadata };
      }
      directory = path.dirname(directory);
    }
    throw new Error(`pg runtime package escapes installed dependency root: ${name}`);
  }

  function assertSafeTree(directory, ancestors = new Set()) {
    const real = fs.realpathSync(directory);
    assert.ok(within(real, allowed), `pg runtime symlink escapes dependency root: ${directory}`);
    assert.ok(!ancestors.has(real), `pg runtime symlink cycle: ${directory}`);
    if (!fs.statSync(real).isDirectory()) return;
    const nested = new Set([...ancestors, real]);
    for (const child of fs.readdirSync(real)) assertSafeTree(path.join(real, child), nested);
  }

  function copy(name, requireFrom) {
    const { directory, manifest, metadata } = manifestFor(name, requireFrom);
    if (copied.has(name)) {
      assert.equal(copied.get(name), metadata.version, `conflicting pg runtime versions: ${name}`);
      return;
    }
    copied.set(name, metadata.version);
    assertSafeTree(directory);
    const target = path.join(destination, name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(directory, target, { recursive: true, dereference: true });
    const localRequire = createRequire(manifest);
    for (const dependency of Object.keys(metadata.dependencies ?? {})) copy(dependency, localRequire);
    for (const dependency of Object.keys(metadata.optionalDependencies ?? {})) {
      try { localRequire.resolve(dependency); }
      catch (error) {
        if (error.code === "MODULE_NOT_FOUND") continue;
        throw error;
      }
      copy(dependency, localRequire);
    }
  }

  copy("pg", createRequire(path.resolve(sourceApp, "package.json")));
  console.log(`pg-runtime: materialized ${copied.size} locked packages (pg=${copied.get("pg")}, pg-protocol=${copied.get("pg-protocol")})`);
  return copied;
}

function selfTest() {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const source = path.join(root, "apps/ops");
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "perfume-aura-pg-runtime-"));
  try {
    const versions = materialize(source, fixture);
    const protocolEntry = path.join(fixture, "node_modules/pg-protocol/dist/index.js");
    fs.rmSync(protocolEntry);
    const requireFixture = createRequire(path.join(fixture, "package.json"));
    assert.throws(() => requireFixture("pg-protocol"), { code: "MODULE_NOT_FOUND" });
    materialize(source, fixture);
    const probe = path.join(fixture, "probe.mjs");
    fs.writeFileSync(probe, `
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import protocol from "pg-protocol";
const require = createRequire(import.meta.url);
assert.equal(typeof pg.Client, "function");
assert.equal(typeof protocol.parse, "function");
assert.equal(typeof require("pg").Pool, "function");
assert.equal(typeof require("pg-protocol").serialize, "object");
const root = path.dirname(fileURLToPath(import.meta.url));
for (const [name, expected] of ${JSON.stringify([...versions])}) {
  assert.ok(require.resolve(name).startsWith(path.join(root, "node_modules") + path.sep));
  const manifest = require(path.join(root, "node_modules", name, "package.json"));
  assert.equal(manifest.version, expected);
}
`);
    execFileSync(process.execPath, [probe], { cwd: fixture, stdio: "pipe" });
    console.log("pg-runtime self-test: repaired missing entrypoint; isolated CJS/ESM closure and versions pass");
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

if (process.argv[2] === "self-test") selfTest();
else {
  assert.equal(process.argv.length, 4, "Usage: materialize-pg-runtime.mjs <source-app> <staged-app> | self-test");
  materialize(process.argv[2], process.argv[3]);
}
