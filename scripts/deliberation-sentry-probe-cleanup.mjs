#!/usr/bin/env node
/**
 * SYNOPSIS: Remove Neon rows created by adversarial SENTRY live probes.
 * Remove Neon rows created by adversarial SENTRY live probes.
 * Usage:
 *   node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs
 *   node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --confirm
 *   node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --confirm --verify-railway
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const confirm = process.argv.includes('--confirm');
const verifyRailway = process.argv.includes('--verify-railway');

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
  "session_id = 'no-roster'",
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

async function verifySameStoreAsRailway(pool) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const key =
    process.env.COMMAND_CENTER_KEY ||
    process.env.COMMAND_KEY ||
    process.env.LIFEOS_KEY ||
    '';
  if (!base || !key) {
    console.warn('⚠️  --verify-railway skipped: PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing');
    return true;
  }

  const localFp = await pool.query(`SELECT current_database() AS db, inet_server_addr()::text AS host`);
  const localRow = localFp.rows[0];

  const probeSession = `sentry-cleanup-fp-${Date.now()}`;
  await pool.query(
    `INSERT INTO cncl_rosters (session_id, decision_type, authorities, reps, models, partial, metadata_json)
     VALUES ($1,'general','[]','[]','[]',true,'{}')`,
    [probeSession]
  );

  const remote = await fetch(`${base}/api/v1/lifeos/deliberation/roster/${probeSession}`, {
    headers: { 'x-command-key': key },
  });
  const remoteJson = await remote.json().catch(() => ({}));
  const remoteFound = remote.ok && remoteJson?.ok && remoteJson?.roster?.session_id === probeSession;

  await pool.query(`DELETE FROM cncl_rosters WHERE session_id = $1`, [probeSession]);

  if (!remoteFound) {
    console.error(
      'HALT: DATABASE_URL does not appear to be the same store Railway reads.',
      { local_db: localRow?.db, local_host: localRow?.host, remote_status: remote.status }
    );
    return false;
  }
  console.log('✅ Railway fingerprint probe: local DATABASE_URL matches Railway deliberation store.');
  return true;
}

if (!confirm) {
  console.log('Dry run — pass --confirm to delete probe rows.');
  console.log('Optional: --verify-railway compares local DATABASE_URL to Railway before delete.');
  console.log('WHERE:', where);
  process.exit(0);
}

const pg = await import('pg');
const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });

try {
  if (verifyRailway) {
    const ok = await verifySameStoreAsRailway(pool);
    if (!ok) process.exit(2);
  }

  for (const table of tables) {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE ${where}`);
    console.log(`Deleted ${rowCount} from ${table}`);
  }
  console.log('Cleanup complete.');
} finally {
  await pool.end();
}
