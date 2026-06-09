export function recordOutcome(entry) {
  return {
    type: 'outcome',
    outcome: entry.outcome,
    variance: entry.variance,
    linked_prediction_id: entry.linked_prediction_id
  };
}
