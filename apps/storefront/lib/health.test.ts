import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { versionResponse } from "./health";

async function withCapturedConsoleError<T>(
  run: () => Promise<T>,
): Promise<{ result: T; errors: unknown[][] }> {
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };
  try {
    return { result: await run(), errors };
  } finally {
    console.error = original;
  }
}

describe("storefront version health", () => {
  it("returns only the exact embedded source commit without caching", async () => {
    const commit = "a".repeat(40);
    const response = versionResponse(() => commit);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok", commit });
  });

  it("fails closed without exposing malformed build metadata", async () => {
    const { result: response, errors } = await withCapturedConsoleError(
      async () =>
        versionResponse(() => {
          throw new Error("secret-shaped-invalid-build-value");
        }),
    );
    const body = await response.text();

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(body, JSON.stringify({ status: "unavailable" }));
    assert.doesNotMatch(body, /secret|commit|env|password/i);
    assert.deepEqual(errors, [
      ["[storefront/health/version] build identity unavailable"],
    ]);
  });
});
