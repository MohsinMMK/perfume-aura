import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { livenessResponse, readinessResponse } from "./health";

describe("health responses", () => {
  it("reports process liveness without dependency details", async () => {
    const response = livenessResponse();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("reports database readiness with generic success and failure bodies", async () => {
    const ready = await readinessResponse(async () => undefined);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: "ready" });

    const unavailable = await readinessResponse(async () => {
      throw new Error("secret database host");
    });
    assert.equal(unavailable.status, 503);
    const body = JSON.stringify(await unavailable.json());
    assert.equal(body, JSON.stringify({ status: "unavailable" }));
    assert.doesNotMatch(body, /database|secret|host/i);
  });
});
