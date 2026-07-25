import { defineConfig } from "drizzle-kit";
import { requireDisposableTestDatabaseUrl } from "./src/test-database-guard";

const connectionString = requireDisposableTestDatabaseUrl();

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
