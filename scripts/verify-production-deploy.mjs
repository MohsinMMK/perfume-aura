#!/usr/bin/env node
/**
 * Commit-aware post-deploy smoke for Hostinger ops + marketing.
 * Never logs response bodies or tokens.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FULL_SHA = /^[0-9a-f]{40}$/;

function normalizeCommit(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!FULL_SHA.test(value)) {
    throw new Error("invalid expected commit");
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} url
 * @param {{ method?: string, timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 */
export async function fetchStatus(url, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is unavailable");
  }
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: options.method ?? "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "perfume-aura-deploy-verify/1.0",
        accept: "*/*",
      },
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text,
      url,
    };
  } finally {
    clearTimeout(timer);
  }
}

function findStaticAssetPath(html) {
  const match = html.match(/\/_next\/static\/[^"')\s]+/);
  return match?.[0] ?? null;
}

/**
 * Auth session must be a healthy Better Auth JSON response.
 * Unauthenticated Better Auth get-session returns HTTP 200 with JSON `null`.
 * Authenticated responses are JSON objects. Arrays/primitives/malformed rejected.
 * Do not accept 401/404/503/redirects as "service up".
 * Never log the body.
 */
export function assertAuthSessionOk(response) {
  if (response.status !== 200) {
    throw new Error(
      `ops /api/auth/get-session expected 200, got ${response.status}`,
    );
  }

  let body;
  try {
    body = JSON.parse(response.text);
  } catch {
    throw new Error("ops /api/auth/get-session returned non-JSON body");
  }

  // Better Auth unauthenticated: exact JSON null.
  if (body === null) {
    return body;
  }

  if (typeof body !== "object" || Array.isArray(body)) {
    throw new Error("ops /api/auth/get-session returned unexpected JSON shape");
  }

  // Object form: optional user/session fields must be null or plain objects.
  if ("user" in body) {
    const user = body.user;
    if (
      user !== null &&
      user !== undefined &&
      (typeof user !== "object" || Array.isArray(user))
    ) {
      throw new Error("ops /api/auth/get-session user field has invalid type");
    }
  }

  if ("session" in body) {
    const session = body.session;
    if (
      session !== null &&
      session !== undefined &&
      (typeof session !== "object" || Array.isArray(session))
    ) {
      throw new Error(
        "ops /api/auth/get-session session field has invalid type",
      );
    }
  }

  return body;
}

/**
 * @param {{
 *   expectedCommit: string,
 *   opsBaseUrl?: string,
 *   marketingBaseUrl?: string,
 *   timeoutMs?: number,
 *   pollIntervalMs?: number,
 *   fetchImpl?: typeof fetch,
 *   now?: () => number,
 *   sleepImpl?: (ms: number) => Promise<void>,
 * }} options
 */
export async function verifyProductionDeploy(options) {
  const expectedCommit = normalizeCommit(options.expectedCommit);
  const opsBase = (options.opsBaseUrl ?? "https://app.perfumeaura.com").replace(
    /\/$/,
    "",
  );
  const marketingBase = (
    options.marketingBaseUrl ?? "https://perfumeaura.com"
  ).replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 15 * 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 10_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("invalid deploy verification timeout");
  }
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1) {
    throw new Error("invalid deploy verification poll interval");
  }
  const fetchImpl = options.fetchImpl;
  const now = options.now ?? Date.now;
  const sleepImpl = options.sleepImpl ?? sleep;
  const started = now();
  const maxAttempts = Math.ceil(timeoutMs / pollIntervalMs) + 1;
  if (!Number.isSafeInteger(maxAttempts)) {
    throw new Error("invalid deploy verification polling bounds");
  }

  let versionMatched = false;
  let attempts = 0;
  while (attempts < maxAttempts) {
    const elapsedMs = now() - started;
    if (elapsedMs >= timeoutMs) {
      break;
    }
    attempts += 1;
    let version = null;
    try {
      version = await fetchStatus(`${opsBase}/api/health/version`, {
        fetchImpl,
        timeoutMs: Math.max(1, Math.min(15_000, timeoutMs - elapsedMs)),
      });
    } catch {
      // DNS, TLS, connection, and request-timeout failures can be transient while
      // Hostinger rolls the branch. Keep polling without exposing provider details.
    }
    if (version?.status === 200) {
      let body;
      try {
        body = JSON.parse(version.text);
      } catch {
        body = null;
      }
      if (
        body &&
        body.status === "ok" &&
        typeof body.commit === "string" &&
        body.commit.toLowerCase() === expectedCommit
      ) {
        versionMatched = true;
        break;
      }
    }
    if (now() - started + pollIntervalMs > timeoutMs) {
      break;
    }
    await sleepImpl(pollIntervalMs);
  }

  if (!versionMatched) {
    throw new Error("deploy version did not match expected commit before timeout");
  }

  const login = await fetchStatus(`${opsBase}/login`, { fetchImpl });
  if (login.status !== 200) {
    throw new Error(`ops /login expected 200, got ${login.status}`);
  }

  const live = await fetchStatus(`${opsBase}/api/health/live`, { fetchImpl });
  if (live.status !== 200) {
    throw new Error(`ops /api/health/live expected 200, got ${live.status}`);
  }

  const ready = await fetchStatus(`${opsBase}/api/health/ready`, { fetchImpl });
  if (ready.status !== 200) {
    throw new Error(`ops /api/health/ready expected 200, got ${ready.status}`);
  }

  const session = await fetchStatus(`${opsBase}/api/auth/get-session`, {
    fetchImpl,
  });
  assertAuthSessionOk(session);

  const staticPath = findStaticAssetPath(login.text);
  if (!staticPath) {
    throw new Error("ops login HTML missing /_next/static asset path");
  }
  const staticAsset = await fetchStatus(`${opsBase}${staticPath}`, {
    fetchImpl,
  });
  if (staticAsset.status !== 200) {
    throw new Error(
      `ops static asset expected 200, got ${staticAsset.status}`,
    );
  }

  const marketingRoot = await fetchStatus(`${marketingBase}/`, { fetchImpl });
  if (marketingRoot.status !== 200) {
    throw new Error(`marketing / expected 200, got ${marketingRoot.status}`);
  }

  const favicon = await fetchStatus(`${marketingBase}/assets/favicon.svg`, {
    fetchImpl,
  });
  if (favicon.status !== 200) {
    throw new Error(
      `marketing favicon expected 200, got ${favicon.status}`,
    );
  }

  const protectedPath = await fetchStatus(
    `${marketingBase}/apps/ops/package.json`,
    { fetchImpl },
  );
  if (protectedPath.status !== 403) {
    throw new Error(
      `marketing protected path expected 403, got ${protectedPath.status}`,
    );
  }

  return {
    ok: true,
    commit: expectedCommit,
    staticPath,
  };
}

