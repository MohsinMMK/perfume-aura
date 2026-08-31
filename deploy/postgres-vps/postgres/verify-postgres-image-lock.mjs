import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dockerfilePath = join(scriptDirectory, "Dockerfile");
const composePath = join(scriptDirectory, "../compose.yaml");
const lockPath = join(scriptDirectory, "postgres-image.lock");

function fail(message) {
  process.stderr.write(`postgres image lock verification: ${message}\n`);
  process.exit(1);
}

function parseLock(source) {
  const values = new Map();

  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) fail(`invalid lock entry at line ${index + 1}`);
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key || !value || values.has(key)) fail(`invalid lock entry at line ${index + 1}`);
    values.set(key, value);
  }

  for (const key of [
    "repository",
    "tag",
    "index_digest",
    "linux_amd64_digest",
    "linux_arm64_digest",
    "pgbouncer_repository",
    "pgbouncer_tag",
    "pgbouncer_index_digest",
    "pgbouncer_linux_amd64_digest",
    "pgbouncer_linux_arm64_digest",
    "pgadmin_repository",
    "pgadmin_tag",
    "pgadmin_index_digest",
    "pgadmin_linux_amd64_digest",
    "pgadmin_linux_arm64_digest",
  ]) {
    if (!values.has(key)) fail(`missing ${key} in postgres-image.lock`);
  }

  for (const key of [
    "index_digest",
    "linux_amd64_digest",
    "linux_arm64_digest",
    "pgbouncer_index_digest",
    "pgbouncer_linux_amd64_digest",
    "pgbouncer_linux_arm64_digest",
    "pgadmin_index_digest",
    "pgadmin_linux_amd64_digest",
    "pgadmin_linux_arm64_digest",
  ]) {
    if (!/^sha256:[a-f0-9]{64}$/.test(values.get(key))) {
      fail(`${key} is not a lowercase sha256 digest`);
    }
  }

  return Object.fromEntries(values);
}

function imageLock(lock, prefix) {
  const keyPrefix = prefix ? `${prefix}_` : "";
  return {
    name: prefix || "postgres",
    repository: lock[`${keyPrefix}repository`],
    tag: lock[`${keyPrefix}tag`],
    indexDigest: lock[`${keyPrefix}index_digest`],
    amd64Digest: lock[`${keyPrefix}linux_amd64_digest`],
    arm64Digest: lock[`${keyPrefix}linux_arm64_digest`],
  };
}

async function verifyDockerHubImage(image) {
  // Docker Hub's official images live under the `library` namespace at the
  // registry API even though Dockerfile/Compose references intentionally use
  // the shorter `postgres` form. Namespaced images retain their literal path.
  const registryRepository = image.repository.includes("/")
    ? image.repository
    : `library/${image.repository}`;
  const tokenResponse = await fetch(
    `https://auth.docker.io/token?service=registry.docker.io&scope=${encodeURIComponent(`repository:${registryRepository}:pull`)}`,
  );
  if (!tokenResponse.ok) {
    fail(`Docker Hub token request failed for ${image.repository} (${tokenResponse.status})`);
  }
  const tokenBody = await tokenResponse.json();
  if (typeof tokenBody.token !== "string" || !tokenBody.token) {
    fail(`Docker Hub token response did not contain a token for ${image.repository}`);
  }

  const manifestResponse = await fetch(
    `https://registry-1.docker.io/v2/${registryRepository}/manifests/${image.tag}`,
    {
      headers: {
        Authorization: `Bearer ${tokenBody.token}`,
        Accept: "application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json",
      },
    },
  );
  if (!manifestResponse.ok) {
    fail(`Docker Hub manifest request failed for ${image.repository}:${image.tag} (${manifestResponse.status})`);
  }
  const liveIndexDigest = manifestResponse.headers.get("docker-content-digest");
  if (liveIndexDigest !== image.indexDigest) {
    fail(`Docker Hub ${image.repository}:${image.tag} digest drifted; review and update the lock deliberately`);
  }

  const manifestIndex = await manifestResponse.json();
  if (!Array.isArray(manifestIndex.manifests)) {
    fail(`Docker Hub ${image.repository}:${image.tag} is not a multi-architecture image index`);
  }

  for (const [platform, expectedDigest] of [
    ["linux/amd64", image.amd64Digest],
    ["linux/arm64", image.arm64Digest],
  ]) {
    const [os, architecture] = platform.split("/");
    const manifest = manifestIndex.manifests.find(
      (candidate) => candidate.platform?.os === os && candidate.platform?.architecture === architecture,
    );
    if (!manifest || manifest.digest !== expectedDigest) {
      fail(`${image.repository}:${image.tag} ${platform} image digest does not match postgres-image.lock`);
    }
  }
}

const [dockerfile, composeSource, lockSource] = await Promise.all([
  readFile(dockerfilePath, "utf8"),
  readFile(composePath, "utf8"),
  readFile(lockPath, "utf8"),
]);
const lock = parseLock(lockSource);
const postgres = imageLock(lock, "");
const pgbouncer = imageLock(lock, "pgbouncer");
const pgadmin = imageLock(lock, "pgadmin");
const expectedReference = `${postgres.repository}:${postgres.tag}@${postgres.indexDigest}`;

if (!dockerfile.includes(`FROM ${expectedReference} AS postgres-base`)) {
  fail("Dockerfile immutable PostgreSQL base reference must exactly match postgres-image.lock");
}

const pgbouncerReference = `${pgbouncer.repository}:${pgbouncer.tag}@${pgbouncer.indexDigest}`;
const pgbouncerReferenceCount = composeSource.split(pgbouncerReference).length - 1;
if (pgbouncerReferenceCount !== 2) {
  fail("Compose must pin both PgBouncer services to the reviewed immutable index");
}

const pgadminReference = `${pgadmin.repository}:${pgadmin.tag}@${pgadmin.indexDigest}`;
if (!composeSource.includes(pgadminReference)) {
  fail("Compose must pin pgAdmin to the reviewed immutable index");
}

await Promise.all([verifyDockerHubImage(postgres), verifyDockerHubImage(pgbouncer), verifyDockerHubImage(pgadmin)]);

process.stdout.write("PostgreSQL, PgBouncer, and pgAdmin image locks verified against Docker Hub indexes and linux amd64/arm64 manifests\n");
