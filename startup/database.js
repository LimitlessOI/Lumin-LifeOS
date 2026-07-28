/**
 * SYNOPSIS: startup/database.js
 * startup/database.js
 * Auto-migration runner — runs every new .sql file in db/migrations/ on startup.
 *
 * Tracks applied migrations in schema_migrations table (created on first run).
 * Files are applied in alphabetical order (date-prefixed names sort correctly).
 * Each migration runs in its own transaction.
 * Already-applied migrations are skipped. Safe to restart at any time.
 *
 * @ssot docs/products/financial-revenue/PRODUCT_HOME.md
 */
import { promises as fsPromises } from "fs";
import path from "path";
import {
  assertionFailureSolution,
  checksumDriftSolution,
  checksumMigration,
  detectChecksumDrift,
  parseAssertions,
  verifyAssertions,
} from "../scripts/lib/migration-truth.mjs";

// Resolved per call, not at module load, so the directory can be pointed
// elsewhere for tests without the import order deciding it.
const defaultMigrationsDir = () => path.join(process.cwd(), "db", "migrations");

export function isSafeIdempotentMigrationFailure(message) {
  return /already exists|duplicate key/i.test(String(message || ""));
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Additive and idempotent. `checksum` gives a migration an identity beyond its
  // filename, so editing an applied file is detectable instead of diverging git
  // from the live schema forever. `duration_ms` exists because
  // services/migration-runner.js declares the same table WITH that column: both
  // used CREATE TABLE IF NOT EXISTS, so whichever ran first won and the other's
  // INSERT would throw, recording a migration as FAILED whose SQL had applied.
  await pool.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT");
  await pool.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS duration_ms INTEGER");
}

async function getApplied(pool) {
  const { rows } = await pool.query("SELECT filename, checksum FROM schema_migrations");
  return new Map(rows.map((r) => [r.filename, r.checksum ?? null]));
}

async function markApplied(pool, filename, checksum = null, durationMs = null) {
  await pool.query(
    `INSERT INTO schema_migrations (filename, checksum, duration_ms) VALUES ($1, $2, $3)
     ON CONFLICT (filename) DO UPDATE
       SET checksum = COALESCE(schema_migrations.checksum, EXCLUDED.checksum)`,
    [filename, checksum, durationMs]
  );
}

