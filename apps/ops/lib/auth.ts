import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  account,
  db,
  session,
  user,
  verification,
} from "@perfume-aura/db";

/**
 * Resolve auth secret for Better Auth.
 * - Runtime: require BETTER_AUTH_SECRET (or fail with a clear message).
 * - Next production build: allow a placeholder so `next build` typechecks
 *   without local secrets (never use this value in a real deploy).
 */
function resolveAuthSecret(): string {
  const fromEnv = process.env.BETTER_AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    return fromEnv;
  }

  const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (isNextBuild) {
    return "perfume-aura-build-placeholder-secret-32b";
  }

  if (fromEnv) {
    throw new Error(
      "BETTER_AUTH_SECRET must be at least 32 characters (see apps/ops/.env.example).",
    );
  }

  throw new Error(
    "BETTER_AUTH_SECRET is not set. Copy apps/ops/.env.example → .env.local and set a strong secret.",
  );
}

/**
 * Better Auth server instance (owner-only, no public sign-up).
 * Prefer BETTER_AUTH_URL for baseURL (local: http://localhost:3000).
 */
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/**
 * Better Auth server (owner-only, no public sign-up).
 * Aligns with better-auth-best-practices + better-auth-security-best-practices.
 * Prefer BETTER_AUTH_URL / BETTER_AUTH_SECRET env (see .env.example).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 256,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "owner",
        input: false,
      },
    },
  },
  secret: resolveAuthSecret(),
  baseURL,
  // baseURL origin is trusted; allow optional extra origins via env
  trustedOrigins: [
    baseURL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
