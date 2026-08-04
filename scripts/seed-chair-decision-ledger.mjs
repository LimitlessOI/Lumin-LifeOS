/**
 * SYNOPSIS: Seed the chair-decision-ledger with the six real predictions
 * documented in docs/products/lifeos/DECISION_OUTCOME_LEDGER_V1.md.
 * Idempotent: skips if rows with source 'priority_5_audit' already exist.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { recordDecision, recordOutcome } from '../services/chair-decision-ledger.js';

const SEEDS = [
  {
    decisionText: 'Repoint the commitment tracker to the canonical table',
    predictionText: 'Would alone fix dashboard parity',
    actualOutcomeText: 'Live re-test still failed — root cause was deeper (front-door tool gap)',
    outcomeMatch: 'incorrect',
  },
  {
    decisionText: 'Widen the life_admin gate to channel chair',
    predictionText: 'Would fix routing and close the loop',
    actualOutcomeText: 'Direct HTTP test proved the fix landed in dead code (front door returns earlier)',
    outcomeMatch: 'incorrect',
  },
  {
    decisionText: 'Wire capture into the real front-door tool + prompt',
    predictionText: 'Would make the write path work, might not fully close the loop',
    actualOutcomeText: 'Write worked, dashboard saw it for the first time all session; query/windowing bugs remained',
    outcomeMatch: 'partial',
  },
  {
    decisionText: 'Add future-date floors + widen the dashboard window',
    predictionText: 'Closes remaining Priority 1 gaps',
    actualOutcomeText: 'Live E2E: ok true, all 7 criteria passed',
    outcomeMatch: 'correct',
  },
  {
    decisionText: 'Ship the crisis gate as mandatory, not LLM-optional',
    predictionText: 'Fixed message fires on crisis language, normal chat unaffected',
    actualOutcomeText: 'Confirmed exactly as predicted, live',
    outcomeMatch: 'correct',
  },
  {
    decisionText: 'Return immediately after a successful agent action',
    predictionText: 'Stops the duplicate-write bug',
    actualOutcomeText: 'Confirmed live: exactly 1 row instead of 3',
    outcomeMatch: 'correct',
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM decision_outcome_ledger WHERE source = 'priority_5_audit'"
    );
    if (rows[0].n >= SEEDS.length) {
      console.log(`SKIP: ${rows[0].n} priority_5_audit rows already present`);
      return;
    }
    for (const s of SEEDS) {
      const created = await recordDecision(pool, {
        userId: 1,
        source: 'priority_5_audit',
        decisionText: s.decisionText,
        predictionText: s.predictionText,
        confidenceBefore: null,
      });
      await recordOutcome(pool, created.id, {
        actualOutcomeText: s.actualOutcomeText,
        outcomeMatch: s.outcomeMatch,
        confidenceAfter: null,
      });
      console.log(`seeded id=${created.id} match=${s.outcomeMatch}`);
    }
    console.log('OK: seeded', SEEDS.length, 'decisions');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
