export function recordStepMetrics(entry) {
  return {
    step_id: entry.step_id,
    token_cost: entry.token_cost,
    latency_ms: entry.latency_ms,
    retries: entry.retries,
    waste: entry.waste
  };
}
