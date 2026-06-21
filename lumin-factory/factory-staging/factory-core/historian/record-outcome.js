/**
 * SYNOPSIS: Exports recordOutcome — lumin-factory/factory-staging/factory-core/historian/record-outcome.js.
 */
export function recordOutcome(entry) {
  return {
    type: 'outcome',
    outcome: entry.outcome,
    variance: entry.variance,
    linked_prediction_id: entry.linked_prediction_id
  };
}
