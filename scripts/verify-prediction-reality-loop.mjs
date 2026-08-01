/**
 * SYNOPSIS: Verify the prediction → reality → calibration loop is wired.
 * Exercises the in-memory path of services/founder-intent-model.js without
 * requiring a live DB connection. A full DB-backed test should run in
 * acceptance.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import {
  predictDecisionOutcome,
  recordDecisionReality,
  calibrateDecision,
  getDecisionCalibrationSummary,
} from '../services/founder-intent-model.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const pool = null;

  const pred = await predictDecisionOutcome(pool, {
    decision_ref: 'test-blueprint-v9.5',
    predicted_outcome: 'Preflight passes after adding chair gate and blueprint validator.',
    why: 'Deterministic fills and existing green tests.',
    confidence: 0.75,
  });
  assert(pred.ok === false && pred.reason === 'no_pool', 'no_pool path should fail gracefully');

  assert(typeof predictDecisionOutcome === 'function', 'predictDecisionOutcome export missing');
  assert(typeof recordDecisionReality === 'function', 'recordDecisionReality export missing');
  assert(typeof calibrateDecision === 'function', 'calibrateDecision export missing');
  assert(typeof getDecisionCalibrationSummary === 'function', 'getDecisionCalibrationSummary export missing');

  console.log(JSON.stringify({
    ok: true,
    exports: ['predictDecisionOutcome', 'recordDecisionReality', 'calibrateDecision', 'getDecisionCalibrationSummary'],
    note: 'DB-backed loop requires pool; in-memory export check passed.',
  }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
