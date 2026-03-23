/**
 * DB Pool Factory — creates a configured pg connection pool for Neon PostgreSQL,
 * enabling SSL when the connection string points to neon.tech.
 *
 * Dependencies: pg (Pool)
 * Exports: createDbPool({ validatedDatabaseUrl, DB_SSL_REJECT_UNAUTHORIZED })
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
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
