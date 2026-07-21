import { eq } from "drizzle-orm";
import { db } from "./client";
import { locations } from "./schema";

export const MAIN_LOCATION_CODE = "MAIN";
export const MAIN_LOCATION_NAME = "Main warehouse";

/**
 * Ensure the default MAIN location exists. Safe to call multiple times.
 */
export async function seedMainLocation(): Promise<{
  id: string;
  code: string;
  name: string;
  created: boolean;
}> {
  const existing = await db
    .select()
    .from(locations)
    .where(eq(locations.code, MAIN_LOCATION_CODE))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      code: existing[0].code,
      name: existing[0].name,
      created: false,
    };
  }

  const [created] = await db
    .insert(locations)
    .values({
      code: MAIN_LOCATION_CODE,
      name: MAIN_LOCATION_NAME,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to seed MAIN location");
  }

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    created: true,
  };
}

/**
 * CLI entry: `pnpm --filter @perfume-aura/db seed`
 * Requires DATABASE_URL.
 */
export async function runSeed(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed");
  }

  const main = await seedMainLocation();
  console.log(
    main.created
      ? `Created location ${main.code} (${main.id})`
      : `Location ${main.code} already exists (${main.id})`,
  );
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("/seed.ts") ||
    process.argv[1].endsWith("/seed.js") ||
    process.argv[1].includes("packages/db/src/seed"));

if (isDirectRun) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
