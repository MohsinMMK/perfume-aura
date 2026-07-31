import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getEmbeddedBuildSourceCommit,
  normalizeSourceCommit,
  resolveBuildSourceCommit,
} from "./build-version";

const VALID = "a".repeat(40);
const VALID_UPPER = "ABCDEF0123456789abcdef0123456789abcdef01";

describe("build version identity", () => {
  it("normalizes a full lowercase commit", () => {
    assert.equal(normalizeSourceCommit(`  ${VALID_UPPER}  `), VALID_UPPER.toLowerCase());
  });

  it("rejects malformed commits", () => {
    assert.throws(() => normalizeSourceCommit("abc"), /invalid source commit/);
    assert.throws(() => normalizeSourceCommit("g".repeat(40)), /invalid source commit/);
    assert.throws(() => normalizeSourceCommit(""), /invalid source commit/);
    assert.throws(() => normalizeSourceCommit(undefined), /invalid source commit/);
  });

  it("prefers STANDALONE_SOURCE_COMMIT over GITHUB_SHA and embedded commit", () => {
    const commit = resolveBuildSourceCommit(
      {
        STANDALONE_SOURCE_COMMIT: VALID,
        GITHUB_SHA: "b".repeat(40),
        PERFUME_AURA_BUILD_COMMIT: "c".repeat(40),
      },
      () => "d".repeat(40),
    );
    assert.equal(commit, VALID);
  });

  it("falls back to GITHUB_SHA then embedded then git HEAD", () => {
    assert.equal(
      resolveBuildSourceCommit(
        { GITHUB_SHA: VALID_UPPER },
        () => {
          throw new Error("git should not run");
        },
      ),
      VALID_UPPER.toLowerCase(),
    );
    assert.equal(
      resolveBuildSourceCommit(
        { PERFUME_AURA_BUILD_COMMIT: VALID },
        () => "e".repeat(40),
      ),
      VALID,
    );
    assert.equal(
      resolveBuildSourceCommit({}, () => VALID_UPPER),
      VALID_UPPER.toLowerCase(),
    );
  });

  it("throws when no trusted commit source exists", () => {
    assert.throws(
      () =>
        resolveBuildSourceCommit({}, () => undefined),
      /missing source commit/,
    );
  });

  it("reads only the direct embedded build commit at runtime", () => {
    const previous = process.env.PERFUME_AURA_BUILD_COMMIT;
    try {
      process.env.PERFUME_AURA_BUILD_COMMIT = VALID_UPPER;
      assert.equal(getEmbeddedBuildSourceCommit(), VALID_UPPER.toLowerCase());

      delete process.env.PERFUME_AURA_BUILD_COMMIT;
      assert.throws(() => getEmbeddedBuildSourceCommit(), /invalid source commit/);

      process.env.PERFUME_AURA_BUILD_COMMIT = "not-a-sha";
      assert.throws(() => getEmbeddedBuildSourceCommit(), /invalid source commit/);
    } finally {
      if (previous === undefined) {
        delete process.env.PERFUME_AURA_BUILD_COMMIT;
      } else {
        process.env.PERFUME_AURA_BUILD_COMMIT = previous;
      }
    }
  });

  it("keeps a direct process.env property access for Next build inlining", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./build-version.ts", import.meta.url), "utf8"),
    );
    assert.match(
      source,
      /return normalizeSourceCommit\(process\.env\.PERFUME_AURA_BUILD_COMMIT\);/,
    );
    assert.doesNotMatch(
      source,
      /getEmbeddedBuildSourceCommit[\s\S]*readEnvValue/,
    );
  });
});
