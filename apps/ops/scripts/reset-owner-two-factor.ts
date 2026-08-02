/**
 * Break-glass owner TOTP recovery. This command is intentionally separate from
 * password recovery and needs its own exact confirmation before it removes the
 * factor and revokes every owner session.
 */

import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "apps/ops/.env.local") });
config({ path: resolve(process.cwd(), "apps/ops/.env") });

const REQUIRED_CONFIRMATION = "RESET_OWNER_TWO_FACTOR_AND_REVOKE_SESSIONS";

async function main() {
  const email = process.env.OWNER_EMAIL?.trim();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for owner two-factor recovery");
  }
  if (process.env.CONFIRM_OWNER_TWO_FACTOR_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Set CONFIRM_OWNER_TWO_FACTOR_RESET=${REQUIRED_CONFIRMATION} to continue`,
    );
  }
  if (!email) {
    throw new Error("OWNER_EMAIL is required");
  }

  const { resetOwnerTwoFactorBreakGlass } = await import(
    "../lib/owner-maintenance"
  );
  const result = await resetOwnerTwoFactorBreakGlass({ email });
  console.log(
    `Owner two-factor break-glass recovery completed; user=${result.userId}; revoked_sessions=${result.revokedSessionCount}; completed_at=${new Date().toISOString()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : "Owner two-factor recovery failed";
    console.error(message);
    process.exit(1);
  });
