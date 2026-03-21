#!/usr/bin/env node
import "dotenv/config";
import { createDbPool } from "../services/db.js";
import { loadRuntimeEnv } from "../config/runtime-env.js";

async function main() {
  const env = loadRuntimeEnv();
  const { validatedDatabaseUrl, DB_SSL_REJECT_UNAUTHORIZED } = env;
  if (!validatedDatabaseUrl) {
    console.error("No validated database URL available");
    process.exit(1);
  }

  const pool = createDbPool({
    validatedDatabaseUrl,
    DB_SSL_REJECT_UNAUTHORIZED,
  });

  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS total_builds FROM build_artifacts"
    );
    console.log("total_builds:", rows[0]?.total_builds ?? 0);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Query failed:", error);
  process.exit(1);
});
