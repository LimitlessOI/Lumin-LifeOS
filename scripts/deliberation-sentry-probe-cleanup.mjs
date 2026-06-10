#!/usr/bin/env node
/**
 * Remove Neon rows created by adversarial SENTRY live probes (session_id prefix sentry- / PHANTOM- / DOES-NOT-EXIST).
 * Usage: node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --confirm
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

const confirm = process.argv.includes('--confirm');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const patterns = [
  "session_id LIKE 'sentry-%'",
  "session_id LIKE 'PHANTOM-%'",
  "session_id LIKE 'DOES-NOT-EXIST-%'",
  "session_id LIKE 'debug-debrief-%'",
  "session_id LIKE 'a-to-z-smoke-%'",
  "session_id LIKE 'probe-%'",
];

const where = patterns.map((p) => `(${p})`).join(' OR ');

const tables = [
  'founder_debriefs',
  'deliberation_gate_records',
  'consensus_sessions',
  'composition_scorecard_entries',
  'cfo_deliberation_receipts',
  'hist_dept_cases',
  'cncl_rosters',
];

if (!confirm) {
  console.log('Dry run — pass --confirm to delete probe rows.');
  console.log('WHERE:', where);
  process.exit(0);
}

const pg = await import('pg');
const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });

try {
  for (const table of tables) {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE ${where}`);
    console.log(`Deleted ${rowCount} from ${table}`);
  }
  console.log('Cleanup complete.');
} finally {
  await pool.end();
}
