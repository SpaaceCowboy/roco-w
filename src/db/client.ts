import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDatabase = globalThis as typeof globalThis & { rocoDatabasePool?: Pool };
type Database = ReturnType<typeof drizzle<typeof schema>>;
let database: Database | undefined;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when the content database is used");
  }

  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
    application_name: "rocobroker-web",
  });

  pool.on("error", (error) => {
    console.error("PostgreSQL pool error", { name: error.name, code: "code" in error ? error.code : undefined });
  });

  return pool;
}

export function getDatabasePool(): Pool {
  if (globalForDatabase.rocoDatabasePool) return globalForDatabase.rocoDatabasePool;
  const pool = createPool();
  globalForDatabase.rocoDatabasePool = pool;
  return pool;
}

export function getDatabase(): Database {
  database ??= drizzle({ client: getDatabasePool(), schema });
  return database;
}

export async function closeDatabase(): Promise<void> {
  const pool = globalForDatabase.rocoDatabasePool;
  if (!pool) return;
  await pool.end();
  delete globalForDatabase.rocoDatabasePool;
  database = undefined;
}
