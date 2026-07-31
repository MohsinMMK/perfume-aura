import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { livenessResponse, readinessResponse, versionResponse } from "./health";

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

function assertGenericUnavailable(body: string) {
  assert.equal(body, JSON.stringify({ status: "unavailable" }));
  assert.doesNotMatch(body, /database|secret|host|password|postgres|trap/i);
}

describe("health responses", () => {
  it("reports process liveness without dependency details", async () => {
    const response = livenessResponse();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("reports only status and full lowercase source commit", async () => {
    const commit = "a".repeat(40);
    const response = versionResponse(() => commit);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok", commit });
  });

  it("returns generic unavailable when build identity is missing", async () => {
    const { result: unavailable, errors } = await withCapturedConsoleError(async () =>
      versionResponse(() => {
        throw new Error("invalid source commit");
      }),
    );
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("cache-control"), "no-store");
    const body = JSON.stringify(await unavailable.json());
    assert.equal(body, JSON.stringify({ status: "unavailable" }));
    assert.doesNotMatch(body, /commit|secret|env|password/i);
    assert.deepEqual(errors, [["[health/version] build identity unavailable"]]);
  });

  it("reports database readiness with generic success and failure bodies", async () => {
    const ready = await readinessResponse(async () => undefined);
    assert.equal(ready.status, 200);
    assert.equal(ready.headers.get("cache-control"), "no-store");
    assert.deepEqual(await ready.json(), { status: "ready" });

    const { result: unavailable, errors } = await withCapturedConsoleError(() =>
      readinessResponse(async () => {
        throw new Error("secret database host");
      }),
    );
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("cache-control"), "no-store");
    const body = JSON.stringify(await unavailable.json());
    assertGenericUnavailable(body);
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], ["[health/ready] database probe failed"]);
  });

  it("logs only the generic readiness failure string", async () => {
    const secretError = Object.assign(
      new Error("postgres://owner:SuperSecretPass@db.example/app"),
      {
        name: "postgres://owner:SuperSecretPass@db.example/app",
        code: "password=SuperSecretPass",
        cause: Object.assign(new Error("nested secret host"), {
          name: "ECONNREFUSED secret.internal",
          code: "password=nested-secret",
        }),
      },
    );

    const { result: unavailable, errors } = await withCapturedConsoleError(() =>
      readinessResponse(async () => {
        throw secretError;
      }),
    );

    assert.equal(unavailable.status, 503);
    assertGenericUnavailable(JSON.stringify(await unavailable.json()));
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], ["[health/ready] database probe failed"]);
    assert.equal(errors[0]?.length, 1);
    const logged = JSON.stringify(errors);
    assert.doesNotMatch(logged, /SuperSecretPass|postgres:\/\/|nested-secret|secret\.internal/i);
  });

  it("returns 503 for primitive rejections without logging the value", async () => {
    const { result: unavailable, errors } = await withCapturedConsoleError(() =>
      readinessResponse(async () => {
        throw "postgres://owner:literal-secret@db.example/app";
      }),
    );

    assert.equal(unavailable.status, 503);
    assertGenericUnavailable(JSON.stringify(await unavailable.json()));
    assert.deepEqual(errors, [["[health/ready] database probe failed"]]);
    assert.doesNotMatch(JSON.stringify(errors), /literal-secret|postgres:\/\//i);
  });

  it("returns 503 when error property inspection would throw", async () => {
    const proxy = new Proxy(
      {},
      {
        get() {
          throw new Error("trap: password=proxy-secret");
        },
        has() {
          throw new Error("trap-has: password=proxy-secret");
        },
        ownKeys() {
          throw new Error("trap-keys: password=proxy-secret");
        },
      },
    );

    const { result: unavailable, errors } = await withCapturedConsoleError(() =>
      readinessResponse(async () => {
        throw proxy;
      }),
    );

    assert.equal(unavailable.status, 503);
    assertGenericUnavailable(JSON.stringify(await unavailable.json()));
    assert.deepEqual(errors, [["[health/ready] database probe failed"]]);
    assert.doesNotMatch(JSON.stringify(errors), /proxy-secret|trap/i);
  });

  it("returns 503 for throwing getters without leaking field values", async () => {
    const toxic = {};
    Object.defineProperty(toxic, "name", {
      enumerable: true,
      get() {
        throw new Error("getter-name password=getter-secret");
      },
    });
    Object.defineProperty(toxic, "code", {
      enumerable: true,
      get() {
        throw new Error("getter-code password=getter-secret");
      },
    });
    Object.defineProperty(toxic, "cause", {
      enumerable: true,
      get() {
        throw new Error("getter-cause password=getter-secret");
      },
    });

    const { result: unavailable, errors } = await withCapturedConsoleError(() =>
      readinessResponse(async () => {
        throw toxic;
      }),
    );

    assert.equal(unavailable.status, 503);
    assertGenericUnavailable(JSON.stringify(await unavailable.json()));
    assert.deepEqual(errors, [["[health/ready] database probe failed"]]);
    assert.doesNotMatch(JSON.stringify(errors), /getter-secret/i);
  });
});
