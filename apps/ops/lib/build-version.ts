import { execFileSync } from "node:child_process";

const FULL_SHA = /^[0-9a-f]{40}$/;

export type BuildVersionEnv = {
  STANDALONE_SOURCE_COMMIT?: string | undefined;
  GITHUB_SHA?: string | undefined;
  PERFUME_AURA_BUILD_COMMIT?: string | undefined;
};

function readEnvValue(
  env: BuildVersionEnv | NodeJS.ProcessEnv,
  key: keyof BuildVersionEnv,
): string | undefined {
  const value = env[key];
  return typeof value === "string" ? value : undefined;
}

export function normalizeSourceCommit(raw: string | undefined | null): string {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!FULL_SHA.test(value)) {
    throw new Error("invalid source commit");
  }
  return value;
}

function readGitHeadCommit(): string | undefined {
  try {
    const value = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the exact source commit embedded into a production build.
 * Only trusted commit-shaped inputs are accepted; never dump env.
 */
export function resolveBuildSourceCommit(
  env: BuildVersionEnv | NodeJS.ProcessEnv = process.env,
  readGitHead: () => string | undefined = readGitHeadCommit,
): string {
  const candidates = [
    readEnvValue(env, "STANDALONE_SOURCE_COMMIT"),
    readEnvValue(env, "GITHUB_SHA"),
    readEnvValue(env, "PERFUME_AURA_BUILD_COMMIT"),
  ];

  for (const candidate of candidates) {
    if (candidate == null || candidate.trim() === "") {
      continue;
    }
    return normalizeSourceCommit(candidate);
  }

  const gitHead = readGitHead();
  if (gitHead) {
    return normalizeSourceCommit(gitHead);
  }

  throw new Error("missing source commit");
}

/**
 * Runtime reader for the build-time embedded commit.
 *
 * Next.js only inlines `process.env.NAME` when the property access is a
 * direct static member expression. Do not route this through a helper that
 * does `env[key]` — that form is not replaced at build time.
 */
export function getEmbeddedBuildSourceCommit(): string {
  return normalizeSourceCommit(process.env.PERFUME_AURA_BUILD_COMMIT);
}
