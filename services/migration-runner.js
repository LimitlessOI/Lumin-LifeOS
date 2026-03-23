/**
 * services/migration-runner.js
 * Runs SQL migration files automatically at server startup.
 *
 * How it works:
 *   1. Creates a schema_migrations table if it doesn't exist
 *   2. Scans db/migrations/ for *.sql files, sorted by filename (date-prefixed)
 *   3. Runs any migrations not yet recorded in schema_migrations
 *   4. Records each successful migration so it never runs twice
 *
 * Safe to run on every startup — already-run migrations are skipped.
 *
 * Exports: runMigrations(pool) → { ran: string[], skipped: string[], failed: string[] }
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import fs from 'fs/promises';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

// Create the tracking table if it doesn't exist
const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          BIGSERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  ran_at      TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename ON schema_migrations (filename);
`;

export async function runMigrations(pool) {
  const results = { ran: [], skipped: [], failed: [] };

  try {
    // Bootstrap: ensure tracking table exists
    await pool.query(BOOTSTRAP_SQL);

    // Get already-run migrations
    const { rows: done } = await pool.query(
      `SELECT filename FROM schema_migrations ORDER BY filename`
    );
    const doneSet = new Set(done.map(r => r.filename));

    // Scan migration files
    let files;
    try {
      files = await fs.readdir(MIGRATIONS_DIR);
    } catch {
      console.log('[MIGRATIONS] No db/migrations/ directory found — skipping');
      return results;
    }

    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // lexicographic = date order since files are prefixed YYYYMMDD_

    if (sqlFiles.length === 0) {
      console.log('[MIGRATIONS] No migration files found');
      return results;
    }

    console.log(`\n📦 [MIGRATIONS] Found ${sqlFiles.length} migration file(s)`);

    for (const filename of sqlFiles) {
      if (doneSet.has(filename)) {
        results.skipped.push(filename);
        console.log(`   ⏭️  ${filename} (already run)`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql = await fs.readFile(filePath, 'utf-8');

      const start = Date.now();
      try {
        await pool.query(sql);
        const duration = Date.now() - start;

        await pool.query(
          `INSERT INTO schema_migrations (filename, duration_ms) VALUES ($1, $2)
           ON CONFLICT (filename) DO NOTHING`,
          [filename, duration]
        );

        results.ran.push(filename);
        console.log(`   ✅ ${filename} (${duration}ms)`);
      } catch (err) {
        results.failed.push(filename);
        console.error(`   ❌ ${filename} FAILED: ${err.message}`);
        // Don't rethrow — log the failure and continue with next migration
        // A failed migration won't block server startup
      }
    }

    const summary = [];
    if (results.ran.length > 0) summary.push(`${results.ran.length} ran`);
    if (results.skipped.length > 0) summary.push(`${results.skipped.length} skipped`);
    if (results.failed.length > 0) summary.push(`${results.failed.length} FAILED`);
    console.log(`✅ [MIGRATIONS] Done: ${summary.join(', ')}\n`);

  } catch (err) {
    console.error(`[MIGRATIONS] Runner failed: ${err.message}`);
  }

  return results;
}
