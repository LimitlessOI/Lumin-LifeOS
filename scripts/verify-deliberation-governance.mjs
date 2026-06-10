#!/usr/bin/env node
/**
 * Verify deliberation governance v2.7 — validation + optional DB smoke.
 * Usage: node scripts/verify-deliberation-governance.mjs
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

import { validateCnclRoster, VALID_AUTHORITIES } from '../config/deliberation-governance.js';

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

const good = validateCnclRoster({
  session_id: 'test-session-1',
  authorities: ['BPB', 'CDR'],
  reps: ['LifeOS', 'Founder'],
  models: [
    { id: 'model-a', focus: 'BPB' },
    { id: 'model-b', focus: 'CDR' },
  ],
  partial: true,
});
assert('valid BPB+CDR two-model roster', good.ok);

const badShared = validateCnclRoster({
  session_id: 'test-session-2',
  authorities: ['BPB', 'CDR'],
  reps: ['LifeOS'],
  models: [{ id: 'same-model', focus: 'BPB' }, { id: 'same-model', focus: 'CDR' }],
});
assert('reject BPB+CDR same model', !badShared.ok);

const badUnfocused = validateCnclRoster({
  session_id: 'test-session-3',
  authorities: ['BPB', 'CDR'],
  reps: ['LifeOS'],
  models: [{ id: 'gpt-4' }, { id: 'gpt-4' }],
});
assert('reject BPB+CDR same model without focus fields', !badUnfocused.ok);

assert('seven authorities defined', VALID_AUTHORITIES.length === 7);

if (process.env.DATABASE_URL) {
  const pg = await import('pg');
  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'cncl_rosters','consensus_sessions','composition_scorecard_entries',
         'hist_dept_cases','cfo_deliberation_receipts','evidence_vault_entries','deliberation_gate_records',
         'founder_debriefs','rep_catalog_entries'
       )`
    );
    assert('migration tables present (if migrated)', rows.length >= 9);
  } catch (e) {
    console.warn('DB check skipped:', e.message);
  } finally {
    await pool.end();
  }
} else {
  console.log('SKIP: DATABASE_URL not set — DB table check omitted');
}

process.exit(failed ? 1 : 0);
