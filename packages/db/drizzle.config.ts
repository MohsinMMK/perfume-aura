import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL_DIRECT (preferred for migrations) or DATABASE_URL",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
  verbose: true,
});