export async function initDatabase(pool, logger, { migrationsDir = defaultMigrationsDir() } = {}) {
  const MIGRATIONS_DIR = migrationsDir;
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
  const failed = [];
  const checksumDrift = [];
  const assertionFailures = [];
  const unverified = [];
  const readOnlyQuery = (sql, params) => pool.query(sql, params);

  for (const filename of files) {
    const fullPath = path.join(MIGRATIONS_DIR, filename);

    if (applied.has(filename)) {
      skipped++;
      // Detect-and-route (never blocks boot): an applied migration whose bytes
      // changed will never be re-run, so the file and the live schema have
      // silently parted ways. Surfacing it is the only way anyone finds out.
      try {
        const currentSql = await fsPromises.readFile(fullPath, "utf8");
        const drift = detectChecksumDrift(applied.get(filename), currentSql);
        if (drift.known && drift.drifted) {
          checksumDrift.push({
            filename,
            recorded: drift.recorded,
            current: drift.current,
            proposed_solution: checksumDriftSolution(filename),
          });
          logger.error(
            `[DB] ⚠️ MIGRATION CHECKSUM DRIFT: ${filename} was edited after being applied — `
            + `live schema cannot match this file. ${checksumDriftSolution(filename)}`
          );
        } else if (!drift.known) {
          // Backfill identity for rows recorded before checksums existed.
          await markApplied(pool, filename, drift.current).catch(() => {});
        }
      } catch { /* unreadable file on an applied row is not a boot problem */ }
      continue;
    }

    let sql;
    try {
      sql = await fsPromises.readFile(fullPath, "utf8");
    } catch (err) {
      logger.warn(`[DB] Could not read migration ${filename}:`, { error: err.message });
      continue;
    }

    const checksum = checksumMigration(sql);
    const { assertions, invalid } = parseAssertions(sql);
    for (const bad of invalid) {
      logger.warn(`[DB] ⚠️ ${filename} has a malformed @assert directive (${bad.reason}): ${bad.line}`);
    }

    try {
      const startedAt = Date.now();
      // Run whole file as one query — handles BEGIN/COMMIT blocks correctly
      await pool.query(sql);
      const durationMs = Date.now() - startedAt;

      // "Did not throw" is not proof. If the file declared what it builds, confirm
      // the objects exist before recording it as applied.
      if (assertions.length) {
        const verdict = await verifyAssertions(assertions, readOnlyQuery);
        if (!verdict.ok) {
          const detail = [...verdict.missing, ...verdict.errored.map((e) => `${e.assertion} (${e.error})`)];
          assertionFailures.push({
            filename,
            missing: detail,
            proposed_solution: assertionFailureSolution(filename, detail),
          });
          failed.push(filename);
          logger.error(
            `[DB] ❌ ${filename} ran but its declared end state is missing (${detail.join(', ')}) — `
            + `NOT marked applied, will retry. ${assertionFailureSolution(filename, detail)}`
          );
          continue;
        }
        logger.info(`[DB] ✅ Applied migration: ${filename} (verified: ${verdict.satisfied.join(', ')})`);
      } else {
        unverified.push(filename);
        logger.info(`[DB] ✅ Applied migration: ${filename} (no @assert declared — end state unverified)`);
      }

      await markApplied(pool, filename, checksum, durationMs);
      ran++;
    } catch (err) {
      // Mark as applied only for narrow, non-destructive idempotent failures.
      // Missing objects must retry; they usually mean a prerequisite migration did not run.
      const msg = String(err.message || '');
      const isIdempotentFailure = isSafeIdempotentMigrationFailure(msg);
      if (isIdempotentFailure) {
        // This branch is where a migration can be recorded "done" having changed
        // nothing: a multi-statement file is sent as one simple query, so an
        // "already exists" partway through rolls the WHOLE file back, and the
        // statements after it never run. If the file declared its end state, the
        // forgiveness is now conditional on that end state actually being there.
        if (assertions.length) {
          const verdict = await verifyAssertions(assertions, readOnlyQuery);
          if (!verdict.ok) {
            const detail = [...verdict.missing, ...verdict.errored.map((e) => `${e.assertion} (${e.error})`)];
            assertionFailures.push({
              filename,
              missing: detail,
              proposed_solution: assertionFailureSolution(filename, detail),
            });
            failed.push(filename);
            logger.error(
              `[DB] ❌ ${filename} failed as "${msg}" AND its declared end state is missing `
              + `(${detail.join(', ')}) — the batch rolled back. NOT marked applied, will retry.`
            );
            continue;
          }
          await markApplied(pool, filename, checksum).catch(() => {});
          logger.warn(
            `[DB] ⚠️ Migration ${filename} failed as "${msg}" but its declared end state is present `
            + `(${verdict.satisfied.join(', ')}) — genuinely idempotent, marked applied.`
          );
        } else {
          await markApplied(pool, filename, checksum).catch(() => {});
          unverified.push(filename);
          logger.warn(
            `[DB] ⚠️ Migration ${filename} failed (idempotent, marked applied) WITHOUT verification: ${msg}. `
            + 'Add an @assert directive so this forgiveness can be checked rather than assumed.'
          );
        }
      } else {
        // Do NOT abort boot. A single bad migration must never take down every
        // route (a throw here left the app serving only /health while all
        // founder-lane routes 404'd). Log loudly, leave it unapplied so it
        // retries next boot, and let the rest of boot (route registration)
        // proceed. The daily loop can author a broken migration — that can
        // degrade one feature, never the whole server.
        failed.push(filename);
        logger.error(`[DB] ❌ Migration ${filename} FAILED — left unapplied, will retry next boot (boot continues): ${msg}`);
      }
    }
  }

  if (failed.length) {
    logger.error(`[DB] ⚠️ ${failed.length} migration(s) failed and were skipped (boot continued): ${failed.join(', ')}`);
  }

  if (checksumDrift.length) {
    logger.error(
      `[DB] ⚠️ ${checksumDrift.length} applied migration(s) edited after the fact — `
      + `git and the live schema have diverged: ${checksumDrift.map((d) => d.filename).join(', ')}`
    );
  }
  if (assertionFailures.length) {
    logger.error(
      `[DB] ❌ ${assertionFailures.length} migration(s) ran without producing their declared end state: `
      + assertionFailures.map((a) => a.filename).join(', ')
    );
  }

  if (ran > 0) {
    logger.info(`[DB] Schema up to date — ran ${ran} new migration(s), skipped ${skipped}`);
  } else {
    logger.info(`[DB] Schema up to date — all ${skipped} migration(s) already applied`);
  }

  return {
    ran,
    skipped,
    failed: [...failed],
    checksum_drift: checksumDrift,
    assertion_failures: assertionFailures,
    unverified_applied: unverified,
  };
}

// Legacy export — kept so any code that imported this still works
export async function ensureTcoAgentTables() {
  // Handled by auto-migrator now — no-op
}
