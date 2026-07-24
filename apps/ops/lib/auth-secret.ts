import { randomBytes } from "node:crypto";

type AuthSecretEnvironment = {
  [key: string]: string | undefined;
  BETTER_AUTH_SECRET?: string;
  NEXT_PHASE?: string;
};

type GenerateSecret = () => string;

const isProductionBuild = (environment: AuthSecretEnvironment): boolean =>
  environment.NEXT_PHASE === "phase-production-build";

/**
 * Create one resolver per server process. A Next production build always gets
 * one ephemeral random secret, even when .env.local supplied a valid or short
 * runtime value. Non-build runtimes remain fail-closed.
 */
export function createAuthSecretResolver(
  generateSecret: GenerateSecret = () =>
    randomBytes(32).toString("base64"),
) {
  let buildOnlySecret: string | undefined;

  return function resolve(
    environment: AuthSecretEnvironment = process.env,
  ): string {
    if (isProductionBuild(environment)) {
      buildOnlySecret ??= generateSecret();
      if (buildOnlySecret.length < 32) {
        throw new Error(
          "Build-only auth secret generation did not meet the minimum length",
        );
      }
      return buildOnlySecret;
    }

    const fromEnvironment = environment.BETTER_AUTH_SECRET;
    if (fromEnvironment && fromEnvironment.length >= 32) {
      return fromEnvironment;
    }
    if (fromEnvironment) {
      throw new Error(
        "BETTER_AUTH_SECRET must be at least 32 characters (see apps/ops/.env.example).",
      );
    }
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Copy apps/ops/.env.example → .env.local and set a strong secret.",
    );
  };
}

export const resolveAuthSecret = createAuthSecretResolver();
