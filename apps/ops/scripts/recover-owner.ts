/**
 * Auditable break-glass owner credential recovery.
 *
 * Normal recovery is /forgot-password through Hostinger SMTP. This command is
 * only for an outage where the mailbox flow is unavailable.
 */

import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "apps/ops/.env.local") });
config({ path: resolve(process.cwd(), "apps/ops/.env") });

const REQUIRED_CONFIRMATION = "REVOKE_ALL_OWNER_SESSIONS";

async function main() {
  const email = process.env.OWNER_EMAIL?.trim();
  const password = process.env.OWNER_PASSWORD;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for owner recovery");
  }
  if (
    process.env.CONFIRM_OWNER_RECOVERY !== REQUIRED_CONFIRMATION
  ) {
    throw new Error(
      `Set CONFIRM_OWNER_RECOVERY=${REQUIRED_CONFIRMATION} to continue`,
    );
  }
  if (!email || !password) {
    throw new Error("OWNER_EMAIL and OWNER_PASSWORD are required");
  }

  const { recoverOwnerCredential } = await import(
    "../lib/owner-maintenance"
  );
  const result = await recoverOwnerCredential({ email, password });

  console.log(
    `Owner break-glass recovery completed; user=${result.userId}; revoked_sessions=${result.revokedSessionCount}; completed_at=${new Date().toISOString()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : "Owner recovery failed";
    console.error(message);
    process.exit(1);
  });
