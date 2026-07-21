import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Lazy fail at first use would be softer, but stock paths must not silently
  // run without a DB. Callers in build-time import graphs should guard env.
  console.warn(
    "[@perfume-aura/db] DATABASE_URL is not set; db client will fail on query",
  );
}

/**
 * node-postgres Pool — required for interactive transactions + SELECT FOR UPDATE.
 * Do not use neon-http for stock writes.
 */
export const pool = new Pool({
  connectionString: connectionString ?? "postgresql://invalid",
  max: 10,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
