import { createDbPool } from '../services/db.js';
import { loadRuntimeEnv } from '../config/runtime-env.js';

async function main() {
  const env = loadRuntimeEnv();
  if (!env.validatedDatabaseUrl) {
    console.warn('Database URL not configured; cannot query build_artifacts');
    return;
  }
  const pool = createDbPool({
    validatedDatabaseUrl: env.validatedDatabaseUrl,
    DB_SSL_REJECT_UNAUTHORIZED: env.DB_SSL_REJECT_UNAUTHORIZED,
  });
  try {
    const { rows } = await pool.query('SELECT count(*)::int AS total FROM build_artifacts');
    console.log('build_artifacts rows:', rows[0]?.total ?? 0);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Proof query failed:', error);
  process.exit(1);
});
