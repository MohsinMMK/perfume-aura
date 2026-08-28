import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_API_BASE_URL = "https://developers.hostinger.com";
const DEFAULT_DOMAIN = "perfumeaura.com";
const DEFAULT_REMOTE_ARCHIVE = "perfume-aura-storefront-release.zip";
const DEFAULT_POLL_INTERVAL_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 20 * 60_000;
const EXPECTED_APPLICATION = "@perfume-aura/storefront";
const EXPECTED_ENTRY_FILE = "apps/storefront/server.js";
const EXPECTED_NODE_VERSION = 24;
const BUILD_STATES = new Set(["pending", "running", "completed", "failed"]);

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function exactCommit(value) {
  const commit = requiredString(value, "source commit").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    fail("source commit must be a 40-character lowercase SHA");
  }
  return commit;
}

function accountUsername(value) {
  const username = requiredString(value, "HOSTINGER_ACCOUNT_USERNAME");
  if (!/^u\d+$/.test(username)) {
    fail("HOSTINGER_ACCOUNT_USERNAME must match Hostinger's u<number> format");
  }
  return username;
}

function publicDomain(value) {
  const domain = requiredString(value, "HOSTINGER_STOREFRONT_DOMAIN").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) {
    fail("HOSTINGER_STOREFRONT_DOMAIN must be a valid public domain");
  }
  return domain;
}

function httpsUrl(value, name) {
  let parsed;
  try {
    parsed = new URL(requiredString(value, name));
  } catch {
    fail(`${name} must be a valid URL`);
  }
  if (parsed.protocol !== "https:") {
    fail(`${name} must use HTTPS`);
  }
  return parsed;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readAndVerifyArtifact({ archivePath, manifestPath, sourceCommit }) {
  const archive = await readFile(archivePath);
  const manifestText = await readFile(manifestPath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    fail("storefront artifact manifest must contain valid JSON");
  }

  if (!isPlainObject(manifest)) {
    fail("storefront artifact manifest must be an object");
  }
  assert.equal(manifest.schemaVersion, 2, "storefront manifest schemaVersion mismatch");
  assert.equal(manifest.application, EXPECTED_APPLICATION, "storefront manifest application mismatch");
  assert.deepEqual(manifest.source, { commit: sourceCommit, dirty: false }, "storefront manifest source mismatch");
  assert.equal(manifest.entry, EXPECTED_ENTRY_FILE, "storefront manifest entry mismatch");
  assert.equal(manifest.extractedSmoke, "passed", "storefront extracted smoke is not accepted");
  if (!isPlainObject(manifest.archive)) {
    fail("storefront manifest archive metadata is missing");
  }
  const digest = createHash("sha256").update(archive).digest("hex");
  assert.equal(manifest.archive.sha256, digest, "storefront archive checksum mismatch");
  assert.equal(manifest.archive.bytes, archive.length, "storefront archive byte count mismatch");
  return { archive, manifest };
}

async function responseJson(response, operation) {
  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      fail(`${operation} returned a non-JSON response with HTTP ${response.status}`);
    }
  }
  if (!response.ok) {
    fail(`${operation} failed with HTTP ${response.status}`);
  }
  return body;
}

