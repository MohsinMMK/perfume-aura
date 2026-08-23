#!/usr/bin/env node
/**
 * Commit-aware post-deploy smoke for Hostinger ops + the apex storefront.
 * Never logs response bodies or tokens.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FULL_SHA = /^[0-9a-f]{40}$/;
const PUBLIC_SURFACES = new Set(["storefront"]);
const DEPLOY_TARGETS = new Set(["ops", "storefront", "both"]);

function normalizeCommit(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!FULL_SHA.test(value)) {
    throw new Error("invalid expected commit");
  }
  return value;
}

export function normalizePublicSurface(raw) {
  const value = String(raw ?? "storefront").trim().toLowerCase();
  if (!PUBLIC_SURFACES.has(value)) {
    throw new Error("public surface must be storefront");
  }
  return value;
}

export function normalizeDeployTarget(raw) {
  const value = String(raw ?? "ops").trim().toLowerCase();
  if (!DEPLOY_TARGETS.has(value)) {
    throw new Error("deploy target must be ops, storefront, or both");
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

export function findStorefrontReleaseCommit(html) {
  const match = String(html).match(
    /\bdata-perfume-aura-release=["']([0-9a-f]{40})["']/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
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

export function assertReleaseLockedCart(response) {
  if (response.status !== 200) {
    throw new Error(`storefront /api/cart expected 200, got ${response.status}`);
  }

  let body;
  try {
    body = JSON.parse(response.text);
  } catch {
    throw new Error("storefront /api/cart returned non-JSON body");
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !body.subtotal ||
    typeof body.subtotal !== "object" ||
    body.subtotal.currency !== "INR" ||
    body.subtotal.amountMinor !== 0 ||
    body.checkoutEnabled !== false ||
    !Array.isArray(body.lines) ||
    body.lines.length !== 0
  ) {
    throw new Error("storefront /api/cart is not release locked");
  }

  return body;
}

/**
 * @param {{
 *   expectedCommit: string,
 *   opsBaseUrl?: string,
 *   publicSurface?: "storefront",
 *   publicBaseUrl?: string,
 *   wwwBaseUrl?: string,
 *   target?: "ops" | "storefront" | "both",
 *   timeoutMs?: number,
 *   pollIntervalMs?: number,
 *   fetchImpl?: typeof fetch,
 *   now?: () => number,
 *   sleepImpl?: (ms: number) => Promise<void>,
 * }} options
 */
