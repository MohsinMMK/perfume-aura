import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSourceCommit,
  resolveBuildSourceCommit,
} from "./build-version";

const VALID = "a".repeat(40);

describe("storefront build version", () => {
  it("normalizes a full source commit", () => {
    assert.equal(normalizeSourceCommit(VALID.toUpperCase()), VALID);
  });

  it("rejects malformed source commits", () => {
    assert.throws(() => normalizeSourceCommit("abc"), /invalid source commit/);
    assert.throws(
      () => normalizeSourceCommit("g".repeat(40)),
      /invalid source commit/,
    );
  });

  it("prefers explicit build inputs and falls back to git", () => {
    assert.equal(
      resolveBuildSourceCommit(
        { STANDALONE_SOURCE_COMMIT: VALID, GITHUB_SHA: "b".repeat(40) },
        () => "c".repeat(40),
      ),
      VALID,
    );
    assert.equal(resolveBuildSourceCommit({}, () => VALID), VALID);
    assert.throws(
      () => resolveBuildSourceCommit({}, () => undefined),
      /missing source commit/,
    );
  });
});