function createFixtureServer(routes) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const key = url.pathname;
    const route = routes[key];
    if (!route) {
      res.statusCode = 404;
      res.end("missing");
      return;
    }
    res.statusCode = route.status;
    for (const [name, value] of Object.entries(route.headers ?? {})) {
      res.setHeader(name, value);
    }
    res.end(route.body ?? "");
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("failed to bind fixture server");
      }
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

function successRoutes(commit, staticPath) {
  return {
    "/api/health/version": {
      status: 200,
      body: JSON.stringify({ status: "ok", commit }),
    },
    "/login": {
      status: 200,
      body: `<html><script src="${staticPath}"></script></html>`,
    },
    "/api/health/live": { status: 200, body: JSON.stringify({ status: "ok" }) },
    "/api/health/ready": {
      status: 200,
      body: JSON.stringify({ status: "ready" }),
    },
    "/api/auth/get-session": {
      status: 200,
      // Live Better Auth unauthenticated body is JSON null.
      body: "null",
    },
    [staticPath]: { status: 200, body: "js" },
    "/": { status: 200, body: "marketing" },
    "/assets/favicon.svg": { status: 200, body: "<svg></svg>" },
    "/apps/ops/package.json": { status: 403, body: "forbidden" },
  };
}

async function selfTest() {
  const commit = "a".repeat(40);
  const staticPath = "/_next/static/chunks/main-abc.js";

  // Unit: auth session shape checks without logging bodies.
  assert.equal(assertAuthSessionOk({ status: 200, text: "null" }), null);
  assertAuthSessionOk({
    status: 200,
    text: JSON.stringify({ session: null, user: null }),
  });
  assertAuthSessionOk({
    status: 200,
    text: JSON.stringify({
      session: { id: "s1" },
      user: { id: "u1" },
    }),
  });
  assert.throws(
    () => assertAuthSessionOk({ status: 404, text: "missing" }),
    /expected 200, got 404/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 401, text: "auth" }),
    /expected 200, got 401/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 503, text: "down" }),
    /expected 200, got 503/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 302, text: "" }),
    /expected 200, got 302/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 200, text: "not-json" }),
    /non-JSON body/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 200, text: '"string"' }),
    /unexpected JSON shape/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 200, text: "true" }),
    /unexpected JSON shape/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 200, text: "42" }),
    /unexpected JSON shape/,
  );
  assert.throws(
    () => assertAuthSessionOk({ status: 200, text: "[]" }),
    /unexpected JSON shape/,
  );
  assert.throws(
    () =>
      assertAuthSessionOk({
        status: 200,
        text: JSON.stringify({ user: "bad" }),
      }),
    /user field has invalid type/,
  );

  await assert.rejects(
    () => verifyProductionDeploy({ expectedCommit: commit, timeoutMs: 0 }),
    /invalid deploy verification timeout/,
  );
  await assert.rejects(
    () =>
      verifyProductionDeploy({
        expectedCommit: commit,
        pollIntervalMs: 0,
      }),
    /invalid deploy verification poll interval/,
  );
  await assert.rejects(
    () =>
      verifyProductionDeploy({
        expectedCommit: commit,
        timeoutMs: Number.MAX_SAFE_INTEGER,
        pollIntervalMs: 1,
      }),
    /invalid deploy verification polling bounds/,
  );

  const success = await createFixtureServer(successRoutes(commit, staticPath));
  try {
    const result = await verifyProductionDeploy({
      expectedCommit: commit,
      opsBaseUrl: success.baseUrl,
      marketingBaseUrl: success.baseUrl,
      timeoutMs: 1_000,
      pollIntervalMs: 10,
    });
    assert.equal(result.commit, commit);
    assert.equal(result.staticPath, staticPath);
  } finally {
    success.server.close();
  }

  const stale = await createFixtureServer({
    "/api/health/version": {
      status: 200,
      body: JSON.stringify({ status: "ok", commit: "b".repeat(40) }),
    },
  });
  try {
    await assert.rejects(
      () =>
        verifyProductionDeploy({
          expectedCommit: commit,
          opsBaseUrl: stale.baseUrl,
          marketingBaseUrl: stale.baseUrl,
          timeoutMs: 50,
          pollIntervalMs: 10,
        }),
      /did not match expected commit/,
    );
  } finally {
    stale.server.close();
  }

  const transient = await createFixtureServer(
    successRoutes(commit, staticPath),
  );
  try {
    let versionAttempts = 0;
    const transientFetch = async (url, init) => {
      if (String(url).endsWith("/api/health/version")) {
        versionAttempts += 1;
        if (versionAttempts === 1) {
          throw new TypeError("temporary provider fetch failure");
        }
      }
      return globalThis.fetch(url, init);
    };
    const result = await verifyProductionDeploy({
      expectedCommit: commit,
      opsBaseUrl: transient.baseUrl,
      marketingBaseUrl: transient.baseUrl,
      timeoutMs: 1_000,
      pollIntervalMs: 10,
      fetchImpl: transientFetch,
    });
    assert.equal(result.commit, commit);
    assert.equal(versionAttempts, 2);
  } finally {
    transient.server.close();
  }

  let persistentAttempts = 0;
  let fakeNow = 0;
  await assert.rejects(
    () =>
      verifyProductionDeploy({
        expectedCommit: commit,
        opsBaseUrl: "https://ops.invalid.example",
        marketingBaseUrl: "https://marketing.invalid.example",
        timeoutMs: 50,
        pollIntervalMs: 10,
        fetchImpl: async () => {
          persistentAttempts += 1;
          throw new TypeError("sensitive provider failure detail");
        },
        now: () => fakeNow,
        sleepImpl: async (ms) => {
          fakeNow += ms;
        },
      }),
    (error) => {
      assert.match(
        error.message,
        /deploy version did not match expected commit before timeout/,
      );
      assert.doesNotMatch(error.message, /sensitive provider failure detail/);
      return true;
    },
  );
  assert.equal(persistentAttempts, 5);

  let frozenClockAttempts = 0;
  await assert.rejects(
    () =>
      verifyProductionDeploy({
        expectedCommit: commit,
        opsBaseUrl: "https://ops.invalid.example",
        marketingBaseUrl: "https://marketing.invalid.example",
        timeoutMs: 30,
        pollIntervalMs: 10,
        fetchImpl: async () => {
          frozenClockAttempts += 1;
          throw new TypeError("transient");
        },
        now: () => 0,
        sleepImpl: async () => {},
      }),
    /deploy version did not match expected commit before timeout/,
  );
  assert.equal(frozenClockAttempts, 4);

  const badStatus = await createFixtureServer({
    "/api/health/version": {
      status: 200,
      body: JSON.stringify({ status: "ok", commit }),
    },
    "/login": { status: 503, body: "down" },
  });
  try {
    await assert.rejects(
      () =>
        verifyProductionDeploy({
          expectedCommit: commit,
          opsBaseUrl: badStatus.baseUrl,
          marketingBaseUrl: badStatus.baseUrl,
          timeoutMs: 200,
          pollIntervalMs: 10,
        }),
      /\/login expected 200/,
    );
  } finally {
    badStatus.server.close();
  }

  const missingStatic = await createFixtureServer({
    "/api/health/version": {
      status: 200,
      body: JSON.stringify({ status: "ok", commit }),
    },
    "/login": { status: 200, body: "<html>no assets</html>" },
    "/api/health/live": { status: 200, body: "{}" },
    "/api/health/ready": { status: 200, body: "{}" },
    "/api/auth/get-session": {
      status: 200,
      body: "null",
    },
  });
  try {
    await assert.rejects(
      () =>
        verifyProductionDeploy({
          expectedCommit: commit,
          opsBaseUrl: missingStatic.baseUrl,
          marketingBaseUrl: missingStatic.baseUrl,
          timeoutMs: 200,
          pollIntervalMs: 10,
        }),
      /missing \/_next\/static/,
    );
  } finally {
    missingStatic.server.close();
  }

  // Object-shaped unauthenticated session also accepted end-to-end.
  const objectSession = await createFixtureServer({
    ...successRoutes(commit, staticPath),
    "/api/auth/get-session": {
      status: 200,
      body: JSON.stringify({ session: null, user: null }),
    },
  });
  try {
    const result = await verifyProductionDeploy({
      expectedCommit: commit,
      opsBaseUrl: objectSession.baseUrl,
      marketingBaseUrl: objectSession.baseUrl,
      timeoutMs: 1_000,
      pollIntervalMs: 10,
    });
    assert.equal(result.commit, commit);
  } finally {
    objectSession.server.close();
  }

  for (const [label, sessionRoute] of [
    ["404", { status: 404, body: "missing" }],
    ["401", { status: 401, body: "auth" }],
    ["503", { status: 503, body: "down" }],
    ["302", { status: 302, headers: { location: "/login" }, body: "" }],
    ["malformed", { status: 200, body: "not-json{" }],
    ["string-json", { status: 200, body: '"nope"' }],
    ["array-json", { status: 200, body: "[]" }],
    ["bool-json", { status: 200, body: "false" }],
    ["number-json", { status: 200, body: "0" }],
  ]) {
    const routes = successRoutes(commit, staticPath);
    routes["/api/auth/get-session"] = sessionRoute;
    const fixture = await createFixtureServer(routes);
    try {
      await assert.rejects(
        () =>
          verifyProductionDeploy({
            expectedCommit: commit,
            opsBaseUrl: fixture.baseUrl,
            marketingBaseUrl: fixture.baseUrl,
            timeoutMs: 200,
            pollIntervalMs: 10,
          }),
        /get-session/,
      );
    } finally {
      fixture.server.close();
    }
    void label;
  }

  console.log("verify-production-deploy self-test ok");
}

async function main(argv) {
  if (argv[0] === "self-test") {
    await selfTest();
    return;
  }
  if (argv.length < 1) {
    throw new Error(
      "usage: node scripts/verify-production-deploy.mjs <expected-commit> [--ops-base URL] [--marketing-base URL] [--timeout-ms N]",
    );
  }

  let expectedCommit = argv[0];
  let opsBaseUrl;
  let marketingBaseUrl;
  let timeoutMs;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--ops-base") {
      opsBaseUrl = argv[++i];
    } else if (arg === "--marketing-base") {
      marketingBaseUrl = argv[++i];
    } else if (arg === "--timeout-ms") {
      timeoutMs = Number(argv[++i]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  const result = await verifyProductionDeploy({
    expectedCommit,
    opsBaseUrl,
    marketingBaseUrl,
    timeoutMs,
  });
  console.log(
    `production-deploy ok commit=${result.commit} static=${result.staticPath}`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    process.exitCode = 1;
  });
}
