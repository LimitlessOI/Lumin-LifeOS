/**
 * SYNOPSIS: DB Pool Factory — creates a configured pg connection pool for Neon PostgreSQL,
 * enabling SSL when the connection string points to neon.tech. Neon uses a longer
 * connectionTimeoutMillis so cold-starts do not brick founder-runtime boot.
 *
 * Dependencies: pg (Pool)
 * Exports: createDbPool({ validatedDatabaseUrl, DB_SSL_REJECT_UNAUTHORIZED })
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { Pool } from "pg";

export function createDbPool({ validatedDatabaseUrl, DB_SSL_REJECT_UNAUTHORIZED }) {
  const isNeon = validatedDatabaseUrl?.includes("neon.tech");
  return new Pool({
    connectionString: validatedDatabaseUrl,
    ssl: isNeon
      ? { rejectUnauthorized: DB_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    // Neon cold-start / cross-region wake can exceed 10s; Railway tip stayed
    // permanently route-less after one timeout because boot never retried.
    connectionTimeoutMillis: isNeon ? 30000 : 10000,
  });
}
