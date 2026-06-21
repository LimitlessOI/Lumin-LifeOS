/**
 * SYNOPSIS: Exports recordStepMetrics — factory-v1/tsos/record-step-metrics.js.
 */
const REQUIRED_FIELDS = ['mission_id', 'blueprint_id', 'step_id', 'status', 'started_at', 'finished_at'];

export async function recordStepMetrics(metrics) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in metrics)) {
      throw new Error(`MISSING_METRICS_FIELD:${field}`);
    }
  }

  return {
    ...metrics,
    duration_ms: new Date(metrics.finished_at).getTime() - new Date(metrics.started_at).getTime()
  };
}
