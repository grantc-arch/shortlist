import { defineConfig } from "drizzle-kit";

// Used only to generate SQL migration files from src/db/schema.ts (npm run db:generate).
// Applying them is done by scripts/migrate.ts, which works for both PGlite and Postgres.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
