#!/usr/bin/env node
/**
 * SYNOPSIS: Run truth scoreboard tick + receipt validation report.
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTruthScoreboardTick } from '../services/truth-scoreboard-worker.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  let pool = null;
  if (process.env.DATABASE_URL) {
    try {
      const pg = await import('pg');
      pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    } catch {
      console.warn('DATABASE_URL set but pool unavailable — epistemic promotion skipped');
    }
  }

  const out = await runTruthScoreboardTick({ pool, logger: console });
  console.log(JSON.stringify(out, null, 2));
  if (pool) await pool.end().catch(() => {});
  process.exit(out.receipt_validation_ok !== false ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
