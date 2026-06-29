/**
 * SYNOPSIS: S5 — Prediction Loop v0
 * S5 — Prediction Loop v0
 *
 * Pure functions: no I/O, no side effects.
 * The caller (queue) logs the returned objects via logPrediction().
 *
 * Prediction is made AFTER the SIS1 check result is known (we know if the file
 * already exists on disk) so the `sis1WillSkip` hint is available at prediction time.
 * This is an informed v0 default — not a smart model prediction.
 *
 * Events emitted (via caller):
 *   prediction_recorded  — declared expectation before the outcome is known
 *   prediction_evaluated — actual outcome measured against prediction
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

/**
 * Build a prediction record from what is known at task-start time.
 *
 * @param {{ taskId: string, lane: string, sis1WillSkip: boolean }} opts
 * @returns {object} prediction_recorded event object (no ts — caller adds)
 */
export function makePrediction({ taskId, lane, sis1WillSkip }) {
  if (sis1WillSkip) {
    return {
      event: 'prediction_recorded',
      task_id: taskId,
      lane,
      predicted_ok: true,
      predicted_closure_type: 'skipped_already_valid',
      predicted_duration_ms_range: [0, 2000],
    };
  }
  return {
    event: 'prediction_recorded',
    task_id: taskId,
    lane,
    predicted_ok: true,
    predicted_closure_type: 'committed_success',
    predicted_duration_ms_range: [5000, 90000],
  };
}

/**
 * Evaluate a prediction against the actual task outcome.
 *
 * @param {object} prediction — the record returned by makePrediction()
 * @param {{ actual_ok: boolean, actual_duration_ms: number, actual_closure_type: string }} outcome
 * @returns {object} prediction_evaluated event object (no ts — caller adds)
 */
export function evaluatePrediction(prediction, { actual_ok, actual_duration_ms, actual_closure_type }) {
  const closure_match = prediction.predicted_closure_type === actual_closure_type;
  const ok_match = prediction.predicted_ok === actual_ok;
  const prediction_match = closure_match && ok_match;

  let miss_reason = null;
  if (!prediction_match) {
    const parts = [];
    if (!ok_match) parts.push(`ok_mismatch(predicted:${prediction.predicted_ok} got:${actual_ok})`);
    if (!closure_match) parts.push(`closure_mismatch(predicted:${prediction.predicted_closure_type} got:${actual_closure_type})`);
    miss_reason = parts.join('; ');
  }

  return {
    event: 'prediction_evaluated',
    task_id: prediction.task_id,
    lane: prediction.lane,
    predicted_ok: prediction.predicted_ok,
    predicted_duration_ms_range: prediction.predicted_duration_ms_range,
    predicted_closure_type: prediction.predicted_closure_type,
    actual_ok,
    actual_duration_ms,
    actual_closure_type,
    prediction_match,
    miss_reason,
  };
}