export async function verifyProductionDeploy(options) {
  const expectedCommit = normalizeCommit(options.expectedCommit);
  const publicSurface = normalizePublicSurface(options.publicSurface);
  const target = normalizeDeployTarget(options.target);
  const opsBase = (options.opsBaseUrl ?? "https://app.perfumeaura.com").replace(
    /\/$/,
    "",
  );
  const publicBase = (options.publicBaseUrl ?? "https://perfumeaura.com").replace(
    /\/$/,
    "",
  );
  const wwwBase = (
    options.wwwBaseUrl ?? "https://www.perfumeaura.com"
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
  const maxAttempts = Math.ceil(timeoutMs / pollIntervalMs) + 1;
  if (!Number.isSafeInteger(maxAttempts)) {
    throw new Error("invalid deploy verification polling bounds");
  }

  const verificationStartedAt = now();
  async function waitForExpectedVersion(baseUrl, label) {
    const started = verificationStartedAt;
    let attempts = 0;
    while (attempts < maxAttempts) {
      const elapsedMs = now() - started;
      if (elapsedMs >= timeoutMs) break;
      attempts += 1;
      let version = null;
      try {
        version = await fetchStatus(`${baseUrl}/api/health/version`, {
          fetchImpl,
          timeoutMs: Math.max(1, Math.min(15_000, timeoutMs - elapsedMs)),
        });
      } catch {
        // Provider rollout failures may be transient; never expose response data.
      }
      if (version?.status === 200) {
        let body;
        try {
          body = JSON.parse(version.text);
        } catch {
          body = null;
        }
        if (
          body?.status === "ok" &&
          typeof body.commit === "string" &&
          body.commit.toLowerCase() === expectedCommit
        ) {
          return;
        }
      }
      if (now() - started + pollIntervalMs > timeoutMs) break;
      await sleepImpl(pollIntervalMs);
    }
    throw new Error(
      `${label} deploy version did not match expected commit before timeout`,
    );
  }

  if (target === "ops" || target === "both") {
    await waitForExpectedVersion(opsBase, "ops");
  }
  if (target === "storefront" || target === "both") {
    await waitForExpectedVersion(publicBase, "storefront");
  }

  let staticPath = null;
  if (target === "ops" || target === "both") {
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

    staticPath = findStaticAssetPath(login.text);
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
  }

  const publicRoot = await fetchStatus(`${publicBase}/`, { fetchImpl });
  if (publicRoot.status !== 200) {
    throw new Error(`${publicSurface} / expected 200, got ${publicRoot.status}`);
  }
  if (target === "storefront" || target === "both") {
    const storefrontRelease = findStorefrontReleaseCommit(publicRoot.text);
    if (storefrontRelease !== expectedCommit) {
      throw new Error("storefront HTML release marker does not match expected commit");
    }
  }

  const storefrontStaticPath = findStaticAssetPath(publicRoot.text);
  if (!storefrontStaticPath) {
    throw new Error("storefront HTML missing /_next/static asset path");
  }
  const storefrontStaticAsset = await fetchStatus(
    `${publicBase}${storefrontStaticPath}`,
    { fetchImpl },
  );
  if (storefrontStaticAsset.status !== 200) {
    throw new Error(
      `storefront static asset expected 200, got ${storefrontStaticAsset.status}`,
    );
  }

  for (const route of ["/shop", "/search"]) {
    const response = await fetchStatus(`${publicBase}${route}`, { fetchImpl });
    if (response.status !== 200) {
      throw new Error(`storefront ${route} expected 200, got ${response.status}`);
    }
  }

  const robots = await fetchStatus(`${publicBase}/robots.txt`, { fetchImpl });
  if (
    robots.status !== 200 ||
    !robots.text.includes("Allow: /") ||
    !robots.text.includes("Disallow: /account/") ||
    !robots.text.includes("Disallow: /api/") ||
    !robots.text.includes("Disallow: /checkout") ||
    !robots.text.includes(`${publicBase}/sitemap.xml`)
  ) {
    throw new Error("storefront robots.txt is missing discovery or private-route directives at the apex");
  }

  const customerAuth = await fetchStatus(
    `${publicBase}/api/customer-auth/get-session`,
    { fetchImpl },
  );
  if (customerAuth.status !== 404) {
    throw new Error(
      `storefront disabled customer auth expected 404, got ${customerAuth.status}`,
    );
  }

  const cart = await fetchStatus(`${publicBase}/api/cart`, { fetchImpl });
  assertReleaseLockedCart(cart);

  if (target === "storefront" || target === "both") {
    const wwwRedirect = await fetchStatus(`${wwwBase}/shop?probe=1`, {
      fetchImpl,
    });
    const expectedLocation = `${publicBase}/shop?probe=1`;
    if (
      wwwRedirect.status !== 308 ||
      wwwRedirect.headers.get("location") !== expectedLocation
    ) {
      throw new Error("storefront www redirect must preserve path and query");
    }
  }

  return {
    ok: true,
    commit: expectedCommit,
    staticPath: target === "storefront" ? storefrontStaticPath : staticPath,
    target,
    publicSurface,
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
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const robots = routes["/robots.txt"];
      if (typeof robots?.body === "string") {
        robots.body = robots.body.replace("pending/sitemap.xml", `${baseUrl}/sitemap.xml`);
      }
      resolve({ server, baseUrl });
    });
  });
}

