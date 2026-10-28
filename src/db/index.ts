import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Two ways to run the database:
 * - DATABASE_URL set (production, e.g. Neon or Supabase): connect to real Postgres.
 * - DATABASE_URL not set (local development): run Postgres in-process with PGlite,
 *   stored in .data/pglite. Nothing to install.
 */
export const PGLITE_DIR = process.env.PGLITE_DIR ?? ".data/pglite";

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    // prepare: false keeps it compatible with connection poolers (Supabase/Neon pooled URLs).
    const client = postgres(url, { prepare: false, max: 5 });
    return drizzlePostgres(client, { schema });
  }
  const client = new PGlite(PGLITE_DIR);
  // Close PGlite cleanly when the dev server stops (Ctrl+C), so the local data isn't left half-written.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      client.close().finally(() => process.exit(0));
    });
  }
  return drizzlePglite(client, { schema }) as unknown as Db;
}

// One connection per process. Next.js can load this module more than once (hot reloads in
// development, separate route bundles in production); a second PGlite instance on the same
// folder would see stale data, so every copy shares the instance stored on globalThis.
const globalForDb = globalThis as unknown as { __shortlistDb?: Db };
export const db: Db = globalForDb.__shortlistDb ?? createDb();
globalForDb.__shortlistDb = db;

export { schema };

/** For scripts: close the connection so the process can exit cleanly (and PGlite flushes to disk). */
export async function closeDb() {
  const client = (db as unknown as { $client: { close?: () => Promise<void>; end?: () => Promise<void> } }).$client;
  if (client.close) await client.close();
  else if (client.end) await client.end();
}
