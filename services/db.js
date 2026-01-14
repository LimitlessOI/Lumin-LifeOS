import { Pool } from "pg";

export function createDbPool({ validatedDatabaseUrl, DB_SSL_REJECT_UNAUTHORIZED }) {
  return new Pool({
    connectionString: validatedDatabaseUrl,
    ssl: validatedDatabaseUrl?.includes("neon.tech")
      ? { rejectUnauthorized: DB_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}