function successRoutes(commit, staticPath, publicBase = "pending") {
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
    "/": {
      status: 200,
      body: `<html data-perfume-aura-release="${commit}"><script src="${staticPath}"></script></html>`,
    },
    "/shop": { status: 200, body: "shop" },
    "/search": { status: 200, body: "search" },
    "/robots.txt": {
      status: 200,
      body: `User-Agent: *\nAllow: /\nDisallow: /account/\nDisallow: /api/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /order/\nSitemap: ${publicBase}/sitemap.xml\n`,
    },
    "/api/customer-auth/get-session": {
      status: 404,
      body: JSON.stringify({ error: "Not found." }),
    },
    "/api/cart": {
      status: 200,
      body: JSON.stringify({
        checkoutEnabled: false,
        checkoutBlockReason: "Commerce has not been released.",
        lines: [],
        itemCount: 0,
        subtotal: { currency: "INR", amountMinor: 0 },
      }),
    },
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
  assert.equal(normalizePublicSurface(undefined), "storefront");
  assert.equal(normalizePublicSurface("storefront"), "storefront");
  assert.throws(
    () => normalizePublicSurface("legacy"),
    /must be storefront/,
  );
  assert.equal(normalizeDeployTarget(undefined), "ops");
  assert.equal(normalizeDeployTarget("storefront"), "storefront");
  assert.equal(normalizeDeployTarget("both"), "both");
  assert.throws(
    () => normalizeDeployTarget("invalid"),
    /must be ops, storefront, or both/,
  );
  await assert.rejects(
    () => main([commit, "--target"]),
    /--target requires a value/,
  );
  assert.equal(
    findStorefrontReleaseCommit(
      `<html data-perfume-aura-release="${commit}">`,
    ),
    commit,
  );
  assertReleaseLockedCart({
    status: 200,
    text: JSON.stringify({
      subtotal: { currency: "INR", amountMinor: 0 },
      checkoutEnabled: false,
      lines: [],
    }),
  });
  assert.throws(
    () =>
      assertReleaseLockedCart({
        status: 200,
        text: JSON.stringify({
          subtotal: { currency: "INR", amountMinor: 0 },
          checkoutEnabled: true,
          lines: [],
        }),
      }),
    /not release locked/,
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

  const successRoutesFixture = successRoutes(commit, staticPath);
  const success = await createFixtureServer(successRoutesFixture);
  successRoutesFixture["/robots.txt"].body =
    `User-Agent: *\nAllow: /\nDisallow: /account/\nDisallow: /api/\nDisallow: /checkout\nSitemap: ${success.baseUrl}/sitemap.xml\n`;
  try {
    const result = await verifyProductionDeploy({
      expectedCommit: commit,
      opsBaseUrl: success.baseUrl,
      publicBaseUrl: success.baseUrl,
      timeoutMs: 1_000,
      pollIntervalMs: 10,
    });
    assert.equal(result.commit, commit);
    assert.equal(result.staticPath, staticPath);
  } finally {
    success.server.close();
  }

  const storefrontRoutes = successRoutes(commit, staticPath, "pending");
  const storefront = await createFixtureServer(storefrontRoutes);
  storefrontRoutes["/robots.txt"].body =
    `User-Agent: *\nAllow: /\nDisallow: /account/\nDisallow: /api/\nDisallow: /checkout\nSitemap: ${storefront.baseUrl}/sitemap.xml\n`;
  try {
    const result = await verifyProductionDeploy({
      expectedCommit: commit,
      opsBaseUrl: storefront.baseUrl,
      publicBaseUrl: storefront.baseUrl,
      publicSurface: "storefront",
      timeoutMs: 1_000,
      pollIntervalMs: 10,
    });
    assert.equal(result.publicSurface, "storefront");
  } finally {
    storefront.server.close();
  }

  const exactStorefrontRoutes = successRoutes(commit, staticPath, "pending");
  const exactStorefront = await createFixtureServer(exactStorefrontRoutes);
  exactStorefrontRoutes["/robots.txt"].body =
    `User-Agent: *\nAllow: /\nDisallow: /account/\nDisallow: /api/\nDisallow: /checkout\nSitemap: ${exactStorefront.baseUrl}/sitemap.xml\n`;
  const www = await createFixtureServer({
    "/shop": {
      status: 308,
      headers: { location: `${exactStorefront.baseUrl}/shop?probe=1` },
    },
  });
  try {
    const result = await verifyProductionDeploy({
      expectedCommit: commit,
      target: "storefront",
      publicBaseUrl: exactStorefront.baseUrl,
      wwwBaseUrl: www.baseUrl,
      timeoutMs: 1_000,
      pollIntervalMs: 10,
    });
    assert.equal(result.target, "storefront");
    assert.equal(result.staticPath, staticPath);
  } finally {
    exactStorefront.server.close();
    www.server.close();
  }

  const staleStorefrontRoutes = successRoutes(commit, staticPath, "pending");
  staleStorefrontRoutes["/"].body =
    `<html data-perfume-aura-release="${"b".repeat(40)}"><script src="${staticPath}"></script></html>`;
  const staleStorefront = await createFixtureServer(staleStorefrontRoutes);
  staleStorefrontRoutes["/robots.txt"].body =
    `User-Agent: *\nAllow: /\nDisallow: /account/\nDisallow: /api/\nDisallow: /checkout\nSitemap: ${staleStorefront.baseUrl}/sitemap.xml\n`;
  const staleWww = await createFixtureServer({
    "/shop": {
      status: 308,
      headers: { location: `${staleStorefront.baseUrl}/shop?probe=1` },
    },
  });
  try {
    await assert.rejects(
      () =>
        verifyProductionDeploy({
          expectedCommit: commit,
          target: "storefront",
          publicBaseUrl: staleStorefront.baseUrl,
          wwwBaseUrl: staleWww.baseUrl,
          timeoutMs: 1_000,
          pollIntervalMs: 10,
        }),
      /HTML release marker does not match/,
    );
  } finally {
    staleStorefront.server.close();
    staleWww.server.close();
  }

  const redirectStorefrontRoutes = successRoutes(commit, staticPath, "pending");
  const redirectStorefront = await createFixtureServer(redirectStorefrontRoutes);
  redirectStorefrontRoutes["/robots.txt"].body =
    `User-Agent: *\nAllow: /\nDisallow: /account/\nDisallow: /api/\nDisallow: /checkout\nSitemap: ${redirectStorefront.baseUrl}/sitemap.xml\n`;
  const badWww = await createFixtureServer({
    "/shop": {
      status: 302,
      headers: { location: `${redirectStorefront.baseUrl}/` },
    },
  });
  try {
    await assert.rejects(
      () =>
        verifyProductionDeploy({
          expectedCommit: commit,
          target: "storefront",
          publicBaseUrl: redirectStorefront.baseUrl,
          wwwBaseUrl: badWww.baseUrl,
          timeoutMs: 1_000,
          pollIntervalMs: 10,
        }),
      /www redirect must preserve path and query/,
    );
  } finally {
    redirectStorefront.server.close();
    badWww.server.close();
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
          publicBaseUrl: stale.baseUrl,
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
      publicBaseUrl: transient.baseUrl,
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
        publicBaseUrl: "https://storefront.invalid.example",
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

  let sharedDeadlineNow = 0;
  let opsVersionAttempts = 0;
  await assert.rejects(
    () =>
      verifyProductionDeploy({
        expectedCommit: commit,
        target: "both",
        opsBaseUrl: "https://ops.invalid.example",
        publicBaseUrl: "https://storefront.invalid.example",
        timeoutMs: 50,
        pollIntervalMs: 10,
        fetchImpl: async (url) => {
          if (
            String(url) ===
            "https://ops.invalid.example/api/health/version"
          ) {
            opsVersionAttempts += 1;
            return new Response(
              JSON.stringify({
                status: "ok",
                commit: opsVersionAttempts > 1 ? commit : "b".repeat(40),
              }),
              { status: 200 },
            );
          }
          return new Response(
            JSON.stringify({ status: "ok", commit: "b".repeat(40) }),
            { status: 200 },
          );
        },
        now: () => sharedDeadlineNow,
        sleepImpl: async (ms) => {
          sharedDeadlineNow += ms;
        },
      }),
    /storefront deploy version did not match expected commit before timeout/,
  );
  assert.equal(sharedDeadlineNow, 50);
  assert.equal(opsVersionAttempts, 2);

  let frozenClockAttempts = 0;
  await assert.rejects(
    () =>
      verifyProductionDeploy({
        expectedCommit: commit,
        opsBaseUrl: "https://ops.invalid.example",
        publicBaseUrl: "https://storefront.invalid.example",
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
          publicBaseUrl: badStatus.baseUrl,
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
          publicBaseUrl: missingStatic.baseUrl,
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
      publicBaseUrl: objectSession.baseUrl,
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
            publicBaseUrl: fixture.baseUrl,
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
      "usage: node scripts/verify-production-deploy.mjs <expected-commit> [--target ops|storefront|both] [--ops-base URL] [--public-base URL] [--www-base URL] [--public-surface storefront] [--timeout-ms N]",
    );
  }

  let expectedCommit = argv[0];
  let opsBaseUrl;
  let publicBaseUrl;
  let wwwBaseUrl;
  let publicSurface;
  let target;
  let timeoutMs;
  function readOptionValue(index, option) {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${option} requires a value`);
    }
    return value;
  }
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--ops-base") {
      opsBaseUrl = readOptionValue(i, arg);
      i += 1;
    } else if (arg === "--public-base") {
      publicBaseUrl = readOptionValue(i, arg);
      i += 1;
    } else if (arg === "--www-base") {
      wwwBaseUrl = readOptionValue(i, arg);
      i += 1;
    } else if (arg === "--target") {
      target = readOptionValue(i, arg);
      i += 1;
    } else if (arg === "--public-surface") {
      publicSurface = readOptionValue(i, arg);
      i += 1;
    } else if (arg === "--timeout-ms") {
      timeoutMs = Number(readOptionValue(i, arg));
      i += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  const result = await verifyProductionDeploy({
    expectedCommit,
    opsBaseUrl,
    publicBaseUrl,
    wwwBaseUrl,
    publicSurface,
    target,
    timeoutMs,
  });
  console.log(
    `production-deploy ok target=${result.target} commit=${result.commit} surface=${result.publicSurface} static=${result.staticPath}`,
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
