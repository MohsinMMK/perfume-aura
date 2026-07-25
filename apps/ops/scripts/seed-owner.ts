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
  // Match apps/ops/lib/auth.ts emailAndPassword.minPasswordLength
  if (password.length < 12) {
    throw new Error("OWNER_PASSWORD must be at least 12 characters");
  }

  // Dynamic import after env is loaded so the database sees DATABASE_URL.
  const { ensureOwnerAccount } = await import(
    "../lib/owner-maintenance"
  );
  const result = await ensureOwnerAccount({ email, password });

  console.log(
    `Owner seed ${result.state}; user=${result.userId}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      "Owner seed failed. Review redacted server/database diagnostics.",
    );
    process.exit(1);
  });
