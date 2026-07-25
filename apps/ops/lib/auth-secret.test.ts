import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAuthSecretResolver } from "./auth-secret";

const validRuntimeSecret =
  "valid-runtime-secret-that-must-not-be-used-by-a-build";

describe("auth secret policy", () => {
  it("uses one random ephemeral secret for a build despite conflicting env values", () => {
    const resolveFirstProcess = createAuthSecretResolver();
    const fromShortConflict = resolveFirstProcess({
      NEXT_PHASE: "phase-production-build",
      BETTER_AUTH_SECRET: "short-local-secret",
    });
    const fromValidConflict = resolveFirstProcess({
      NEXT_PHASE: "phase-production-build",
      BETTER_AUTH_SECRET: validRuntimeSecret,
    });
    const resolveSecondProcess = createAuthSecretResolver();
    const fromSecondProcess = resolveSecondProcess({
      NEXT_PHASE: "phase-production-build",
      BETTER_AUTH_SECRET: validRuntimeSecret,
    });

    assert.equal(fromShortConflict.length >= 32, true);
    assert.equal(fromValidConflict, fromShortConflict);
    assert.notEqual(fromValidConflict, validRuntimeSecret);
    assert.notEqual(fromSecondProcess, fromValidConflict);
  });

  it("uses only a valid runtime secret outside the build phase", () => {
    const resolve = createAuthSecretResolver();
    assert.equal(
      resolve({ BETTER_AUTH_SECRET: validRuntimeSecret }),
      validRuntimeSecret,
    );
    assert.throws(
      () => resolve({ BETTER_AUTH_SECRET: "short-local-secret" }),
      /at least 32 characters/,
    );
    assert.throws(
      () => resolve({}),
      /BETTER_AUTH_SECRET is not set/,
    );
  });
});
