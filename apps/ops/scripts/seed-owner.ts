/**
 * Seed the single owner account (public sign-up is disabled).
 *
 * Usage:
 *   OWNER_EMAIL=you@example.com OWNER_PASSWORD='long-secret' \
 *   DATABASE_URL=... BETTER_AUTH_SECRET=... BETTER_AUTH_URL=http://localhost:3000 \
 *   pnpm --filter @perfume-aura/ops seed:owner
 *
 * Or with apps/ops/.env.local loaded via dotenv if present.
 */

import { config } from "dotenv";
import { resolve } from "node:path";

// Load apps/ops env files when run from monorepo root or package dir
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "apps/ops/.env.local") });
config({ path: resolve(process.cwd(), "apps/ops/.env") });

async function main() {
  const email = process.env.OWNER_EMAIL?.trim();
  const password = process.env.OWNER_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the owner");
  }
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to seed the owner");
  }
  if (!email || !password) {
    throw new Error(
      "OWNER_EMAIL and OWNER_PASSWORD are required (see apps/ops/.env.example)",
    );
  }
  if (password.length < 8) {
    throw new Error("OWNER_PASSWORD must be at least 8 characters");
  }

  // Dynamic import after env is loaded so auth/db see DATABASE_URL
  const { auth } = await import("../lib/auth");

  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);

  if (existing?.user) {
    console.log(`Owner already exists: ${email} (id=${existing.user.id})`);
    return;
  }

  const user = await ctx.internalAdapter.createUser({
    email,
    name: "Owner",
    emailVerified: true,
    role: "owner",
  });

  const hashed = await ctx.password.hash(password);

  await ctx.internalAdapter.createAccount({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hashed,
  });

  console.log(`Created owner user: ${email} (id=${user.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
