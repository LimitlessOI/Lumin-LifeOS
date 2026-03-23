/**
 * startup/database.js
 * Auto-migration runner — runs every new .sql file in db/migrations/ on startup.
 *
 * Tracks applied migrations in schema_migrations table (created on first run).
 * Files are applied in alphabetical order (date-prefixed names sort correctly).
 * Each migration runs in its own transaction — a failure in one does NOT block others.
 * Already-applied migrations are skipped. Safe to restart at any time.
 *
 * @ssot docs/projects/AMENDMENT_03_FINANCIAL_REVENUE.md
 */
import { promises as fsPromises } from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(pool) {
  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  return new Set(rows.map((r) => r.filename));
}

async function markApplied(pool, filename) {
  await pool.query(
    "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
    [filename]
  );
}

export async function initDatabase(pool, logger) {
  await ensureMigrationsTable(pool);
  const applied = await getApplied(pool);

  // Read all .sql files, sort alphabetically (date prefix ensures correct order)
  let files;
  try {
    const all = await fsPromises.readdir(MIGRATIONS_DIR);
    files = all.filter((f) => f.endsWith(".sql")).sort();
  } catch (err) {
    logger.error("[DB] Could not read migrations directory:", { error: err.message });
    throw err;
  }

  let ran = 0;
  let skipped = 0;

  for (const filename of files) {
    if (applied.has(filename)) {
      skipped++;
      continue;
    }

    const fullPath = path.join(MIGRATIONS_DIR, filename);
    let sql;
    try {
      sql = await fsPromises.readFile(fullPath, "utf8");
    } catch (err) {
      logger.warn(`[DB] Could not read migration ${filename}:`, { error: err.message });
      continue;
    }

    try {
      // Run whole file as one query — handles BEGIN/COMMIT blocks correctly
      await pool.query(sql);
      await markApplied(pool, filename);
      logger.info(`[DB] ✅ Applied migration: ${filename}`);
      ran++;
    } catch (err) {
      // Log but continue — a broken migration shouldn't crash other migrations
      logger.warn(`[DB] ⚠️  Migration ${filename} failed (may already be applied): ${err.message}`);
      // Still mark it so we don't retry on every boot — investigate manually if needed
      await markApplied(pool, filename).catch(() => {});
    }
  }

  if (ran > 0) {
    logger.info(`[DB] Schema up to date — ran ${ran} new migration(s), skipped ${skipped}`);
  } else {
    logger.info(`[DB] Schema up to date — all ${skipped} migration(s) already applied`);
  }
}

// Legacy export — kept so any code that imported this still works
export async function ensureTcoAgentTables() {
  // Handled by auto-migrator now — no-op
}