async function hostingerRequest({ fetchImpl, apiBaseUrl, apiToken, pathname, method = "GET", body }) {
  const url = new URL(pathname, apiBaseUrl);
  const response = await fetchImpl(url, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return responseJson(response, `${method} ${url.pathname}`);
}

function encodeRemotePath(relativePath) {
  const normalized = requiredString(relativePath, "remote archive path");
  if (normalized.startsWith("/") || normalized.includes("\\")) {
    fail("remote archive path must be relative and use forward slashes");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    fail("remote archive path contains an unsafe segment");
  }
  return segments.map(encodeURIComponent).join("/");
}

async function uploadArchive({
  fetchImpl,
  upload,
  archive,
  remoteArchivePath,
}) {
  if (!isPlainObject(upload)) {
    fail("Hostinger upload URL response is missing");
  }
  const uploadBaseUrl = httpsUrl(upload.url, "Hostinger upload URL");
  const authKey = requiredString(upload.auth_key, "Hostinger upload auth key");
  const restAuthKey = requiredString(upload.rest_auth_key, "Hostinger upload REST auth key");
  const target = new URL(encodeRemotePath(remoteArchivePath), uploadBaseUrl.href.endsWith("/") ? uploadBaseUrl : new URL(`${uploadBaseUrl.href}/`));
  target.searchParams.set("override", "true");
  const sharedHeaders = {
    "Tus-Resumable": "1.0.0",
    "X-Auth": authKey,
    "X-Auth-Rest": restAuthKey,
  };

  const createResponse = await fetchImpl(target, {
    method: "POST",
    headers: {
      ...sharedHeaders,
      "Upload-Length": String(archive.length),
      "Upload-Offset": "0",
    },
  });
  if (createResponse.status !== 201) {
    fail(`Hostinger archive upload creation failed with HTTP ${createResponse.status}`);
  }

  // Hostinger's file API requires PATCH on the same relative file URL.
  const uploadResponse = await fetchImpl(target, {
    method: "PATCH",
    headers: {
      ...sharedHeaders,
      "Content-Type": "application/offset+octet-stream",
      "Upload-Offset": "0",
    },
    body: archive,
  });
  if (uploadResponse.status !== 200 && uploadResponse.status !== 204) {
    fail(`Hostinger archive upload failed with HTTP ${uploadResponse.status}`);
  }
  const uploadedOffset = uploadResponse.headers.get("upload-offset");
  if (uploadedOffset !== null && uploadedOffset !== String(archive.length)) {
    fail("Hostinger archive upload offset does not match the archive size");
  }
}

function validateDetectedSettings(settings) {
  if (!isPlainObject(settings)) {
    fail("Hostinger could not detect Node.js settings from the archive");
  }
  const availableScripts = Array.isArray(settings.available_scripts)
    ? settings.available_scripts
    : [];
  if (!availableScripts.includes("start")) {
    fail("Hostinger archive settings do not expose the required start script");
  }
  if (settings.node_version !== null && settings.node_version !== undefined && settings.node_version !== EXPECTED_NODE_VERSION) {
    fail(`Hostinger detected unsupported Node.js version ${settings.node_version}`);
  }
}

function exactBuildRequest(remoteArchivePath) {
  return {
    node_version: EXPECTED_NODE_VERSION,
    app_type: "other",
    root_directory: null,
    output_directory: null,
    build_script: null,
    entry_file: EXPECTED_ENTRY_FILE,
    package_manager: null,
    source_type: "archive",
    source_options: { archive_path: remoteArchivePath },
  };
}

function validateBuild(build) {
  if (!isPlainObject(build)) {
    fail("Hostinger Node.js build response is missing");
  }
  const uuid = requiredString(build.uuid, "Hostinger build UUID");
  const state = requiredString(build.state, "Hostinger build state");
  if (!BUILD_STATES.has(state)) {
    fail(`Hostinger returned unknown build state ${state}`);
  }
  return { uuid, state };
}

async function waitForBuild({
  fetchImpl,
  apiBaseUrl,
  apiToken,
  buildPath,
  buildUuid,
  initialState,
  pollIntervalMs,
  timeoutMs,
  sleepImpl,
  logger,
}) {
  let state = initialState;
  let lastReportedState = "";
  const deadline = Date.now() + timeoutMs;
  while (state !== "completed") {
    if (state === "failed") {
      fail(`Hostinger Node.js build ${buildUuid} failed; inspect its scoped hPanel logs`);
    }
    if (Date.now() >= deadline) {
      fail(`Hostinger Node.js build ${buildUuid} did not complete within ${timeoutMs}ms`);
    }
    if (state !== lastReportedState) {
      logger(`hostinger-storefront-archive-deploy: build=${buildUuid} state=${state}`);
      lastReportedState = state;
    }
    await sleepImpl(pollIntervalMs);
    const builds = await hostingerRequest({
      fetchImpl,
      apiBaseUrl,
      apiToken,
      pathname: `${buildPath}?page=1&per_page=100`,
    });
    const rows = isPlainObject(builds) && Array.isArray(builds.data) ? builds.data : [];
    const observed = rows.find((candidate) => isPlainObject(candidate) && candidate.uuid === buildUuid);
    if (!observed) {
      fail(`Hostinger Node.js build ${buildUuid} was not returned by the build inventory`);
    }
    state = validateBuild(observed).state;
  }
  logger(`hostinger-storefront-archive-deploy: build=${buildUuid} state=completed`);
}

export async function deployStorefrontArchive({
  archivePath,
  manifestPath,
  sourceCommit,
  apiToken,
  username,
  domain = DEFAULT_DOMAIN,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  remoteArchivePath = DEFAULT_REMOTE_ARCHIVE,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
  sleepImpl = sleep,
  logger = console.log,
}) {
  const commit = exactCommit(sourceCommit);
  const token = requiredString(apiToken, "HOSTINGER_API_TOKEN");
  const account = accountUsername(username);
  const targetDomain = publicDomain(domain);
  const baseUrl = httpsUrl(apiBaseUrl, "Hostinger API base URL");
  const remotePath = requiredString(remoteArchivePath, "remote archive path");
  const { archive } = await readAndVerifyArtifact({ archivePath, manifestPath, sourceCommit: commit });
  const encodedAccount = encodeURIComponent(account);
  const encodedDomain = encodeURIComponent(targetDomain);
  const buildPath = `/api/hosting/v1/accounts/${encodedAccount}/websites/${encodedDomain}/nodejs/builds`;

  logger(`hostinger-storefront-archive-deploy: source=${commit} upload=starting`);
  const upload = await hostingerRequest({
    fetchImpl,
    apiBaseUrl: baseUrl,
    apiToken: token,
    pathname: "/api/hosting/v1/files/upload-urls",
    method: "POST",
    body: { username: account, domain: targetDomain },
  });
  await uploadArchive({ fetchImpl, upload, archive, remoteArchivePath: remotePath });
  logger(`hostinger-storefront-archive-deploy: source=${commit} upload=completed`);

  const settingsPath = `${buildPath}/settings/from-archive?archive_path=${encodeURIComponent(remotePath)}`;
  const detectedSettings = await hostingerRequest({
    fetchImpl,
    apiBaseUrl: baseUrl,
    apiToken: token,
    pathname: settingsPath,
  });
  validateDetectedSettings(detectedSettings);
  logger(`hostinger-storefront-archive-deploy: source=${commit} settings=accepted`);

  const startedBuild = validateBuild(await hostingerRequest({
    fetchImpl,
    apiBaseUrl: baseUrl,
    apiToken: token,
    pathname: buildPath,
    method: "POST",
    body: exactBuildRequest(remotePath),
  }));
  await waitForBuild({
    fetchImpl,
    apiBaseUrl: baseUrl,
    apiToken: token,
    buildPath,
    buildUuid: startedBuild.uuid,
    initialState: startedBuild.state,
    pollIntervalMs,
    timeoutMs,
    sleepImpl,
    logger,
  });
  logger(`hostinger-storefront-archive-deploy: completed source=${commit} build=${startedBuild.uuid}`);
  return { sourceCommit: commit, buildUuid: startedBuild.uuid };
}

async function runSelfTest() {
  const root = await mkdtemp(path.join(tmpdir(), "perfume-aura-hostinger-archive-test."));
  try {
    const commit = "a".repeat(40);
    const archivePath = path.join(root, "storefront.zip");
    const manifestPath = path.join(root, "storefront.manifest.json");
    const archive = Buffer.from("verified-storefront-archive");
    const digest = createHash("sha256").update(archive).digest("hex");
    await writeFile(archivePath, archive);
    await writeFile(manifestPath, `${JSON.stringify({
      schemaVersion: 2,
      application: EXPECTED_APPLICATION,
      source: { commit, dirty: false },
      entry: EXPECTED_ENTRY_FILE,
      extractedSmoke: "passed",
      archive: { bytes: archive.length, sha256: digest },
    })}\n`);

    const requests = [];
    const responses = [
      new Response(JSON.stringify({
        url: "https://upload.hstgr.io/",
        auth_key: "upload-auth-key",
        rest_auth_key: "upload-rest-auth-key",
      }), { status: 200 }),
      new Response(null, { status: 201, headers: { location: "/ignored-by-hostinger-upload-contract" } }),
      new Response(null, { status: 204, headers: { "upload-offset": String(archive.length) } }),
      new Response(JSON.stringify({ node_version: 24, available_scripts: ["build", "start"] }), { status: 200 }),
      new Response(JSON.stringify({ uuid: "build-1", state: "pending" }), { status: 200 }),
      new Response(JSON.stringify({ data: [{ uuid: "build-1", state: "running" }] }), { status: 200 }),
      new Response(JSON.stringify({ data: [{ uuid: "build-1", state: "completed" }] }), { status: 200 }),
    ];
    const fakeFetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      const response = responses.shift();
      assert.ok(response, "unexpected extra request");
      return response;
    };
    const logLines = [];
    const result = await deployStorefrontArchive({
      archivePath,
      manifestPath,
      sourceCommit: commit,
      apiToken: "test-token",
      username: "u123456789",
      fetchImpl: fakeFetch,
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      timeoutMs: 10_000,
      logger: (line) => logLines.push(line),
    });
    assert.deepEqual(result, { sourceCommit: commit, buildUuid: "build-1" });
    assert.equal(requests.length, 7);
    assert.equal(requests[0].options.headers.Authorization, "Bearer test-token");
    assert.equal(requests[1].options.headers["Upload-Length"], String(archive.length));
    assert.equal(requests[2].url, requests[1].url);
    assert.deepEqual(requests[2].options.body, archive);
    assert.equal(JSON.parse(requests[4].options.body).source_type, "archive");
    assert.ok(logLines.every((line) => !line.includes("test-token") && !line.includes("upload-auth-key")));
    assert.equal(responses.length, 0);

    await assert.rejects(
      deployStorefrontArchive({
        archivePath,
        manifestPath,
        sourceCommit: commit,
        apiToken: "test-token",
        username: "u123456789",
        fetchImpl: async () => new Response(JSON.stringify({
          url: "http://127.0.0.1/upload",
          auth_key: "key",
          rest_auth_key: "rest",
        }), { status: 200 }),
        logger: () => {},
      }),
      /must use HTTPS/,
    );
    process.stdout.write("hostinger-storefront-archive deploy self-test ok\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "self-test") {
      options.selfTest = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined) {
      fail(`missing value for ${argument}`);
    }
    if (argument === "--archive") options.archivePath = value;
    else if (argument === "--manifest") options.manifestPath = value;
    else if (argument === "--commit") options.sourceCommit = value;
    else if (argument === "--remote-path") options.remoteArchivePath = value;
    else fail(`unknown argument ${argument}`);
    index += 1;
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.selfTest) {
    await runSelfTest();
    return;
  }
  await deployStorefrontArchive({
    ...options,
    apiToken: process.env.HOSTINGER_API_TOKEN,
    username: process.env.HOSTINGER_ACCOUNT_USERNAME,
    domain: process.env.HOSTINGER_STOREFRONT_DOMAIN ?? DEFAULT_DOMAIN,
    apiBaseUrl: process.env.HOSTINGER_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  });
}

const isEntrypoint = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isEntrypoint) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
